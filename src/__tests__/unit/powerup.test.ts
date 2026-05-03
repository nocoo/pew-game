import { describe, test, expect } from "vitest";
import {
  canDropPowerUp,
  createPowerUp,
  collectPowerUps,
  applyPowerUp,
  updateActivePowerUps,
  hasActivePowerUp,
  pruneDeadPowerUps,
  createPlayerBullets,
} from "@/game/powerup";
import { createPlayer } from "@/game/player";
import type { Player } from "@/game/types";

function playerAt(x: number, y: number): Player {
  const p = createPlayer();
  p.pos = { x, y };
  return p;
}

describe("powerup", () => {
  test("canDropPowerUp returns false for waves below 3", () => {
    expect(canDropPowerUp(1)).toBe(false);
    expect(canDropPowerUp(2)).toBe(false);
  });

  test("canDropPowerUp returns true for wave 3+", () => {
    expect(canDropPowerUp(3)).toBe(true);
    expect(canDropPowerUp(5)).toBe(true);
  });

  test("createPowerUp creates a valid power-up entity", () => {
    const pu = createPowerUp("spread", { x: 100, y: 100 });
    expect(pu.alive).toBe(true);
    expect(pu.kind).toBe("spread");
    expect(pu.pos).toEqual({ x: 100, y: 100 });
    expect(pu.duration).toBeGreaterThan(0);
  });

  test("nuke power-up has 0 duration (instant)", () => {
    const pu = createPowerUp("nuke", { x: 50, y: 50 });
    expect(pu.duration).toBe(0);
  });

  test("collectPowerUps detects overlap and marks collected as dead", () => {
    const player = playerAt(100, 100);
    const pu = createPowerUp("spread", { x: 102, y: 102 });
    const farPu = createPowerUp("pierce", { x: 300, y: 300 });

    const collected = collectPowerUps(player, [pu, farPu]);
    expect(collected.length).toBe(1);
    expect(collected[0].kind).toBe("spread");
    expect(pu.alive).toBe(false);
    expect(farPu.alive).toBe(true);
  });

  test("applyPowerUp adds timed power-up to player", () => {
    const player = createPlayer();
    const pu = createPowerUp("rapidfire", { x: 0, y: 0 });

    applyPowerUp(player, pu);
    expect(player.activePowerUps.length).toBe(1);
    expect(player.activePowerUps[0].kind).toBe("rapidfire");
    expect(player.activePowerUps[0].remaining).toBeGreaterThan(0);
  });

  test("applyPowerUp refreshes duration if same kind already active", () => {
    const player = createPlayer();
    const pu1 = createPowerUp("spread", { x: 0, y: 0 });
    const pu2 = createPowerUp("spread", { x: 0, y: 0 });

    applyPowerUp(player, pu1);
    // simulate some time passing
    player.activePowerUps[0].remaining = 1;
    applyPowerUp(player, pu2);

    expect(player.activePowerUps.length).toBe(1);
    expect(player.activePowerUps[0].remaining).toBe(pu2.duration); // refreshed
  });

  test("applyPowerUp does nothing for nuke (handled by engine)", () => {
    const player = createPlayer();
    const pu = createPowerUp("nuke", { x: 0, y: 0 });

    applyPowerUp(player, pu);
    expect(player.activePowerUps.length).toBe(0);
  });

  test("updateActivePowerUps decrements timers and removes expired", () => {
    const player = createPlayer();
    player.activePowerUps = [
      { kind: "spread", remaining: 2 },
      { kind: "rapidfire", remaining: 0.5 },
    ];

    updateActivePowerUps(player, 1);
    // spread: 2 - 1 = 1 (still active)
    // rapidfire: 0.5 - 1 = -0.5 (expired)
    expect(player.activePowerUps.length).toBe(1);
    expect(player.activePowerUps[0].kind).toBe("spread");
    expect(player.activePowerUps[0].remaining).toBeCloseTo(1);
  });

  test("hasActivePowerUp checks correctly", () => {
    const player = createPlayer();
    expect(hasActivePowerUp(player, "spread")).toBe(false);

    player.activePowerUps = [{ kind: "pierce", remaining: 3 }];
    expect(hasActivePowerUp(player, "pierce")).toBe(true);
    expect(hasActivePowerUp(player, "spread")).toBe(false);
  });

  test("pruneDeadPowerUps removes dead power-ups", () => {
    const pu1 = createPowerUp("spread", { x: 0, y: 0 });
    const pu2 = createPowerUp("pierce", { x: 0, y: 0 });
    pu1.alive = false;

    const result = pruneDeadPowerUps([pu1, pu2]);
    expect(result.length).toBe(1);
    expect(result[0].kind).toBe("pierce");
  });

  test("createPlayerBullets creates single bullet without power-ups", () => {
    const player = createPlayer();
    const bullets = createPlayerBullets(player, { x: 1, y: 0 });
    expect(bullets.length).toBe(1);
    expect(bullets[0].pierce).toBe(false);
  });

  test("createPlayerBullets creates 3 bullets with spread", () => {
    const player = createPlayer();
    player.activePowerUps = [{ kind: "spread", remaining: 5 }];

    const bullets = createPlayerBullets(player, { x: 1, y: 0 });
    expect(bullets.length).toBe(3);
    // all should be player bullets
    expect(bullets.every((b) => b.fromPlayer)).toBe(true);
  });

  test("createPlayerBullets creates pierce bullets with pierce power-up", () => {
    const player = createPlayer();
    player.activePowerUps = [{ kind: "pierce", remaining: 5 }];

    const bullets = createPlayerBullets(player, { x: 0, y: -1 });
    expect(bullets.length).toBe(1);
    expect(bullets[0].pierce).toBe(true);
  });

  test("createPlayerBullets combines spread + pierce", () => {
    const player = createPlayer();
    player.activePowerUps = [
      { kind: "spread", remaining: 5 },
      { kind: "pierce", remaining: 5 },
    ];

    const bullets = createPlayerBullets(player, { x: 1, y: 0 });
    expect(bullets.length).toBe(3);
    expect(bullets.every((b) => b.pierce)).toBe(true);
  });
});
