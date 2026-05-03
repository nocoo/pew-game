import { describe, test, expect } from "vitest";
import { checkCollision } from "@/game/collision";

describe("collision", () => {
  test("overlapping entities collide", () => {
    const a = { pos: { x: 10, y: 10 }, size: 16, alive: true };
    const b = { pos: { x: 15, y: 15 }, size: 16, alive: true };
    expect(checkCollision(a, b)).toBe(true);
  });

  test("non-overlapping entities do not collide", () => {
    const a = { pos: { x: 0, y: 0 }, size: 16, alive: true };
    const b = { pos: { x: 100, y: 100 }, size: 16, alive: true };
    expect(checkCollision(a, b)).toBe(false);
  });

  test("edge-touching entities do not collide", () => {
    const a = { pos: { x: 0, y: 0 }, size: 16, alive: true };
    const b = { pos: { x: 16, y: 0 }, size: 16, alive: true };
    expect(checkCollision(a, b)).toBe(false);
  });

  test("same position entities collide", () => {
    const a = { pos: { x: 50, y: 50 }, size: 10, alive: true };
    const b = { pos: { x: 50, y: 50 }, size: 10, alive: true };
    expect(checkCollision(a, b)).toBe(true);
  });
});
