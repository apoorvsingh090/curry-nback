# Contributing to Curry Kitchen

Thank you for contributing. The guiding rule for every change is the one
that shaped the build: **when in doubt, pick the interpretation that best
serves the 70-year-old user.**

## Setup

```bash
git clone https://github.com/apoorvsingh090/curry-nback
cd curry-nback
npm install
npm run dev        # http://localhost:3000
```

## Before you open a PR

All of these must pass locally:

```bash
npm run audit          # contrast + senior-UX + lint + typecheck + unit tests
npm run build          # production build (also emits the service worker)
```

If your change touches gameplay or UI, also run the real-browser checks
(Playwright, needs `npm run build && npm start` first):

```bash
npm run smoke          # whole loop, includes offline + PDF export
npm run check:ux       # the ten senior-UX constraints, tablet + phone
npm run check:adaptive # plays a perfect 2-back round
```

## Senior-UX constraints (non-negotiable)

1. Tap targets ≥ 64×64px, spaced ≥ 16px — `text-xs`/`text-sm` fail the audit.
2. Body text ≥ 20px (root font size), headings ≥ 28px, Atkinson Hyperlegible.
3. WCAG AA contrast — `npm run audit:contrast` is the referee.
4. One filled (primary) button per screen; no nested menus during play.
5. Voice narration for every prompt; colour is never the only signal.
6. No countdown timers anywhere outside gameplay; no time pressure on MATCH.
7. Feedback is never punishing: "Not quite", the −50 in grey, never red.
8. A session stays short (~3 minutes) and is never forced to continue.

Automated checks enforce items 1–3 and parts of 4–8; the rest needs a
manual pass per [`docs/UX-CHECKLIST.md`](docs/UX-CHECKLIST.md).

## Commits and PRs

- Commit messages are short, imperative and conventional in spirit
  (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `polish:`, `deploy:`).
- Pull requests use the template; reference the issue with `Closes #N`,
  keep diffs focused, and update [`CHANGELOG.md`](CHANGELOG.md) under
  *Unreleased* for user-facing changes.
- Dependency updates arrive via Dependabot; please let them come from there.

## Notes

- No accounts, no tracking, no third-party analytics — PRs must not add any.
- No diagnostic or medical claims anywhere in the product.
- The MIT license applies to contributions; see [LICENSE](LICENSE).
