import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { memberForPick } from "@/lib/draft";
import { sendYourTurnEmail } from "@/lib/email";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { leagueId, randomizeOrder } = await request.json();

  const { data: league } = await supabase.from("leagues").select("*").eq("id", leagueId).single();
  if (!league) return NextResponse.json({ error: "League not found" }, { status: 404 });
  if (league.commissioner_id !== user.id) {
    return NextResponse.json({ error: "Only the commissioner can start the draft" }, { status: 403 });
  }
  if (league.draft_status !== "not_started") {
    return NextResponse.json({ error: "Draft already started" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: members } = await admin
    .from("league_members")
    .select("*, profiles(email, display_name)")
    .eq("league_id", leagueId);

  if (!members || members.length < 2) {
    return NextResponse.json({ error: "Need at least 2 members to start a draft" }, { status: 400 });
  }

  let ordered = [...members];
  if (randomizeOrder) {
    ordered = ordered.sort(() => Math.random() - 0.5);
  }
  for (let i = 0; i < ordered.length; i++) {
    await admin.from("league_members").update({ draft_position: i + 1 }).eq("id", ordered[i].id);
  }
  ordered.forEach((m, i) => (m.draft_position = i + 1));

  const first = memberForPick(ordered, league.roster_size, 1)!;
  const deadline =
    league.draft_type === "slow"
      ? new Date(Date.now() + league.pick_time_limit_hours * 60 * 60 * 1000).toISOString()
      : null;

  await admin
    .from("draft_state")
    .update({
      status: "in_progress",
      current_pick_number: 1,
      current_round: 1,
      current_league_member_id: first.member.id,
      turn_deadline: deadline,
    })
    .eq("league_id", leagueId);

  await admin.from("leagues").update({ draft_status: "in_progress" }).eq("id", leagueId);

  const firstMember = first.member as typeof first.member & {
    profiles?: { email: string; display_name: string };
  };
  if (firstMember.profiles) {
    await sendYourTurnEmail({
      to: firstMember.profiles.email,
      teamName: firstMember.team_name,
      leagueName: league.name,
      leagueId,
      deadline,
      pickNumber: 1,
    });
  }

  return NextResponse.json({ success: true });
}
