"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BigButton } from "@/components/BigButton";
import SpeakerToggle from "@/components/SpeakerToggle";
import {
  DIFFICULTIES,
  numberWord,
  parseModeParam,
} from "@/lib/difficulty";
import { isModeUnlocked } from "@/lib/progression";
import { speak } from "@/lib/audio";
import { useSettings } from "@/lib/store";
import type { DifficultyMode } from "@/lib/types";

function BriefingScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const voiceEnabled = useSettings((s) => s.voiceEnabled);
  const markBriefingSeen = useSettings((s) => s.markBriefingSeen);

  const raw = params.get("mode");
  // Missing param → Easy; unrecognised value → home (QA B-5). A locked
  // difficulty reached by typing the URL is also sent home (QA B-4).
  const parsed = parseModeParam(raw);
  const mode: DifficultyMode = parsed ?? "easy";
  const config = DIFFICULTIES[mode];

  const instruction = `Tap MATCH when you see the same ingredient from ${numberWord(config.n)} step${config.n > 1 ? "s" : ""} back.`;

  useEffect(() => {
    const evaluate = () => {
      if (
        parsed === null ||
        !isModeUnlocked(mode, useSettings.getState().unlockedMode)
      ) {
        router.replace("/");
      }
    };
    // Persisted settings hydrate asynchronously — evaluate once ready (QA B-4).
    if (useSettings.persist.hasHydrated()) {
      evaluate();
      return;
    }
    const unsubscribe = useSettings.persist.onFinishHydration(evaluate);
    return () => unsubscribe();
  }, [mode, parsed, router]);

  // The worked example must match the wording for its N: the default strip
  // (Tomato, Onion, Tomato, Carrot) demonstrates TWO steps back, so 1-back
  // rounds get their own strip where the third card repeats the one right
  // before it (QA B-1).
  const strip =
    config.n === 1
      ? ["🧅", "🍅", "🍅", "🥕"]
      : ["🍅", "🧅", "🍅", "🥕"];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      speak(`${instruction} This round is ${config.label}, ${config.n}-back.`, voiceEnabled);
    }, 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="w-full">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-end gap-4 px-5 py-4">
          <SpeakerToggle />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-5 pb-10 text-center">
        <p aria-hidden="true" className="text-[4rem] leading-none">
          🥘
        </p>
        <h1 className="mt-4 text-[2rem] font-bold leading-tight text-brand">
          {config.label} round — {config.n}-back
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-[1.5rem] font-bold leading-relaxed text-ink">
          {instruction}
        </p>

        <div className="mt-8 w-full max-w-2xl rounded-2xl border-2 border-line bg-surface p-6 shadow-card">
          <p className="text-[1.25rem] font-bold text-ink">Example</p>
          <div data-testid="example-strip" className="mt-4 flex items-center justify-center gap-3 text-[2.5rem]">
            {strip.map((emoji, i) => (
              <span
                key={i}
                aria-hidden="true"
                className={i === 2 ? "rounded-xl bg-brand-soft px-2" : ""}
              >
                {emoji}
              </span>
            ))}
          </div>
          <p className="mt-4 text-[1.25rem] leading-relaxed text-ink-soft">
            {config.n <= 2 ? (
              <>
                The third card is <strong className="text-ink">Tomato</strong> —
                the same as {config.n} card{config.n > 1 ? "s" : ""} before. Tap{" "}
                <strong className="text-ink">MATCH</strong>!
              </>
            ) : (
              <>
                This strip shows 2-back. Your round looks back{" "}
                <strong className="text-ink">{numberWord(config.n)} cards</strong>{" "}
                instead.
              </>
            )}
          </p>
        </div>

        <div className="btn-group mt-8 w-full max-w-md space-y-4">
          <BigButton
            onClick={() => {
              markBriefingSeen();
              router.push(`/play?mode=${mode}`);
            }}
          >
            Got it, let&apos;s cook!
          </BigButton>
          <BigButton
            variant="secondary"
            onClick={() => speak(instruction, voiceEnabled)}
          >
            <span aria-hidden="true" className="text-[1.5rem] leading-none">
              🔊
            </span>
            Listen again
          </BigButton>
        </div>
      </main>
    </div>
  );
}

export default function BriefingPage() {
  return (
    <Suspense fallback={null}>
      <BriefingScreen />
    </Suspense>
  );
}
