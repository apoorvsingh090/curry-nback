import type { Ingredient, SequenceItem } from "./types";

/**
 * Generates an N-back sequence.
 *
 * Invariant (acceptance test, spec §7): for every i >= n,
 *   seq[i].cardId === seq[i - n].cardId   <=>   seq[i].isMatch
 */
export function generateSequence(
  length: number,
  n: number,
  pool: Ingredient[],
  matchProbability = 0.3,
  random: () => number = Math.random
): SequenceItem[] {
  const seq: SequenceItem[] = [];

  if (pool.length === 0) {
    throw new Error("generateSequence requires a non-empty ingredient pool");
  }

  for (let i = 0; i < length; i++) {
    let isMatch = false;
    let cardId: string;

    const canMatch = i >= n;
    const wantMatch = canMatch && random() < matchProbability;

    if (wantMatch) {
      cardId = seq[i - n].cardId;
      isMatch = true;
    } else {
      // Pick a card that is NOT equal to seq[i-n] so we never create an
      // accidental match.
      const forbidden = canMatch ? seq[i - n].cardId : null;
      const candidates = pool.filter((p) => p.id !== forbidden);
      cardId = candidates[Math.floor(random() * candidates.length)].id;
    }

    seq.push({ cardId, isMatch });
  }

  return seq;
}
