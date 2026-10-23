import type { Ingredient, SequenceItem } from "./types";

/** Every session contains at least this many match trials. */
export const MIN_MATCHES_PER_SESSION = 5;

/**
 * Generates an N-back sequence.
 *
 * Invariant (acceptance test, spec §7): for every i >= n,
 *   seq[i].cardId === seq[i - n].cardId   <=>   seq[i].isMatch
 *
 * Match trials are sampled from the eligible positions at ~30%; the set is
 * then topped up to `MIN_MATCHES_PER_SESSION` so a session never plays out
 * with no targets at all (QA O-4).
 */
export function generateSequence(
  length: number,
  n: number,
  pool: Ingredient[],
  matchProbability = 0.3,
  random: () => number = Math.random,
  minimumMatches: number = MIN_MATCHES_PER_SESSION
): SequenceItem[] {
  const seq: SequenceItem[] = [];

  if (pool.length === 0) {
    throw new Error("generateSequence requires a non-empty ingredient pool");
  }

  /* Sample which eligible trials are matches. */
  const matchPositions = new Set<number>();
  for (let i = n; i < length; i++) {
    if (random() < matchProbability) matchPositions.add(i);
  }

  /* Top up so the session always has something to catch. */
  const eligible: number[] = [];
  for (let i = n; i < length; i++) eligible.push(i);
  while (
    matchPositions.size < minimumMatches &&
    matchPositions.size < eligible.length
  ) {
    const candidate = eligible[Math.floor(random() * eligible.length)];
    matchPositions.add(candidate);
  }

  /* Fill every trial, guaranteeing card equality iff it was chosen as a match. */
  for (let i = 0; i < length; i++) {
    const canMatch = i >= n;
    const isMatch = canMatch && matchPositions.has(i);

    if (isMatch) {
      seq.push({ cardId: seq[i - n].cardId, isMatch: true });
    } else {
      // Pick a card that is NOT equal to seq[i-n] so we never create an
      // accidental match.
      const forbidden = canMatch ? seq[i - n].cardId : null;
      const candidates = pool.filter((p) => p.id !== forbidden);
      seq.push({
        cardId: candidates[Math.floor(random() * candidates.length)].id,
        isMatch: false,
      });
    }
  }

  return seq;
}
