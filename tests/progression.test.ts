import { describe, expect, it } from "vitest";
import { evaluateUnlockedMode, isModeUnlocked } from "@/lib/progression";
import { DIFFICULTIES, DIFFICULTY_ORDER } from "@/lib/difficulty";
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
  });

  it("reports which modes are available", () => {
    expect(isModeUnlocked("easy", "easy")).toBe(true);
    expect(isModeUnlocked("medium", "easy")).toBe(false);
    expect(isModeUnlocked("hard", "medium")).toBe(false);
    expect(isModeUnlocked("hard", "hard")).toBe(true);
  });

  it("keeps the difficulty order", () => {
    expect(DIFFICULTY_ORDER).toEqual(["easy", "medium", "hard"]);
  });
});
