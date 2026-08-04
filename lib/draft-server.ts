import { createAdminClient } from "@/lib/supabase/admin";
import { memberForPick, isDraftComplete } from "@/lib/draft";
import { sendYourTurnEmail } from "@/lib/email";

type MakePickResult = { success: true; draftComplete: boolean } | { success: false; error: string };

/**
 * Records a pick and advances draft_state. Shared by:
 *   - app/api/draft/pick (a human picking on their own turn)
 *   - app/api/cron/autopick (system picking for someone who missed their deadline)
 * Both callers are responsible for authorizing the request BEFORE calling this
 * (checking "is it actually this user's turn" / "is this deadline actually lapsed").
 */
export async function makePick(params: {
  leagueId: string;
  cfbTeamId: number;
  leagueMemberId: string;
  isAutopick: boolean;
}): Promise<MakePickResult> {
  const admin = createAdminClient();
  const { leagueId, cfbTeamId, leagueMemberId, isAutopick } = params;

  const [{ data: league }, { data: draftState }, { data: members }] = await Promise.all([
    admin.from("leagues").select("*").eq("id", leagueId).single(),
    admin.from("draft_state").select("*").eq("league_id", leagueId).single(),
    admin.from("league_members").select("*, profiles(email, display_name)").eq("league_id", leagueId),
  ]);
  if (!league || !draftState || !members) return { success: false, error: "League not found" };

  const { error: insertError } = await admin.from("draft_picks").insert({
    league_id: leagueId,
    league_member_id: leagueMemberId,
    cfb_team_id: cfbTeamId,
    round: draftState.current_round,
    pick_number: draftState.current_pick_number,
    is_autopick: isAutopick,
  });
  if (insertError) return { success: false, error: insertError.message };

  const nextPickNumber = draftState.current_pick_number + 1;

  if (isDraftComplete(members, league.roster_size, nextPickNumber)) {
    await admin
      .from("draft_state")
      .update({ status: "complete", current_league_member_id: null, turn_deadline: null })
      .eq("league_id", leagueId);
    await admin.from("leagues").update({ draft_status: "complete" }).eq("id", leagueId);
    return { success: true, draftComplete: true };
  }

  const next = memberForPick(members, league.roster_size, nextPickNumber)!;
  const deadline =
    league.draft_type === "slow"
      ? new Date(Date.now() + league.pick_time_limit_hours * 60 * 60 * 1000).toISOString()
      : null;

  await admin
    .from("draft_state")
    .update({
      current_pick_number: nextPickNumber,
      current_round: next.round,
      current_league_member_id: next.member.id,
      turn_deadline: deadline,
    })
    .eq("league_id", leagueId);

  const nextMember = next.member as typeof next.member & {
    profiles?: { email: string; display_name: string };
  };
  if (nextMember.profiles) {
    await sendYourTurnEmail({
      to: nextMember.profiles.email,
      teamName: nextMember.team_name,
      leagueName: league.name,
      leagueId,
      deadline,
      pickNumber: nextPickNumber,
    });
  }

  return { success: true, draftComplete: false };
}

/** Best remaining team by AP rank (unranked teams last, then insertion order). */
export async function bestAvailableTeam(leagueId: string) {
  const admin = createAdminClient();
  const { data: drafted } = await admin.from("draft_picks").select("cfb_team_id").eq("league_id", leagueId);
  const draftedIds = new Set((drafted ?? []).map((d) => d.cfb_team_id));

  const { data: allTeams } = await admin
    .from("cfb_teams")
    .select("id, ap_rank")
    .order("ap_rank", { ascending: true, nullsFirst: false });

  return (allTeams ?? []).find((t) => !draftedIds.has(t.id)) ?? null;
}
