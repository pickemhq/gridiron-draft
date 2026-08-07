// Hand-written to match supabase/schema.sql. Once your project is linked you
// can replace this with a generated file:
//   npx supabase gen types typescript --project-id <ref> > types/database.ts

export type ScoringSettings = {
  yards_per_point: number;
  td_points: number;
  turnover_forced_points: number;
  turnover_committed_points: number;
  win_base_points: number;
  loss_base_points: number;
  upset_multiplier: number;
  unranked_rank_value: number;
};

export type Profile = {
  id: string;
  display_name: string;
  email: string;
  created_at: string;
};

export type CfbTeam = {
  id: number;
  school: string;
  mascot: string | null;
  conference: string | null;
  logo_url: string | null;
  ap_rank: number | null;
  sp_rating: number | null;
  created_at: string;
};

export type League = {
  id: string;
  name: string;
  commissioner_id: string;
  season_year: number;
  invite_code: string;
  max_members: number;
  roster_size: number;
  draft_type: "slow" | "live_snake";
  pick_time_limit_hours: number;
  draft_status: "not_started" | "in_progress" | "complete";
  scoring_settings: ScoringSettings;
  created_at: string;
};

export type LeagueMember = {
  id: string;
  league_id: string;
  user_id: string;
  team_name: string;
  draft_position: number | null;
  joined_at: string;
};

export type DraftState = {
  league_id: string;
  current_pick_number: number;
  current_round: number;
  current_league_member_id: string | null;
  turn_deadline: string | null;
  status: "not_started" | "in_progress" | "complete";
};

export type DraftPick = {
  id: string;
  league_id: string;
  league_member_id: string;
  cfb_team_id: number;
  round: number;
  pick_number: number;
  is_autopick: boolean;
  picked_at: string;
};

export type WeeklyStats = {
  id: string;
  cfb_team_id: number;
  season_year: number;
  week: number;
  total_yards: number;
  passing_tds: number;
  rushing_tds: number;
  turnovers_forced: number;
  turnovers_committed: number;
  points_scored: number;
  points_allowed: number;
  result: "W" | "L" | "T" | null;
  opponent_cfb_team_id: number | null;
  team_rank_at_kickoff: number | null;
  opponent_rank_at_kickoff: number | null;
  created_at: string;
};

export type WeeklyScore = {
  id: string;
  league_id: string;
  league_member_id: string;
  cfb_team_id: number;
  season_year: number;
  week: number;
  stat_points: number;
  win_bonus_points: number;
  total_points: number;
  calculated_at: string;
};

export type Feedback = {
  id: string;
  message: string;
  from_email: string | null;
  created_at: string;
};

// Minimal shape satisfying @supabase/ssr's generic constraint. Expand table
// by table as you wire up more generated columns/relationships.
export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      cfb_teams: { Row: CfbTeam; Insert: Partial<CfbTeam>; Update: Partial<CfbTeam> };
      leagues: { Row: League; Insert: Partial<League>; Update: Partial<League> };
      league_members: { Row: LeagueMember; Insert: Partial<LeagueMember>; Update: Partial<LeagueMember> };
      draft_state: { Row: DraftState; Insert: Partial<DraftState>; Update: Partial<DraftState> };
      draft_picks: { Row: DraftPick; Insert: Partial<DraftPick>; Update: Partial<DraftPick> };
      weekly_stats: { Row: WeeklyStats; Insert: Partial<WeeklyStats>; Update: Partial<WeeklyStats> };
      weekly_scores: { Row: WeeklyScore; Insert: Partial<WeeklyScore>; Update: Partial<WeeklyScore> };
      feedback: { Row: Feedback; Insert: Partial<Feedback>; Update: Partial<Feedback> };
    };
  };
};
