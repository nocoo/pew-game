# Pew Game

Browser pixel shooter with a persistent leaderboard served by Cloudflare Workers and D1.
Profile: ts-worker-web.
Direction: [game/interaction contract](docs/02-game-contract.md), [README.md](README.md).

## Sources of Truth

This handbook is the contract; hooks, CI and config enforce it. Raise weaker enforcement to match. Frameworks must not replace this handbook.

| Fact | Where |
| --- | --- |
| Human docs | [README.md](README.md), English README, [logo guide](docs/01-logo-usage.md) |
| Version | Root `package.json`; `/api/live` reads it |
| Runtime | `wrangler.jsonc`, `worker/index.ts`, `migrations/` |
| Enforcement | `.husky/`, CI, Vitest/Playwright, `scripts/local-worker.ts` |
| Secrets | `ANTICHEAT_SECRET` Worker Secret; ignored local/test signing files |
| Accidents | [Retrospective.md](Retrospective.md) |

## Project Invariants

- This is `nocoo/pew-game` / `pew.hexly.ai`, distinct from `nocoo/pew` / `pew.md`. Worker and D1 are both `pew-game`; never share `hexly-status` resources or its retention policy.
- Next exports to `out/`; Worker Static Assets serves it. Native Worker handles token/scores/live APIs. Keep this free of an app server, adapter, container, native SQLite production dependency or persistent volume.
- Rankings persist indefinitely with no cleanup cron. No local `pew.db` imports or automated production score writes.
- Preserve plausibility limits, bounded input/work and HMAC signature verification before retries. `session_id UNIQUE` and score writes remain atomic, including failures/restarts/concurrency; no fallback secret or logged tokens.
- An identical signed retry returns the original public score with HTTP 201; conflicting normalized name/score/wave returns 403. Preserve ID/duration/created time and hide session IDs/tokens.
- All APIs use no-store. Public `/api/live` queries the real scores table and signing configuration, returns version/database 200/503 and no private error details.
- Preserve exact game/keyboard/touch/save/practice behavior, 320×320 coordinates / 640×640 backing canvas, independent game loop and walnut/brass identity in [game contract](docs/02-game-contract.md). Keep English/Chinese controls and shared screenshot aligned.

## Stack / Layout

| Component | Choice |
| --- | --- |
| Game/UI | TypeScript, Canvas/OffscreenCanvas, React/Next static export, Tailwind |
| API/data | Worker Fetch, Web Crypto, D1 and migrations |
| Tooling | Bun, Node 22.12+, ESLint, Vitest and Playwright |
| Layout | `src/game/`, `src/components/`, `src/lib/`, `worker/`, `src/__tests__/`, `e2e/bdd/` |

## Commands

Run from root. `dev` builds first; rebuild frontend edits explicitly. CI uses Bun 1.4.2.

```sh
bun install --frozen-lockfile
bun x --no-install husky
bun run dev
bun run types
bun run typecheck
bun run lint
bun run build
bun run test:coverage
bun run test:e2e
bunx playwright install chromium
bun run test:e2e:bdd
bun run deploy:check
```

`types` generates `.wrangler/types.d.ts`; never hand-write bindings. `start` serves an existing export with the local Worker. Local signing keys are generated into ignored files; no production credentials are needed for local tests. `deploy:check` is packaging only, not deployment.

## Verification

6DQ = L1/L2/L3 + G1/G2 + D1. Status: `enforced`, `planned`, `manual`, `N/A`. No focused/skipped tests; statements/branches/functions/lines each ≥95% required.

| Piece | Requirement and current reality | Status | Evidence |
| --- | --- | --- | --- |
| L1 | Four-metric 95% across first-party game/API logic | planned | Current selected-file Vitest gate is 95/95/95/95; broader first-party scope gap remains |
| L2 | Real HTTP for every API endpoint/method and real SQLite | planned | `test:e2e` invokes handlers with real local D1, not HTTP; browser uses real HTTP but no full API inventory gate |
| L3 | Real gameplay, save/retry, keyboard/touch/responsive flows | enforced | CI `test:e2e:bdd` → built export + Worker/SQLite |
| G1 | Frontend/Worker type checks and ESLint, zero warnings/errors | enforced | Pre-commit and CI |
| G2 | OSV + gitleaks, missing scanner fails | enforced | Staged secret/lockfile hooks and shared CI |
| D1 | Per-run local state, binding/context/marker guards | planned | Integration uses temporary SQLite; browser resets fixed `.wrangler/browser` without marker guard |
| Build | Next static export and Worker package | enforced | Pre-push and CI build; deploy:check available |
| Docs | Shared controls, screenshot and runtime contract updated | manual | README/game guide review |

Current hooks check working-tree types/lint/coverage + staged secrets; pre-push builds/tests/lints/integrates then OSV. Target: check-only index L1/G1 <30s; stdin pushed-ref L2/G2 <3min. Never bypass hooks or weaken tests/security to publish.

## Resources / Isolation

| Purpose | Port / persistence | Isolation |
| --- | --- | --- |
| Dev | Caddy `https://pew-game.dev.hexly.ai` → 7050; inspector 8050 | `.wrangler/dev`, fake local D1 ID |
| Browser | 27050; inspector 28050 | `.wrangler/browser`, separate fake D1 binding |
| Integration | Temporary SQLite directory | `getPlatformProxy` with remote bindings disabled |
| Production | `https://pew.hexly.ai` | Independent `pew-game` D1, permanent rankings |

Keep nmem/Caddy/config port assignments aligned. Required next step is per-run browser persistence plus local context and `_test_marker` checks before seed/reset/cleanup, with production credentials rejected. Never create remote `-test` resources or use real rankings as fixtures.

## Operations / Release

Authorized release: patch by default unless specified, synchronize version, push and await exact-commit CI. `bun run deploy` builds, applies production migrations, then deploys; existing `ANTICHEAT_SECRET` stays stable. Verify homepage, public `/api/live` version/database and read-only scores, plus Hexly catalogue/status targets. Identity changes follow the shared onboarding/archive workflow.

## Retrospective

Store accident narratives in [Retrospective.md](Retrospective.md). Keep project rules brief here, global lessons in nmem/rules and deterministic checks in hooks/tests.

- A failed save retains the original score/name/session; only an explicit new game may discard it.
