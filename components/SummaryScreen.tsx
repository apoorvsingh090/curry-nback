"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BigLinkButton } from "@/components/BigButton";
import SpeakerToggle from "@/components/SpeakerToggle";
import { getSession } from "@/lib/db";
import { DIFFICULTIES } from "@/lib/difficulty";
import { useLastSession } from "@/lib/store";
import { formatDuration } from "@/lib/utils";
import type { Session } from "@/lib/types";

function headlineFor(accuracy: number): string {
  if (accuracy >= 0.8) return "Great job!";
  if (accuracy >= 0.6) return "Well done!";
  return "Nice effort!";
}

function SummaryScreen() {
  const params = useSearchParams();
  const id = params.get("s");
  const lastSession = useLastSession((s) => s.lastSession);

  const [session, setSession] = useState<Session | null>(lastSession);
  const [missing, setMissing] = useState(false);
  const newlyUnlocked = useLastSession((s) => s.newlyUnlocked);

  useEffect(() => {
    if (session || !id) return;
    let cancelled = false;
    void getSession(id)
      .then((found) => {
        if (cancelled) return;
        if (found) setSession(found);
        else setMissing(true);
      })
      .catch(() => {
        if (!cancelled) setMissing(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id, session]);

  if (missing || (!session && id)) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-5">
        <p className="text-center text-[1.25rem] text-ink-soft">
          We could not find that session on this device.
        </p>
        <BigLinkButton href="/" className="max-w-md">
          Back to the kitchen
        </BigLinkButton>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <p className="text-[1.25rem] text-ink-soft">Loading…</p>
      </div>
    );
  }

  const accuracyPercent = Math.round(session.accuracy * 100);
  const durationMs = session.endedAt - session.startedAt;

  const stats = [
    { label: "Accuracy", value: `${accuracyPercent}%` },
    { label: "Matches caught", value: `${session.matchesCaught}` },
    { label: "Session time", value: formatDuration(durationMs) },
    { label: "Points", value: `${session.points >= 0 ? "+" : ""}${session.points}` },
  ];

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="w-full">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-end gap-4 px-5 py-4">
          <SpeakerToggle />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-5 pb-12">
        <p aria-hidden="true" className="text-[4rem] leading-none">
          🍲
        </p>
        <h1 className="mt-3 text-[2.5rem] font-bold leading-tight text-brand">
          {headlineFor(session.accuracy)}
        </h1>
        <p className="mt-2 text-[1.25rem] text-ink-soft">
          {session.n}-back &middot; {session.mode} round
        </p>

        <div className="mt-8 w-full">
          <div className="flex flex-col items-center rounded-[2rem] border-2 border-line bg-surface p-8 shadow-card">
            <p className="text-[1.25rem] font-bold uppercase tracking-wide text-ink-soft">
              Brain Score
            </p>
            <p className="text-[5rem] font-bold leading-none text-brand">
              {session.brainScore}
            </p>
            <p className="mt-1 text-[1rem] text-muted">out of 100</p>
          </div>
        </div>

        <div className="mt-6 grid w-full grid-cols-2 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border-2 border-line bg-surface p-5 text-center"
            >
              <p className="text-[1rem] leading-snug text-ink-soft">{stat.label}</p>
              <p className="mt-1 text-[1.75rem] font-bold leading-tight text-ink">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {newlyUnlocked && session ? (
          <p
            role="status"
            className="mt-6 rounded-full bg-brand-soft px-8 py-3 text-center text-[1.25rem] font-bold text-brand"
          >
            <span aria-hidden="true">⭐ </span>
            {DIFFICULTIES[newlyUnlocked].label} is unlocked — pick it on the
            home screen
          </p>
        ) : null}

        <div className="btn-group mt-8 w-full space-y-4">
          <BigLinkButton href={`/play?mode=${session.mode}`}>
            <span aria-hidden="true" className="text-[2rem] leading-none">
              🍳
            </span>
            Play Again
          </BigLinkButton>
          <BigLinkButton href="/progress" variant="secondary">
            <span aria-hidden="true" className="text-[1.5rem] leading-none">
              📈
            </span>
            See Progress
          </BigLinkButton>
        </div>
      </main>
    </div>
  );
}

export default function SummaryPage() {
  return <SummaryScreen />;
}
