/**
 * Pulls the full FBS team list (with logos + conferences) and the current
 * AP poll from the free CollegeFootballData API, then upserts them into
 * the `cfb_teams` table.
 *
 * Setup:
 *   1. Get a free API key at https://collegefootballdata.com
 *   2. Add CFBD_API_KEY, NEXT_PUBLIC_SUPABASE_URL and
 *      SUPABASE_SERVICE_ROLE_KEY to .env.local
 *   3. npm run seed:teams
 *
 * Re-run any time — it upserts on `school`, so it's safe on a schedule
 * (e.g. weekly, to refresh AP rank) via a GitHub Action / Supabase cron.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const CFBD_KEY = process.env.CFBD_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!CFBD_KEY || !SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing env vars. Need CFBD_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const cfbdHeaders = { Authorization: `Bearer ${CFBD_KEY}` };

type CfbdTeam = {
  school: string;
  mascot: string | null;
  conference: string | null;
  classification: string;
  logos: string[] | null;
};

type CfbdPollTeam = { school: string; rank: number };

/**
 * Finds the best available AP Top 25 poll for a season. Rather than
 * guessing at CFBD's season-type labels (which turned out to be
 * unreliable — "preseason" wasn't matching real data), this just takes
 * whatever poll exists with the highest week number for the current year,
 * regardless of label. Only falls back to last season's final poll if
 * there's truly nothing published yet for the current year.
 */
async function fetchLatestApPoll(year: number): Promise<CfbdPollTeam[]> {
  const res = await fetch(`https://api.collegefootballdata.com/rankings?year=${year}`, {
    headers: cfbdHeaders,
  });
  const weeks: { week: number; polls: { poll: string; ranks: CfbdPollTeam[] }[] }[] = await res.json();

  if (weeks.length > 0) {
    const latest = weeks.reduce((a, b) => (b.week > a.week ? b : a));
    const ranks = latest.polls.find((p) => p.poll === "AP Top 25")?.ranks;
    if (ranks && ranks.length > 0) return ranks;
  }

  // Nothing published yet for this year at all — fall back to last season's final poll.
  const prevRes = await fetch(`https://api.collegefootballdata.com/rankings?year=${year - 1}`, {
    headers: cfbdHeaders,
  });
  const prevWeeks: { week: number; polls: { poll: string; ranks: CfbdPollTeam[] }[] }[] = await prevRes.json();
  if (prevWeeks.length === 0) return [];
  const latestPrev = prevWeeks.reduce((a, b) => (b.week > a.week ? b : a));
  return latestPrev.polls.find((p) => p.poll === "AP Top 25")?.ranks ?? [];
}

async function main() {
  const year = new Date().getFullYear();

  const teamsRes = await fetch("https://api.collegefootballdata.com/teams/fbs", {
    headers: cfbdHeaders,
  });
  const teams: CfbdTeam[] = await teamsRes.json();

  const rankBySchool = new Map((await fetchLatestApPoll(year)).map((t) => [t.school, t.rank]));

  const rows = teams
    .filter((t) => t.classification === "fbs")
    .map((t) => ({
      school: t.school,
      mascot: t.mascot,
      conference: t.conference,
      logo_url: t.logos?.[0] ?? null,
      ap_rank: rankBySchool.get(t.school) ?? null,
    }));

  console.log(`Upserting ${rows.length} FBS teams...`);

  const { error } = await supabase.from("cfb_teams").upsert(rows, { onConflict: "school" });
  if (error) {
    console.error("Upsert failed:", error);
    process.exit(1);
  }
  console.log("Done.");
}

main();