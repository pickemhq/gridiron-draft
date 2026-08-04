import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DraftRoom from "@/components/DraftRoom";

export default async function DraftPage({ params }: { params: { leagueId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: league }, { data: members }, { data: draftState }, { data: teams }, { data: picks }] =
    await Promise.all([
      supabase.from("leagues").select("*").eq("id", params.leagueId).single(),
      supabase.from("league_members").select("*").eq("league_id", params.leagueId).order("draft_position"),
      supabase.from("draft_state").select("*").eq("league_id", params.leagueId).single(),
      supabase.from("cfb_teams").select("*").order("ap_rank", { ascending: true, nullsFirst: false }),
      supabase.from("draft_picks").select("*").eq("league_id", params.leagueId).order("pick_number"),
    ]);

  if (!league || !members || !draftState || !teams) {
    return <div className="mx-auto max-w-3xl px-6 py-20 text-chalk/60">League not found.</div>;
  }

  const myMembership = members.find((m) => m.user_id === user.id);
  const isCommissioner = league.commissioner_id === user.id;

  return (
    <DraftRoom
      league={league}
      members={members}
      initialDraftState={draftState}
      teams={teams}
      initialPicks={picks ?? []}
      myMembershipId={myMembership?.id ?? null}
      isCommissioner={isCommissioner}
    />
  );
}
