/**
 * Maps between tile space (what the simulation uses) and screen pixels.
 * The whole board is always fit to the canvas, letterboxed and centred -- a
 * fixed board means no scrolling and no camera controls to get in the way.
 */
import type { Grid } from '../sim/state';

export interface Camera {
  tileSize: number;
  offsetX: number;
  offsetY: number;
}

const PADDING = 16;

export function fitCamera(grid: Grid, width: number, height: number): Camera {
  const tileSize = Math.max(
    4,
    Math.floor(Math.min((width - PADDING * 2) / grid.cols, (height - PADDING * 2) / grid.rows)),
  );
  return {
    tileSize,
    offsetX: Math.floor((width - tileSize * grid.cols) / 2),
    offsetY: Math.floor((height - tileSize * grid.rows) / 2),
  };
}

export function tileToScreenX(cam: Camera, tx: number): number {
  return cam.offsetX + tx * cam.tileSize;
}

export function tileToScreenY(cam: Camera, ty: number): number {
  return cam.offsetY + ty * cam.tileSize;
}

/** Screen pixel -> tile coordinate, floored. May fall outside the grid. */
export function screenToTile(cam: Camera, sx: number, sy: number): { tx: number; ty: number } {
  return {
    tx: Math.floor((sx - cam.offsetX) / cam.tileSize),
    ty: Math.floor((sy - cam.offsetY) / cam.tileSize),
  };
}
