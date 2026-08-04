"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateLeagueForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [draftType, setDraftType] = useState<"slow" | "live_snake">("slow");
  const [rosterSize, setRosterSize] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/leagues/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, teamName, draftType, rosterSize, pickTimeLimitHours: 24 }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error);
    router.push(`/leagues/${data.league.id}/draft`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="border border-field-700 bg-field-900/50 rounded-md p-6 space-y-4">
      <h2 className="font-display uppercase text-chalk">Start a league</h2>
      <TextField label="League name" value={name} onChange={setName} />
      <TextField label="Your team name" value={teamName} onChange={setTeamName} />
      <label className="block">
        <span className="text-xs font-mono uppercase tracking-widest text-chalk/50">Draft style</span>
        <select
          value={draftType}
          onChange={(e) => setDraftType(e.target.value as "slow" | "live_snake")}
          className="mt-1 w-full bg-field-950 border border-field-700 rounded-sm px-3 py-2 text-chalk"
        >
          <option value="slow">Slow draft — 24h per pick, emailed when it's your turn</option>
          <option value="live_snake">Live snake draft — everyone picks in one sitting</option>
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-mono uppercase tracking-widest text-chalk/50">
          Teams per roster: {rosterSize}
        </span>
        <input
          type="range"
          min={3}
          max={10}
          value={rosterSize}
          onChange={(e) => setRosterSize(Number(e.target.value))}
          className="mt-2 w-full accent-clock-amber"
        />
      </label>
      {error && <p className="text-clock-red text-sm">{error}</p>}
      <button
        disabled={loading}
        className="w-full rounded-sm bg-clock-amber text-field-950 font-display uppercase tracking-wide py-2.5 hover:bg-brass transition-colors disabled:opacity-50"
      >
        {loading ? "Creating…" : "Create league"}
      </button>
    </form>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-mono uppercase tracking-widest text-chalk/50">{label}</span>
      <input
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full bg-field-950 border border-field-700 rounded-sm px-3 py-2 text-chalk focus:outline-none focus:border-clock-amber"
      />
    </label>
  );
}
