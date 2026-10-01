// pixel art sprites drawn procedurally via code
// each sprite is a 2D array of hex color strings (or "" for transparent)

export type SpriteData = readonly (readonly string[])[];

// color palette
const _ = ""; // transparent
const K = "#2a1f1e"; // dark outline
const S = "#c4956a"; // skin
const H = "#5b3a29"; // hat brown
const D = "#3e2723"; // hat dark
const W = "#f5f0e1"; // white (shirt)
const B = "#3b5dc9"; // blue jeans
const T = "#8b6914"; // tan/leather (belt, boots)
const R = "#c0392b"; // red bandana
const G = "#6d6d6d"; // gun metal

/** 16x16 cowboy facing down (idle) */
export const COWBOY_DOWN: SpriteData = [
  [_, _, _, _, _, H, H, H, H, H, H, _, _, _, _, _],
  [_, _, _, _, H, H, H, H, H, H, H, H, _, _, _, _],
  [_, _, _, H, H, H, H, H, H, H, H, H, H, _, _, _],
  [_, _, _, H, D, D, D, D, D, D, D, D, H, _, _, _],
  [_, _, _, _, K, S, S, S, S, S, S, K, _, _, _, _],
  [_, _, _, _, S, K, S, S, S, S, K, S, _, _, _, _],
  [_, _, _, _, S, S, S, S, S, S, S, S, _, _, _, _],
  [_, _, _, _, _, S, R, R, R, R, S, _, _, _, _, _],
  [_, _, _, _, _, W, W, W, W, W, W, _, _, _, _, _],
  [_, _, _, _, W, W, W, T, T, W, W, W, _, _, _, _],
  [_, _, _, _, W, W, W, T, T, W, W, W, _, _, _, _],
  [_, _, _, _, _, W, W, W, W, W, W, _, _, _, _, _],
  [_, _, _, _, _, B, B, B, B, B, B, _, _, _, _, _],
  [_, _, _, _, _, B, B, _, _, B, B, _, _, _, _, _],
  [_, _, _, _, _, B, B, _, _, B, B, _, _, _, _, _],
  [_, _, _, _, _, T, T, _, _, T, T, _, _, _, _, _],
];

/** 16x16 cowboy facing up */
export const COWBOY_UP: SpriteData = [
  [_, _, _, _, _, H, H, H, H, H, H, _, _, _, _, _],
  [_, _, _, _, H, H, H, H, H, H, H, H, _, _, _, _],
  [_, _, _, H, H, H, H, H, H, H, H, H, H, _, _, _],
  [_, _, _, H, D, D, D, D, D, D, D, D, H, _, _, _],
  [_, _, _, _, K, D, D, D, D, D, D, K, _, _, _, _],
  [_, _, _, _, S, D, D, D, D, D, D, S, _, _, _, _],
  [_, _, _, _, S, S, S, S, S, S, S, S, _, _, _, _],
  [_, _, _, _, _, S, S, S, S, S, S, _, _, _, _, _],
  [_, _, _, _, _, W, W, W, W, W, W, _, _, _, _, _],
  [_, _, _, _, W, W, W, T, T, W, W, W, _, _, _, _],
  [_, _, _, _, W, W, W, T, T, W, W, W, _, _, _, _],
  [_, _, _, _, _, W, W, W, W, W, W, _, _, _, _, _],
  [_, _, _, _, _, B, B, B, B, B, B, _, _, _, _, _],
  [_, _, _, _, _, B, B, _, _, B, B, _, _, _, _, _],
  [_, _, _, _, _, B, B, _, _, B, B, _, _, _, _, _],
  [_, _, _, _, _, T, T, _, _, T, T, _, _, _, _, _],
];

/** 16x16 cowboy facing right */
export const COWBOY_RIGHT: SpriteData = [
  [_, _, _, _, _, H, H, H, H, H, H, _, _, _, _, _],
  [_, _, _, _, H, H, H, H, H, H, H, H, _, _, _, _],
  [_, _, _, _, H, H, H, H, H, H, H, H, H, _, _, _],
  [_, _, _, _, H, D, D, D, D, D, D, D, H, _, _, _],
  [_, _, _, _, _, S, S, S, S, S, K, _, _, _, _, _],
  [_, _, _, _, _, S, S, S, S, K, S, _, _, _, _, _],
  [_, _, _, _, _, S, S, S, S, S, S, _, _, _, _, _],
  [_, _, _, _, _, _, S, R, R, S, _, _, _, _, _, _],
  [_, _, _, _, _, _, W, W, W, W, G, _, _, _, _, _],
  [_, _, _, _, _, W, W, T, T, W, G, G, _, _, _, _],
  [_, _, _, _, _, W, W, T, T, W, W, _, _, _, _, _],
  [_, _, _, _, _, _, W, W, W, W, _, _, _, _, _, _],
  [_, _, _, _, _, _, B, B, B, B, _, _, _, _, _, _],
  [_, _, _, _, _, _, B, B, B, B, _, _, _, _, _, _],
  [_, _, _, _, _, _, B, B, B, B, _, _, _, _, _, _],
  [_, _, _, _, _, _, T, T, T, T, _, _, _, _, _, _],
];

/** 16x16 cowboy facing left (mirror of right) */
export const COWBOY_LEFT: SpriteData = COWBOY_RIGHT.map((row) => [...row].reverse());

/** Simple enemy sprite — a bandit / outlaw */
const E = "#4a0e0e"; // dark red
const C = "#1a1a1a"; // black clothing
const F = "#d4a574"; // enemy skin

export const ENEMY_BASIC: SpriteData = [
  [_, _, _, _, _, _, C, C, C, C, _, _, _, _, _, _],
  [_, _, _, _, _, C, C, C, C, C, C, _, _, _, _, _],
  [_, _, _, _, C, C, C, C, C, C, C, C, _, _, _, _],
  [_, _, _, _, C, K, K, K, K, K, K, C, _, _, _, _],
  [_, _, _, _, _, F, F, F, F, F, F, _, _, _, _, _],
  [_, _, _, _, _, K, F, F, F, F, K, _, _, _, _, _],
  [_, _, _, _, _, F, F, F, F, F, F, _, _, _, _, _],
  [_, _, _, _, _, _, E, E, E, E, _, _, _, _, _, _],
  [_, _, _, _, _, C, C, C, C, C, C, _, _, _, _, _],
  [_, _, _, _, C, C, C, C, C, C, C, C, _, _, _, _],
  [_, _, _, _, C, C, C, C, C, C, C, C, _, _, _, _],
  [_, _, _, _, _, C, C, C, C, C, C, _, _, _, _, _],
  [_, _, _, _, _, C, C, C, C, C, C, _, _, _, _, _],
  [_, _, _, _, _, C, C, _, _, C, C, _, _, _, _, _],
  [_, _, _, _, _, C, C, _, _, C, C, _, _, _, _, _],
  [_, _, _, _, _, K, K, _, _, K, K, _, _, _, _, _],
];

// cache rendered sprites as OffscreenCanvas for proper alpha compositing
const spriteCache = new Map<SpriteData, OffscreenCanvas>();

/** Render a SpriteData into an OffscreenCanvas (cached) */
function getSpriteCanvas(sprite: SpriteData): OffscreenCanvas {
  const cached = spriteCache.get(sprite);
  if (cached) return cached;

  const h = sprite.length;
  const w = sprite[0].length;
  const offscreen = new OffscreenCanvas(w, h);
  const ctx = offscreen.getContext("2d");
  if (!ctx) throw new Error("Failed to get offscreen 2D context");
  const imageData = ctx.createImageData(w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const color = sprite[y][x];
      if (!color) continue;

      const idx = (y * w + x) * 4;
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      imageData.data[idx] = r;
      imageData.data[idx + 1] = g;
      imageData.data[idx + 2] = b;
      imageData.data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  spriteCache.set(sprite, offscreen);
  return offscreen;
}

type RenderContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Draw a sprite onto a canvas context at game coordinates (with transparency) */
export function drawSprite(
  ctx: RenderContext,
  sprite: SpriteData,
  x: number,
  y: number,
): void {
  const canvas = getSpriteCanvas(sprite);
  ctx.drawImage(canvas, Math.round(x), Math.round(y));
}

/** Pick cowboy sprite based on facing direction */
export function getCowboySprite(dir: { x: number; y: number }): SpriteData {
  if (dir.x > 0.3) return COWBOY_RIGHT;
  if (dir.x < -0.3) return COWBOY_LEFT;
  if (dir.y < -0.3) return COWBOY_UP;
  return COWBOY_DOWN;
}

// --- environment sprites ---

// grass tile colors
const g1 = "#4a8c3f"; // grass base
const g2 = "#3d7a34"; // grass dark
const g3 = "#5a9e4e"; // grass light
const g4 = "#6aad5c"; // grass highlight
const g5 = "#3a6e30"; // grass shadow

/** 16x16 grass tile with texture */
export const GRASS_TILE_A: SpriteData = [
  [g1, g1, g2, g1, g1, g3, g1, g1, g2, g1, g1, g1, g3, g1, g1, g2],
  [g1, g2, g1, g1, g3, g1, g1, g2, g1, g1, g3, g1, g1, g1, g2, g1],
  [g2, g1, g1, g4, g1, g1, g2, g1, g1, g1, g1, g2, g1, g3, g1, g1],
  [g1, g1, g3, g1, g1, g1, g1, g3, g1, g2, g1, g1, g1, g1, g1, g2],
  [g1, g2, g1, g1, g5, g1, g1, g1, g1, g1, g3, g1, g2, g1, g1, g1],
  [g3, g1, g1, g1, g1, g1, g2, g1, g4, g1, g1, g1, g1, g1, g3, g1],
  [g1, g1, g2, g1, g1, g3, g1, g1, g1, g1, g2, g1, g1, g5, g1, g1],
  [g1, g1, g1, g1, g2, g1, g1, g5, g1, g1, g1, g4, g1, g1, g1, g2],
  [g2, g1, g4, g1, g1, g1, g1, g1, g1, g3, g1, g1, g1, g1, g2, g1],
  [g1, g1, g1, g2, g1, g1, g3, g1, g1, g1, g1, g2, g1, g1, g1, g1],
  [g1, g3, g1, g1, g1, g5, g1, g1, g2, g1, g1, g1, g4, g1, g1, g3],
  [g2, g1, g1, g1, g1, g1, g1, g4, g1, g1, g5, g1, g1, g1, g1, g1],
  [g1, g1, g2, g3, g1, g1, g1, g1, g1, g1, g1, g1, g2, g1, g5, g1],
  [g1, g5, g1, g1, g1, g2, g1, g1, g3, g1, g1, g1, g1, g1, g1, g2],
  [g3, g1, g1, g1, g1, g1, g4, g1, g1, g2, g1, g3, g1, g1, g1, g1],
  [g1, g1, g2, g1, g3, g1, g1, g1, g1, g1, g1, g1, g2, g1, g3, g1],
];

export const GRASS_TILE_B: SpriteData = [
  [g2, g1, g1, g3, g1, g1, g1, g2, g1, g1, g4, g1, g1, g2, g1, g1],
  [g1, g1, g4, g1, g1, g2, g1, g1, g3, g1, g1, g1, g2, g1, g1, g3],
  [g1, g3, g1, g1, g1, g1, g5, g1, g1, g1, g1, g3, g1, g1, g5, g1],
  [g1, g1, g1, g2, g1, g1, g1, g1, g2, g4, g1, g1, g1, g1, g1, g1],
  [g2, g1, g1, g1, g1, g3, g1, g1, g1, g1, g1, g2, g1, g4, g1, g1],
  [g1, g5, g1, g1, g2, g1, g4, g1, g1, g1, g3, g1, g1, g1, g1, g2],
  [g1, g1, g1, g1, g1, g1, g1, g2, g1, g5, g1, g1, g2, g1, g1, g1],
  [g3, g1, g2, g1, g1, g5, g1, g1, g1, g1, g1, g1, g1, g3, g1, g1],
  [g1, g1, g1, g1, g3, g1, g1, g1, g4, g1, g2, g1, g1, g1, g1, g5],
  [g1, g4, g1, g2, g1, g1, g1, g1, g1, g1, g1, g1, g5, g1, g2, g1],
  [g2, g1, g1, g1, g1, g1, g2, g3, g1, g1, g1, g4, g1, g1, g1, g1],
  [g1, g1, g5, g1, g1, g4, g1, g1, g1, g2, g1, g1, g1, g1, g3, g1],
  [g1, g1, g1, g3, g1, g1, g1, g1, g5, g1, g1, g1, g2, g1, g1, g1],
  [g4, g1, g1, g1, g2, g1, g1, g1, g1, g1, g3, g1, g1, g5, g1, g1],
  [g1, g2, g1, g1, g1, g1, g3, g1, g1, g1, g1, g2, g1, g1, g1, g4],
  [g1, g1, g1, g5, g1, g1, g1, g2, g1, g4, g1, g1, g1, g1, g2, g1],
];

// tree/bush colors
const t1 = "#2d5a1e"; // dark tree green
const t2 = "#3d7a2e"; // mid tree green
const t3 = "#4d8a3e"; // light tree green
const t4 = "#5d3a1e"; // trunk brown
const t5 = "#4a2e14"; // trunk dark

/** 16x16 tree top (canopy) */
export const TREE_TOP: SpriteData = [
  [_, _, _, _, _, _, t1, t2, t2, t1, _, _, _, _, _, _],
  [_, _, _, _, _, t1, t2, t3, t3, t2, t1, _, _, _, _, _],
  [_, _, _, _, t1, t2, t3, t3, t3, t3, t2, t1, _, _, _, _],
  [_, _, _, t1, t2, t3, t3, t2, t2, t3, t3, t2, t1, _, _, _],
  [_, _, t1, t2, t3, t3, t2, t1, t1, t2, t3, t3, t2, t1, _, _],
  [_, _, t1, t2, t3, t2, t1, t2, t2, t1, t2, t3, t2, t1, _, _],
  [_, t1, t2, t3, t2, t1, t2, t3, t3, t2, t1, t2, t3, t2, t1, _],
  [_, t1, t2, t3, t3, t2, t3, t3, t3, t3, t2, t3, t3, t2, t1, _],
  [t1, t2, t3, t2, t3, t3, t2, t3, t3, t2, t3, t3, t2, t3, t2, t1],
  [t1, t2, t3, t3, t2, t3, t3, t2, t2, t3, t3, t2, t3, t3, t2, t1],
  [_, t1, t2, t3, t3, t3, t2, t1, t1, t2, t3, t3, t3, t2, t1, _],
  [_, t1, t1, t2, t3, t2, t1, _, _, t1, t2, t3, t2, t1, t1, _],
  [_, _, t1, t1, t2, t1, _, _, _, _, t1, t2, t1, t1, _, _],
  [_, _, _, _, t1, _, _, t4, t4, _, _, t1, _, _, _, _],
  [_, _, _, _, _, _, _, t4, t4, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, t5, t5, _, _, _, _, _, _, _],
];

// bush colors
const b1 = "#2a5e1a"; // dark bush
const b2 = "#3a7e2a"; // mid bush
const b3 = "#4a9e3a"; // light bush
const b4 = "#5aae4a"; // highlight bush

/** 16x8 bush sprite */
export const BUSH: SpriteData = [
  [_, _, _, _, b1, b2, b2, b3, b3, b2, b2, b1, _, _, _, _],
  [_, _, _, b1, b2, b3, b3, b4, b4, b3, b3, b2, b1, _, _, _],
  [_, _, b1, b2, b3, b4, b3, b3, b3, b3, b4, b3, b2, b1, _, _],
  [_, b1, b2, b3, b3, b3, b2, b3, b3, b2, b3, b3, b3, b2, b1, _],
  [b1, b2, b3, b2, b3, b2, b1, b2, b2, b1, b2, b3, b2, b3, b2, b1],
  [b1, b2, b3, b3, b2, b1, b2, b3, b3, b2, b1, b2, b3, b3, b2, b1],
  [_, b1, b2, b3, b3, b2, b3, b2, b2, b3, b2, b3, b3, b2, b1, _],
  [_, _, b1, b1, b2, b2, b1, b1, b1, b1, b2, b2, b1, b1, _, _],
];

// --- power-up sprites ---

const pB = "#3498db"; // blue (spread)
const pY = "#f1c40f"; // yellow (rapidfire)
const pP = "#9b59b6"; // purple (pierce)
const pO = "#e67e22"; // orange (nuke)
const pW = "#ffffff"; // white highlight

/** 10x10 spread shot power-up */
export const POWERUP_SPREAD: SpriteData = [
  [_, _, _, pB, pB, pB, pB, _, _, _],
  [_, _, pB, pW, pW, pB, pB, pB, _, _],
  [_, pB, pW, pB, pB, pB, pB, pB, pB, _],
  [pB, pW, pB, pW, pB, pB, pW, pB, pB, pB],
  [pB, pB, pB, pB, pB, pB, pB, pB, pB, pB],
  [pB, pB, pB, pB, pB, pB, pB, pB, pB, pB],
  [pB, pB, pB, pW, pB, pB, pW, pB, pB, pB],
  [_, pB, pB, pB, pB, pB, pB, pB, pB, _],
  [_, _, pB, pB, pB, pB, pB, pB, _, _],
  [_, _, _, pB, pB, pB, pB, _, _, _],
];

/** 10x10 rapid fire power-up */
export const POWERUP_RAPIDFIRE: SpriteData = [
  [_, _, _, pY, pY, pY, pY, _, _, _],
  [_, _, pY, pW, pW, pY, pY, pY, _, _],
  [_, pY, pW, pY, pY, pY, pY, pY, pY, _],
  [pY, pW, pY, pY, pW, pW, pY, pY, pY, pY],
  [pY, pY, pY, pW, pW, pW, pW, pY, pY, pY],
  [pY, pY, pY, pW, pW, pW, pW, pY, pY, pY],
  [pY, pY, pY, pY, pW, pW, pY, pY, pY, pY],
  [_, pY, pY, pY, pY, pY, pY, pY, pY, _],
  [_, _, pY, pY, pY, pY, pY, pY, _, _],
  [_, _, _, pY, pY, pY, pY, _, _, _],
];

/** 10x10 pierce power-up */
export const POWERUP_PIERCE: SpriteData = [
  [_, _, _, pP, pP, pP, pP, _, _, _],
  [_, _, pP, pW, pW, pP, pP, pP, _, _],
  [_, pP, pW, pP, pP, pP, pP, pP, pP, _],
  [pP, pW, pP, pP, pP, pW, pP, pP, pP, pP],
  [pP, pP, pP, pP, pW, pW, pW, pP, pP, pP],
  [pP, pP, pP, pW, pW, pW, pP, pP, pP, pP],
  [pP, pP, pP, pP, pW, pP, pP, pP, pP, pP],
  [_, pP, pP, pP, pP, pP, pP, pP, pP, _],
  [_, _, pP, pP, pP, pP, pP, pP, _, _],
  [_, _, _, pP, pP, pP, pP, _, _, _],
];

/** 10x10 nuke power-up (clear all enemies) */
export const POWERUP_NUKE: SpriteData = [
  [_, _, _, pO, pO, pO, pO, _, _, _],
  [_, _, pO, pW, pW, pO, pO, pO, _, _],
  [_, pO, pW, pO, pO, pO, pO, pO, pO, _],
  [pO, pW, pO, pO, pW, pO, pO, pO, pO, pO],
  [pO, pO, pO, pW, pW, pW, pO, pO, pO, pO],
  [pO, pO, pO, pO, pW, pW, pW, pO, pO, pO],
  [pO, pO, pO, pO, pO, pW, pO, pO, pO, pO],
  [_, pO, pO, pO, pO, pO, pO, pO, pO, _],
  [_, _, pO, pO, pO, pO, pO, pO, _, _],
  [_, _, _, pO, pO, pO, pO, _, _, _],
];
