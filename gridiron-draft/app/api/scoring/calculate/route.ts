import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateWeekTotal } from "@/lib/scoring";

/**
 * Recomputes weekly_scores for every drafted team in a league for a given
 * week, from whatever's currently in weekly_stats. Call this:
 *   - manually from the commissioner's scoreboard page ("Refresh scores"), or
 *   - on a schedule (e.g. Monday morning) via a Supabase cron / GitHub Action
 *     that hits this route after weekly_stats has been refreshed from CFBD.
 *
 * This does NOT fetch real-world stats itself — that's a separate ingestion
 * job (see README "Populating real team data") that writes into
 * weekly_stats first. This route only turns those raw stats into points
 * using the league's own scoring_settings.
 */
export async function POST(request: Request) {
  const { leagueId, week, seasonYear } = await request.json();
  if (!leagueId || !week || !seasonYear) {
    return NextResponse.json({ error: "leagueId, week, and seasonYear are required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: league } = await admin.from("leagues").select("scoring_settings").eq("id", leagueId).single();
  if (!league) return NextResponse.json({ error: "League not found" }, { status: 404 });

  const { data: picks } = await admin
    .from("draft_picks")
    .select("league_member_id, cfb_team_id")
    .eq("league_id", leagueId);
  if (!picks || picks.length === 0) {
    return NextResponse.json({ error: "No drafted teams yet" }, { status: 400 });
  }

  const teamIds = picks.map((p) => p.cfb_team_id);
  const { data: statsRows } = await admin
    .from("weekly_stats")
    .select("*")
    .in("cfb_team_id", teamIds)
    .eq("season_year", seasonYear)
    .eq("week", week);

  if (!statsRows || statsRows.length === 0) {
    return NextResponse.json({ error: "No weekly_stats found for that week yet" }, { status: 400 });
  }

  const statsByTeam = new Map(statsRows.map((s) => [s.cfb_team_id, s]));

  const rows = picks
    .map((pick) => {
      const stats = statsByTeam.get(pick.cfb_team_id);
      if (!stats) return null; // that team was on a bye or hasn't played yet
      const { statPoints, winBonusPoints } = calculateWeekTotal(stats, league.scoring_settings);
      return {
        league_id: leagueId,
        league_member_id: pick.league_member_id,
        cfb_team_id: pick.cfb_team_id,
        season_year: seasonYear,
        week,
        stat_points: statPoints,
        win_bonus_points: winBonusPoints,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const { error } = await admin
    .from("weekly_scores")
    .upsert(rows, { onConflict: "league_id,league_member_id,cfb_team_id,season_year,week" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, teamsScored: rows.length });
}
