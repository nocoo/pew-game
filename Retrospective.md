# Retrospective

## 2026-09-24 — Mirror URLs reached a local dependency commit

The dependency installation embedded Tencent tarball URLs in all registry entries of `bun.lock`. The local commit ran before the required registry-neutral lockfile check, producing an unnecessarily large diff that would have pinned CI to a local installation mirror. This was detected before push. The commit was amended to restore empty registry URLs while retaining versions and integrity hashes, followed by a frozen installation and normal hooks. Inspect lockfile URLs and diff size before staging dependency updates.

## 2026-10-01: TypeScript 7 requires separating compiler and linter support

The direct TypeScript 7 upgrade passed application and Worker type checks but
crashed typescript-eslint because TS7 no longer exports its classic compiler API.
Scoped overrides and an experimental lint workspace did not solve that peer
resolution. They were removed rather than retained as compatibility paths.
Next.js 16.3.8 already invokes the stable compiler CLI; the native-preview marker
used by older sibling projects was unnecessary. With the owner's approval, Biome
replaced ESLint entirely. Inspect current installed framework documentation and
sibling migration records before constructing a compatibility workaround.

The first Biome gate test used stdin and rejected valid input with a generic
"contents aren't fixed" diagnostic. It could not prove lint rejection. Tests now
use owned temporary source files, verify valid input succeeds, and clean up after
checking invalid cases. The production lint command remains check-only.
