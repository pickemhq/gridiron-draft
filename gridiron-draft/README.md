# Gridiron Draft

Fantasy college football where you draft **whole real teams**, not players.
Built with Next.js (App Router) + Supabase.

## What's built

- **Auth** — email/password via Supabase Auth
- **Leagues** — create or join with an invite code, tunable roster size and scoring
- **Draft** — snake order; either a live one-sitting draft, or a **slow draft**
  where each GM gets a 24-hour window (configurable) and an email when they're
  on the clock. Missed deadlines auto-pick the best available team.
- **Scoring** — fantasy-style stat points (yardage / TDs / turnover margin)
  plus a **win bonus that scales with how much better the opponent was
  ranked** — beat a top-5 team and it pays a lot more than beating an
  unranked one.
- **Realtime board** — everyone watching a draft sees picks land live via
  Supabase Realtime, no polling.

## What's stubbed / up to you

- **Team logos/full FBS list** — `supabase/seed_teams.sql` only has ~25
  teams to get you testing fast. Run `npm run seed:teams` for the full ~134
  FBS teams with logos and live AP ranks.
- **Auction drafts** — only snake order is implemented. The schema has room
  for it (`draft_type`) if you want to add it later.
- **Head-to-head weekly matchups** — right now scoring is pure
  points-accumulation (like rotisserie). Ping me if you want head-to-head
  matchups with W-L records instead/in addition.

## 1. Push this to GitHub

```bash
cd gridiron-draft
git init
git add .
git commit -m "Initial scaffold"
gh repo create gridiron-draft --private --source=. --push
# or manually: create a repo on github.com, then
# git remote add origin <your-repo-url> && git push -u origin main
```

## 2. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project.
2. Once it's up, open the **SQL Editor** and run the contents of
   `supabase/schema.sql`, then `supabase/seed_teams.sql` (or run
   `npm run seed:teams` after step 3 for the full team list instead).
3. Go to **Project Settings → API** and grab:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret —
     server-only, never shipped to the browser)
4. Under **Authentication → Providers**, email/password is on by default.
   Under **Authentication → URL Configuration**, add your local
   (`http://localhost:3000`) and deployed site URL as redirect URLs.

## 3. Local setup

```bash
npm install
cp .env.local.example .env.local
# fill in the Supabase values from step 2, plus (optional for now):
#   RESEND_API_KEY + EMAIL_FROM — for the "you're on the clock" emails
#   CFBD_API_KEY — for scripts/seed-teams.ts
npm run dev
```

Open `http://localhost:3000`, sign up, create a league, and invite a
second account (a private/incognito window works) to test the draft — you
need at least 2 members to start one.

## 4. Email notifications (optional but recommended for slow drafts)

1. Create a free account at [resend.com](https://resend.com), verify a
   sending domain (or use their test domain while developing).
2. Add `RESEND_API_KEY` and `EMAIL_FROM` to `.env.local` (and to your
   deployment's env vars). Without these set, the app just skips sending
   and logs a warning — nothing breaks.

## 5. Deploy

Easiest path is [Vercel](https://vercel.com):

1. Import the GitHub repo.
2. Add all the env vars from `.env.local` (including a new one,
   `CRON_SECRET` — invent any random string, used to protect the autopick
   endpoint).
3. Deploy.

## 6. Turn on the autopick sweep

The slow draft only enforces its deadline if something actually calls
`/api/cron/autopick` periodically. `.github/workflows/draft-autopick.yml`
does this via GitHub Actions every 15 minutes — just add two repo secrets
under **Settings → Secrets and variables → Actions**:

- `SITE_URL` — your deployed URL, e.g. `https://gridiron-draft.vercel.app`
- `CRON_SECRET` — the same value you set in step 5

Push to `main` and the workflow becomes active on its schedule (you can
also trigger it manually from the Actions tab to test it).

## 7. Turn on real stats + auto-scoring

`scripts/sync-weekly-stats.ts` pulls the past week's real game stats and AP
ranks from CollegeFootballData, writes them into `weekly_stats`, and
recalculates `weekly_scores` for every league — so once this is running,
scoring truly runs itself.

```bash
npm run sync:stats                     # auto-detects last completed week
npm run sync:stats -- --week 3 --year 2026   # or target one explicitly
```

To automate it, `.github/workflows/weekly-stats-sync.yml` runs it every
Tuesday morning. Add three more repo secrets:

- `CFBD_API_KEY` — free key from [collegefootballdata.com](https://collegefootballdata.com)
- `SUPABASE_URL` — same value as `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase Project Settings → API

You can also trigger it manually from the Actions tab (with an optional
explicit week/year) to backfill or re-run a week.

## Scoring formula reference

Defined per-league in `leagues.scoring_settings` (editable via SQL for now;
a settings UI would be a good next addition) and implemented in
`lib/scoring.ts`:

- **Stat points** = `total_yards / yards_per_point` + `(passing_tds +
  rushing_tds) * td_points` + `turnovers_forced * turnover_forced_points` +
  `turnovers_committed * turnover_committed_points`
- **Win bonus** = `win_base_points + max(0, own_rank − opponent_rank) *
  upset_multiplier`, where a lower rank number is better and unranked teams
  are treated as rank `unranked_rank_value` (default 60). So beating a
  team ranked 10 spots better than you pays more than beating one ranked
  10 spots worse.

Defaults: 25 yards/pt, 6 pts/TD, ±2 for turnover margin, 10-point base win
bonus, 0.5× multiplier per rank point of quality gap.

## Project structure

```
app/
  api/                    route handlers (leagues, draft, scoring, cron)
  leagues/[leagueId]/     draft, roster, scoreboard pages
lib/
  draft.ts                snake order + turn math (pure functions)
  draft-server.ts         pick recording + turn advancement (uses service role)
  scoring.ts              stat points + win bonus formulas (pure functions)
  email.ts                Resend wrapper for turn notifications
  supabase/               client.ts (browser), server.ts (RLS-respecting),
                           admin.ts (service role, server-only)
supabase/
  schema.sql              tables, RLS policies, realtime config
  seed_teams.sql           starter team list
scripts/seed-teams.ts     pulls full FBS list + AP poll from CFBD API
.github/workflows/        autopick cron
```
