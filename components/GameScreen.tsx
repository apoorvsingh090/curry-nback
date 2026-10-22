"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import SpeakerToggle from "@/components/SpeakerToggle";
import { INGREDIENTS, ingredientById } from "@/lib/ingredients";
import {
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  INTER_TRIAL_GAP_MS,
  TRIALS_PER_SESSION,
} from "@/lib/difficulty";
import { generateSequence } from "@/lib/sequence";
import {
  computeAccuracy,
  computeBrainScore,
  computePoints,
  countMatchesCaught,
  resolveTrial,
} from "@/lib/scoring";
import { ADAPTIVE_WINDOW, applyAdaptiveStep } from "@/lib/adaptive";
import { isHigherMode, isModeUnlocked } from "@/lib/progression";
import { saveSession } from "@/lib/db";
import { playSfx, speak } from "@/lib/audio";
import { useLastSession, useSettings } from "@/lib/store";
import { uuid } from "@/lib/utils";
import type {
  AdaptiveAdjustment,
  DifficultyMode,
  Ingredient,
  SequenceItem,
  Session,
  Trial,
} from "@/lib/types";

type Phase = "starting" | "showing" | "gap" | "finished";

interface Feedback {
  id: number;
  kind: "good" | "soft";
  text: string;
  points: number;
}

export default function GameScreen() {
  const router = useRouter();
  const params = useSearchParams();

  const raw = params.get("mode");
  const mode: DifficultyMode = DIFFICULTY_ORDER.some((m) => m === raw)
    ? (raw as DifficultyMode)
    : "easy";
  const config = DIFFICULTIES[mode];

  const [card, setCard] = useState<Ingredient | null>(null);
  const [trialIndex, setTrialIndex] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const setLastSession = useLastSession((s) => s.setLastSession);

  const startedRef = useRef(false);
  const seqRef = useRef<SequenceItem[]>([]);
  const trialsRef = useRef<Trial[]>([]);
  const reactionRef = useRef<(number | null)[]>([]);
  const adjustmentsRef = useRef<AdaptiveAdjustment[]>([]);
  const durationRef = useRef(config.displayDurationMs);
  const indexRef = useRef(0);
  const answeredRef = useRef(false);
  const shownAtRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const phaseRef = useRef<Phase>("starting");
  const sessionStartRef = useRef(Date.now());
  const feedbackIdRef = useRef(0);

  const setPhaseBoth = useCallback((next: Phase) => {
    phaseRef.current = next;
  }, []);

  const handleTap = useCallback(() => {
    if (phaseRef.current !== "showing" || answeredRef.current) return;
    answeredRef.current = true;

    const index = indexRef.current;
    const reactionTimeMs = Math.max(
      0,
      Math.round(performance.now() - shownAtRef.current)
    );
    reactionRef.current[index] = reactionTimeMs;

    const item = seqRef.current[index];
    const { correct, points } = resolveTrial(item.isMatch, true);
    const voiceEnabled = useSettings.getState().voiceEnabled;

    feedbackIdRef.current += 1;
    setFeedback({
      id: feedbackIdRef.current,
      kind: correct ? "good" : "soft",
      text: correct ? "Nice!" : "Not quite",
      points,
    });

    playSfx(correct ? "correct" : "incorrect", voiceEnabled);
    speak(correct ? "Nice!" : "Not quite", voiceEnabled);

    const feedbackId = feedbackIdRef.current;
    window.setTimeout(() => {
      setFeedback((current) => (current?.id === feedbackId ? null : current));
    }, 600);
  }, []);

  /** Forgiving input: a tap in the lower 40% of the screen counts as MATCH. */
  const handleRootPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const y = event.clientY - rect.top;
      if (y >= rect.height * 0.6) handleTap();
    },
    [handleTap]
  );

  // Run the whole session loop. Everything it needs lives in refs, so the
  // effect runs exactly once.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    // A locked difficulty can still be reached through a hand-typed URL.
    if (!isModeUnlocked(mode, useSettings.getState().unlockedMode)) {
      router.replace("/");
      return;
    }

    const timers: number[] = [];
    timersRef.current = timers;

    const pool = INGREDIENTS.slice(0, config.poolSize);
    seqRef.current = generateSequence(TRIALS_PER_SESSION, config.n, pool, 0.3);
    reactionRef.current = new Array(TRIALS_PER_SESSION).fill(null);
    durationRef.current = config.displayDurationMs;
    sessionStartRef.current = Date.now();

    const finishSession = async () => {
      if (phaseRef.current === "finished") return;
      setPhaseBoth("finished");

      const trials = trialsRef.current;
      const accuracy = computeAccuracy(trials);
      const session: Session = {
        id: uuid(),
        startedAt: sessionStartRef.current,
        endedAt: Date.now(),
        mode,
        n: config.n,
        trials,
        brainScore: Math.round(computeBrainScore(accuracy)),
        accuracy,
        displayDurationStartMs: config.displayDurationMs,
        displayDurationEndMs: durationRef.current,
        points: computePoints(trials),
        matchesCaught: countMatchesCaught(trials),
        adjustments: adjustmentsRef.current,
      };

      setLastSession(session);
      playSfx("complete", useSettings.getState().voiceEnabled);

      const unlockedBefore = useSettings.getState().unlockedMode;
      let newlyUnlocked: DifficultyMode | null = null;

      try {
        await saveSession(session);
      } catch {
        /* Storage failures must not block the summary screen. */
      }

      // Unlock the next difficulty if this round qualified for it.
      try {
        const { getAllSessions } = await import("@/lib/db");
        const all = await getAllSessions();
        useSettings.getState().syncUnlocks(all);
        const unlockedAfter = useSettings.getState().unlockedMode;
        newlyUnlocked = isHigherMode(unlockedBefore, unlockedAfter)
          ? unlockedAfter
          : null;
      } catch {
        /* Unlocking is a progressive enhancement. */
      }

      // The summary screen announces the new unlock exactly once.
      setLastSession(session, newlyUnlocked);

      timers.push(
        window.setTimeout(() => {
          router.push(`/summary?s=${session.id}`);
        }, 650)
      );
    };

    const showTrial = (index: number) => {
      const seq = seqRef.current;
      if (index >= seq.length) {
        void finishSession();
        return;
      }

      indexRef.current = index;
      answeredRef.current = false;
      setTrialIndex(index);

      const item = seq[index];
      setCard(ingredientById(item.cardId) ?? null);
      setPhaseBoth("showing");
      shownAtRef.current = performance.now();

      const duration = durationRef.current;
      timers.push(
        window.setTimeout(() => {
          endTrial(index, duration);
        }, duration)
      );
    };

    const endTrial = (index: number, duration: number) => {
      const item = seqRef.current[index];
      const reactionTimeMs = reactionRef.current[index] ?? null;
      const playerTapped = reactionTimeMs !== null;
      const { correct, outcome, points } = resolveTrial(item.isMatch, playerTapped);

      const trial: Trial = {
        index,
        cardId: item.cardId,
        isMatch: item.isMatch,
        playerTapped,
        correct,
        reactionTimeMs,
        displayDurationMs: duration,
        points,
        outcome,
      };
      trialsRef.current.push(trial);

      setCard(null);
      setPhaseBoth("gap");

      // Adaptive difficulty: after every 5 trials, adjust the display duration.
      if (trialsRef.current.length % ADAPTIVE_WINDOW === 0) {
        const { durationMs, adjustment } = applyAdaptiveStep(
          durationRef.current,
          trialsRef.current
        );
        durationRef.current = durationMs;
        if (adjustment) adjustmentsRef.current.push(adjustment);
      }

      timers.push(
        window.setTimeout(() => {
          showTrial(index + 1);
        }, INTER_TRIAL_GAP_MS)
      );
    };

    speak(`Let's cook. ${config.n} back.`, useSettings.getState().voiceEnabled);

    timers.push(
      window.setTimeout(() => {
        showTrial(0);
      }, 900)
    );

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard support: space or enter = MATCH.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === " " || event.key === "Enter") {
        if (event.repeat) return;
        event.preventDefault();
        handleTap();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleTap]);

  const progress = Math.round((trialIndex / TRIALS_PER_SESSION) * 100);

  return (
    <div
      className="fixed inset-0 flex select-none flex-col overflow-hidden bg-cream"
      onPointerDown={handleRootPointerDown}
    >
      <header className="shrink-0">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-5 py-3">
          <div>
            <p
              data-testid="trial-counter"
              className="text-[1.25rem] font-bold leading-tight text-ink"
            >
              Card {Math.min(trialIndex + 1, TRIALS_PER_SESSION)} of{" "}
              {TRIALS_PER_SESSION}
            </p>
            <p className="text-[1rem] leading-snug text-ink-soft">
              {config.label} &middot; {config.n}-back
            </p>
          </div>
          <SpeakerToggle />
        </div>
        <div className="h-2 w-full bg-brand-soft">
          <div
            className="h-2 bg-brand transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="relative flex flex-1 flex-col items-center justify-center px-5 pb-4">
        <p className="sr-only" aria-live="polite">
          {card ? `Card: ${card.label}` : ""}
        </p>

        <AnimatePresence mode="wait">
          {card ? (
            <motion.div
              key={`${trialIndex}-${card.id}`}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.16 }}
              className={[
                "flex aspect-square min-h-[240px] min-w-[240px] w-[min(78vw,320px)]",
                "flex-col items-center justify-center rounded-[2rem] border-2 shadow-card",
                feedback?.kind === "good"
                  ? "border-success bg-success-soft"
                  : "border-line bg-surface",
              ].join(" ")}
            >
              <span
                aria-hidden="true"
                data-testid="ingredient-emoji"
                className="text-[7rem] leading-none"
              >
                {card.emoji}
              </span>
              <p
                data-testid="ingredient-label"
                className="mt-2 text-[2rem] font-bold leading-tight text-ink"
              >
                {card.label}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex aspect-square min-h-[240px] min-w-[240px] w-[min(78vw,320px)] items-center justify-center rounded-[2rem] border-2 border-dashed border-line bg-surface/60"
            >
              <span aria-hidden="true" className="text-[4rem] opacity-40">
                🥣
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {feedback ? (
            <motion.div
              key={feedback.id}
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.15 }}
              className={`absolute top-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full px-8 py-3 text-[1.5rem] font-bold shadow-card ${
                feedback.kind === "good"
                  ? "animate-pulse-good bg-success-soft text-success"
                  : "animate-shake-soft bg-white text-ink"
              }`}
            >
              <span>{feedback.text}</span>
              {feedback.points < 0 ? (
                <span className="text-[1.25rem] font-bold text-muted">
                  {feedback.points}
                </span>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      <div className="shrink-0 px-5 pb-5">
        <button
          type="button"
          onClick={handleTap}
          aria-label="Match — tap if this ingredient is the same as the one N steps earlier"
          className="flex h-[96px] w-full items-center justify-center rounded-2xl border-2 border-brand bg-brand text-[2.5rem] font-bold tracking-wide text-white shadow-button transition-transform active:translate-y-1 active:shadow-none"
        >
          MATCH
        </button>
      </div>
    </div>
  );
}
