import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RefreshScoresButton from "@/components/RefreshScoresButton";

export default async function ScoreboardPage({ params }: { params: { leagueId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: league }, { data: members }, { data: scores }] = await Promise.all([
    supabase.from("leagues").select("*").eq("id", params.leagueId).single(),
    supabase.from("league_members").select("*").eq("league_id", params.leagueId),
    supabase
      .from("weekly_scores")
      .select("*, cfb_teams(school)")
      .eq("league_id", params.leagueId),
  ]);

  if (!league || !members) {
    return <div className="mx-auto max-w-3xl px-6 py-20 text-chalk/60">League not found.</div>;
  }

  const standings = members
    .map((member) => {
      const memberScores = (scores ?? []).filter((s) => s.league_member_id === member.id);
      const total = memberScores.reduce((sum, s) => sum + Number(s.total_points), 0);
      return { member, total, weeks: memberScores.length };
    })
    .sort((a, b) => b.total - a.total);

  const isCommissioner = league.commissioner_id === user.id;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-brass mb-2">{league.name}</p>
          <h1 className="font-display text-3xl uppercase text-chalk">Standings</h1>
        </div>
        {isCommissioner && <RefreshScoresButton leagueId={league.id} seasonYear={league.season_year} />}
      </div>

      <div className="border border-field-700 rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-field-900 text-chalk/50 font-mono text-xs uppercase tracking-widest">
            <tr>
              <th className="text-left px-5 py-3">Rank</th>
              <th className="text-left px-5 py-3">Team</th>
              <th className="text-right px-5 py-3">Weeks scored</th>
              <th className="text-right px-5 py-3">Total points</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, i) => (
              <tr key={row.member.id} className="border-t border-field-800">
                <td className="px-5 py-3 font-mono text-chalk/50">{i + 1}</td>
                <td className="px-5 py-3 text-chalk">{row.member.team_name}</td>
                <td className="px-5 py-3 text-right text-chalk/60">{row.weeks}</td>
                <td className="px-5 py-3 text-right scoreboard-digit text-clock-amber">
                  {row.total.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-chalk/40 mt-4">
        Scoring: {league.scoring_settings.yards_per_point} yards = 1 pt · {league.scoring_settings.td_points} pts/TD ·
        turnover margin {league.scoring_settings.turnover_forced_points > 0 ? "+" : ""}
        {league.scoring_settings.turnover_forced_points}/{league.scoring_settings.turnover_committed_points} · win
        bonus {league.scoring_settings.win_base_points} + {league.scoring_settings.upset_multiplier}× rank gap
      </p>
    </div>
  );
}
