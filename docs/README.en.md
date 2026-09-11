<p align="center">
  <img src="../assets/brand/icon-rounded.png" alt="Pew Game" width="128" height="128" />
</p>

<h1 align="center">Pew Game</h1>

<p align="center">Dodge enemies, collect power-ups, and survive waves of pixel shooting in your browser.</p>

<p align="center">
  <a href="https://pew.hexly.ai">Website</a> ·
  <a href="../README.md">简体中文</a>
</p>

## What it does

Pew Game is a single-player browser shooter inspired by Journey of the Prairie King from Stardew Valley. Move a cowboy around a square arena while firing automatically, survive incoming enemies, and submit your score to the leaderboard after a run.

The page adapts to desktop, tablet, and phone screens, with keyboard controls and directional buttons on touch devices. The original logo, walnut tones, brass accents, and pixel art give it a Western arcade appearance. Character, scenery, and power-up pixel art is drawn in code. The game loop is independent of React; Next.js exports the page; a Cloudflare Worker provides the leaderboard API.

![Pew Game gameplay](../assets/screenshots/arcade-desktop.png)

## Features

- Start with 3 lives and briefly become invincible after a hit; enemy count and spawn rate increase with each wave.
- Encounter basic, fast, and tank enemies as waves progress.
- Fire continuously in the last movement direction, with a small fire-rate bonus while moving.
- Collect spread, rapidfire, pierce, and nuke power-ups; the first three expire after a short duration.
- Submit scores under a name of 1–6 letters or digits and view the all-time top 10.
- Draw in native 320 × 320 game coordinates onto a 640 × 640 canvas backing; the displayed size adapts to the available space.
- Play a clearly labeled practice run when the leaderboard connection is unavailable; failed saves keep the score and form available for retry.

## Usage

Open [Pew Game](https://pew.hexly.ai) and use these controls:

| Action | Key / behavior |
| --- | --- |
| Start | Click Start a run, or press Space / Enter |
| Move and change firing direction | WASD, arrow keys, or hold the touch direction buttons |
| Fire | Continuous auto-fire; stopping preserves the last direction |
| Submit a score | Enter a name of 1–6 letters or digits after game over and click Save score |
| Play again | Click Play again; this discards any unsaved score from the current run |

Touch direction buttons appear on narrow screens and devices with a coarse pointer, such as a touchscreen. After saving a score or finishing a practice run, Space / Enter can also start a new run. While a score is waiting to be saved, use Play again to discard it explicitly.

Enemies can drop power-ups from wave 3 onward. Nukes become available from wave 5.

| Power-up | Effect |
| --- | --- |
| Spread | Fire 3 bullets in a fan |
| Rapidfire | Double the fire rate |
| Pierce | Bullets pass through enemies |
| Nuke | Clear enemies currently on screen |

The leaderboard requires a server connection. If a session token cannot be acquired at the start, the game still begins and displays `PRACTICE RUN · SCORES UNAVAILABLE`. That run cannot enter the rankings; the next run tries to reconnect. If saving a ranked run fails, an error appears while the name and score remain available. Click Save score again to retry. If the server saved the score but its response was lost, retrying confirms the same record without duplicating it.

Scores are submitted by the client; the server checks session signatures, repeated submissions, and score/wave/duration plausibility. It does not replay the entire game.

## Development

Requires Bun and Node.js 22.12+. No Node.js application server, native SQLite module, or persistent volume is needed.

```bash
git clone https://github.com/nocoo/pew-game.git
cd pew-game
bun install --frozen-lockfile
bun run dev
```

`bun run dev` builds the static pages and starts the Wrangler Worker at `http://127.0.0.1:7050`. Local ports are allocated through nmem. Caddy serves local HTTPS at [pew-game.dev.hexly.ai](https://pew-game.dev.hexly.ai), proxying directly to that Worker. The development inspector uses port `8050`. Query nmem before changing ports and update Caddy to match.

Rankings use Wrangler's local SQLite D1 in `.wrangler/dev`. The first start applies migrations and generates an independent local signing key in `.dev.vars.local`. Local configuration uses fake database IDs and forces local execution; it never reads or changes production rankings. After frontend edits, run `bun run build` and refresh. Wrangler reloads Worker edits automatically. Use `bun run start` to serve an existing build.

```bash
bun run typecheck       # Generate Worker Env types; check frontend and Worker
bun run check           # ESLint, unit, game-loop, and local D1 integration tests
bun run test:coverage
bun run test:e2e:bdd    # Build and test real gameplay and ranking in a browser
```

## Deployment

The site is [pew.hexly.ai](https://pew.hexly.ai). The Cloudflare Worker and its independent D1 database are both named `pew-game`. [wrangler.jsonc](../wrangler.jsonc) owns the binding and custom domain. This game is separate from `nocoo/pew` and `pew.md`, and does not share the `hexly-status` database.

Log in to the intended Cloudflare account and set an independently generated random signing key of at least 32 characters using the interactive command. Existing deployments do not need a new key for each release; rotating it invalidates tokens for games in progress.

```bash
bunx wrangler login
bunx wrangler secret put ANTICHEAT_SECRET --env ""
```

After repository quality checks and GitHub CI pass:

```bash
bun run deploy:check    # Validate the Worker bundle and configuration without publishing
bun run deploy         # Build → apply production D1 migrations → deploy Worker and assets
```

Workers Static Assets serves the exported page directly; a native Worker handles `/api/*`. HMAC tokens use the Worker secret and Web Crypto. Saving the score also records its session atomically under `scores.session_id UNIQUE`. Retrying the same signed session with the same normalized name, score, and wave returns the original score, preserving its ID, duration, and creation time. Changing any of those submitted fields returns HTTP 403. Lost responses, concurrent retries, and Worker restarts cannot duplicate a score. Rankings are retained indefinitely, without scheduled jobs. Status's seven-day observation retention does not apply to game rankings. A local `pew.db` is never imported automatically.

Public `GET /api/live` queries the actual `scores` table and checks signing-key configuration. It returns HTTP 200 when healthy or 503 if D1, its schema, or the signing configuration is unavailable. Its body is `{status, version, database: {connected}}`, without internal error details. All API responses use `Cache-Control: no-store`. After deployment, verify the homepage, `/api/live`, and `GET /api/scores`; never insert test scores into production.

## Tests

| Test layer | Command |
| --- | --- |
| Unit, game-loop, and local D1 integration | `bun run test` |
| Game-loop and Worker/D1 integration | `bun run test:e2e` |
| Browser gameplay and ranking persistence | `bun run test:e2e:bdd` |

Install Chromium with `bunx playwright install chromium` before browser tests. Playwright serves the static export and real Worker APIs on nmem-allocated port `27050`, with inspector port `28050`, using a separate SQLite D1 in `.wrangler/browser`. Only this local browser database is reset at test startup. Browser tests cover a complete game, retrying a failed save, rankings after reload, leaderboard error recovery, keyboard start, practice mode, responsive layout, and touch buttons. D1 integration tests use temporary SQLite directories and cover migrations, ranking, lost-response retries, concurrent and conflicting submissions, runtime restarts, write rollbacks, and health responses; they delete their temporary data afterward.

```text
src/game/          Input, game loop, pixel drawing, and combat rules
src/components/    Canvas container, score form, and leaderboard
src/lib/           D1 queries, Web Crypto signatures, and score validation
worker/index.ts    Session tokens, score APIs, and /api/live
migrations/        D1 leaderboard schema
src/__tests__/     Unit, game-loop, and local D1 integration tests
e2e/bdd/           Static export + Worker + SQLite D1 browser test
```

## Stack

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![Canvas](https://img.shields.io/badge/Canvas_2D-555555)
![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)

| Area | Implementation |
| --- | --- |
| Game | TypeScript, Canvas 2D, OffscreenCanvas, requestAnimationFrame |
| Web page | Next.js static export, React, Tailwind CSS |
| APIs and leaderboard | Cloudflare Workers Static Assets, D1, Web Crypto HMAC |
| Development and testing | Bun, ESLint, Vitest, Playwright |

## Documentation

- [Logo usage guide](01-logo-usage.md)
- [Project visual archive](https://hexly.ai/logos/pew-game)
- [Game types and arena definitions](../src/game/types.ts)

## License

[MIT](../LICENSE) © 2026 Zheng Li
