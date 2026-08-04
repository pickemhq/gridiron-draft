"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RefreshScoresButton({ leagueId, seasonYear }: { leagueId: string; seasonYear: number }) {
  const router = useRouter();
  const [week, setWeek] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/scoring/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leagueId, week, seasonYear }),
    });
    const data = await res.json();
    setLoading(false);
    setMessage(res.ok ? `Scored ${data.teamsScored} teams for week ${week}` : data.error);
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={1}
        max={20}
        value={week}
        onChange={(e) => setWeek(Number(e.target.value))}
        className="w-16 bg-field-950 border border-field-700 rounded-sm px-2 py-1.5 text-chalk text-sm"
        aria-label="Week number"
      />
      <button
        onClick={refresh}
        disabled={loading}
        className="rounded-sm border border-brass text-brass text-sm px-4 py-1.5 hover:bg-brass hover:text-field-950 transition-colors disabled:opacity-50"
      >
        {loading ? "Refreshing…" : "Refresh scores"}
      </button>
      {message && <span className="text-xs text-chalk/50">{message}</span>}
    </div>
  );
}
