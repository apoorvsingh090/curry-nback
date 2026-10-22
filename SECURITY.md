# Security Policy

Curry Kitchen is a fully static client-side app: no accounts, no server-side
data, no third-party analytics. Session data never leaves the player's
browser.

## Supported versions

| Version | Supported |
|---|---|
| 0.1.x | yes |

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting (*Security → Report a
vulnerability*) rather than a public issue. Include the affected URL, the
browser/OS, and steps to reproduce.

Training-game data is stored only in the browser (IndexedDB + localStorage),
so issues of concern are XSS/prototype-pollution vectors, the offline service
worker cache, or vulnerable npm dependencies — the last are also covered by
Dependabot alerts on this repository.
