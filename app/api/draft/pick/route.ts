import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { makePick } from "@/lib/draft-server";
import type { DraftState, LeagueMember } from "@/types/database";

/**
 * Handles one human draft pick:
 *   1. Confirm it's actually this user's turn (server-side, not trusted from the client)
 *   2. Confirm the chosen real-world team hasn't already been drafted in this league
 *   3. Delegate to makePick() to record it and advance the clock
 *
 * See app/api/cron/autopick for the system's equivalent when a deadline lapses.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { leagueId, cfbTeamId } = await request.json();

  const admin = createAdminClient();
  const [{ data: draftState }, { data: members }] = await Promise.all([
    admin.from("draft_state").select("*").eq("league_id", leagueId).single(),
    admin.from("league_members").select("id, user_id").eq("league_id", leagueId),
  ]);

  const draft = (draftState ?? null) as DraftState | null;
  const draftMembers = (members ?? []) as Pick<LeagueMember, "id" | "user_id">[];

  if (!draft || draftMembers.length === 0) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }
  if (draft.status !== "in_progress") {
    return NextResponse.json({ error: "Draft is not currently in progress" }, { status: 400 });
  }

  const onTheClock = draftMembers.find((m) => m.id === draft.current_league_member_id);
  if (!onTheClock || onTheClock.user_id !== user.id) {
    return NextResponse.json({ error: "It's not your turn to pick" }, { status: 403 });
  }

  const { data: existingPick } = await admin
    .from("draft_picks")
    .select("id")
    .eq("league_id", leagueId)
    .eq("cfb_team_id", cfbTeamId)
    .maybeSingle();
  if (existingPick) {
    return NextResponse.json({ error: "That team has already been drafted" }, { status: 400 });
  }

  const result = await makePick({ leagueId, cfbTeamId, leagueMemberId: onTheClock.id, isAutopick: false });
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 });

  return NextResponse.json(result);
}
