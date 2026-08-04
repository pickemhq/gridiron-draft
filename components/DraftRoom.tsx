"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CfbTeam, DraftPick, DraftState, League, LeagueMember } from "@/types/database";
import CountdownTimer from "@/components/CountdownTimer";

export default function DraftRoom({
  league,
  members,
  initialDraftState,
  teams,
  initialPicks,
  myMembershipId,
  isCommissioner,
}: {
  league: League;
  members: LeagueMember[];
  initialDraftState: DraftState;
  teams: CfbTeam[];
  initialPicks: DraftPick[];
  myMembershipId: string | null;
  isCommissioner: boolean;
}) {
  const supabase = createClient();
  const [draftState, setDraftState] = useState(initialDraftState);
  const [picks, setPicks] = useState(initialPicks);
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  // Live-update the board for everyone watching, not just the person picking.
  useEffect(() => {
    const channel = supabase
      .channel(`draft-${league.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "draft_state", filter: `league_id=eq.${league.id}` },
        (payload) => setDraftState(payload.new as DraftState)
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "draft_picks", filter: `league_id=eq.${league.id}` },
        (payload) => setPicks((prev) => [...prev, payload.new as DraftPick])
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, league.id]);

  const draftedTeamIds = useMemo(() => new Set(picks.map((p) => p.cfb_team_id)), [picks]);
  const availableTeams = useMemo(
    () =>
      teams.filter(
        (t) => !draftedTeamIds.has(t.id) && t.school.toLowerCase().includes(search.toLowerCase())
      ),
    [teams, draftedTeamIds, search]
  );

  const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const teamsById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const onTheClock = draftState.current_league_member_id
    ? membersById.get(draftState.current_league_member_id)
    : null;
  const isMyTurn = draftState.status === "in_progress" && onTheClock?.id === myMembershipId;

  async function startDraft() {
    setStarting(true);
    setError(null);
    const res = await fetch("/api/draft/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leagueId: league.id, randomizeOrder: true }),
    });
    const data = await res.json();
    setStarting(false);
    if (!res.ok) setError(data.error);
  }

  async function makePick(cfbTeamId: number) {
    setPending(cfbTeamId);
    setError(null);
    const res = await fetch("/api/draft/pick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leagueId: league.id, cfbTeamId }),
    });
    const data = await res.json();
    setPending(null);
    if (!res.ok) setError(data.error);
  }

  if (draftState.status === "not_started") {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-brass mb-3">{league.name}</p>
        <h1 className="font-display text-3xl uppercase text-chalk mb-4">Draft hasn't started</h1>
        <p className="text-chalk/60 mb-8">
          {members.length} GM{members.length === 1 ? "" : "s"} in the league. Share invite code{" "}
          <span className="font-mono text-brass">{league.invite_code}</span> to get more.
        </p>
        {isCommissioner ? (
          <button
            onClick={startDraft}
            disabled={starting || members.length < 2}
            className="rounded-sm bg-clock-amber text-field-950 font-display uppercase tracking-wide px-6 py-3 hover:bg-brass transition-colors disabled:opacity-50"
          >
            {starting ? "Starting…" : members.length < 2 ? "Need 2+ members" : "Randomize order & start draft"}
          </button>
        ) : (
          <p className="text-chalk/50 text-sm">Waiting for the commissioner to start the draft.</p>
        )}
        {error && <p className="text-clock-red text-sm mt-4">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* On-the-clock header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-field-700 bg-field-900/60 rounded-md px-6 py-5 mb-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-chalk/50">
            {draftState.status === "complete"
              ? "Draft complete"
              : `Round ${draftState.current_round} · Pick ${draftState.current_pick_number}`}
          </p>
          <p className="font-display text-2xl uppercase text-chalk mt-1">
            {draftState.status === "complete"
              ? "Rosters are set — good luck this season"
              : `${onTheClock?.team_name ?? "—"} is on the clock`}
          </p>
        </div>
        {draftState.status === "in_progress" && (
          <div className="text-right">
            <CountdownTimer deadline={draftState.turn_deadline} />
            {league.draft_type === "slow" && (
              <p className="text-xs text-chalk/40 mt-1">until autopick</p>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-clock-red text-sm mb-4">{error}</p>}

      <div className="grid lg:grid-cols-[1fr,320px] gap-8">
        {/* Available teams */}
        <div>
          <input
            type="text"
            placeholder="Search teams…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-field-950 border border-field-700 rounded-sm px-3 py-2 text-chalk mb-4 focus:outline-none focus:border-clock-amber"
          />
          <div className="grid sm:grid-cols-2 gap-2 max-h-[560px] overflow-y-auto pr-1">
            {availableTeams.map((team) => (
              <button
                key={team.id}
                disabled={!isMyTurn || pending !== null}
                onClick={() => makePick(team.id)}
                className="flex items-center justify-between text-left border border-field-700 bg-field-900/40 rounded-sm px-4 py-3 hover:border-clock-amber disabled:hover:border-field-700 disabled:opacity-60 transition-colors"
              >
                <span>
                  <span className="block text-chalk">{team.school}</span>
                  <span className="block text-xs text-chalk/40">{team.conference}</span>
                </span>
                {team.ap_rank && (
                  <span className="font-mono text-xs text-brass">#{team.ap_rank}</span>
                )}
              </button>
            ))}
            {availableTeams.length === 0 && (
              <p className="text-chalk/40 text-sm col-span-2">No teams match your search.</p>
            )}
          </div>
          {draftState.status === "in_progress" && !isMyTurn && (
            <p className="text-xs text-chalk/40 mt-4">
              You'll be able to pick when it's your turn — this board updates live.
            </p>
          )}
        </div>

        {/* Draft history */}
        <div>
          <h2 className="font-mono text-xs uppercase tracking-widest text-chalk/50 mb-3">Draft board</h2>
          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
            {[...picks]
              .sort((a, b) => b.pick_number - a.pick_number)
              .map((pick) => {
                const team = teamsById.get(pick.cfb_team_id);
                const member = membersById.get(pick.league_member_id);
                return (
                  <div
                    key={pick.id}
                    className="flex items-center justify-between border-b border-field-800 py-2 text-sm"
                  >
                    <span className="text-chalk/40 font-mono text-xs w-8">{pick.pick_number}</span>
                    <span className="flex-1 text-chalk">{team?.school}</span>
                    <span className="text-chalk/50 text-xs text-right">
                      {member?.team_name}
                      {pick.is_autopick && <span className="text-clock-red ml-1">(auto)</span>}
                    </span>
                  </div>
                );
              })}
            {picks.length === 0 && <p className="text-chalk/40 text-sm">No picks yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
