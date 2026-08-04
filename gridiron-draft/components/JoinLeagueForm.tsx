"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinLeagueForm() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/leagues/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode, teamName }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error);
    router.push(`/leagues/${data.leagueId}/draft`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="border border-field-700 bg-field-900/50 rounded-md p-6 space-y-4">
      <h2 className="font-display uppercase text-chalk">Join a league</h2>
      <label className="block">
        <span className="text-xs font-mono uppercase tracking-widest text-chalk/50">Invite code</span>
        <input
          required
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          className="mt-1 w-full bg-field-950 border border-field-700 rounded-sm px-3 py-2 text-chalk font-mono focus:outline-none focus:border-clock-amber"
        />
      </label>
      <label className="block">
        <span className="text-xs font-mono uppercase tracking-widest text-chalk/50">Your team name</span>
        <input
          required
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          className="mt-1 w-full bg-field-950 border border-field-700 rounded-sm px-3 py-2 text-chalk focus:outline-none focus:border-clock-amber"
        />
      </label>
      {error && <p className="text-clock-red text-sm">{error}</p>}
      <button
        disabled={loading}
        className="w-full rounded-sm border border-brass text-brass font-display uppercase tracking-wide py-2.5 hover:bg-brass hover:text-field-950 transition-colors disabled:opacity-50"
      >
        {loading ? "Joining…" : "Join league"}
      </button>
    </form>
  );
}
