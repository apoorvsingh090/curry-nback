# Decisions

Ambiguities in the build spec, and how each was resolved. The guiding rule
was the spec's own instruction: **when in doubt, pick the interpretation that
best serves the 70-year-old user.**

## Data model

### Extra fields on `Session`

The spec's `Session` interface (§6) does not have a place for the adaptive
adjustments, even though §3.3 says "log every adjustment to the session
record", and Phase 2's acceptance criterion asks to "verify display duration
dropped by 200ms in the session log". The core interface is kept exactly as
specified; three optional fields were added on top:

| Field | Why |
|---|---|
| `points` | The per-trial points from §3.4 are otherwise unrecoverable — accuracy alone cannot rebuild them. |
| `matchesCaught` | The summary screen needs "matches caught" (§5, Screen 4). Cheap to store, cheaper than re-deriving. |
| `adjustments` | The full adaptive log: `afterTrialIndex`, `rollingAccuracy`, `previousDurationMs`, `newDurationMs`, `direction`. |

`Trial` also gained `points` and `outcome` for the same reason — a per-trial
audit trail is more useful than re-computing outcomes from the flags.

### Where settings live

`localStorage` (via the Zustand `persist` middleware) holds settings only:
voice on/off, "has seen the briefing", unlocked difficulty, last difficulty
played. Session history lives in IndexedDB because it grows without bound and
the dashboard needs indexed queries.

## Game rules

### The ladder continues past Hard, to 9-back

The original spec stopped at Hard (3-back). players who cleared it had
nowhere to go, so the ladder now runs to Level 9 (9-back) with one unlock
rule for every level: ≥ 80% accuracy on the level below.

Decisions inside that extension:

- **Stable mode keys.** `easy` / `medium` / `hard` keep their names and
  stored values (session records, last-played preference, URLs); new
  levels use `level4` … `level9`. Nothing in old device data breaks.
- **Pace holds at 2000ms from Hard to Level 9.** Rising N *is* the
  difficulty; making cards flicker faster on top of 9-back would punish
  the exact users the game serves. The adaptive engine still shortens or
  lengthens the pace inside a round (1200–4000ms).
- **Pool stays at 8 ingredients above Medium.** A bigger pool would add a
  second, different kind of difficulty on top of N.
- **Labels are `Level 4` … `Level 9`** while the first three keep their
  thematic names; every button also shows its N ("4-back").
- **The briefing example stays the 2-back strip** for levels above Medium,
  with a line saying the round looks back N cards instead — a 9-card strip
  would be noise, not an example.
- **URLs let any unlocked level in** (`/play?mode=level6`); locked levels
  redirect Home, as before, so a caregiver can pre-set a round.

### The first N cards are never matches

For `i < n` there is no card to compare against, so `isMatch` is always
`false`. The match probability of ~30% therefore applies to *eligible* trials
(`i >= n`), which is what the generator in §7 does.

### The 2-back briefing example

The briefing screen shows the example from §3.1 (`🍅 🧅 🍅 🥕`) and states
in words which card matches. The example is worded for the current difficulty
so a 3-back player is not confused by a 1-back illustration.

### "Start Cooking" on Home starts Easy

§5 says the Home CTA starts an Easy session. Once the player has finished at
least one session, a difficulty picker appears above the CTA and "Start
Cooking" starts the last played difficulty (persisted across sessions, per
Phase 2). The CTA itself never changes, so Home still has exactly one primary
action.

### Locked difficulties can be reached by URL

`/play?mode=hard` is redirected to Home when Hard is not unlocked. A caregiver
can still set up the game on a tablet without playing first.

### Missed cards and the forgiving tap zone

§4.7 says a tap anywhere in the lower 40% of the screen counts as MATCH. The
play screen implements this with a single pointer handler on the game root,
so there is exactly one code path for a tap and no double-counting. The
visible MATCH button is a hint, not a strict target.

Only the **first** tap of a trial counts. Later taps are ignored rather than
penalised — seniors often double-tap.

### Session length

25 cards at 3000ms plus a 500ms gap is ~87 seconds in Easy mode, well inside
the "~3 minutes max" guidance. The summary screen offers "Play Again" but
never auto-starts another round.

## Senior UX

### The 20px body font is enforced at the root

`html { font-size: 20px }` makes every rem-based Tailwind size scale up, so
`text-base` is 20px and `text-2xl` is 30px. `text-xs`/`text-sm` are banned by
`npm run audit:ux`, which fails the build if they reappear.

### Card borders are 3:1, not decorative

A card whose border is invisible to a low-vision user is a usability problem
before it is a compliance problem, so borders use `#A2855F` (3.47:1 against
white, 3.24:1 against the cream background) rather than a hairline grey.

### Penalties are grey, never red

`-50` is shown in `#6B6257` ("muted") next to the message "Not quite".
Correct feedback uses a soft green pill with "Nice!".

### The voice toggle is on by default

Voice narration helps low-vision players and costs nothing for others, so it
starts enabled and can be switched off from any screen. The toggle is
persisted in `localStorage`.

### Speech is an enhancement, never a requirement

Web Speech API (`speechSynthesis`) is used for narration and spoken feedback
because recording real voice would delay the MVP. If the browser has no
voices available, everything still works silently. Sound effects are Howler
SFX generated from scratch by `scripts/generate-audio.mjs`.

### Colour is never the only signal

Correct/incorrect feedback always carries a word ("Nice!" / "Not quite").
Difficulty state uses a lock emoji as well as a colour.

## Technical

### `@ducanh2912/next-pwa` instead of `next-pwa`

The original `next-pwa` package is unmaintained and breaks on modern Next.js
builds. `@ducanh2912/next-pwa` is the maintained drop-in fork with the same
API and the same `next-pwa` configuration surface.

### The manifest comes from `app/manifest.ts`, not from the PWA plugin

The maintained fork no longer writes a `manifest.json` from a `manifest`
option (it only builds the service worker). The manifest is therefore
declared with Next.js's own `app/manifest.ts` route, which serves
`/manifest.webmanifest` and injects the `<link rel="manifest">` tag. This is
the idiomatic App Router approach and keeps the manifest type-checked.

### Zoom is not disabled

`viewport` deliberately omits `maximum-scale`. Pinching to zoom is a
low-vision feature, not something to lock away.

### The iOS splash images are injected on the client

React 18 does not hoist `<link>` elements into `<head>`, and iOS expects
`apple-touch-startup-image` there. A tiny client component adds the links to
`document.head` on mount. Chrome's own splash screen comes from the manifest
(`background_color`, `theme_color` and the 512px icon).

### Hand-rolled SVG charts instead of a charting library

The dashboard needs two line charts. Hand-rolled SVG keeps the bundle small,
renders identically offline, and produces accessible output (`role="img"` with
a spoken description of every point). It also avoids pulling a large charting
dependency into an app for a 65-year-old's tablet.

### jsPDF is loaded on demand

The PDF library is only imported when the caregiver presses "Download PDF
report", so it never enters the initial bundle.

### The generator takes an injectable `random`

`generateSequence(length, n, pool, matchProbability, random = Math.random)`
behaves exactly like the §7 signature, with an optional fifth parameter so
the tests can be deterministic.

## Explicitly not built

Per §9, the MVP has no accounts, payments, social features, ads,
localisation, native apps or LLM calls. Nothing in the code has a hook for
any of them.
