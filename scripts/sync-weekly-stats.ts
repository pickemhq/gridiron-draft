/**
 * Pulls one week's real game results + team stats from the free
 * CollegeFootballData API, writes them into `weekly_stats`, then
 * recalculates `weekly_scores` for every league that has drafted teams —
 * so scoring runs itself once this is scheduled (see
 * .github/workflows/weekly-stats-sync.yml).
 *
 * Usage:
 *   npm run sync:stats                  # auto-detects "last completed week"
 *   npm run sync:stats -- --week 3            # explicit week, current year
 *   npm run sync:stats -- --week 3 --year 2026
 *
 * Requires the same env vars as scripts/seed-teams.ts:
 *   CFBD_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { calculateWeekTotal } from "../lib/scoring";
import type { ScoringSettings, WeeklyStats } from "../types/database";
const CFBD_KEY = process.env.CFBD_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!CFBD_KEY || !SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing env vars. Need CFBD_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const cfbdHeaders = { Authorization: `Bearer ${CFBD_KEY}` };

// ---- CLI args -------------------------------------------------------------
function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

// ---- CFBD response shapes (only the fields we use) -------------------------
type CfbdGame = {
  id: number;
  week: number;
  home_team: string;
  away_team: string;
  home_points: number | null;
  away_points: number | null;
};

type CfbdTeamGameStats = {
  id: number; // game id
  teams: {
    school: string;
    stats: { category: string; stat: string }[];
  }[];
};

type CfbdPollRank = { school: string; rank: number };

async function determineWeek(year: number): Promise<number> {
  const res = await fetch(`https://api.collegefootballdata.com/calendar?year=${year}`, {
    headers: cfbdHeaders,
  });
  const weeks: { week: number; firstGameStart: string; lastGameStart: string }[] = await res.json();

  const now = Date.now();
  // Find the most recent week whose games have already finished (last game
  // start + ~4h buffer is in the past). That's "last week's" results, which
  // is what you want to score the Monday/Tuesday after games happen.
  const completed = weeks.filter((w) => new Date(w.lastGameStart).getTime() + 4 * 60 * 60 * 1000 < now);
  if (completed.length === 0) throw new Error("No completed weeks found yet this season.");
  return completed[completed.length - 1].week;
}

function statValue(stats: { category: string; stat: string }[], categories: string[]): number {
  for (const cat of categories) {
    const found = stats.find((s) => s.category === cat);
    if (found) return parseInt(found.stat, 10) || 0;
  }
  return 0;
}

async function main() {
  const year = Number(argValue("--year")) || new Date().getFullYear();
  const week = Number(argValue("--week")) || (await determineWeek(year));

  console.log(`Syncing weekly_stats for ${year} week ${week}...`);

  const [gamesRes, teamStatsRes, pollsRes, ourTeamsRes] = await Promise.all([
    fetch(`https://api.collegefootballdata.com/games?year=${year}&week=${week}&seasonType=regular`, {
      headers: cfbdHeaders,
    }),
    fetch(`https://api.collegefootballdata.com/games/teams?year=${year}&week=${week}&seasonType=regular`, {
      headers: cfbdHeaders,
    }),
    fetch(`https://api.collegefootballdata.com/rankings?year=${year}&seasonType=regular&week=${week}`, {
      headers: cfbdHeaders,
    }),
    supabase.from("cfb_teams").select("id, school"),
  ]);

  const games: CfbdGame[] = await gamesRes.json();
  const teamStatsByGame: CfbdTeamGameStats[] = await teamStatsRes.json();
  const pollWeeks = await pollsRes.json();
  const apPoll: CfbdPollRank[] =
    pollWeeks?.[0]?.polls?.find((p: { poll: string }) => p.poll === "AP Top 25")?.ranks ?? [];
  const rankBySchool = new Map(apPoll.map((t) => [t.school, t.rank]));

  const schoolToId = new Map((ourTeamsRes.data ?? []).map((t) => [t.school, t.id as number]));
  const statsByGameId = new Map(teamStatsByGame.map((g) => [g.id, g]));

  const rows: Omit<WeeklyStats, "id" | "created_at">[] = [];

  for (const game of games) {
    if (game.home_points === null || game.away_points === null) continue; // not played yet

    const gameStats = statsByGameId.get(game.id);
    const sides = [
      { team: game.home_team, opp: game.away_team, pts: game.home_points, oppPts: game.away_points },
      { team: game.away_team, opp: game.home_team, pts: game.away_points, oppPts: game.home_points },
    ];

    for (const side of sides) {
      const teamId = schoolToId.get(side.team);
      const oppId = schoolToId.get(side.opp);
      if (!teamId) continue; // not an FBS team we're tracking (e.g. FCS opponent)

      const teamStats = gameStats?.teams.find((t) => t.school === side.team)?.stats ?? [];

      rows.push({
        cfb_team_id: teamId,
        season_year: year,
        week,
        total_yards: statValue(teamStats, ["totalYards"]),
        passing_tds: statValue(teamStats, ["passingTDs"]),
        rushing_tds: statValue(teamStats, ["rushingTDs"]),
        turnovers_forced: statValue(
          gameStats?.teams.find((t) => t.school === side.opp)?.stats ?? [],
          ["turnovers"]
        ),
        turnovers_committed: statValue(teamStats, ["turnovers"]),
        points_scored: side.pts,
        points_allowed: side.oppPts,
        result: side.pts > side.oppPts ? "W" : side.pts < side.oppPts ? "L" : "T",
        opponent_cfb_team_id: oppId ?? null,
        team_rank_at_kickoff: rankBySchool.get(side.team) ?? null,
        opponent_rank_at_kickoff: rankBySchool.get(side.opp) ?? null,
      });
    }
  }

  if (rows.length === 0) {
    console.log("No completed games with stats found for that week — nothing to sync.");
    return;
  }

  console.log(`Upserting ${rows.length} team-week stat lines...`);
  const { error: statsError } = await supabase
    .from("weekly_stats")
    .upsert(rows, { onConflict: "cfb_team_id,season_year,week" });
  if (statsError) {
    console.error("Failed to upsert weekly_stats:", statsError);
    process.exit(1);
  }

  await recalculateAllLeagueScores(year, week);
  console.log("Done.");
}

/** Mirrors app/api/scoring/calculate, run directly against the DB for every league. */
async function recalculateAllLeagueScores(year: number, week: number) {
  const { data: leagues } = await supabase.from("leagues").select("id, scoring_settings");
  if (!leagues) return;

  for (const league of leagues) {
    const { data: picks } = await supabase
      .from("draft_picks")
      .select("league_member_id, cfb_team_id")
      .eq("league_id", league.id);
    if (!picks || picks.length === 0) continue;

    const teamIds = picks.map((p) => p.cfb_team_id);
    const { data: statsRows } = await supabase
      .from("weekly_stats")
      .select("*")
      .in("cfb_team_id", teamIds)
      .eq("season_year", year)
      .eq("week", week);
    if (!statsRows || statsRows.length === 0) continue;

    const statsByTeam = new Map(statsRows.map((s) => [s.cfb_team_id, s as WeeklyStats]));
    const settings = league.scoring_settings as ScoringSettings;

    const scoreRows = picks
      .map((pick) => {
        const stats = statsByTeam.get(pick.cfb_team_id);
        if (!stats) return null;
        const { statPoints, winBonusPoints } = calculateWeekTotal(stats, settings);
        return {
          league_id: league.id,
          league_member_id: pick.league_member_id,
          cfb_team_id: pick.cfb_team_id,
          season_year: year,
          week,
          stat_points: statPoints,
          win_bonus_points: winBonusPoints,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (scoreRows.length === 0) continue;

    const { error } = await supabase
      .from("weekly_scores")
      .upsert(scoreRows, { onConflict: "league_id,league_member_id,cfb_team_id,season_year,week" });
    if (error) console.error(`Failed to score league ${league.id}:`, error);
    else console.log(`  scored ${scoreRows.length} teams for league ${league.id}`);
  }
}

main();
