import type { GameState, PowerUpKind } from "./types";
import { GAME_WIDTH, GAME_HEIGHT } from "./types";
import { InputManager } from "./input";
import { createPlayer, updatePlayer, hitPlayer } from "./player";
import { updateBullets, pruneDeadBullets } from "./bullet";
import { createEnemy, updateEnemies, damageEnemy, pruneDeadEnemies } from "./enemy";
import { checkCollision } from "./collision";
import { createWaveState, updateWave, getEnemyTypeForWave } from "./wave";
import {
  trySpawnPowerUp,
  collectPowerUps,
  applyPowerUp,
  updateActivePowerUps,
  pruneDeadPowerUps,
  createPlayerBullets,
} from "./powerup";
import {
  drawSprite,
  getCowboySprite,
  ENEMY_BASIC,
  GRASS_TILE_A,
  GRASS_TILE_B,
  TREE_TOP,
  BUSH,
  POWERUP_SPREAD,
  POWERUP_RAPIDFIRE,
  POWERUP_PIERCE,
  POWERUP_NUKE,
} from "./sprites";

const SCALE = 2; // render at 2x for crisp pixels
const CANVAS_WIDTH = GAME_WIDTH * SCALE;
const CANVAS_HEIGHT = GAME_HEIGHT * SCALE;

const BULLET_COLOR = "#f1c40f";

export class GameEngine {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  // offscreen canvas for pixel-perfect rendering at native resolution
  private readonly offscreen: OffscreenCanvas;
  private readonly offCtx: OffscreenCanvasRenderingContext2D;
  private readonly input: InputManager;
  private state: GameState;
  private animFrameId: number | null = null;
  private lastTime = 0;
  private backgroundCanvas: OffscreenCanvas | null = null;
  private onScoreChange?: (score: number) => void;
  private onLivesChange?: (lives: number) => void;
  private onWaveChange?: (wave: number) => void;
  private onGameOver?: (score: number) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    // CSS scaling with pixelated rendering
    this.canvas.style.width = `${CANVAS_WIDTH}px`;
    this.canvas.style.height = `${CANVAS_HEIGHT}px`;
    this.canvas.style.imageRendering = "pixelated";

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D context");
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;

    this.offscreen = new OffscreenCanvas(GAME_WIDTH, GAME_HEIGHT);
    const offCtx = this.offscreen.getContext("2d");
    if (!offCtx) throw new Error("Failed to get offscreen 2D context");
    this.offCtx = offCtx;
    this.offCtx.imageSmoothingEnabled = false;

    this.input = new InputManager();
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      phase: "title",
      player: createPlayer(),
      bullets: [],
      enemies: [],
      powerUps: [],
      wave: createWaveState(),
      score: 0,
      time: 0,
    };
  }

  setCallbacks(cbs: {
    onScoreChange?: (score: number) => void;
    onLivesChange?: (lives: number) => void;
    onWaveChange?: (wave: number) => void;
    onGameOver?: (score: number) => void;
  }): void {
    this.onScoreChange = cbs.onScoreChange;
    this.onLivesChange = cbs.onLivesChange;
    this.onWaveChange = cbs.onWaveChange;
    this.onGameOver = cbs.onGameOver;
  }

  start(): void {
    this.input.bind();
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.input.unbind();
  }

  private loop = (now: number): void => {
    const dt = Math.min((now - this.lastTime) / 1000, 0.05); // cap at 50ms
    this.lastTime = now;

    this.update(dt);
    this.render();
    this.input.endFrame();

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    const { state } = this;

    if (state.phase === "title") {
      // press any key to start
      if (this.input.isJustDown(" ") || this.input.isJustDown("enter")) {
        state.phase = "playing";
        this.onLivesChange?.(state.player.lives);
        this.onWaveChange?.(1);
      }
      return;
    }

    if (state.phase === "gameover") {
      if (this.input.isJustDown(" ") || this.input.isJustDown("enter")) {
        this.state = this.createInitialState();
        this.state.phase = "playing";
        this.onScoreChange?.(0);
        this.onLivesChange?.(this.state.player.lives);
        this.onWaveChange?.(1);
      }
      return;
    }

    // --- playing ---
    state.time += dt;

    // tick active power-up durations
    updateActivePowerUps(state.player, dt);

    // player movement & shooting
    const fireDir = updatePlayer(state.player, this.input, dt);
    if (fireDir) {
      // create bullets with power-up effects (spread/pierce)
      const bullets = createPlayerBullets(state.player, fireDir);
      state.bullets.push(...bullets);
    }

    // bullets
    updateBullets(state.bullets, dt);

    // wave & enemy spawning
    const prevWave = state.wave.current;
    const shouldSpawn = updateWave(state.wave, state.enemies.length, dt);
    if (shouldSpawn) {
      const type = getEnemyTypeForWave(state.wave.current);
      state.enemies.push(createEnemy(type));
    }
    if (state.wave.current !== prevWave) {
      this.onWaveChange?.(state.wave.current);
    }

    // enemy movement
    updateEnemies(state.enemies, state.player.pos, dt);

    // collision: bullets vs enemies
    for (const bullet of state.bullets) {
      if (!bullet.alive || !bullet.fromPlayer) continue;
      for (const enemy of state.enemies) {
        if (!enemy.alive) continue;
        if (checkCollision(bullet, enemy)) {
          // pierce bullets pass through enemies instead of dying
          if (!bullet.pierce) {
            bullet.alive = false;
          }
          const killed = damageEnemy(enemy, bullet.damage);
          if (killed) {
            state.score += enemy.score;
            this.onScoreChange?.(state.score);

            // try spawning a power-up drop
            const powerUp = trySpawnPowerUp(
              enemy.pos,
              state.wave.current,
            );
            if (powerUp) {
              state.powerUps.push(powerUp);
            }
          }
          if (!bullet.pierce) break;
        }
      }
    }

    // collision: player vs power-ups
    const collected = collectPowerUps(state.player, state.powerUps);
    for (const pu of collected) {
      if (pu.kind === "nuke") {
        // nuke: kill all enemies and award score
        for (const enemy of state.enemies) {
          if (enemy.alive) {
            state.score += enemy.score;
            enemy.alive = false;
          }
        }
        this.onScoreChange?.(state.score);
      } else {
        applyPowerUp(state.player, pu);
      }
    }

    // collision: enemies vs player
    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      if (checkCollision(enemy, state.player)) {
        const wasHit = hitPlayer(state.player);
        if (wasHit) {
          this.onLivesChange?.(state.player.lives);
          enemy.alive = false;
          if (!state.player.alive) {
            state.phase = "gameover";
            this.onGameOver?.(state.score);
          }
        }
      }
    }

    // prune dead entities
    state.bullets = pruneDeadBullets(state.bullets);
    state.enemies = pruneDeadEnemies(state.enemies);
    state.powerUps = pruneDeadPowerUps(state.powerUps);
  }

  private render(): void {
    const ctx = this.offCtx;
    const { state } = this;

    // draw cached background (grass + border decorations)
    if (!this.backgroundCanvas) {
      this.backgroundCanvas = this.buildBackground();
    }
    ctx.drawImage(this.backgroundCanvas, 0, 0);

    if (state.phase === "title") {
      this.renderTitle(ctx);
      this.blitToScreen();
      return;
    }

    // draw power-ups (bobbing effect)
    for (const pu of state.powerUps) {
      if (!pu.alive) continue;
      const sprite = this.getPowerUpSprite(pu.kind);
      // gentle bob animation
      const bob = Math.sin(state.time * 4) * 2;
      drawSprite(ctx, sprite, pu.pos.x, pu.pos.y + bob);
    }

    // draw bullets
    ctx.fillStyle = BULLET_COLOR;
    for (const bullet of state.bullets) {
      if (!bullet.alive) continue;
      ctx.fillRect(
        Math.round(bullet.pos.x),
        Math.round(bullet.pos.y),
        bullet.size,
        bullet.size,
      );
    }

    // draw enemies
    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      drawSprite(ctx, ENEMY_BASIC, enemy.pos.x, enemy.pos.y);
    }

    // draw player (blink when invincible)
    if (state.player.alive) {
      const blink =
        state.player.invincibleTimer > 0 &&
        Math.floor(state.player.invincibleTimer * 10) % 2 === 0;
      if (!blink) {
        const sprite = getCowboySprite(state.player.direction);
        drawSprite(ctx, sprite, state.player.pos.x, state.player.pos.y);
      }
    }

    if (state.phase === "gameover") {
      this.renderGameOver(ctx);
    }

    this.blitToScreen();
  }

  private getPowerUpSprite(kind: PowerUpKind) {
    switch (kind) {
      case "spread": return POWERUP_SPREAD;
      case "rapidfire": return POWERUP_RAPIDFIRE;
      case "pierce": return POWERUP_PIERCE;
      case "nuke": return POWERUP_NUKE;
    }
  }

  /** Build a static background canvas with grass tiles and border decorations */
  private buildBackground(): OffscreenCanvas {
    const bg = new OffscreenCanvas(GAME_WIDTH, GAME_HEIGHT);
    const ctx = bg.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    // tile grass
    const tileW = GRASS_TILE_A[0].length;
    const tileH = GRASS_TILE_A.length;
    for (let y = 0; y < GAME_HEIGHT; y += tileH) {
      for (let x = 0; x < GAME_WIDTH; x += tileW) {
        const tile = ((x / tileW + y / tileH) % 2 === 0) ? GRASS_TILE_A : GRASS_TILE_B;
        drawSprite(ctx, tile, x, y);
      }
    }

    // draw border decorations: trees and bushes around the edges
    // top edge
    for (let x = 0; x < GAME_WIDTH; x += 32) {
      drawSprite(ctx, TREE_TOP, x, -6);
    }
    // bottom edge
    for (let x = 8; x < GAME_WIDTH; x += 40) {
      drawSprite(ctx, BUSH, x, GAME_HEIGHT - 8);
    }
    // left edge
    for (let y = 24; y < GAME_HEIGHT - 16; y += 48) {
      drawSprite(ctx, TREE_TOP, -6, y);
    }
    // right edge
    for (let y = 40; y < GAME_HEIGHT - 16; y += 48) {
      drawSprite(ctx, TREE_TOP, GAME_WIDTH - 10, y);
    }
    // corner bushes
    drawSprite(ctx, BUSH, 0, GAME_HEIGHT - 8);
    drawSprite(ctx, BUSH, GAME_WIDTH - 16, GAME_HEIGHT - 8);

    return bg;
  }

  private renderTitle(ctx: OffscreenCanvasRenderingContext2D): void {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.fillStyle = "#f5f0e1";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    ctx.fillText("PEW.MD", GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20);

    ctx.font = "8px monospace";
    ctx.fillText("Press SPACE to start", GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10);
    ctx.fillText("WASD / Arrows to move & shoot", GAME_WIDTH / 2, GAME_HEIGHT / 2 + 25);
  }

  private renderGameOver(ctx: OffscreenCanvasRenderingContext2D): void {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.fillStyle = "#c0392b";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", GAME_WIDTH / 2, GAME_HEIGHT / 2 - 15);

    ctx.fillStyle = "#f5f0e1";
    ctx.font = "10px monospace";
    ctx.fillText(`Score: ${this.state.score}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 5);

    ctx.font = "8px monospace";
    ctx.fillText("Press SPACE to retry", GAME_WIDTH / 2, GAME_HEIGHT / 2 + 25);
  }

  /** Scale the offscreen canvas onto the visible canvas */
  private blitToScreen(): void {
    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.ctx.drawImage(this.offscreen, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
}
