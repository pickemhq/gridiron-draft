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

async function main() {
  const year = new Date().getFullYear();

  const teamsRes = await fetch("https://api.collegefootballdata.com/teams/fbs", {
    headers: cfbdHeaders,
  });
  const teams: CfbdTeam[] = await teamsRes.json();

  const pollRes = await fetch(
    `https://api.collegefootballdata.com/rankings?year=${year}&seasonType=regular`,
    { headers: cfbdHeaders }
  );
  const pollWeeks = await pollRes.json();
  const latestPoll = pollWeeks?.[pollWeeks.length - 1];
  const apPoll: CfbdPollTeam[] =
    latestPoll?.polls?.find((p: { poll: string }) => p.poll === "AP Top 25")?.ranks ?? [];
  const rankBySchool = new Map(apPoll.map((t) => [t.school, t.rank]));

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
