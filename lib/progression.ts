import { DIFFICULTY_ORDER, UNLOCK_ACCURACY } from "./difficulty";
import type { DifficultyMode, Session } from "./types";

/**
 * Unlock rules (spec §3.2):
 *  - Easy is always available.
 *  - Medium unlocks at >= 80% accuracy on Easy.
 *  - Hard unlocks at >= 80% accuracy on Medium.
 */
export function evaluateUnlockedMode(sessions: Session[]): DifficultyMode {
  let unlocked: DifficultyMode = "easy";

  for (let i = 1; i < DIFFICULTY_ORDER.length; i++) {
    const mode = DIFFICULTY_ORDER[i];
    const previousMode = DIFFICULTY_ORDER[i - 1];
    const qualifiedPrevious = sessions.some(
      (s) => s.mode === previousMode && s.accuracy >= UNLOCK_ACCURACY
    );
    if (!qualifiedPrevious) break;
    unlocked = mode;
  }

  return unlocked;
}

export function isModeUnlocked(mode: DifficultyMode, unlockedMode: DifficultyMode): boolean {
  return (
    DIFFICULTY_ORDER.indexOf(mode) <= DIFFICULTY_ORDER.indexOf(unlockedMode)
  );
}

/** True when `after` unlocks more than `before` (a strictly higher mode). */
export function isHigherMode(before: DifficultyMode, after: DifficultyMode): boolean {
  return DIFFICULTY_ORDER.indexOf(after) > DIFFICULTY_ORDER.indexOf(before);
}
