import type { Grid, TileKind } from './state';

export function idx(grid: Grid, tx: number, ty: number): number {
  return ty * grid.cols + tx;
}

export function inBounds(grid: Grid, tx: number, ty: number): boolean {
  return tx >= 0 && ty >= 0 && tx < grid.cols && ty < grid.rows;
}

export function tileAt(grid: Grid, tx: number, ty: number): TileKind {
  if (!inBounds(grid, tx, ty)) return 'rock';
  return grid.tiles[idx(grid, tx, ty)] ?? 'rock';
}

/** Terrain a creep may cross, ignoring towers. */
export function isWalkableTerrain(grid: Grid, tx: number, ty: number): boolean {
  return tileAt(grid, tx, ty) !== 'rock';
}

/**
 * Terrain a player may build on. Spawn and exit tiles stay clear so a maze can
 * never seal either end outright -- the same rule the original maps used.
 */
export function isBuildableTerrain(grid: Grid, tx: number, ty: number): boolean {
  return tileAt(grid, tx, ty) === 'open';
}

export function createGrid(
  cols: number,
  rows: number,
  spawn: { x: number; y: number },
  exit: { x: number; y: number },
  rocks: ReadonlyArray<readonly [number, number]> = [],
): Grid {
  const tiles: TileKind[] = new Array(cols * rows).fill('open');
  const grid: Grid = { cols, rows, tiles, spawn, exit };
  for (const [x, y] of rocks) {
    if (inBounds(grid, x, y)) tiles[y * cols + x] = 'rock';
  }
  tiles[spawn.y * cols + spawn.x] = 'spawn';
  tiles[exit.y * cols + exit.x] = 'exit';
  return grid;
}
