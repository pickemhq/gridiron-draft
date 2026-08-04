"use client";

import { useEffect, useState } from "react";

export default function CountdownTimer({ deadline }: { deadline: string | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!deadline) return <span className="scoreboard-digit text-2xl text-chalk/40">LIVE</span>;

  const msLeft = new Date(deadline).getTime() - now;
  const isLate = msLeft <= 0;
  const abs = Math.abs(msLeft);
  const h = Math.floor(abs / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  const s = Math.floor((abs % 60_000) / 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <span className={`scoreboard-digit text-2xl ${isLate ? "text-clock-red" : "text-clock-amber"}`}>
      {isLate && "-"}
      {pad(h)}:{pad(m)}:{pad(s)}
    </span>
  );
}
