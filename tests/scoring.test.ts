import { describe, expect, it } from "vitest";
import {
  averageReactionTime,
  computeAccuracy,
  computeBrainScore,
  computePoints,
  countFalseAlarms,
  countMatchesCaught,
  countMisses,
  resolveTrial,
} from "@/lib/scoring";
import type { Trial, TrialOutcome } from "@/lib/types";

function trial(partial: Partial<Trial> & { index: number }): Trial {
  const isMatch = partial.isMatch ?? false;
  const playerTapped = partial.playerTapped ?? false;
  const resolved = resolveTrial(isMatch, playerTapped);
  return {
    cardId: "tomato",
    isMatch,
    playerTapped,
    correct: resolved.correct,
    reactionTimeMs: null,
    displayDurationMs: 2500,
    points: resolved.points,
    outcome: resolved.outcome,
    ...partial,
  };
}

describe("resolveTrial", () => {
  const cases: {
    name: string;
    isMatch: boolean;
    tapped: boolean;
    correct: boolean;
    outcome: TrialOutcome;
    points: number;
  }[] = [
    {
      name: "correct match tap",
      isMatch: true,
      tapped: true,
      correct: true,
      outcome: "correct-match",
      points: 100,
    },
    {
      name: "miss (no tap on a match)",
      isMatch: true,
      tapped: false,
      correct: false,
      outcome: "miss",
      points: -50,
    },
    {
      name: "false alarm (tap on a non-match)",
      isMatch: false,
      tapped: true,
      correct: false,
      outcome: "false-alarm",
      points: -50,
    },
    {
      name: "correct non-tap",
      isMatch: false,
      tapped: false,
      correct: true,
      outcome: "correct-rejection",
      points: 50,
    },
  ];

  it.each(cases)("$name", ({ isMatch, tapped, correct, outcome, points }) => {
    const result = resolveTrial(isMatch, tapped);
    expect(result.correct).toBe(correct);
    expect(result.outcome).toBe(outcome);
    expect(result.points).toBe(points);
  });
});

describe("session scoring", () => {
  it("computes accuracy as (correct matches + correct rejections) / total trials", () => {
    const trials = [
      trial({ index: 0, isMatch: true, playerTapped: true }),
      trial({ index: 1, isMatch: false, playerTapped: false }),
      trial({ index: 2, isMatch: true, playerTapped: false }),
      trial({ index: 3, isMatch: false, playerTapped: true }),
    ];
    expect(computeAccuracy(trials)).toBe(0.5);
  });

  it("returns 0 accuracy for an empty session", () => {
    expect(computeAccuracy([])).toBe(0);
  });

  it("maps accuracy to the Brain Score (0-100)", () => {
    expect(computeBrainScore(0)).toBe(0);
    expect(computeBrainScore(0.5)).toBe(50);
    expect(computeBrainScore(1)).toBe(100);
  });

  it("clamps the Brain Score into the 0-100 range", () => {
    expect(computeBrainScore(-1)).toBe(0);
    expect(computeBrainScore(2)).toBe(100);
  });

  it("sums the points of every trial", () => {
    const trials = [
      trial({ index: 0, isMatch: true, playerTapped: true }),
      trial({ index: 1, isMatch: false, playerTapped: false }),
      trial({ index: 2, isMatch: false, playerTapped: true }),
      trial({ index: 3, isMatch: true, playerTapped: false }),
    ];
    expect(computePoints(trials)).toBe(100 + 50 - 50 - 50);
  });

  it("counts matches caught, false alarms and misses", () => {
    const trials = [
      trial({ index: 0, isMatch: true, playerTapped: true }),
      trial({ index: 1, isMatch: true, playerTapped: false }),
      trial({ index: 2, isMatch: false, playerTapped: true }),
      trial({ index: 3, isMatch: false, playerTapped: false }),
    ];
    expect(countMatchesCaught(trials)).toBe(1);
    expect(countMisses(trials)).toBe(1);
    expect(countFalseAlarms(trials)).toBe(1);
  });

  it("averages reaction times and ignores trials without a tap", () => {
    const trials = [
      trial({ index: 0, isMatch: true, playerTapped: true, reactionTimeMs: 400 }),
      trial({ index: 1, isMatch: false, playerTapped: true, reactionTimeMs: 800 }),
      trial({ index: 2, isMatch: false, playerTapped: false, reactionTimeMs: null }),
    ];
    expect(averageReactionTime(trials)).toBe(600);
    expect(averageReactionTime([trial({ index: 0 })])).toBeNull();
  });
});
