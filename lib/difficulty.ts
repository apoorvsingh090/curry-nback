import type { DifficultyMode, NValue } from "./types";

export interface DifficultyConfig {
  mode: DifficultyMode;
  label: string;
  n: NValue;
  displayDurationMs: number;
  /** How many ingredients the sequence may draw from. */
  poolSize: number;
  /** Plain-language explanation used by the briefing and voice narration. */
  description: string;
}

export const DIFFICULTIES: Record<DifficultyMode, DifficultyConfig> = {
  easy: {
    mode: "easy",
    label: "Easy",
    n: 1,
    displayDurationMs: 3000,
    poolSize: 4,
    description: "Look back one card.",
  },
  medium: {
    mode: "medium",
    label: "Medium",
    n: 2,
    displayDurationMs: 2500,
    poolSize: 6,
    description: "Look back two cards.",
  },
  hard: {
    mode: "hard",
    label: "Hard",
    n: 3,
    displayDurationMs: 2000,
    poolSize: 8,
    description: "Look back three cards.",
  },
};

export const DIFFICULTY_ORDER: DifficultyMode[] = ["easy", "medium", "hard"];

/** Number of cards in one session. */
export const TRIALS_PER_SESSION = 25;

/** Pause between cards, in ms. */
export const INTER_TRIAL_GAP_MS = 500;

/** Accuracy required on a mode to unlock the next one. */
export const UNLOCK_ACCURACY = 0.8;

export function difficultyFor(mode: DifficultyMode): DifficultyConfig {
  return DIFFICULTIES[mode];
}

export function nextMode(mode: DifficultyMode): DifficultyMode | null {
  const idx = DIFFICULTY_ORDER.indexOf(mode);
  if (idx < 0 || idx >= DIFFICULTY_ORDER.length - 1) return null;
  return DIFFICULTY_ORDER[idx + 1];
}
