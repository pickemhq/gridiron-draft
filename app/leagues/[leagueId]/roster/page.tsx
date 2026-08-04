import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RosterPage({ params }: { params: { leagueId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: league }, { data: members }, { data: picks }] = await Promise.all([
    supabase.from("leagues").select("name").eq("id", params.leagueId).single(),
    supabase.from("league_members").select("*").eq("league_id", params.leagueId).order("draft_position"),
    supabase
      .from("draft_picks")
      .select("*, cfb_teams(school, conference, ap_rank)")
      .eq("league_id", params.leagueId)
      .order("pick_number"),
  ]);

  if (!league || !members) {
    return <div className="mx-auto max-w-3xl px-6 py-20 text-chalk/60">League not found.</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <p className="font-mono text-xs uppercase tracking-widest text-brass mb-2">{league.name}</p>
      <h1 className="font-display text-3xl uppercase text-chalk mb-8">Rosters</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((member) => {
          const teams = (picks ?? []).filter((p) => p.league_member_id === member.id);
          return (
            <div key={member.id} className="border border-field-700 bg-field-900/50 rounded-md p-5">
              <h2 className="font-display uppercase text-chalk">{member.team_name}</h2>
              <div className="mt-3 space-y-2">
                {teams.length > 0 ? (
                  teams.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between text-sm border-b border-field-800 pb-2">
                      <span className="text-chalk/80">{p.cfb_teams?.school}</span>
                      {p.cfb_teams?.ap_rank && (
                        <span className="font-mono text-xs text-brass">#{p.cfb_teams.ap_rank}</span>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-chalk/40 text-sm">No teams drafted yet.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
