import { describe, expect, it } from "vitest";
import {
  ADAPTIVE_STEP_MS,
  ADAPTIVE_WINDOW,
  MAX_DISPLAY_MS,
  MIN_DISPLAY_MS,
  applyAdaptiveStep,
  nextDisplayDuration,
  rollingAccuracy,
} from "@/lib/adaptive";
import type { Trial } from "@/lib/types";

/** Builds `count` trials where the first `correctCount` are correct. */
function syntheticTrials(count: number, correctCount: number): Trial[] {
  return Array.from({ length: count }, (_, index) => ({
    index,
    cardId: "tomato",
    isMatch: index % 2 === 0,
    playerTapped: index % 2 === 0,
    correct: index < correctCount,
    reactionTimeMs: index < correctCount ? 500 : null,
    displayDurationMs: 2500,
    points: index < correctCount ? 100 : -50,
    outcome: index < correctCount ? "correct-match" : "miss",
  }));
}

describe("rolling accuracy", () => {
  it("uses only the last five trials", () => {
    const firstFive = syntheticTrials(5, 5);
    const lastFive = syntheticTrials(5, 0).map((trial, index) => ({
      ...trial,
      index: 5 + index,
    }));
    const trials = [...firstFive, ...lastFive];

    // The whole session is 50% correct, but the window only sees the last 5.
    expect(rollingAccuracy(trials)).toBe(0);

    const reversed = [...lastFive, ...firstFive].map((trial, index) => ({
      ...trial,
      index,
    }));
    expect(rollingAccuracy(reversed)).toBe(1);
  });

  it("is 0 for an empty window", () => {
    expect(rollingAccuracy([])).toBe(0);
  });

  it("returns a fraction between 0 and 1", () => {
    expect(rollingAccuracy(syntheticTrials(5, 0))).toBe(0);
    expect(rollingAccuracy(syntheticTrials(5, 5))).toBe(1);
  });
});

describe("nextDisplayDuration", () => {
  it("reduces the duration by 200ms at 80% accuracy or above", () => {
    expect(nextDisplayDuration(2500, 0.8)).toBe(2500 - ADAPTIVE_STEP_MS);
    expect(nextDisplayDuration(2500, 1)).toBe(2500 - ADAPTIVE_STEP_MS);
  });

  it("increases the duration by 200ms at 40% accuracy or below", () => {
    expect(nextDisplayDuration(2500, 0.4)).toBe(2500 + ADAPTIVE_STEP_MS);
    expect(nextDisplayDuration(2500, 0)).toBe(2500 + ADAPTIVE_STEP_MS);
  });

  it("leaves the duration alone in between", () => {
    expect(nextDisplayDuration(2500, 0.6)).toBe(2500);
    expect(nextDisplayDuration(2500, 0.79)).toBe(2500);
    expect(nextDisplayDuration(2500, 0.41)).toBe(2500);
  });

  it("never goes below the 1200ms floor or above the 4000ms ceiling", () => {
    expect(nextDisplayDuration(1300, 1)).toBe(MIN_DISPLAY_MS);
    expect(nextDisplayDuration(3900, 0)).toBe(MAX_DISPLAY_MS);
    expect(nextDisplayDuration(1200, 1)).toBe(MIN_DISPLAY_MS);
    expect(nextDisplayDuration(4000, 0)).toBe(MAX_DISPLAY_MS);
  });
});

describe("applyAdaptiveStep", () => {
  it("speeds up after five perfect trials and records the adjustment", () => {
    const trials = syntheticTrials(ADAPTIVE_WINDOW, ADAPTIVE_WINDOW);
    const { durationMs, adjustment } = applyAdaptiveStep(2500, trials);

    expect(durationMs).toBe(2300);
    expect(adjustment).not.toBeNull();
    expect(adjustment?.direction).toBe("faster");
    expect(adjustment?.previousDurationMs).toBe(2500);
    expect(adjustment?.newDurationMs).toBe(2300);
    expect(adjustment?.rollingAccuracy).toBe(1);
    expect(adjustment?.afterTrialIndex).toBe(ADAPTIVE_WINDOW - 1);
  });

  it("slows down after five poor trials", () => {
    const trials = syntheticTrials(ADAPTIVE_WINDOW, 0);
    const { durationMs, adjustment } = applyAdaptiveStep(2500, trials);

    expect(durationMs).toBe(2700);
    expect(adjustment?.direction).toBe("slower");
  });

  it("does nothing when accuracy is in the middle band", () => {
    const trials = syntheticTrials(ADAPTIVE_WINDOW, 3);
    const { durationMs, adjustment } = applyAdaptiveStep(2500, trials);

    expect(durationMs).toBe(2500);
    expect(adjustment).toBeNull();
  });

  it("keeps stepping down across a long perfect run", () => {
    let duration = 2500;
    for (let round = 0; round < 4; round++) {
      const trials = syntheticTrials(ADAPTIVE_WINDOW, ADAPTIVE_WINDOW);
      const result = applyAdaptiveStep(duration, trials);
      duration = result.durationMs;
    }
    expect(duration).toBe(2500 - 4 * ADAPTIVE_STEP_MS);
  });
});
