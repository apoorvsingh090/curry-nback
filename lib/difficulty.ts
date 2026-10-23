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

const NUMBER_WORDS = [
  "",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
] as const;

export function numberWord(n: NValue): string {
  return NUMBER_WORDS[n];
}

function configFor(
  n: NValue,
  label: string,
  displayDurationMs: number,
  poolSize: number,
  mode: DifficultyMode
): DifficultyConfig {
  return {
    mode,
    label,
    n,
    displayDurationMs,
    poolSize,
    description: `Look back ${NUMBER_WORDS[n]} ${n === 1 ? "card" : "cards"}.`,
  };
}

export const DIFFICULTIES: Record<DifficultyMode, DifficultyConfig> = {
  easy: configFor(1, "Easy", 3000, 4, "easy"),
  medium: configFor(2, "Medium", 2500, 6, "medium"),
  hard: configFor(3, "Hard", 2000, 8, "hard"),
  level4: configFor(4, "Level 4", 2000, 8, "level4"),
  level5: configFor(5, "Level 5", 2000, 8, "level5"),
  level6: configFor(6, "Level 6", 2000, 8, "level6"),
  level7: configFor(7, "Level 7", 2000, 8, "level7"),
  level8: configFor(8, "Level 8", 2000, 8, "level8"),
  level9: configFor(9, "Level 9", 2000, 8, "level9"),
};

export const DIFFICULTY_ORDER: DifficultyMode[] = [
  "easy",
  "medium",
  "hard",
  "level4",
  "level5",
  "level6",
  "level7",
  "level8",
  "level9",
];

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

export function previousMode(mode: DifficultyMode): DifficultyMode | null {
  const idx = DIFFICULTY_ORDER.indexOf(mode);
  if (idx <= 0) return null;
  return DIFFICULTY_ORDER[idx - 1];
}

/**
 * Parses a `?mode=` value (spec QA B-5): a valid key → that mode, a missing
 * value → Easy, anything else → null so the caller can redirect home.
 */
export function parseModeParam(raw: string | null): DifficultyMode | null {
  if (raw === null || raw === "") return "easy";
  return DIFFICULTY_ORDER.some((m) => m === raw) ? (raw as DifficultyMode) : null;
}
