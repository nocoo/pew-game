import { describe, test, expect } from "vitest";
import { createWaveState, startNextWave, updateWave, getEnemyTypeForWave } from "@/game/wave";

describe("wave", () => {
  test("createWaveState starts inactive at wave 0", () => {
    const w = createWaveState();
    expect(w.current).toBe(0);
    expect(w.active).toBe(false);
    expect(w.enemiesRemaining).toBe(0);
  });

  test("startNextWave increments wave and sets enemies", () => {
    const w = createWaveState();
    startNextWave(w);
    expect(w.current).toBe(1);
    expect(w.active).toBe(true);
    expect(w.enemiesRemaining).toBeGreaterThan(0);
  });

  test("updateWave transitions from inactive to active after delay", () => {
    const w = createWaveState();
    // simulate time passing beyond the between-wave delay
    updateWave(w, 0, 3);
    expect(w.active).toBe(true);
    expect(w.current).toBe(1);
  });

  test("updateWave returns true when a spawn should happen", () => {
    const w = createWaveState();
    startNextWave(w);
    // advance past spawn interval
    const shouldSpawn = updateWave(w, 0, 2);
    expect(shouldSpawn).toBe(true);
  });

  test("updateWave deactivates wave when all enemies spawned and cleared", () => {
    const w = createWaveState();
    startNextWave(w);
    w.enemiesRemaining = 0;
    // no active enemies
    updateWave(w, 0, 0.1);
    expect(w.active).toBe(false);
  });

  test("getEnemyTypeForWave returns basic for wave 1", () => {
    // wave 1 should only return basic (no fast/tank thresholds met)
    const types = new Set<string>();
    for (let i = 0; i < 100; i++) {
      types.add(getEnemyTypeForWave(1));
    }
    expect(types.has("basic")).toBe(true);
    expect(types.has("tank")).toBe(false); // tank requires wave >= 5
  });
});
