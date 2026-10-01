# TypeScript Toolchain

The application and Worker use stable TypeScript 7.0.2. Next.js 16.3.8 runs the
project-local compiler CLI during builds; no native-preview package, legacy
compiler API, compiler alias or lint workspace is needed.

Biome 2.5.15 replaces ESLint and eslint-config-next. `bun run lint` is check-only
and rejects warnings. It covers the previous source, Worker, script and browser
test scope plus root TypeScript, JavaScript and JSON configuration. React and
Next recommended domains preserve framework-aware linting. Unused variables,
imports, parameters, hook ordering, missing hook dependencies and focused/skipped
tests are explicitly errors. Formatting remains outside this lint-only migration.

The hook dependency rule allows extra dependencies, matching the former React
effect behavior: leaderboard refresh and retry counters intentionally trigger a
new request without appearing inside its callback. Missing dependencies still
fail. `lint-config.test.ts` verifies both cases and rejection of unused variables
and focused/skipped tests. Biome's framework rules are not a one-to-one copy of
every ESLint plugin rule; the existing TypeScript, unit, integration and browser
gates remain required.

The removed minimatch patch and two dependency-shape tests existed only for the
deleted ESLint dependency graph. Application coverage scope and all four 95%
thresholds remain unchanged.

Run `bun run typecheck`, `bun run lint`, `bun run test:coverage`,
`bun run test:e2e`, `bun run test:e2e:bdd` and `bun run deploy:check` before release.
