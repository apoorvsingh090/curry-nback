"use client";

import { useEffect, useMemo, useState } from "react";
import LineChart from "@/components/LineChart";
import TopBar from "@/components/TopBar";
import { BigButton } from "@/components/BigButton";
import {
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  UNLOCK_ACCURACY,
  previousMode,
} from "@/lib/difficulty";
import { isModeUnlocked } from "@/lib/progression";
import { useSettings } from "@/lib/store";
import { useSessions } from "@/lib/useSessions";
import { downloadProgressReport } from "@/lib/pdf";
import { formatDate, startOfWeek } from "@/lib/utils";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-line bg-surface p-5">
      <p className="text-[1rem] leading-snug text-ink-soft">{label}</p>
      <p className="mt-1 text-[2.25rem] font-bold leading-none text-brand">{value}</p>
      {hint ? <p className="mt-1 text-[1rem] leading-snug text-muted">{hint}</p> : null}
    </div>
  );
}

function trendSentence(points: { value: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return "One session recorded so far.";
  const first = points[0].value;
  const last = points[points.length - 1].value;
  const delta = Math.round(last - first);
  if (delta > 3) return `Your score is up ${delta} points since the first session.`;
  if (delta < -3) return `Your score is down ${Math.abs(delta)} points since the first session.`;
  return "Your score has been steady across these sessions.";
}

export default function ProgressScreen() {
  const { sessions, loading } = useSessions();
  const unlockedMode = useSettings((s) => s.unlockedMode);
  const syncUnlocks = useSettings((s) => s.syncUnlocks);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) syncUnlocks(sessions);
  }, [loading, sessions, syncUnlocks]);

  const ordered = useMemo(
    () => [...sessions].sort((a, b) => a.startedAt - b.startedAt),
    [sessions]
  );
  const last14 = useMemo(() => ordered.slice(-14), [ordered]);

  const brainScorePoints = useMemo(
    () =>
      last14.map((s) => ({
        label: formatDate(s.startedAt),
        value: s.brainScore,
      })),
    [last14]
  );

  const accuracyPoints = useMemo(
    () =>
      last14.map((s) => ({
        label: formatDate(s.startedAt),
        value: Math.round(s.accuracy * 100),
      })),
    [last14]
  );

  const thisWeekStart = startOfWeek(Date.now());
  const sessionsThisWeek = ordered.filter((s) => s.startedAt >= thisWeekStart).length;
  const bestScore = ordered.reduce((max, s) => Math.max(max, s.brainScore), 0);
  const averageScore = ordered.length
    ? Math.round(ordered.reduce((sum, s) => sum + s.brainScore, 0) / ordered.length)
    : 0;

  const labelEvery = brainScorePoints.length > 8 ? 2 : 1;

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      await downloadProgressReport(ordered, unlockedMode);
    } catch {
      setExportError("We could not create the PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <TopBar title="Progress" subtitle="Caregiver view" />

      <main className="mx-auto w-full max-w-4xl flex-1 px-5 pb-16">
        {loading ? (
          <p className="py-16 text-center text-[1.25rem] text-ink-soft">Loading…</p>
        ) : ordered.length === 0 ? (
          <section className="mt-6 rounded-[2rem] border-2 border-line bg-surface p-8 text-center shadow-card">
            <p aria-hidden="true" className="text-[4rem] leading-none">
              📊
            </p>
            <h2 className="mt-3 text-[1.75rem] font-bold text-ink">
              No sessions yet
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[1.25rem] leading-relaxed text-ink-soft">
              Once your loved one finishes a round, their Brain Score and accuracy
              will appear here.
            </p>
          </section>
        ) : (
          <>
            <section aria-labelledby="overview-heading" className="mt-6">
              <h2 id="overview-heading" className="sr-only">
                Overview
              </h2>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                  label="Sessions this week"
                  value={String(sessionsThisWeek)}
                  hint={`${ordered.length} in total`}
                />
                <StatCard label="Best Brain Score" value={String(bestScore)} />
                <StatCard
                  label="Average Brain Score"
                  value={String(averageScore)}
                />
                <StatCard
                  label="Level reached"
                  value={DIFFICULTIES[unlockedMode].label}
                  hint={`${DIFFICULTIES[unlockedMode].n}-back`}
                />
              </div>
            </section>

            <section
              aria-labelledby="score-heading"
              className="mt-8 rounded-[2rem] border-2 border-line bg-surface p-6 shadow-card"
            >
              <h2
                id="score-heading"
                className="text-[1.5rem] font-bold leading-tight text-ink"
              >
                Brain Score
              </h2>
              <p className="mt-1 text-[1rem] text-ink-soft">
                Last {last14.length} session{last14.length === 1 ? "" : "s"}
              </p>
              <div className="mt-4">
                <LineChart
                  points={brainScorePoints}
                  title="Brain Score over recent sessions"
                  description={`Brain Score over the last ${last14.length} sessions: ${brainScorePoints
                    .map((p) => `${p.label} ${p.value}`)
                    .join(", ")}.`}
                  labelEvery={labelEvery}
                />
              </div>
              <p className="mt-2 text-[1.25rem] font-bold text-brand">
                {trendSentence(brainScorePoints)}
              </p>
            </section>

            <section
              aria-labelledby="accuracy-heading"
              className="mt-8 rounded-[2rem] border-2 border-line bg-surface p-6 shadow-card"
            >
              <h2
                id="accuracy-heading"
                className="text-[1.5rem] font-bold leading-tight text-ink"
              >
                Accuracy trend
              </h2>
              <p className="mt-1 text-[1rem] text-ink-soft">
                Correct answers out of every card shown
              </p>
              <div className="mt-4">
                <LineChart
                  points={accuracyPoints}
                  title="Accuracy over recent sessions"
                  description={`Accuracy percentage over the last ${last14.length} sessions: ${accuracyPoints
                    .map((p) => `${p.label} ${p.value}%`)
                    .join(", ")}.`}
                  unit="%"
                  labelEvery={labelEvery}
                />
              </div>
            </section>

            <section
              aria-labelledby="levels-heading"
              className="mt-8 rounded-[2rem] border-2 border-line bg-surface p-6 shadow-card"
            >
              <h2
                id="levels-heading"
                className="text-[1.5rem] font-bold leading-tight text-ink"
              >
                Difficulty levels
              </h2>
              <ul className="mt-4 space-y-3">
                {DIFFICULTY_ORDER.map((mode) => {
                  const config = DIFFICULTIES[mode];
                  const unlocked = isModeUnlocked(mode, unlockedMode);
                  const requirement = previousMode(mode);
                  return (
                    <li
                      key={mode}
                      className="flex min-h-[72px] items-center justify-between gap-4 rounded-xl border-2 border-line bg-cream px-4 py-3"
                    >
                      <div>
                        <p className="text-[1.25rem] font-bold leading-tight text-ink">
                          {config.label} &middot; {config.n}-back
                        </p>
                        <p className="text-[1rem] leading-snug text-ink-soft">
                          {unlocked
                            ? "Unlocked"
                            : requirement
                              ? `Reach ${Math.round(UNLOCK_ACCURACY * 100)}% accuracy on ${DIFFICULTIES[requirement].label} to unlock`
                              : "Unlocked"}
                        </p>
                      </div>
                      <span aria-hidden="true" className="text-[2rem]">
                        {unlocked ? "✅" : "🔒"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="mt-8">
              <BigButton onClick={handleExport} disabled={exporting}>
                <span aria-hidden="true" className="text-[1.5rem] leading-none">
                  📄
                </span>
                {exporting ? "Preparing PDF…" : "Download PDF report"}
              </BigButton>
              {exportError ? (
                <p className="mt-3 text-center text-[1rem] text-muted">{exportError}</p>
              ) : null}
              <p className="mt-3 text-center text-[1rem] leading-relaxed text-muted">
                Share this report with a GP or memory clinic if you wish. No ads,
                ever — and your data never leaves this device.
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
