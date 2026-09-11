<p align="center">
  <img src="../assets/brand/icon-rounded.png" alt="Pew Game" width="128" height="128" />
</p>

<h1 align="center">Pew.md</h1>

<p align="center">Dodge enemies, collect power-ups, and survive waves of pixel shooting in your browser.</p>

<p align="center">
  <a href="https://pew.md">Website</a> ·
  <a href="../README.md">简体中文</a>
</p>

## What it does

Pew Game (pew.md) is a single-player browser shooter inspired by Journey of the Prairie King from Stardew Valley. Move a cowboy around a square arena while firing automatically, survive incoming enemies, and submit your score to the leaderboard after a run.

The game uses keyboard controls and is intended for desktop browsers. Character, scenery, and power-up pixel art is drawn in code. The game loop is independent of React; Next.js provides the page and leaderboard.

![Pew.md gameplay](https://s.zhe.to/dcd0e6e42358/20260222/8f74eaa9-20c4-4d15-990f-52d2349fb950.jpg)

## Features

- Start with 3 lives and briefly become invincible after a hit; enemy count and spawn rate increase with each wave.
- Encounter basic, fast, and tank enemies as waves progress.
- Fire continuously in the last movement direction, with a small fire-rate bonus while moving.
- Collect spread, rapidfire, pierce, and nuke power-ups; the first three expire after a short duration.
- Submit scores under a name of 1–6 letters or digits and view the all-time top 10.
- Draw at a logical resolution of 320 × 320 and display at 2× scale with crisp pixels.

## Usage

Open [pew.md](https://pew.md) and use these controls:

| Action | Key / behavior |
| --- | --- |
| Start | Space or Enter |
| Move and change firing direction | WASD or arrow keys |
| Fire | Continuous auto-fire; stopping preserves the last direction |
| Submit a score | Enter a name after game over and click Save, or choose Skip |
| Play again | Close the score form, then press Space or Enter |

Enemies can drop power-ups from wave 3 onward. Nukes become available from wave 5.

| Power-up | Effect |
| --- | --- |
| Spread | Fire 3 bullets in a fan |
| Rapidfire | Double the fire rate |
| Pierce | Bullets pass through enemies |
| Nuke | Clear enemies currently on screen |

The leaderboard requires a server connection. Scores are submitted by the client; the server checks session signatures, repeated submissions, and score/wave/duration plausibility. It does not replay the entire game.

## Development

Requires Bun and Node.js 22.12+. `better-sqlite3` is a native module; dependency installation must complete its build or install a prebuilt binary.

```bash
git clone https://github.com/nocoo/pew-game.git
cd pew-game
bun install --frozen-lockfile
bun run dev
```

The development server defaults to `http://localhost:3000`. SQLite tables are created on first access, using `pew.db` in the repository root by default.

| Environment variable | Purpose |
| --- | --- |
| `DATABASE_PATH` | SQLite file path; its parent directory must exist, and deployed data needs persistent storage |
| `ANTICHEAT_SECRET` | HMAC key for session tokens; set an independent random value for deployment |

```bash
bun run check       # ESLint and tests
bun run typecheck
bun run build
bun run start
```

The [Dockerfile](../Dockerfile) uses `/app/data/pew.db`. Mount persistent storage at `/app/data` and set `ANTICHEAT_SECRET` when deploying. Repeated-submission records currently live in the server process's memory. The service provides a public health check endpoint `GET /api/live` with `Cache-Control: no-store`, returning HTTP 200 when the database is healthy and HTTP 503 on failure.

```text
src/game/          Input, game loop, pixel drawing, and combat rules
src/components/    Canvas container, score form, and leaderboard
src/lib/           SQLite and score validation
src/app/api/       Session token, score APIs, and health check (/api/live)
src/__tests__/     Unit and game-loop tests
e2e/bdd/           Browser page smoke test
```

## Tests

Run from the repository root:

| Test layer | Command |
| --- | --- |
| Unit and game-loop tests | `bun run test` |
| Game-loop integration tests only | `bun run test:e2e` |
| Browser smoke test | `bun run test:e2e:bdd` |

Run `bunx playwright install chromium` before browser tests. Playwright starts a local server on port `23000` and checks the page title and main heading. Game-loop tests check rules through simulated frames without Canvas. Verify rendering, keyboard feel, and score submission by opening the game. Use `bun run test:coverage` to generate a coverage report.

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
| Web page and APIs | Next.js App Router, React, Tailwind CSS |
| Leaderboard | SQLite, better-sqlite3, Node.js HMAC |
| Development and testing | Bun, ESLint, Vitest, Playwright |

## Documentation

- [Logo usage guide](01-logo-usage.md)
- [Project visual archive](https://hexly.ai/logos/pew-game)
- [Game types and arena definitions](../src/game/types.ts)

## License

[MIT](../LICENSE) © 2026 Zheng Li
