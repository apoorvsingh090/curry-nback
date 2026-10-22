import { describe, expect, it } from "vitest";
import {
  evaluateUnlockedMode,
  isHigherMode,
  isModeUnlocked,
} from "@/lib/progression";
import {
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  nextMode,
} from "@/lib/difficulty";
import type { DifficultyMode, Session } from "@/lib/types";

function session(mode: DifficultyMode, accuracy: number, startedAt = 0): Session {
  return {
    id: `${mode}-${accuracy}-${startedAt}`,
    startedAt,
    endedAt: startedAt + 1000,
    mode,
    n: DIFFICULTIES[mode].n,
    trials: [],
    brainScore: Math.round(accuracy * 100),
    accuracy,
    displayDurationStartMs: DIFFICULTIES[mode].displayDurationMs,
    displayDurationEndMs: DIFFICULTIES[mode].displayDurationMs,
    points: 0,
    matchesCaught: 0,
    adjustments: [],
  };
}

describe("difficulty configuration", () => {
  it("matches the spec table", () => {
    expect(DIFFICULTIES.easy.n).toBe(1);
    expect(DIFFICULTIES.easy.displayDurationMs).toBe(3000);
    expect(DIFFICULTIES.easy.poolSize).toBe(4);

    expect(DIFFICULTIES.medium.n).toBe(2);
    expect(DIFFICULTIES.medium.displayDurationMs).toBe(2500);
    expect(DIFFICULTIES.medium.poolSize).toBe(6);

    expect(DIFFICULTIES.hard.n).toBe(3);
    expect(DIFFICULTIES.hard.displayDurationMs).toBe(2000);
    expect(DIFFICULTIES.hard.poolSize).toBe(8);
  });

  it("reaches 9-back in nine levels", () => {
    expect(DIFFICULTY_ORDER).toHaveLength(9);
    DIFFICULTY_ORDER.forEach((mode, index) => {
      expect(DIFFICULTIES[mode].n).toBe(index + 1);
      expect(DIFFICULTIES[mode].poolSize).toBeLessThanOrEqual(8);
      expect(DIFFICULTIES[mode].displayDurationMs).toBeGreaterThanOrEqual(2000);
    });
    expect(DIFFICULTIES.level9.label).toBe("Level 9");
    expect(DIFFICULTIES.level9.description).toBe("Look back nine cards.");
  });
});

describe("unlock rules", () => {
  it("always unlocks easy", () => {
    expect(evaluateUnlockedMode([])).toBe("easy");
  });

  it("unlocks medium at 80% accuracy on easy", () => {
    expect(evaluateUnlockedMode([session("easy", 0.79)])).toBe("easy");
    expect(evaluateUnlockedMode([session("easy", 0.8)])).toBe("medium");
  });

  it("unlocks hard at 80% accuracy on medium", () => {
    const sessions = [session("easy", 0.9), session("medium", 0.8)];
    expect(evaluateUnlockedMode(sessions)).toBe("hard");
  });

  it("does not skip a level", () => {
    const sessions = [session("hard", 1)];
    expect(evaluateUnlockedMode(sessions)).toBe("easy");
    const single = [session("level9", 1)];
    expect(evaluateUnlockedMode(single)).toBe("easy");
  });

  it("walks the whole ladder one qualifying round at a time", () => {
    let sessions: Session[] = [];
    let unlocked = evaluateUnlockedMode(sessions);
    for (const mode of DIFFICULTY_ORDER) {
      sessions = [...sessions, session(mode, 0.8)];
      unlocked = evaluateUnlockedMode(sessions);
      expect(unlocked).toBe(nextMode(mode) ?? mode);
    }
    expect(unlocked).toBe("level9");
  });

  it("reports which modes are available", () => {
    expect(isModeUnlocked("easy", "easy")).toBe(true);
    expect(isModeUnlocked("medium", "easy")).toBe(false);
    expect(isModeUnlocked("hard", "medium")).toBe(false);
    expect(isModeUnlocked("hard", "hard")).toBe(true);
    expect(isModeUnlocked("level4", "hard")).toBe(false);
    expect(isModeUnlocked("level9", "level9")).toBe(true);
  });

  it("keeps the difficulty order", () => {
    expect(DIFFICULTY_ORDER).toEqual([
      "easy",
      "medium",
      "hard",
      "level4",
      "level5",
      "level6",
      "level7",
      "level8",
      "level9",
    ]);
  });

  it("detects a newly unlocked difficulty", () => {
    expect(isHigherMode("easy", "easy")).toBe(false);
    expect(isHigherMode("easy", "medium")).toBe(true);
    expect(isHigherMode("medium", "medium")).toBe(false);
    expect(isHigherMode("medium", "hard")).toBe(true);
    expect(isHigherMode("hard", "easy")).toBe(false);
    expect(isHigherMode("level8", "level9")).toBe(true);
    expect(isHigherMode("level9", "level9")).toBe(false);
  });
});
