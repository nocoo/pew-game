# pew.md

A pixel art twin-stick shooter in the browser, inspired by *Journey of the Prairie King* from Stardew Valley.

Built with Next.js 16, Bun, TypeScript (strict mode), and Tailwind CSS 4. All sprites are drawn purely in code — no image assets.

**[Play now → pew.md](https://pew.md)**

![pew.md gameplay](https://s.zhe.to/dcd0e6e42358/20260222/8f74eaa9-20c4-4d15-990f-52d2349fb950.jpg)

## Play

Move with **WASD** or **Arrow Keys**. Your cowboy auto-fires in the direction you're moving. Survive waves of bandits, collect power-ups, and climb the leaderboard.

### Power-ups (wave 3+, 25% drop on kill)

| Power-up | Effect |
| --- | --- |
| **Spread** | Fires 3 bullets in a fan pattern |
| **Rapidfire** | Doubles fire rate |
| **Pierce** | Bullets pass through enemies |
| **Nuke** | Instantly kills all enemies on screen |

## Tech stack

- **Runtime**: [Bun](https://bun.sh)
- **Framework**: [Next.js 16](https://nextjs.org) (App Router)
- **Language**: TypeScript 6 (strict mode)
- **Styling**: Tailwind CSS 4
- **Database**: SQLite via `better-sqlite3`

## Architecture

```
src/
├── game/          # Pure TypeScript game engine (no React dependency)
│   ├── types.ts   # All interfaces: Player, Bullet, Enemy, PowerUp, etc.
│   ├── engine.ts  # Main loop, state machine, rendering
│   ├── input.ts   # Keyboard manager (WASD + arrows)
│   ├── sprites.ts # Pixel art defined as 2D hex color arrays
│   ├── player.ts  # Movement, auto-fire, power-up effects
│   ├── bullet.ts  # Creation, movement, pierce support
│   ├── enemy.ts   # 3 types (basic/fast/tank), edge spawning, AI
│   ├── collision.ts
│   ├── wave.ts    # Progressive difficulty
│   └── powerup.ts # Spawn, collect, apply, update
├── components/    # React UI layer
│   ├── GameCanvas.tsx   # Canvas mount, session management
│   ├── Leaderboard.tsx  # Top 10 sidebar
│   └── NameInput.tsx    # Game over name entry (1-6 chars)
├── lib/           # Server-side
│   ├── db.ts      # SQLite schema & queries
│   └── anticheat.ts # HMAC session tokens, replay prevention
└── app/
    ├── page.tsx   # Layout: game + leaderboard
    └── api/       # REST endpoints
        ├── token/route.ts  # GET /api/token
        └── scores/route.ts # GET & POST /api/scores
```

**Rendering**: OffscreenCanvas at native 320x320, scaled 2x to 640x640 with `image-rendering: pixelated`.

**Anti-cheat**: Server issues HMAC-signed session tokens at game start. On game over, the client submits the token with the score. The server validates the signature, checks score/wave/duration plausibility, and prevents replay attacks.

## Development

```bash
# install
bun install

# dev server
bun dev

# lint + test
bun run check

# unit tests only
vitest run

# build
bun run build
```

### Test coverage

73 tests across 9 files covering player mechanics, bullet physics, enemy AI, collision detection, wave progression, power-ups, anti-cheat validation, and database operations. Includes E2E game loop simulation.

## License

[MIT](LICENSE)
