import { Graphics } from "pixi.js";

/** Draw PhillyBot pixel character — purple hoodie, white eyes, shadow */
export function drawPhillyBot(g: Graphics, scale = 2): void {
  // Shadow ellipse
  g.fill({ color: 0x000000, alpha: 0.3 });
  g.ellipse(0, 12 * scale, 8 * scale, 3 * scale);
  g.fill();

  const s = scale;
  const ox = -8 * s; // center horizontally
  const oy = -16 * s; // anchor at feet

  // Feet (dark purple)
  px(g, 0x4a2d6b, ox + 4 * s, oy + 14 * s, 2 * s, 2 * s);
  px(g, 0x4a2d6b, ox + 10 * s, oy + 14 * s, 2 * s, 2 * s);

  // Legs (dark gray)
  px(g, 0x3a3a4a, ox + 5 * s, oy + 12 * s, 2 * s, 2 * s);
  px(g, 0x3a3a4a, ox + 9 * s, oy + 12 * s, 2 * s, 2 * s);

  // Body (purple hoodie)
  px(g, 0x7b3fa0, ox + 3 * s, oy + 7 * s, 10 * s, 5 * s);
  // Hoodie highlight
  px(g, 0x9b5fc0, ox + 4 * s, oy + 7 * s, 8 * s, 2 * s);
  // Hoodie pocket
  px(g, 0x6b2f90, ox + 5 * s, oy + 10 * s, 6 * s, 1 * s);

  // Arms (purple)
  px(g, 0x7b3fa0, ox + 1 * s, oy + 8 * s, 2 * s, 4 * s);
  px(g, 0x7b3fa0, ox + 13 * s, oy + 8 * s, 2 * s, 4 * s);
  // Hands (skin)
  px(g, 0xf0c8a0, ox + 1 * s, oy + 12 * s, 2 * s, 1 * s);
  px(g, 0xf0c8a0, ox + 13 * s, oy + 12 * s, 2 * s, 1 * s);

  // Head (skin tone)
  px(g, 0xf0c8a0, ox + 4 * s, oy + 1 * s, 8 * s, 6 * s);
  // Hair (dark purple)
  px(g, 0x4a1d6b, ox + 3 * s, oy + 0 * s, 10 * s, 2 * s);
  px(g, 0x4a1d6b, ox + 3 * s, oy + 2 * s, 1 * s, 2 * s);
  px(g, 0x4a1d6b, ox + 12 * s, oy + 2 * s, 1 * s, 2 * s);

  // Eyes (white with dark pupil)
  px(g, 0xffffff, ox + 5 * s, oy + 3 * s, 2 * s, 2 * s);
  px(g, 0xffffff, ox + 9 * s, oy + 3 * s, 2 * s, 2 * s);
  px(g, 0x1a1a2e, ox + 6 * s, oy + 4 * s, 1 * s, 1 * s);
  px(g, 0x1a1a2e, ox + 10 * s, oy + 4 * s, 1 * s, 1 * s);
}

/** Draw a simple isometric diamond tile */
export function drawDiamondTile(
  g: Graphics,
  w: number,
  h: number,
  color: number,
  alpha = 1
): void {
  g.poly([
    { x: 0, y: -h / 2 },
    { x: w / 2, y: 0 },
    { x: 0, y: h / 2 },
    { x: -w / 2, y: 0 },
  ]);
  g.fill({ color, alpha });
  g.stroke({ color: brighten(color, -20), width: 1, alpha: alpha * 0.5 });
}

/** Draw an isometric wall block (diamond top + two side faces) */
export function drawWallBlock(
  g: Graphics,
  w: number,
  h: number,
  wallH: number,
  color: number
): void {
  // Left face
  g.poly([
    { x: -w / 2, y: 0 },
    { x: 0, y: h / 2 },
    { x: 0, y: h / 2 + wallH },
    { x: -w / 2, y: wallH },
  ]);
  g.fill({ color: brighten(color, -30) });

  // Right face
  g.poly([
    { x: w / 2, y: 0 },
    { x: 0, y: h / 2 },
    { x: 0, y: h / 2 + wallH },
    { x: w / 2, y: wallH },
  ]);
  g.fill({ color: brighten(color, -50) });

  // Top face
  g.poly([
    { x: 0, y: -h / 2 },
    { x: w / 2, y: 0 },
    { x: 0, y: h / 2 },
    { x: -w / 2, y: 0 },
  ]);
  g.fill({ color });
}

/** Draw furniture block — shorter wall block with accent color */
export function drawFurnitureBlock(
  g: Graphics,
  w: number,
  h: number,
  furnitureH: number,
  color: number
): void {
  drawWallBlock(g, w, h, furnitureH, color);
}

function px(
  g: Graphics,
  color: number,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  g.rect(x, y, w, h);
  g.fill({ color });
}

function brighten(color: number, amount: number): number {
  const r = Math.max(0, Math.min(255, ((color >> 16) & 0xff) + amount));
  const gr = Math.max(0, Math.min(255, ((color >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (color & 0xff) + amount));
  return (r << 16) | (gr << 8) | b;
}
