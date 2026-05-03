import { describe, test, expect } from "vitest";
import { createEnemy, updateEnemies, damageEnemy, pruneDeadEnemies } from "@/game/enemy";

describe("enemy", () => {
  test("createEnemy creates alive enemy of correct type", () => {
    const e = createEnemy("basic");
    expect(e.alive).toBe(true);
    expect(e.type).toBe("basic");
    expect(e.hp).toBe(1);
    expect(e.score).toBe(10);
  });

  test("createEnemy fast has higher speed", () => {
    const basic = createEnemy("basic");
    const fast = createEnemy("fast");
    expect(fast.speed).toBeGreaterThan(basic.speed);
  });

  test("createEnemy tank has more hp", () => {
    const tank = createEnemy("tank");
    expect(tank.hp).toBe(3);
    expect(tank.maxHp).toBe(3);
  });

  test("updateEnemies moves toward player", () => {
    const e = createEnemy("basic");
    e.pos = { x: 0, y: 0 };
    const playerPos = { x: 100, y: 100 };

    updateEnemies([e], playerPos, 1);
    expect(e.pos.x).toBeGreaterThan(0);
    expect(e.pos.y).toBeGreaterThan(0);
  });

  test("damageEnemy reduces hp and returns true on kill", () => {
    const e = createEnemy("basic");
    const killed = damageEnemy(e, 1);
    expect(killed).toBe(true);
    expect(e.alive).toBe(false);
  });

  test("damageEnemy returns false when not killed", () => {
    const e = createEnemy("tank");
    const killed = damageEnemy(e, 1);
    expect(killed).toBe(false);
    expect(e.alive).toBe(true);
    expect(e.hp).toBe(2);
  });

  test("pruneDeadEnemies removes dead enemies", () => {
    const e1 = createEnemy("basic");
    const e2 = createEnemy("basic");
    e1.alive = false;

    const result = pruneDeadEnemies([e1, e2]);
    expect(result.length).toBe(1);
  });
});
