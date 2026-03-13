export const TILE_W = 64;
export const TILE_H = 32;

export function tileToScreen(
  tileX: number,
  tileY: number,
  offsetX: number,
  offsetY: number
): { x: number; y: number } {
  return {
    x: (tileX - tileY) * (TILE_W / 2) + offsetX,
    y: (tileX + tileY) * (TILE_H / 2) + offsetY,
  };
}

export function screenToTile(
  screenX: number,
  screenY: number,
  offsetX: number,
  offsetY: number
): { tileX: number; tileY: number } {
  const sx = screenX - offsetX;
  const sy = screenY - offsetY;
  const tileX = Math.floor((sx / (TILE_W / 2) + sy / (TILE_H / 2)) / 2);
  const tileY = Math.floor((sy / (TILE_H / 2) - sx / (TILE_W / 2)) / 2);
  return { tileX, tileY };
}
