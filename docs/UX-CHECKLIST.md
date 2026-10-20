# Manual senior-UX checklist

Verify in a real browser at **1024×768** (iPad landscape) and on a phone at
390×844. Tick every box before shipping.

Automated coverage: `npm run audit:ux` and `npm run audit:contrast` check the
mechanical parts (font sizes, tap-target sizes, button spacing, colour
contrast), and `npm run check:ux` drives a real browser through constraints
1, 2, 4, 5, 6, 7, 8 and 10 at both viewports. The items below still need
human eyes and hands.

---

## 1. Tap targets are at least 64×64px, spaced at least 16px apart

- [ ] Home — "Start Cooking" and "See My Progress" are comfortably tappable with a thumb.
- [ ] Home — the difficulty buttons (Easy / Medium / Hard) are tappable without aiming.
- [ ] Briefing — "Got it, let's cook!" and "Listen again" are both large.
- [ ] Gameplay — the MATCH button is full width and 96px tall.
- [ ] Gameplay — the speaker toggle is at least 64px square.
- [ ] Summary — "Play Again" and "See Progress".
- [ ] Dashboard — "Download PDF report".
- [ ] No two buttons touch; there is always a visible gap between them.

## 2. Body text is at least 20px, headings at least 28px

- [ ] Read every screen at arm's length without squinting.
- [ ] The ingredient label on the card is large enough to identify at a glance.
- [ ] No text anywhere is smaller than the "No ads. No sign-up." footer on Home.
- [ ] The font is Atkinson Hyperlegible (check: the digits 0/1/2 have a
      slashed zero and a distinct 1).

## 3. Contrast meets WCAG AA (4.5:1)

- [ ] Run `npm run audit:contrast` — it must print "All contrast checks passed."
- [ ] Read the grey "−50" penalty text on a white card — legible, not red.
- [ ] Read the secondary text ("Easy · 1-back", "Caregiver view") on cream.
- [ ] Chart labels and gridlines are visible on the dashboard.

## 4. One primary action per screen

- [ ] Home has exactly one filled (primary) button.
- [ ] The briefing has one filled button and one outlined one.
- [ ] Gameplay has exactly one action: MATCH. No menus, no back button, no
      score, no settings.
- [ ] Summary has one filled button ("Play Again") and one outlined ("See Progress").
- [ ] The dashboard's only filled button is the PDF export.

## 5. Voice narration with a persistent speaker toggle

- [ ] The speaker toggle is in the top-right of **every** screen.
- [ ] The briefing speaks itself when it opens.
- [ ] "Listen again" re-reads the instruction.
- [ ] The toggle says "Voice on" / "Voice off" and its state survives a reload.
- [ ] With the toggle off, nothing is spoken but everything still works.

## 6. No time pressure on the MATCH button

- [ ] The card stays visible for its full display window.
- [ ] You can tap MATCH at any point during that window, including right at
      the start or right at the end.
- [ ] There is no countdown ring, no "3… 2… 1…" and no visible timer.
- [ ] A tap after the card has gone does nothing at all.

## 7. Forgiving input

- [ ] Tapping the card itself (in the lower part of the screen) counts as MATCH.
- [ ] Tapping the empty space to the left and right of the MATCH button counts.
- [ ] The space bar and the Enter key also count as MATCH.
- [ ] Double-tapping does not count twice and does not cause an extra penalty.

## 8. Feedback is never punishing

- [ ] A correct tap shows "Nice!" on a soft green pill.
- [ ] An incorrect tap shows "Not quite" with a soft shake — never "Wrong!",
      never a red flash.
- [ ] The "−50" appears in grey, never in red.
- [ ] Feedback disappears on its own after about 600ms.

## 9. The session is short and never forces another round

- [ ] A full 25-card session takes roughly 1.5–2.5 minutes.
- [ ] The summary offers "Play Again" — it never starts a new round by itself.
- [ ] Leaving mid-session is possible (the browser back button works).

## 10. No countdown timers on menus

- [ ] Home, briefing and dashboard show no timers, countdowns or "time left".
- [ ] Only the progress bar on the gameplay screen moves, and it shows cards
      completed, not time remaining.

---

## Extra checks

- [ ] The whole flow works with the keyboard alone (Tab, Space, Enter).
- [ ] The focus ring is clearly visible on every focusable element.
- [ ] A screen reader announces the current ingredient on the gameplay screen.
- [ ] The game still works offline after the first load (turn the network off
      and reload).
- [ ] The app can be installed from the browser's share menu on iOS and from
      the install prompt on Android.
- [ ] The PDF download opens and shows the Brain Score chart and the session
      table.
- [ ] The dashboard renders correctly with 0 sessions, 1 session and 20 sessions
      (`node scripts/seed-sessions.mjs http://localhost:3000 20`).
- [ ] A 70-year-old can start a session without being told what to do.
