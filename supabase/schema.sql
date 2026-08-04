-- ============================================================================
-- Gridiron Draft — schema.sql
-- Run this once in the Supabase SQL editor (or `supabase db push`) on a
-- fresh project. Safe to re-run: everything is IF NOT EXISTS / OR REPLACE.
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- PROFILES — one row per auth.users, created automatically on signup
-- ----------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ----------------------------------------------------------------------------
-- CFB_TEAMS — reference table of real FBS teams. Seed via supabase/seed_teams.sql
-- or scripts/seed-teams.ts (pulls from CollegeFootballData API).
-- ----------------------------------------------------------------------------
create table if not exists cfb_teams (
  id serial primary key,
  school text not null unique,
  mascot text,
  conference text,
  logo_url text,
  ap_rank int,              -- current AP poll rank, null if unranked
  sp_rating numeric,        -- optional advanced rating, for rank-based bonuses
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- LEAGUES
-- ----------------------------------------------------------------------------
create table if not exists leagues (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  commissioner_id uuid not null references profiles(id),
  season_year int not null default extract(year from now())::int,
  invite_code text not null unique default substr(md5(random()::text), 1, 8),
  max_members int not null default 10,
  roster_size int not null default 5, -- teams drafted per member

  draft_type text not null default 'slow' check (draft_type in ('slow', 'live_snake')),
  pick_time_limit_hours int not null default 24, -- only used for 'slow' drafts
  draft_status text not null default 'not_started'
    check (draft_status in ('not_started', 'in_progress', 'complete')),

  -- Tunable scoring formula, see README "Scoring" section for the full spec.
  scoring_settings jsonb not null default '{
    "yards_per_point": 25,
    "td_points": 6,
    "turnover_forced_points": 2,
    "turnover_committed_points": -2,
    "win_base_points": 10,
    "loss_base_points": 0,
    "upset_multiplier": 0.5,
    "unranked_rank_value": 60
  }'::jsonb,

  created_at timestamptz not null default now()
);

create table if not exists league_members (
  id uuid primary key default uuid_generate_v4(),
  league_id uuid not null references leagues(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  team_name text not null default 'My Squad',
  draft_position int, -- assigned when the draft is initialized
  joined_at timestamptz not null default now(),
  unique (league_id, user_id)
);

-- ----------------------------------------------------------------------------
-- DRAFT
-- ----------------------------------------------------------------------------
create table if not exists draft_state (
  league_id uuid primary key references leagues(id) on delete cascade,
  current_pick_number int not null default 1,       -- overall pick, 1-indexed
  current_round int not null default 1,
  current_league_member_id uuid references league_members(id),
  turn_deadline timestamptz,                          -- null until draft starts (slow drafts only)
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'complete'))
);

create table if not exists draft_picks (
  id uuid primary key default uuid_generate_v4(),
  league_id uuid not null references leagues(id) on delete cascade,
  league_member_id uuid not null references league_members(id) on delete cascade,
  cfb_team_id int not null references cfb_teams(id),
  round int not null,
  pick_number int not null, -- overall pick number
  is_autopick boolean not null default false,
  picked_at timestamptz not null default now(),
  unique (league_id, cfb_team_id),      -- a real team can only be drafted once per league
  unique (league_id, pick_number)
);

-- ----------------------------------------------------------------------------
-- STATS + SCORING
-- weekly_stats: raw real-world team performance, populated from an external
-- source (e.g. CollegeFootballData API) by a scheduled job — see README.
-- ----------------------------------------------------------------------------
create table if not exists weekly_stats (
  id uuid primary key default uuid_generate_v4(),
  cfb_team_id int not null references cfb_teams(id),
  season_year int not null,
  week int not null,
  total_yards int not null default 0,
  passing_tds int not null default 0,
  rushing_tds int not null default 0,
  turnovers_forced int not null default 0,
  turnovers_committed int not null default 0,
  points_scored int not null default 0,
  points_allowed int not null default 0,
  result text check (result in ('W', 'L', 'T')),
  opponent_cfb_team_id int references cfb_teams(id),
  team_rank_at_kickoff int,      -- this team's AP rank going into the game (null = unranked)
  opponent_rank_at_kickoff int,  -- opponent's AP rank going into the game
  created_at timestamptz not null default now(),
  unique (cfb_team_id, season_year, week)
);

-- weekly_scores: the per-league, per-member fantasy points derived from
-- weekly_stats + that league's scoring_settings. Recomputed by
-- /api/scoring/calculate (see README) whenever new weekly_stats land.
create table if not exists weekly_scores (
  id uuid primary key default uuid_generate_v4(),
  league_id uuid not null references leagues(id) on delete cascade,
  league_member_id uuid not null references league_members(id) on delete cascade,
  cfb_team_id int not null references cfb_teams(id),
  season_year int not null,
  week int not null,
  stat_points numeric not null default 0,
  win_bonus_points numeric not null default 0,
  total_points numeric generated always as (stat_points + win_bonus_points) stored,
  calculated_at timestamptz not null default now(),
  unique (league_id, league_member_id, cfb_team_id, season_year, week)
);

-- ----------------------------------------------------------------------------
-- SCORING FUNCTION — mirrors the logic in lib/scoring.ts so it can also be
-- called straight from SQL/edge functions. Keep the two in sync.
-- ----------------------------------------------------------------------------
create or replace function calculate_win_bonus(
  own_rank int,        -- null if unranked
  opponent_rank int,    -- null if unranked
  base_points numeric,
  upset_multiplier numeric,
  unranked_value int
) returns numeric as $$
declare
  own_val int := coalesce(own_rank, unranked_value);
  opp_val int := coalesce(opponent_rank, unranked_value);
  -- lower rank number = better team, so a "better opponent" has a *smaller* opp_val.
  quality_gap int := greatest(0, own_val - opp_val);
begin
  return base_points + (quality_gap * upset_multiplier);
end;
$$ language plpgsql immutable;

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- Everything is readable by any authenticated league member; writes are
-- locked down to the acting user or the commissioner.
-- ----------------------------------------------------------------------------
alter table profiles enable row level security;
alter table leagues enable row level security;
alter table league_members enable row level security;
alter table draft_state enable row level security;
alter table draft_picks enable row level security;
alter table weekly_scores enable row level security;
alter table cfb_teams enable row level security;
alter table weekly_stats enable row level security;

-- profiles
drop policy if exists "profiles are viewable by authenticated users" on profiles;
create policy "profiles are viewable by authenticated users" on profiles
  for select using (auth.role() = 'authenticated');
drop policy if exists "users can update own profile" on profiles;
create policy "users can update own profile" on profiles
  for update using (auth.uid() = id);

-- cfb_teams / weekly_stats: public read-only reference data
drop policy if exists "teams are public read" on cfb_teams;
create policy "teams are public read" on cfb_teams for select using (true);
drop policy if exists "weekly stats are public read" on weekly_stats;
create policy "weekly stats are public read" on weekly_stats for select using (true);

-- leagues: members can see their league; anyone authenticated can create one
drop policy if exists "members can view their league" on leagues;
create policy "members can view their league" on leagues
  for select using (
    exists (select 1 from league_members m where m.league_id = leagues.id and m.user_id = auth.uid())
    or commissioner_id = auth.uid()
  );
drop policy if exists "authenticated users can create leagues" on leagues;
create policy "authenticated users can create leagues" on leagues
  for insert with check (auth.uid() = commissioner_id);
drop policy if exists "commissioner can update league" on leagues;
create policy "commissioner can update league" on leagues
  for update using (auth.uid() = commissioner_id);

-- league_members
drop policy if exists "members can view league roster" on league_members;
create policy "members can view league roster" on league_members
  for select using (
    exists (select 1 from league_members me where me.league_id = league_members.league_id and me.user_id = auth.uid())
  );
drop policy if exists "users can join a league as themselves" on league_members;
create policy "users can join a league as themselves" on league_members
  for insert with check (auth.uid() = user_id);
drop policy if exists "users can update own membership" on league_members;
create policy "users can update own membership" on league_members
  for update using (auth.uid() = user_id);

-- draft_state
drop policy if exists "members can view draft state" on draft_state;
create policy "members can view draft state" on draft_state
  for select using (
    exists (select 1 from league_members m where m.league_id = draft_state.league_id and m.user_id = auth.uid())
  );
drop policy if exists "commissioner can manage draft state" on draft_state;
create policy "commissioner can manage draft state" on draft_state
  for all using (
    exists (select 1 from leagues l where l.id = draft_state.league_id and l.commissioner_id = auth.uid())
  );

-- draft_picks: members can view; inserts go through the /api/draft/pick
-- route using the service role so turn order + eligibility are enforced
-- server-side rather than trusted to client-side RLS.
drop policy if exists "members can view draft picks" on draft_picks;
create policy "members can view draft picks" on draft_picks
  for select using (
    exists (select 1 from league_members m where m.league_id = draft_picks.league_id and m.user_id = auth.uid())
  );

-- weekly_scores
drop policy if exists "members can view weekly scores" on weekly_scores;
create policy "members can view weekly scores" on weekly_scores
  for select using (
    exists (select 1 from league_members m where m.league_id = weekly_scores.league_id and m.user_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- REALTIME — lets the draft board and scoreboard update live for everyone
-- watching, without polling.
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table draft_state;
alter publication supabase_realtime add table draft_picks;
alter publication supabase_realtime add table weekly_scores;
