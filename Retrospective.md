# Retrospective

## 2026-09-24 — Mirror URLs reached a local dependency commit

The dependency installation embedded Tencent tarball URLs in all registry entries of `bun.lock`. The local commit ran before the required registry-neutral lockfile check, producing an unnecessarily large diff that would have pinned CI to a local installation mirror. This was detected before push. The commit was amended to restore empty registry URLs while retaining versions and integrity hashes, followed by a frozen installation and normal hooks. Inspect lockfile URLs and diff size before staging dependency updates.
