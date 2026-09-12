# Pew Game

- Repository: `nocoo/pew-game`; website: `https://pew.hexly.ai`.
- Worker and independent D1 database: `pew-game`, configured in `wrangler.jsonc`.
- This is the pixel shooter, separate from `nocoo/pew` / `pew.md`. Do not reuse that application's infrastructure or the `hexly-status` database.

## Architecture

Next.js statically exports the existing React/Canvas game to `out/`. Workers Static Assets serves the page; `worker/index.ts` handles `/api/token`, `/api/scores`, and `/api/live` directly. Keep this deployment free of an application server, adapter, container, native SQLite dependency, or persistent volume.

D1 migrations live in `migrations/`. Rankings persist indefinitely; there is no cleanup cron. Status's seven-day observation retention is a different database policy. Never import a local `pew.db` or write test scores to production without explicit authorization.

The client submits plausibility-checked scores, not authoritative game replays. Preserve the existing game rules and score ceilings. Web Crypto signs and verifies tokens using the `ANTICHEAT_SECRET` binding. Never add a fallback secret or log it. Score insertion and `session_id UNIQUE` replay protection must remain atomic in D1 across requests, failures, and restarts. Identical signed retries with the same normalized name, score, and wave return the original public score, preserving its ID, duration, and creation time; conflicting reuse returns HTTP 403. Keep the successful HTTP 201 response shape for both the initial save and identical retries. Verify signatures before accepting retries, and never consume a session on a rolled-back write. Keep session IDs and tokens out of public leaderboard results. Validate unknown input, bound request bodies, and keep work independent of attacker-supplied wave counts.

All APIs use `Cache-Control: no-store`. Public `GET /api/live` must remain unauthenticated and perform a real `scores` table query, with HTTP 200/503 and `{status, version, database: {connected}}`. Missing signing configuration also makes health fail. Never expose raw database errors.

## Frontend and interaction

Preserve the original logo and the walnut, brass, and pixel appearance of the prairie arcade. Use responsive layout for desktop, tablet, and phone screens. The engine renders in native 320 × 320 game coordinates onto a 640 × 640 canvas backing; CSS controls the displayed size. Keep the game loop independent of React and the accessible start/result controls in HTML.

- Start with **Start a run**, Space, or Enter. WASD and arrow keys move the player and change the automatic firing direction; stopping preserves the last direction. Do not intercept keyboard input in forms or other interactive controls.
- Show touch direction buttons on screens up to 760px wide and with `@media (any-pointer: coarse)`. Holding a direction moves the player; release input on pointer up, cancellation, lost capture, or blur. Keep keyboard and touch inputs independent so releasing one does not cancel the other. Keep mobile action targets at least 44px tall and allow the result area to grow with its form instead of clipping it inside the square arena.
- Game over offers **Save score** and **Play again**. Accept 1–6 ASCII letters or digits for names. A failed save must retain the name, score, and session for retry, show an error, and allow another attempt. Mark a score saved only after a successful API response.
- **Play again** may discard an unsaved score. Global Space/Enter shortcuts must not discard a ranked result awaiting save. Guard repeated starts and submissions while requests are in progress.
- If `/api/token` fails or times out, allow a clearly labeled **practice run** that cannot submit a ranking. Try to acquire a new token for the next run; never silently present an unranked run as ranked.

Keep the Chinese and English README controls in sync. Their shared desktop screenshot is `assets/screenshots/arcade-desktop.png`; use `../assets/screenshots/arcade-desktop.png` from `docs/README.en.md`. Refresh it when the interface changes.

## Development and checks

- `bun install --frozen-lockfile`; Node.js 22.12+ and Bun are required.
- `bun run dev`: build static pages and run Wrangler directly at `http://127.0.0.1:7050`, using fake local D1 IDs and `.wrangler/dev`. It applies local migrations and generates a gitignored local signing key. Rebuild frontend edits with `bun run build`.
- Local HTTPS: `https://pew-game.dev.hexly.ai` is served by Caddy, which proxies directly to the Worker on `7050`. nmem reserves development/browser-test ports `7050` / `27050`; their inspector ports are `8050` / `28050`. Query nmem before reallocating ports and update Caddy and the local/test scripts together.
- `bun run types` generates `.wrangler/types.d.ts` from current config; never hand-write Env bindings. `bun run typecheck` checks both Next/frontend and Worker-specific types.
- `bun run lint`, `bun run test:coverage`, `bun run test:e2e`, `bun run test:e2e:bdd`, and `bun run deploy:check` validate a release. Browser tests build and serve the real export + Worker + SQLite D1 on `27050`, with separate `.wrangler/browser` data. Integration tests use temporary local SQLite directories and disable remote bindings explicitly; preserve checks for lost responses, identical and conflicting concurrent retries, runtime restarts, and real database write rollbacks.
- Preserve the existing quality thresholds, security checks, and Git hooks. Do not skip hooks, replace checks with `true`, or weaken CI to publish a change.

## Publishing

Increment the patch version `X.Y.Z` to `X.Y.(Z+1)` for routine code releases unless the user specifies another version; this Worker/D1 migration and frontend redesign ships as `0.2.0`. `/api/live` reads the package version. Commit verified changes, push, and wait for the exact commit's GitHub quality CI to pass before deployment.

Use the account configured in Wrangler. `ANTICHEAT_SECRET` is provisioned securely with `wrangler secret put`; do not rotate it on routine deployments. `bun run deploy` builds the static export, applies production `pew-game` migrations, and deploys the Worker/custom domain. It needs Cloudflare Workers and D1 access. Keep production credentials out of the repository and local/test configuration.

After deployment, verify the public homepage, `/api/live` (200, expected version, database connected), and `GET /api/scores`. Confirm the Hexly catalogue and `status.hexly.ai` monitor still target `pew.hexly.ai`. When onboarding or changing project identity/site metadata, follow the shared project onboarding skill and synchronize the source README, GitHub repository/profile entry, Hexly catalogue, and logo archive.
