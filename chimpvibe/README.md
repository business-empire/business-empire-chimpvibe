# Business Empire native Chimp Vibe edition

The standalone game at the repository root is preserved. This folder contains the separate native edition submitted as **lego** on 10 October 2026. This development belongs to the fork at https://github.com/business-empire/business-empire-chimpvibe; the original business repository is untouched.

The original neon terminal layout, mode choices, tabs, restock controls and reports are restored. The page automatically fits its host frame; inherited full-width tab buttons are corrected. Economy calculations now account for stock cost once, preserve overhead when auto-buying and make expansions viable.

## Run locally

Use Node.js 22 or newer. No dependencies are required for this native folder.

- From this folder, run `npm test` for 22 mechanics checks.
- Run `npm run preview`, then open http://127.0.0.1:4312.
- Open a second browser tab to try shared-session play.

The preview executes trusted source from this checkout in a local harness. It is **not** Chimp Vibe's official isolated runner and must not load untrusted third-party games. It binds only to localhost. The platform separately passed ephemeral-Docker validation and a bounded 32-tick multiplayer probe. Validation checks the native contract; it does not render or establish gameplay quality. Screenshots were captured from the running browser preview.

The whole page was checked in solo and online modes, across Dashboard, Business, Upgrades, Multiplayer and Log, at 1280×720, 900×600 and 390×844. Very narrow frames scale the original page down to keep all content visible.

## Submission status

**Submitted, pending owner review.** These are private candidates; acceptance and deployment are controlled by Chimp Vibe's owner. No public game URL is claimed.

- Revision: `revision-82722ad2-e944-499c-bd89-e210ce495df9`
- Submitted source digest: `5ea46dd2587f5ae7855ce4c658f5c0a8e13e686c395704d34ce3dab17cca20dd`
- Native source: [game/README.md](game/README.md), including controls and adaptation limits

The exact submitted native files are in `game/`. Preview, tests and screenshots sit outside the native upload. Credentials and MCP configuration are excluded.
