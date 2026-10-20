"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BigLinkButton, BigButton } from "@/components/BigButton";
import SpeakerToggle from "@/components/SpeakerToggle";
import { DIFFICULTY_ORDER, DIFFICULTIES } from "@/lib/difficulty";
import { isModeUnlocked } from "@/lib/progression";
import { useSettings } from "@/lib/store";
import { useSessions } from "@/lib/useSessions";
import type { DifficultyMode } from "@/lib/types";

export default function HomeScreen() {
  const router = useRouter();
  const { sessions, loading } = useSessions();

  const briefingSeen = useSettings((s) => s.briefingSeen);
  const lastMode = useSettings((s) => s.lastMode);
  const unlockedMode = useSettings((s) => s.unlockedMode);
  const syncUnlocks = useSettings((s) => s.syncUnlocks);
  const setLastMode = useSettings((s) => s.setLastMode);

  const [selected, setSelected] = useState<DifficultyMode>(lastMode);

  useEffect(() => {
    if (!loading) syncUnlocks(sessions);
  }, [loading, sessions, syncUnlocks]);

  useEffect(() => {
    setSelected((prev) => (isModeUnlocked(prev, unlockedMode) ? prev : unlockedMode));
  }, [unlockedMode]);

  const showDifficultyPicker = unlockedMode !== "easy" || sessions.length > 0;

  function startCooking() {
    setLastMode(selected);
    const target = briefingSeen ? `/play?mode=${selected}` : `/brief?mode=${selected}`;
    router.push(target);
  }

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="w-full">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-end gap-4 px-5 py-4">
          <SpeakerToggle />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-5 pb-12">
        <div className="mb-6 text-center">
          <p aria-hidden="true" className="text-[5rem] leading-none">
            🍛
          </p>
          <h1 className="mt-4 text-[3rem] font-bold leading-tight text-brand">
            Curry Kitchen
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[1.25rem] leading-relaxed text-ink-soft">
            A gentle memory game that keeps your brain sharp — one ingredient
            card at a time.
          </p>
        </div>

        {showDifficultyPicker ? (
          <section
            aria-labelledby="difficulty-heading"
            className="mb-8 w-full"
          >
            <h2
              id="difficulty-heading"
              className="mb-4 text-center text-[1.25rem] font-bold text-ink"
            >
              How hard would you like to play?
            </h2>
            <div className="btn-group flex flex-wrap justify-center gap-4">
              {DIFFICULTY_ORDER.map((mode) => {
                const config = DIFFICULTIES[mode];
                const unlocked = isModeUnlocked(mode, unlockedMode);
                const active = mode === selected;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => unlocked && setSelected(mode)}
                    disabled={!unlocked}
                    aria-pressed={active}
                    className={[
                      "min-h-[88px] w-[9.5rem] rounded-2xl border-2 px-3 py-3 text-center transition-colors",
                      active
                        ? "border-brand bg-brand text-white"
                        : "border-brand bg-surface text-ink",
                      unlocked ? "hover:bg-brand-soft" : "opacity-60",
                    ].join(" ")}
                  >
                    <span className="block text-[1.25rem] font-bold leading-tight">
                      {unlocked ? config.label : "🔒 " + config.label}
                    </span>
                    <span
                      className={`mt-1 block text-[1rem] leading-tight ${
                        active ? "text-white" : "text-ink-soft"
                      }`}
                    >
                      {config.n}-back
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        <div className="btn-group w-full max-w-md space-y-4">
          <BigButton onClick={startCooking}>
            <span aria-hidden="true" className="text-[2rem] leading-none">
              🍳
            </span>
            Start Cooking
          </BigButton>
          <BigLinkButton href="/progress" variant="secondary">
            <span aria-hidden="true" className="text-[1.5rem] leading-none">
              📈
            </span>
            See My Progress
          </BigLinkButton>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-4xl px-5 pb-8 text-center">
        <p className="text-[1rem] leading-relaxed text-muted">
          No ads. No sign-up. Your results stay on this device.
        </p>
      </footer>
    </div>
  );
}
