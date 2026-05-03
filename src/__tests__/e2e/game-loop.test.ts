import { describe, test, expect } from "vitest";
import { createPlayer, updatePlayer, hitPlayer } from "@/game/player";
import { updateBullets, pruneDeadBullets } from "@/game/bullet";
import { createEnemy, updateEnemies, damageEnemy, pruneDeadEnemies } from "@/game/enemy";
import { checkCollision } from "@/game/collision";
import { createWaveState, updateWave, getEnemyTypeForWave } from "@/game/wave";
import {
  trySpawnPowerUp,
  collectPowerUps,
  applyPowerUp,
  updateActivePowerUps,
  pruneDeadPowerUps,
  createPlayerBullets,
  createPowerUp,
} from "@/game/powerup";
import { InputManager } from "@/game/input";
import type { GameState } from "@/game/types";

// simulate a minimal game loop without canvas/rendering
function createTestGameState(): GameState {
  return {
    phase: "playing",
    player: createPlayer(),
    bullets: [],
    enemies: [],
    powerUps: [],
    wave: createWaveState(),
    score: 0,
    time: 0,
  };
}

function createMockInput(dir: { x: number; y: number }): InputManager {
  const input = new InputManager();
  input.getDirection = () => dir;
  return input;
}

function simulateFrame(
  state: GameState,
  input: InputManager,
  dt: number,
): void {
  if (state.phase !== "playing") return;
  state.time += dt;

  // tick active power-ups
  updateActivePowerUps(state.player, dt);

  // player
  const fireDir = updatePlayer(state.player, input, dt);
  if (fireDir) {
    const bullets = createPlayerBullets(state.player, fireDir);
    state.bullets.push(...bullets);
  }

  // bullets
  updateBullets(state.bullets, dt);

  // wave
  const shouldSpawn = updateWave(state.wave, state.enemies.length, dt);
  if (shouldSpawn) {
    const type = getEnemyTypeForWave(state.wave.current);
    state.enemies.push(createEnemy(type));
  }

  // enemy movement
  updateEnemies(state.enemies, state.player.pos, dt);

  // bullet-enemy collision
  for (const bullet of state.bullets) {
    if (!bullet.alive || !bullet.fromPlayer) continue;
    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      if (checkCollision(bullet, enemy)) {
        if (!bullet.pierce) {
          bullet.alive = false;
        }
        const killed = damageEnemy(enemy, bullet.damage);
        if (killed) {
          state.score += enemy.score;
          // try spawning power-up
          const pu = trySpawnPowerUp(enemy.pos, state.wave.current);
          if (pu) state.powerUps.push(pu);
        }
        if (!bullet.pierce) break;
      }
    }
  }

  // power-up collection
  const collected = collectPowerUps(state.player, state.powerUps);
  for (const pu of collected) {
    if (pu.kind === "nuke") {
      for (const enemy of state.enemies) {
        if (enemy.alive) {
          state.score += enemy.score;
          enemy.alive = false;
        }
      }
    } else {
      applyPowerUp(state.player, pu);
    }
  }

  // enemy-player collision
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    if (checkCollision(enemy, state.player)) {
      const wasHit = hitPlayer(state.player);
      if (wasHit) {
        enemy.alive = false;
        if (!state.player.alive) {
          state.phase = "gameover";
        }
      }
    }
  }

  state.bullets = pruneDeadBullets(state.bullets);
  state.enemies = pruneDeadEnemies(state.enemies);
  state.powerUps = pruneDeadPowerUps(state.powerUps);
}

describe("e2e: full game loop", () => {
  test("game starts in playing phase and can progress through waves", () => {
    const state = createTestGameState();
    const input = createMockInput({ x: 0, y: 0 }); // idle

    // simulate 3 seconds — wave should start
    for (let i = 0; i < 180; i++) {
      simulateFrame(state, input, 1 / 60);
    }

    expect(state.wave.current).toBeGreaterThanOrEqual(1);
  });

  test("player fires bullets even when standing still", () => {
    const state = createTestGameState();
    const input = createMockInput({ x: 0, y: 0 }); // idle

    // simulate a few frames
    for (let i = 0; i < 30; i++) {
      simulateFrame(state, input, 1 / 60);
    }

    // should have fired at least 1 bullet while standing still
    // (bullets may have gone out of bounds, but at least some should exist)
    // We check that bullets were ever created by checking score remains 0
    // (no enemies to hit) but the player has a fire cooldown set
    expect(state.player.fireCooldown).toBeGreaterThan(0);
  });

  test("player can shoot and kill enemies to gain score", () => {
    const state = createTestGameState();

    // place an enemy directly to the right of the player
    const enemy = createEnemy("basic");
    enemy.pos = { x: state.player.pos.x + 50, y: state.player.pos.y };
    state.enemies.push(enemy);

    // player shoots right
    const input = createMockInput({ x: 1, y: 0 });

    // simulate until bullet hits or 5 seconds
    for (let i = 0; i < 300; i++) {
      simulateFrame(state, input, 1 / 60);
      if (state.score > 0) break;
    }

    expect(state.score).toBeGreaterThan(0);
    expect(state.enemies.length).toBe(0);
  });

  test("enemy collision damages player and triggers gameover at 0 lives", () => {
    const state = createTestGameState();
    state.player.lives = 1;
    state.player.fireCooldown = 999; // prevent auto-fire from interfering

    // place enemy on top of player
    const enemy = createEnemy("basic");
    enemy.pos = { ...state.player.pos };
    state.enemies.push(enemy);

    const input = createMockInput({ x: 0, y: 0 });
    simulateFrame(state, input, 1 / 60);

    expect(state.player.alive).toBe(false);
    expect(state.phase).toBe("gameover");
  });

  test("invincible player survives multiple enemy contacts", () => {
    const state = createTestGameState();
    state.player.invincibleTimer = 5; // 5 seconds of invincibility
    state.player.fireCooldown = 999; // prevent auto-fire from killing enemies

    // spam enemies on player position
    for (let i = 0; i < 5; i++) {
      const enemy = createEnemy("basic");
      enemy.pos = { ...state.player.pos };
      state.enemies.push(enemy);
    }

    const input = createMockInput({ x: 0, y: 0 });
    simulateFrame(state, input, 1 / 60);

    expect(state.player.lives).toBe(3);
    expect(state.player.alive).toBe(true);
    // enemies should still be alive (no damage to player = no kill)
    expect(state.enemies.length).toBe(5);
  });

  test("spread power-up creates 3 bullets per shot", () => {
    const state = createTestGameState();
    state.player.activePowerUps = [{ kind: "spread", remaining: 5 }];

    const input = createMockInput({ x: 1, y: 0 });
    simulateFrame(state, input, 1 / 60);

    // first shot should create 3 bullets
    expect(state.bullets.length).toBe(3);
  });

  test("pierce bullets pass through multiple enemies", () => {
    const state = createTestGameState();
    state.player.activePowerUps = [{ kind: "pierce", remaining: 5 }];

    // place two enemies in a line to the right
    const enemy1 = createEnemy("basic");
    enemy1.pos = { x: state.player.pos.x + 30, y: state.player.pos.y };
    const enemy2 = createEnemy("basic");
    enemy2.pos = { x: state.player.pos.x + 60, y: state.player.pos.y };
    state.enemies.push(enemy1, enemy2);

    const input = createMockInput({ x: 1, y: 0 });

    // simulate until both enemies are killed
    for (let i = 0; i < 300; i++) {
      simulateFrame(state, input, 1 / 60);
      if (state.enemies.length === 0) break;
    }

    // both enemies should be dead
    expect(state.enemies.length).toBe(0);
    // score should reflect both kills
    expect(state.score).toBeGreaterThanOrEqual(20); // 2 x 10 for basic
  });

  test("nuke power-up kills all enemies", () => {
    const state = createTestGameState();

    // place enemies around the map
    for (let i = 0; i < 5; i++) {
      const enemy = createEnemy("basic");
      enemy.pos = { x: 50 + i * 40, y: 50 };
      state.enemies.push(enemy);
    }

    // place a nuke power-up on the player
    const nuke = createPowerUp("nuke", { ...state.player.pos });
    state.powerUps.push(nuke);

    const input = createMockInput({ x: 0, y: 0 });
    simulateFrame(state, input, 1 / 60);

    // all enemies should be dead
    expect(state.enemies.length).toBe(0);
    // score should include all enemy scores
    expect(state.score).toBe(50); // 5 x 10
  });

  test("complete game session: survive, score, die", () => {
    const state = createTestGameState();

    // phase 1: player moves and shoots right for 2 seconds
    const shootRight = createMockInput({ x: 1, y: 0 });
    for (let i = 0; i < 120; i++) {
      simulateFrame(state, shootRight, 1 / 60);
    }
    expect(state.player.alive).toBe(true);

    // phase 2: overwhelm with enemies
    state.player.lives = 1;
    state.player.invincibleTimer = 0;
    const enemy = createEnemy("basic");
    enemy.pos = { ...state.player.pos };
    state.enemies.push(enemy);

    const idle = createMockInput({ x: 0, y: 0 });
    simulateFrame(state, idle, 1 / 60);

    expect(state.phase).toBe("gameover");
  });
});
