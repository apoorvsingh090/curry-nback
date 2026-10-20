import type { Trial, TrialOutcome } from "./types";

export const POINTS = {
  correctMatch: 100,
  correctRejection: 50,
  falseAlarm: -50,
  miss: -50,
} as const;

/**
 * Resolves a single trial given the ground truth and whether the player tapped.
 */
export function resolveTrial(
  isMatch: boolean,
  playerTapped: boolean
): { correct: boolean; outcome: TrialOutcome; points: number } {
  if (isMatch && playerTapped) {
    return { correct: true, outcome: "correct-match", points: POINTS.correctMatch };
  }
  if (!isMatch && playerTapped) {
    return { correct: false, outcome: "false-alarm", points: POINTS.falseAlarm };
  }
  if (isMatch && !playerTapped) {
    return { correct: false, outcome: "miss", points: POINTS.miss };
  }
  return { correct: true, outcome: "correct-rejection", points: POINTS.correctRejection };
}

/**
 * Session accuracy = (correct matches + correct rejections) / total trials.
 */
export function computeAccuracy(trials: Trial[]): number {
  if (trials.length === 0) return 0;
  const correct = trials.filter((t) => t.correct).length;
  return correct / trials.length;
}

/**
 * Final Brain Score = clamp(accuracy * 100, 0, 100).
 */
export function computeBrainScore(accuracy: number): number {
  return Math.min(100, Math.max(0, accuracy * 100));
}

export function computePoints(trials: Trial[]): number {
  return trials.reduce((sum, t) => sum + t.points, 0);
}

export function countMatchesCaught(trials: Trial[]): number {
  return trials.filter((t) => t.outcome === "correct-match").length;
}

export function countFalseAlarms(trials: Trial[]): number {
  return trials.filter((t) => t.outcome === "false-alarm").length;
}

export function countMisses(trials: Trial[]): number {
  return trials.filter((t) => t.outcome === "miss").length;
}

/** Human friendly reaction time, in ms. Null when the player never tapped. */
export function averageReactionTime(trials: Trial[]): number | null {
  const rts = trials
    .map((t) => t.reactionTimeMs)
    .filter((rt): rt is number => typeof rt === "number" && rt >= 0);
  if (rts.length === 0) return null;
  return Math.round(rts.reduce((a, b) => a + b, 0) / rts.length);
}
