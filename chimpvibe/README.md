# Business Empire native Chimp Vibe edition

The standalone game at the repository root is preserved. This development belongs to the separate fork https://github.com/business-empire/business-empire-chimpvibe. The original personal repository is untouched.

The accepted **business-empire#0** is serving on Chimp Vibe. Its public multiplayer works, but Create Private City and Join with Code were informational placeholders. The updated native source fixes those controls without replacing the original neon interface.

- JOIN ANY CITY enters the public city.
- CREATE PRIVATE CITY creates a city and displays a six-character invitation code.
- A friend enters that code and presses JOIN or Enter. Codes, chat, readiness and the customer economy are isolated by city inside the hosted session.
- Leaving returns to solo play; business progress is retained. The last member leaving expires the code.
- Mode/city changes show pending feedback and await server acknowledgement.
- TODAY ranks completed-day revenue. Daily reports appear on Dashboard, leaving city chat usable when days advance.

## Verification

All **38** native mechanics checks pass, including city joining, privacy, independent economies, readiness, reset scope, reconnects, invalid codes, capacity limits and a representative checkpoint produced by the exact accepted #0 runtime. Chimp Vibe's ephemeral-Docker validation passed with no warnings and classified replacement as **live-compatible**, with a passing handoff check. The exact current draft also passed a 32-tick isolated probe with two participants joining a private city, advancing its day and sharing private chat, while spectator views exclude the private code and chat.

The original private-city failure and public multiplayer were checked in the actual official game frame at https://play.chimpvibe.dev/business-empire. The corrected UI was checked with two local browser participants, using the same authored source and native contract; that local harness is not the official isolated runner. Five tabs fit at 900×600 and 390×844. Narrow frames scale the original page down and therefore show smaller text and controls. Screenshots are real browser captures, converted from JPEG to PNG without changing the pixels.

## Review status

The fix is prepared for owner review as **Working Multiplayer Cities**, based on accepted revision #0. Submission does not automatically deploy it. The owner must accept/deploy it before the corrected build can be verified publicly.

- Candidate revision: `revision-929e5970-77a1-4983-982e-a4ed09e95df7`
- Native source digest: `36ed9f5f272c706b65d9bf658466b14760f45378e25a1487d18fec5f517cc4ed`
- Native source and limits: [game/README.md](game/README.md)

## Run locally

Use Node.js 22 or newer. From this folder run `npm test` or `npm run preview`, then open http://127.0.0.1:4312. No dependencies are required. The preview executes only trusted authored source, binds to localhost, and must not load untrusted third-party games. Preview, tests, accepted checkpoint fixtures and screenshots are outside the native `game/` upload. Credentials and MCP configuration are excluded.
