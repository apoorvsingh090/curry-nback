export type DifficultyMode = "easy" | "medium" | "hard";

export type NValue = 1 | 2 | 3;

export interface Ingredient {
  id: string;
  emoji: string;
  label: string;
}

export interface SequenceItem {
  cardId: string;
  isMatch: boolean;
}

export type TrialOutcome =
  | "correct-match"
  | "correct-rejection"
  | "false-alarm"
  | "miss";

export interface Trial {
  /** 0-based index within the session. */
  index: number;
  /** Ingredient id shown for this trial. */
  cardId: string;
  /** Ground truth: was this card identical to the card N steps earlier? */
  isMatch: boolean;
  /** Did the player tap MATCH? */
  playerTapped: boolean;
  /** Was the response correct (hit vs miss, false alarm vs correct rejection)? */
  correct: boolean;
  /** Time from card appearing to the tap. Null when no tap happened. */
  reactionTimeMs: number | null;
  /** Display duration used for this specific trial. */
  displayDurationMs: number;
  /** Points awarded (+100 / +50 / -50). */
  points: number;
  /** How this trial resolved. */
  outcome: TrialOutcome;
}

export type AdjustmentDirection = "faster" | "slower" | "none";

export interface AdaptiveAdjustment {
  /** Index of the trial after which the adjustment was made. */
  afterTrialIndex: number;
  /** Rolling accuracy over the window that triggered the adjustment. */
  rollingAccuracy: number;
  previousDurationMs: number;
  newDurationMs: number;
  direction: AdjustmentDirection;
}

export interface Session {
  /** uuid */
  id: string;
  /** epoch ms */
  startedAt: number;
  /** epoch ms */
  endedAt: number;
  mode: DifficultyMode;
  n: NValue;
  trials: Trial[];
  /** 0-100 composite score. */
  brainScore: number;
  /** 0-1 */
  accuracy: number;
  displayDurationStartMs: number;
  displayDurationEndMs: number;
  /** Total points (100 / 50 / -50 per trial). */
  points: number;
  /** Number of true matches the player caught. */
  matchesCaught: number;
  /** Every adaptive change made during the session. */
  adjustments: AdaptiveAdjustment[];
}

export interface Settings {
  /** Voice narration + spoken feedback enabled. */
  voiceEnabled: boolean;
  /** The player has seen the pre-game briefing at least once. */
  briefingSeen: boolean;
  /** Highest difficulty unlocked so far. */
  unlockedMode: DifficultyMode;
  /** Last difficulty played; persisted across sessions. */
  lastMode: DifficultyMode;
}
