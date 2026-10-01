# Changelog

## v0.2.2 - 2026-10-01

- Upgrade to stable TypeScript 7.0.2 and replace ESLint with Biome 2.5.15, without a preview compiler or legacy compatibility workspace.
- Preserve strict lint, React/Next checks and four-metric 95% coverage gates; add lint rejection tests and improve control semantics.
- Remove the obsolete ESLint minimatch patch and its dependency-only tests.
- Include the previously deployed Next.js 16.3.8, Wrangler 4.145.0, Vitest 5.0.3 and Node.js types 26.6.3 updates, resolving undici and brace-expansion advisories.

## v0.2.1 - 2026-09-24

- Upgrade Next.js and its ESLint configuration to 16.3.6, Wrangler to 4.138.0, ESLint to 10.11.0, and Node.js types to 26.6.2.
- Keep the release workflow pinned to the installed Wrangler version.
- Enforce the documented 95% branch coverage threshold alongside the existing statements, functions, and lines thresholds.
- Preserve the original dependency and coverage commits from PR #227.
