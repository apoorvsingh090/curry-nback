"use client";

import { DIFFICULTIES } from "./difficulty";
import { formatDateTime } from "./utils";
import type { DifficultyMode, Session } from "./types";

/**
 * Builds a caregiver-friendly PDF report of the player's history.
 * jsPDF is imported lazily so it never lands in the initial bundle.
 */
export async function downloadProgressReport(
  sessions: Session[],
  unlockedMode: DifficultyMode
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;

  const ordered = [...sessions].sort((a, b) => a.startedAt - b.startedAt);
  const chartSessions = ordered.slice(-14);

  /* ----------------------------------------------------------- header --- */
  doc.setFillColor(154, 52, 18);
  doc.rect(0, 0, pageWidth, 96, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("Curry Kitchen — Progress Report", margin, 46);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.text(`Generated ${formatDateTime(Date.now())}`, margin, 72);

  /* ---------------------------------------------------------- summary --- */
  const thisWeekStart = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.getTime();
  })();

  const sessionsThisWeek = ordered.filter((s) => s.startedAt >= thisWeekStart).length;
  const best = ordered.reduce((max, s) => Math.max(max, s.brainScore), 0);
  const latest = ordered[ordered.length - 1];
  const average = ordered.length
    ? Math.round(ordered.reduce((sum, s) => sum + s.brainScore, 0) / ordered.length)
    : 0;

  let cursorY = 140;
  doc.setTextColor(43, 26, 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Summary", margin, cursorY);

  cursorY += 22;
  const summaryItems: [string, string][] = [
    ["Total sessions", String(ordered.length)],
    ["Sessions this week", String(sessionsThisWeek)],
    ["Average Brain Score", `${average}`],
    ["Best Brain Score", `${best}`],
    ["Latest Brain Score", latest ? `${latest.brainScore}` : "—"],
    ["Highest level reached", DIFFICULTIES[unlockedMode].label],
  ];

  const colWidth = contentWidth / 3;
  summaryItems.forEach(([label, value], index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = margin + col * colWidth;
    const y = cursorY + row * 52;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(91, 70, 50);
    doc.text(label, x, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(43, 26, 14);
    doc.text(value, x, y + 22);
  });
  cursorY += 52 * Math.ceil(summaryItems.length / 3) + 16;

  /* ------------------------------------------------------------ chart --- */
  if (chartSessions.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(43, 26, 14);
    doc.text("Brain Score over the last sessions", margin, cursorY);

    const chartTop = cursorY + 20;
    const chartHeight = 150;
    const chartLeft = margin;
    const chartWidth = contentWidth;

    doc.setDrawColor(227, 213, 196);
    doc.setLineWidth(1);
    for (const value of [0, 25, 50, 75, 100]) {
      const y = chartTop + chartHeight - (value / 100) * chartHeight;
      doc.line(chartLeft, y, chartLeft + chartWidth, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(107, 98, 87);
      doc.text(String(value), chartLeft - 6, y + 3, { align: "right" });
    }

    const xFor = (i: number) =>
      chartSessions.length === 1
        ? chartLeft + chartWidth / 2
        : chartLeft + (i / (chartSessions.length - 1)) * chartWidth;
    const yFor = (value: number) => chartTop + chartHeight - (value / 100) * chartHeight;

    doc.setDrawColor(154, 52, 18);
    doc.setLineWidth(2.5);
    for (let i = 1; i < chartSessions.length; i++) {
      doc.line(
        xFor(i - 1),
        yFor(chartSessions[i - 1].brainScore),
        xFor(i),
        yFor(chartSessions[i].brainScore)
      );
    }
    doc.setFillColor(154, 52, 18);
    for (let i = 0; i < chartSessions.length; i++) {
      doc.circle(xFor(i), yFor(chartSessions[i].brainScore), 3, "F");
    }

    cursorY = chartTop + chartHeight + 34;
  }

  /* ------------------------------------------------------------ table --- */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(43, 26, 14);
  doc.text("Recent sessions", margin, cursorY);
  cursorY += 18;

  const columns = [
    { title: "Date", x: margin },
    { title: "Level", x: margin + 140 },
    { title: "Brain Score", x: margin + 245 },
    { title: "Accuracy", x: margin + 340 },
    { title: "Matches", x: margin + 430 },
  ];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(91, 70, 50);
  doc.setFillColor(251, 230, 214);
  doc.rect(margin, cursorY, contentWidth, 22, "F");
  columns.forEach((col) => doc.text(col.title, col.x, cursorY + 15));
  cursorY += 26;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(43, 26, 14);

  const rows = ordered.slice(-12).reverse();
  if (rows.length === 0) {
    doc.text("No sessions recorded yet.", margin, cursorY + 14);
    cursorY += 30;
  }

  for (const session of rows) {
    if (cursorY > pageHeight - 120) {
      doc.addPage();
      cursorY = 60;
    }
    doc.text(formatDateTime(session.startedAt), margin, cursorY);
    doc.text(
      `${DIFFICULTIES[session.mode].label} (${session.n}-back)`,
      margin + 140,
      cursorY
    );
    doc.text(String(session.brainScore), margin + 245, cursorY);
    doc.text(`${Math.round(session.accuracy * 100)}%`, margin + 340, cursorY);
    doc.text(String(session.matchesCaught), margin + 430, cursorY);
    doc.setDrawColor(227, 213, 196);
    doc.line(margin, cursorY + 8, margin + contentWidth, cursorY + 8);
    cursorY += 24;
  }

  /* ----------------------------------------------------------- footer --- */
  const footerY = doc.internal.pageSize.getHeight() - 56;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(107, 98, 87);
  doc.text(
    "Curry Kitchen is a cognitive training game. It is not a diagnostic tool and does not detect or treat dementia.",
    margin,
    footerY
  );

  doc.save("curry-kitchen-progress.pdf");
}
