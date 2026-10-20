import { describe, expect, it } from "vitest";
import { generateSequence } from "@/lib/sequence";
import { INGREDIENTS } from "@/lib/ingredients";

/** Deterministic PRNG so every run is reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("generateSequence", () => {
  it("matches the ground truth exactly for every trial (spec §7 acceptance test)", () => {
    for (let seed = 0; seed < 200; seed++) {
      const random = mulberry32(seed);
      const n = 1 + (seed % 3);
      const pool = INGREDIENTS.slice(0, 4 + (seed % 5));
      const seq = generateSequence(25, n, pool, 0.3, random);

      for (let i = n; i < seq.length; i++) {
        const isMatch = seq[i].cardId === seq[i - n].cardId;
        expect(seq[i].isMatch, `seed ${seed}, trial ${i}`).toBe(isMatch);
      }
    }
  });

  it("never marks the first n cards as matches", () => {
    for (let seed = 0; seed < 50; seed++) {
      const seq = generateSequence(25, 3, INGREDIENTS, 0.3, mulberry32(seed));
      for (let i = 0; i < 3; i++) {
        expect(seq[i].isMatch).toBe(false);
      }
    }
  });

  it("only draws from the supplied ingredient pool", () => {
    const pool = INGREDIENTS.slice(0, 4);
    const ids = new Set(pool.map((i) => i.id));
    const seq = generateSequence(25, 2, pool, 0.3, mulberry32(7));
    for (const item of seq) {
      expect(ids.has(item.cardId)).toBe(true);
    }
  });

  it("keeps the match rate close to 30% of eligible trials", () => {
    let matches = 0;
    let eligible = 0;
    for (let seed = 0; seed < 100; seed++) {
      const seq = generateSequence(25, 2, INGREDIENTS, 0.3, mulberry32(seed));
      for (let i = 2; i < seq.length; i++) {
        eligible += 1;
        if (seq[i].isMatch) matches += 1;
      }
    }
    const rate = matches / eligible;
    expect(rate).toBeGreaterThan(0.2);
    expect(rate).toBeLessThan(0.4);
  });

  it("works for 1-back, 2-back and 3-back with the same invariant", () => {
    for (const n of [1, 2, 3] as const) {
      const seq = generateSequence(25, n, INGREDIENTS, 0.3, mulberry32(n * 31));
      expect(seq).toHaveLength(25);
      for (let i = n; i < seq.length; i++) {
        expect(seq[i].isMatch).toBe(seq[i].cardId === seq[i - n].cardId);
      }
    }
  });

  it("throws when the ingredient pool is empty", () => {
    expect(() => generateSequence(25, 2, [], 0.3)).toThrow();
  });
});
