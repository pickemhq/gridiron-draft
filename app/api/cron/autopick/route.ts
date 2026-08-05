import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { makePick, bestAvailableTeam } from "@/lib/draft-server";
import type { DraftState } from "@/types/database";

/**
 * Called on a schedule (see .github/workflows/draft-autopick.yml, runs every
 * 15 minutes) to sweep every 'slow' league whose turn_deadline has passed
 * and auto-draft the highest-ranked remaining team for whoever missed it.
 *
 * Protect this route: only requests with the correct CRON_SECRET bearer
 * token are allowed, so it can't be hit by randoms to force picks.
 */
export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: lapsed, error } = await admin
    .from("draft_state")
    .select("league_id, current_league_member_id")
    .eq("status", "in_progress")
    .lt("turn_deadline", new Date().toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const drafts = (lapsed ?? []) as Pick<DraftState, "league_id" | "current_league_member_id">[];

  if (drafts.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let processed = 0;
  for (const draft of drafts) {
    if (!draft.current_league_member_id) continue;
    const team = await bestAvailableTeam(draft.league_id);
    if (!team) continue;

    const result = await makePick({
      leagueId: draft.league_id,
      cfbTeamId: team.id,
      leagueMemberId: draft.current_league_member_id,
      isAutopick: true,
    });
    if (result.success) processed++;
  }

  return NextResponse.json({ processed });
}
