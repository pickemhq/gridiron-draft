"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function LeagueTabs({ leagueId }: { leagueId: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/leagues/${leagueId}/draft`, label: "Draft" },
    { href: `/leagues/${leagueId}/roster`, label: "Rosters" },
    { href: `/leagues/${leagueId}/scoreboard`, label: "Scoreboard" },
  ];

  return (
    <div className="border-b border-field-700 bg-field-900/40">
      <div className="mx-auto max-w-6xl px-6 flex gap-6">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`py-3 text-sm font-mono uppercase tracking-widest border-b-2 transition-colors ${
                active ? "border-clock-amber text-chalk" : "border-transparent text-chalk/50 hover:text-chalk"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
