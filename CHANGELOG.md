# Changelog

All notable changes to Curry Kitchen are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/) and the project versions
follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- The difficulty ladder now runs to **Level 9 (9-back)**: six new levels
  above Hard, each unlocked one at a time by ≥ 80% accuracy on the level
  below. From Level 4 the pace holds at 2000ms so the challenge rises with
  N, not with speed.

### Changed

- The summary screen announces a newly unlocked level ("⭐ Level 5 is
  unlocked — pick it on the home screen").
- The home picker states the unlock rule ("Score 80% or better on Level 4
  to unlock Level 5.") next to locked levels.
- The briefing example now says which levels it illustrates when the
  round is above 2-back.

## [0.1.0] — 2026-10-22

### Added

- N-back memory game: Easy (1-back), Medium (2-back) and Hard (3-back)
  difficulties with 25-card sessions, ~30% match rate and no time pressure
  on the MATCH decision.
- Adaptive difficulty engine: rolling 5-trial accuracy shortens or lengthens
  the card display by 200ms (1200–4000ms clamp); every adjustment is logged
  to the session record.
- Difficulty unlocking: Medium needs ≥80% accuracy on Easy, Hard needs ≥80%
  on Medium.
- Senior-first UX: 20px base font (Atkinson Hyperlegible), 64px tap targets,
  a forgiving lower-40%-of-screen MATCH zone, voice narration with a
  persistent speaker toggle, and never-punishing feedback.
- Caregiver dashboard: Brain Score and accuracy trends over the last 14
  sessions, colour-accessible hand-rolled SVG charts, sessions per week, and
  an on-device PDF export (jsPDF, lazy-loaded).
- Progressive web app: installable on Android and iOS, generated icons and
  splash screens, offline play after the first load via service worker.
- Quality gates: Vitest unit tests, `npm run audit` (WCAG contrast + senior
  UX + lint + typecheck + tests) and real-browser verification scripts
  (`smoke`, `check:ux`, `check:adaptive`).
- Deployment: production build served at https://curry-nback.vercel.app.

[Unreleased]: https://github.com/apoorvsingh090/curry-nback/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/apoorvsingh090/curry-nback/releases/tag/v0.1.0
