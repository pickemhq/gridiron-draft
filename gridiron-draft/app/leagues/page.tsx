import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CreateLeagueForm from "@/components/CreateLeagueForm";
import JoinLeagueForm from "@/components/JoinLeagueForm";

export default async function LeaguesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("league_members")
    .select("league_id, team_name, leagues(id, name, draft_status, season_year, invite_code)")
    .eq("user_id", user.id);

  return (
    <div className="mx-auto max-w-4xl px-6 py-14">
      <h1 className="font-display text-3xl uppercase text-chalk mb-8">My Leagues</h1>

      <div className="grid gap-3 mb-12">
        {memberships && memberships.length > 0 ? (
          memberships.map((m: any) => (
            <Link
              key={m.league_id}
              href={`/leagues/${m.league_id}/draft`}
              className="flex items-center justify-between border border-field-700 bg-field-900/50 rounded-md px-5 py-4 hover:border-clock-amber transition-colors"
            >
              <div>
                <p className="font-display uppercase text-lg text-chalk">{m.leagues?.name}</p>
                <p className="text-xs text-chalk/50 mt-1">
                  {m.team_name} · {m.leagues?.season_year} · invite code{" "}
                  <span className="font-mono">{m.leagues?.invite_code}</span>
                </p>
              </div>
              <span className="font-mono text-xs uppercase tracking-widest text-brass">
                {m.leagues?.draft_status.replace("_", " ")}
              </span>
            </Link>
          ))
        ) : (
          <p className="text-chalk/50 text-sm">You're not in any leagues yet — start or join one below.</p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <CreateLeagueForm />
        <JoinLeagueForm />
      </div>
    </div>
  );
}
