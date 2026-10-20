# Curry Kitchen

A gamified **N-back working-memory trainer** for adults 65+, wrapped in a
"curry kitchen" theme, with a caregiver dashboard that tracks cognitive
performance over time.

> Curry Kitchen is a **training game**, not a diagnostic tool. It does not
> detect, screen for or treat dementia. Brain Score is a game metric, not a
> clinical measure.

---

## Quick start

```bash
npm install
npm run dev            # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (also emits the service worker) |
| `npm start` | Serve the production build |
| `npm test` | Unit tests (Vitest) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint via `next lint` |
| `npm run audit:contrast` | WCAG AA contrast audit of the palette |
| `npm run audit:ux` | Senior-UX audit (font size, tap targets, button spacing) |
| `npm run audit` | All of the above |
| `npm run gen:assets` | Regenerate PWA icons, splash screens and sound effects |
| `npm run smoke` | End-to-end browser test of the whole loop |
| `npm run check:ux` | Verifies the ten senior-UX constraints in a real browser |
| `npm run check:adaptive` | Plays a perfect 2-back round and verifies the adaptive engine |

---

## How the game works

The player sees a sequence of ingredient cards, one at a time, and must tap
**MATCH** when the current card is identical to the card shown **N steps
earlier**.

```
Sequence:  🍅  🧅  🍅  🥕  🧅

2-back:
- Pos 3 (🍅) vs Pos 1 (🍅) → MATCH
- Pos 4 (🥕) vs Pos 2 (🧅) → no match
```

### Difficulty modes

| Mode | N | Card display | Ingredients | Unlocked by |
|---|---|---|---|---|
| Easy | 1-back | 3000ms | 4 | always available |
| Medium | 2-back | 2500ms | 6 | ≥ 80% accuracy on Easy |
| Hard | 3-back | 2000ms | 8 | ≥ 80% accuracy on Medium |

### Session parameters

- 25 cards per session, 500ms between cards
- ~30% of eligible trials are matches (randomised)
- Match probability is hidden — the sequence is not predictable

### Scoring

| Event | Points |
|---|---|
| Correct match tap | +100 |
| Correct non-tap (no match, no tap) | +50 |
| False alarm (tapped on a non-match) | −50 |
| Miss (did not tap on a match) | −50 |

**Brain Score = accuracy × 100**, where accuracy is the share of trials
answered correctly. The formula is shown in plain language on the caregiver
dashboard.

### Adaptive difficulty

After every 5 trials the rolling accuracy of the last 5 trials decides what
happens next:

| Rolling accuracy | Effect |
|---|---|
| ≥ 0.80 | card shows 200ms **shorter** (floor 1200ms) |
| ≤ 0.40 | card shows 200ms **longer** (ceiling 4000ms) |
| in between | no change |

Every adjustment is written to the session record so a caregiver can see
exactly how the game adapted.

---

## Screens

1. **Home** — one primary action ("Start Cooking"), a difficulty picker once
   more than Easy is unlocked, and a link to the progress dashboard.
2. **Briefing** — one sentence, spoken aloud, skippable after the first
   session.
3. **Gameplay** — progress ("Card 7 of 25"), the current mode, a large
   ingredient card, and a full-width MATCH button. No score, no timers.
4. **Summary** — Brain Score, accuracy, matches caught, session time, points.
5. **Caregiver dashboard** — Brain Score and accuracy trends over the last 14
   sessions, sessions this week, difficulty levels, and a PDF report.

---

## Senior-UX rules (enforced, not aspirational)

Every screen obeys the ten constraints in the build spec:

1. **Tap targets ≥ 64×64px**, spaced ≥ 16px apart — enforced by
   `npm run audit:ux`.
2. **Body text ≥ 20px**, headings ≥ 28px, Atkinson Hyperlegible — the root
   font size is 20px, and `text-xs`/`text-sm` fail the audit.
3. **WCAG AA contrast (4.5:1)** — enforced by `npm run audit:contrast`.
4. **One primary action per screen**, no nested menus during play.
5. **Voice narration for every prompt**, with a persistent speaker toggle.
6. **No time pressure on MATCH** — the card stays until its window ends.
7. **Forgiving input** — a tap anywhere in the lower 40% of the screen counts.
8. **No punishing feedback** — "Not quite", with the −50 shown in grey.
9. **~3 minutes per session**, and an invitation rather than a push to
   continue.
10. **No countdown timers on menus.**

See [`docs/UX-CHECKLIST.md`](docs/UX-CHECKLIST.md) for the manual
verification checklist.

---

## Project layout

```
app/                 Next.js App Router routes
  page.tsx           Home
  brief/             Pre-game briefing
  play/              Gameplay
  summary/           Session summary
  progress/          Caregiver dashboard
components/          Screens and shared UI
lib/
  sequence.ts        N-back sequence generator (§7)
  scoring.ts         Trial resolution, accuracy, Brain Score
  adaptive.ts        Rolling-accuracy difficulty engine
  db.ts              IndexedDB session storage (idb)
  progression.ts     Difficulty unlock rules
  store.ts           Zustand settings store (localStorage)
  audio.ts           Web Speech narration + Howler SFX
  pdf.ts             Caregiver PDF report (jsPDF)
scripts/             Asset generation and the audits
tests/               Vitest unit tests
docs/UX-CHECKLIST.md Manual senior-UX checklist
```

---

## Testing

```bash
npm test                  # unit tests
npm run audit             # contrast + UX + lint + typecheck + unit tests
npm run build && npm start
npm run smoke             # full loop in a real browser (needs a running server)
npm run check:ux          # the ten senior-UX constraints, in a real browser
npm run check:adaptive    # perfect 2-back round, verifies the adaptive engine
```

The unit tests cover the sequence generator (including the §7 acceptance
test), the scoring table, the adaptive engine, and the unlock rules. The
browser scripts cover the whole flow, the adaptive engine in a real session,
the PDF export, offline play, and the ten senior-UX constraints at
1024×768 and 390×844.

### Lighthouse (production build, Lighthouse 11)

| Route | Performance | Accessibility | PWA |
|---|---|---|---|
| `/` | 93 | 100 | 100 |
| `/play` | 91 | 100 | 100 |
| `/progress` | 95 | 100 | 100 |

Reproduce with:

```bash
npm run build && npm start
CHROME_PATH=<path to chrome> npx lighthouse http://localhost:3000 \
  --only-categories=performance,accessibility,pwa --output=json
```

---

## Deployment

The app is a static Next.js build with no backend, so it deploys to Vercel
with no environment variables.

**Repository:** <https://github.com/apoorvsingh090/curry-nback> (private)

### Vercel (one-time setup)

```bash
npx vercel login
npx vercel --prod          # deploys the current branch
npx vercel alias set <deployment-url> <your-domain>   # optional
```

Or connect the GitHub repository in the Vercel dashboard
(*Add New → Project → Import*). Every push to `main` then deploys
automatically.

### Make the repository public (optional)

```bash
gh repo edit apoorvsingh090/curry-nback --visibility public
```

### After deploying

- Set the production URL in the repository description and in
  `app/layout.tsx` → `metadata.metadataBase`.
- Verify PWA installability on a real device: open the production URL in
  Chrome (Android) → *Install app*, or Safari (iOS) → *Share → Add to Home
  Screen*.
- Check the offline path: load the app once, turn the network off, reload.

The app is installable as a PWA (Android, iOS) and plays offline after the
first load. Session data stays in the browser on the device — nothing is
uploaded.

---

## Safety notes

- No ads, ever. No accounts, no tracking, no third-party analytics.
- No diagnostic or medical claims anywhere in the product.
- The PDF report carries the line: *"Curry Kitchen is a cognitive training
  game. It is not a diagnostic tool and does not detect or treat dementia."*
