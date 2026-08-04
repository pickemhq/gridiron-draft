import type { ScoringSettings, WeeklyStats } from "@/types/database";

/**
 * Stat-based fantasy points for a single team-week: yardage, TDs, and
 * turnover margin — the "fantasy-style stats" half of the request.
 */
export function calculateStatPoints(stats: WeeklyStats, settings: ScoringSettings): number {
  const yardagePoints = stats.total_yards / settings.yards_per_point;
  const tdPoints = (stats.passing_tds + stats.rushing_tds) * settings.td_points;
  const turnoverPoints =
    stats.turnovers_forced * settings.turnover_forced_points +
    stats.turnovers_committed * settings.turnover_committed_points;

  return round2(yardagePoints + tdPoints + turnoverPoints);
}

/**
 * Win bonus, scaled by how much better the opponent was ranked than you —
 * the "beat a better team, get more points" half of the request.
 *
 * Rank numbers: 1 = best team in the country. Unranked teams are treated as
 * `unranked_rank_value` (default 60) so an unranked team beating a ranked
 * team still earns some upset bonus, and an unranked-vs-unranked game just
 * pays the base win points.
 */
export function calculateWinBonus(
  result: WeeklyStats["result"],
  ownRank: number | null,
  opponentRank: number | null,
  settings: ScoringSettings
): number {
  if (result !== "W") return result === "L" ? settings.loss_base_points : 0;

  const ownValue = ownRank ?? settings.unranked_rank_value;
  const opponentValue = opponentRank ?? settings.unranked_rank_value;

  // Lower rank number is better, so a tougher opponent has a *smaller*
  // opponentValue. quality gap is 0 if you beat a worse/equal team.
  const qualityGap = Math.max(0, ownValue - opponentValue);

  return round2(settings.win_base_points + qualityGap * settings.upset_multiplier);
}

export function calculateWeekTotal(
  stats: WeeklyStats,
  settings: ScoringSettings
): { statPoints: number; winBonusPoints: number; total: number } {
  const statPoints = calculateStatPoints(stats, settings);
  const winBonusPoints = calculateWinBonus(
    stats.result,
    stats.team_rank_at_kickoff,
    stats.opponent_rank_at_kickoff,
    settings
  );
  return { statPoints, winBonusPoints, total: round2(statPoints + winBonusPoints) };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
