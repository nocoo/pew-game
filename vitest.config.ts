import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/game/bullet.ts",
        "src/game/collision.ts",
        "src/game/enemy.ts",
        "src/game/player.ts",
        "src/game/powerup.ts",
        "src/game/wave.ts",
        "src/lib/anticheat.ts",
      ],
      thresholds: {
        statements: 95,
        functions: 95,
        lines: 95,
        branches: 90,
      },
    },
  },
});
