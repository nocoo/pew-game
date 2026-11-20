# Pew Game

Browser pixel shooter with a persistent leaderboard on Cloudflare Workers Static Assets and D1 (`pew.hexly.ai`, `nocoo/pew-game`).
Docs: [README.md](README.md) · [README.en.md](docs/README.en.md) · [Game Contract](docs/02-game-contract.md) · [Logo Usage](docs/01-logo-usage.md) · [Toolchain](docs/03-typescript-toolchain.md) · [Retrospective](Retrospective.md)

## Commands

Run from root with Bun (CI 1.4.2) and Node 22.12+. `dev` builds first; rebuild frontend edits explicitly. Local signing keys auto-generate into ignored `.dev.vars.*` files; no prod credentials needed locally.

```sh
bun install --frozen-lockfile
bun run dev           # build + https://pew-game.dev.hexly.ai -> 127.0.0.1:7050
bun run start         # serve existing out/ with local Worker
bun run types         # generate .wrangler/types.d.ts (never hand-write)
bun run typecheck     # S1: app + tsconfig.worker.json
bun run lint          # S2: Biome check-only, 0 warnings/errors
bun run build         # B1: types + Next.js static export to out/
bun run test:coverage # L1: Vitest v8 >= 95% (4 metrics)
bun run test:e2e      # L3: Vitest integration + game-loop on real local D1
bunx playwright install chromium
bun run test:e2e:bdd  # L4: build + Playwright on local Worker/SQLite
bun run deploy:check  # Wrangler dry-run packaging check only
```

## Invariants

- Distinct from `nocoo/pew` (`pew.md`): Worker and D1 are both `pew-game`. Never share `hexly-status` resources or its retention policy.
- Next.js statically exports to `out/` served by Workers Static Assets; `worker/index.ts` handles `/api/token`, `/api/scores`, `/api/live`. No app server, adapter, container, native SQLite prod dep, or volume.
- D1 rankings (`migrations/`, `wrangler.jsonc`) persist indefinitely with no cleanup cron; never import local `pew.db` or write automated/test scores to production.
- Preserve plausibility limits, bounded input/work, and HMAC verification (`ANTICHEAT_SECRET`) before retries; never add a fallback secret or log tokens/secrets.
- Keep `session_id UNIQUE` and score writes atomic in D1 across failures, restarts, and concurrency; never consume a session on a rolled-back write.
- Identical signed retries return the original public score with HTTP 201 (preserving ID/duration/created time); conflicting normalized name/score/wave returns 403. Hide session IDs and tokens from responses.
- All APIs return `Cache-Control: no-store`. Public `/api/live` reads root `package.json` version, queries `scores` and signing config, and returns 200/503 with no private error details.
- Preserve 320×320 coordinates, 640×640 backing canvas, independent game loop, walnut/brass identity, and save/practice rules in [02-game-contract.md](docs/02-game-contract.md).
- A failed save retains the original score, name, and session for retry; only an explicit new game may discard an unsaved ranked score.
- Keep ZH/EN README controls and `assets/screenshots/arcade-desktop.png` aligned. Brand/logo updates follow [01-logo-usage.md](docs/01-logo-usage.md) and the Hexly onboarding/archive workflow.
- Authorized releases bump patch by default, sync `package.json` version, and await exact-commit `quality / Z1: Gate` before `.github/workflows/release.yml` or `bun run deploy`.
- `bun run deploy` builds, applies prod D1 migrations, and deploys while keeping `ANTICHEAT_SECRET` stable; verify homepage, `/api/live`, read-only scores, and Hexly catalogue/status.

## Quality & Local Gates

Follows `system1-quality`; CI slots and pinned `base-ci` revision live in `.github/workflows/quality-slots.yml` (`quality / Z1: Gate` required on `main`). Status vocabulary: `enforced`, `planned`, `manual`, `N/A`.

- **Thresholds & scope**: Zero warnings/errors and no focused/skipped tests. `L1` enforces 95%×4 on selected `src/game/`, `src/lib/`, and `worker/index.ts` files in `vitest.config.ts`.
- **Exceptions / gaps**: `L2 Runtime` is `N/A` (Worker bindings covered by `L3`/`L4`); `P1 Package` is `N/A` (not published to npm); docs/screenshot sync is `manual`.
- **L3 boundary**: `test:e2e` invokes Worker handlers directly on real local D1, not HTTP; `L4` (`test:e2e:bdd`) tests real HTTP browser flows without a full API-inventory HTTP gate.
- **Pre-commit**: Installed via `bun run prepare` (`.husky/`). Gates a `git checkout-index` snapshot: staged `gitleaks` (`G1`), lockfile/worktree match, `S1`, `S2`, `L1` (`coverage/` required).
- **Pre-push**: Runs `build`, `test`, `lint`, `test:e2e`, and `osv-scanner` (`G2`) on the working tree; stdin pushed-ref checks are `planned`. Missing scanners fail the gate; never bypass hooks.

## Resources & Isolation

| Lane | Endpoint / State | Boundary |
| --- | --- | --- |
| Dev | `https://pew-game.dev.hexly.ai` -> `:7050` (inspector `:8050`), `.wrangler/dev` | Fake local D1 (`...0001`), `.dev.vars.local` |
| Browser (L4) | `127.0.0.1:27050` (inspector `:28050`), `.wrangler/browser` | Fake test D1 (`...0002`), `.dev.vars.test`; reset per run |
| Integration (L3) | Temp SQLite dir (`pew-game-d1-test-*`) | `getPlatformProxy` with `remoteBindings: false` |
| Prod | `https://pew.hexly.ai` | Independent `pew-game` Worker & D1; permanent rankings; read-only unless authorized |

- Keep Caddy, `scripts/local-worker.ts`, and `playwright.config.ts` ports aligned. Never create remote `-test` resources or use production rankings as fixtures.
- Browser isolation hardening is `planned`: per-run temp persistence plus local-context and `_test_marker` guards before seed/reset/cleanup, rejecting prod credentials.

## Retrospective

Record incident narratives in [Retrospective.md](Retrospective.md); promote recurring constraints to `Invariants` above and deterministic checks to tests/hooks.
