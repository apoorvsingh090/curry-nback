import type { AdaptiveAdjustment, Trial } from "./types";

/** Number of trials in the rolling window. */
export const ADAPTIVE_WINDOW = 5;

/** How much the display duration changes per adjustment. */
export const ADAPTIVE_STEP_MS = 200;

/** Fastest the card may be shown. */
export const MIN_DISPLAY_MS = 1200;

/** Slowest the card may be shown. */
export const MAX_DISPLAY_MS = 4000;

export const FAST_ACCURACY = 0.8;
export const SLOW_ACCURACY = 0.4;

/**
 * Rolling accuracy over the last ADAPTIVE_WINDOW trials.
 */
export function rollingAccuracy(trials: Trial[]): number {
  const window = trials.slice(-ADAPTIVE_WINDOW);
  if (window.length === 0) return 0;
  const correct = window.filter((t) => t.correct).length;
  return correct / window.length;
}

/**
 * Given the current display duration and a rolling accuracy, return the next
 * display duration. Fast players get a shorter window; struggling players get
 * a longer one.
 */
export function nextDisplayDuration(currentMs: number, accuracy: number): number {
  if (accuracy >= FAST_ACCURACY) {
    return clampDuration(currentMs - ADAPTIVE_STEP_MS);
  }
  if (accuracy <= SLOW_ACCURACY) {
    return clampDuration(currentMs + ADAPTIVE_STEP_MS);
  }
  return clampDuration(currentMs);
}

export function clampDuration(ms: number): number {
  return Math.min(MAX_DISPLAY_MS, Math.max(MIN_DISPLAY_MS, ms));
}

/**
 * Applies one adaptive step to the running session and records the change.
 * Returns the new duration plus a log entry (null when nothing changed).
 */
export function applyAdaptiveStep(
  currentMs: number,
  trials: Trial[]
): { durationMs: number; adjustment: AdaptiveAdjustment | null } {
  const accuracy = rollingAccuracy(trials);
  const durationMs = nextDisplayDuration(currentMs, accuracy);

  if (durationMs === currentMs) {
    return { durationMs, adjustment: null };
  }

  return {
    durationMs,
    adjustment: {
      afterTrialIndex: trials.length - 1,
      rollingAccuracy: accuracy,
      previousDurationMs: currentMs,
      newDurationMs: durationMs,
      direction: durationMs < currentMs ? "faster" : "slower",
    },
  };
}
