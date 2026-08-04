import type { LeagueMember } from "@/types/database";

/**
 * Standard snake order: round 1 goes 1→N, round 2 goes N→1, etc. Used for
 * both draft types — 'live_snake' plays it in real time, 'slow' plays the
 * same order but gives each pick up to `pick_time_limit_hours` and emails
 * the person on the clock (see supabase/functions/draft-reminder).
 */
export function draftOrderForRound(members: LeagueMember[], round: number): LeagueMember[] {
  const sorted = [...members].sort((a, b) => (a.draft_position ?? 0) - (b.draft_position ?? 0));
  return round % 2 === 1 ? sorted : [...sorted].reverse();
}

/** Given the overall pick number (1-indexed), who's on the clock. */
export function memberForPick(members: LeagueMember[], rosterSize: number, pickNumber: number): {
  round: number;
  member: LeagueMember;
} | null {
  const n = members.length;
  if (n === 0 || pickNumber > n * rosterSize) return null;

  const round = Math.ceil(pickNumber / n);
  const indexInRound = (pickNumber - 1) % n;
  const order = draftOrderForRound(members, round);
  return { round, member: order[indexInRound] };
}

export function isDraftComplete(members: LeagueMember[], rosterSize: number, pickNumber: number) {
  return pickNumber > members.length * rosterSize;
}
