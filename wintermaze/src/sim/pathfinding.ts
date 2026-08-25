/**
 * Flow-field pathfinding.
 *
 * Rather than running a path search per creep, we run one Dijkstra sweep
 * outward from the exit and store the cost-to-exit of every tile. A creep then
 * simply walks downhill. That means hundreds of creeps cost nothing extra to
 * path, and re-mazing mid-wave is handled for free: rebuild the field and every
 * creep on the map instantly follows the new route.
 *
 * Movement is 8-directional. Diagonal steps are forbidden when they would cut
 * the corner between two blocked tiles, so creeps can never squeeze through a
 * diagonal seam in a maze -- a rule mazing strategy depends on.
 */
import type { Grid, Tower } from './state';
import { idx, inBounds, isWalkableTerrain } from './grid';

const DIAGONAL = Math.SQRT2;

/** Neighbour offsets: the four orthogonals first, then the four diagonals. */
const NEIGHBOURS: ReadonlyArray<readonly [number, number, number]> = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, DIAGONAL],
  [1, -1, DIAGONAL],
  [-1, 1, DIAGONAL],
  [-1, -1, DIAGONAL],
];

/** 1 where a tower stands, 0 elsewhere. */
export function buildOccupancy(grid: Grid, towers: readonly Tower[]): Uint8Array {
  const occupied = new Uint8Array(grid.cols * grid.rows);
  for (const t of towers) {
    if (inBounds(grid, t.tx, t.ty)) occupied[idx(grid, t.tx, t.ty)] = 1;
  }
  return occupied;
}

function passable(grid: Grid, occupied: Uint8Array, tx: number, ty: number): boolean {
  if (!inBounds(grid, tx, ty)) return false;
  if (occupied[idx(grid, tx, ty)] === 1) return false;
  return isWalkableTerrain(grid, tx, ty);
}

/**
 * A binary min-heap over tile indices, keyed by tentative cost.
 * Small and allocation-light; a full priority queue library would be overkill.
 */
class MinHeap {
  private readonly items: number[] = [];
  private readonly keys: number[] = [];

  get size(): number {
    return this.items.length;
  }

  push(item: number, key: number): void {
    this.items.push(item);
    this.keys.push(key);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.keys[parent]! <= this.keys[i]!) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  pop(): number {
    const top = this.items[0]!;
    const lastItem = this.items.pop()!;
    const lastKey = this.keys.pop()!;
    if (this.items.length > 0) {
      this.items[0] = lastItem;
      this.keys[0] = lastKey;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let smallest = i;
        if (l < this.keys.length && this.keys[l]! < this.keys[smallest]!) smallest = l;
        if (r < this.keys.length && this.keys[r]! < this.keys[smallest]!) smallest = r;
        if (smallest === i) break;
        this.swap(i, smallest);
        i = smallest;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    [this.items[a], this.items[b]] = [this.items[b]!, this.items[a]!];
    [this.keys[a], this.keys[b]] = [this.keys[b]!, this.keys[a]!];
  }
}

/**
 * Cost-to-exit for every tile. `Infinity` marks tiles with no route out,
 * which is how build validation detects a maze that would seal the map.
 */
export function computeField(grid: Grid, occupied: Uint8Array): Float64Array {
  const field = new Float64Array(grid.cols * grid.rows).fill(Infinity);
  const heap = new MinHeap();
  const start = idx(grid, grid.exit.x, grid.exit.y);

  field[start] = 0;
  heap.push(start, 0);

  while (heap.size > 0) {
    const current = heap.pop();
    const cx = current % grid.cols;
    const cy = (current / grid.cols) | 0;
    const cost = field[current]!;

    for (const [dx, dy, step] of NEIGHBOURS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!passable(grid, occupied, nx, ny)) continue;

      // No cutting the corner between two blocked tiles.
      if (dx !== 0 && dy !== 0) {
        if (!passable(grid, occupied, cx + dx, cy)) continue;
        if (!passable(grid, occupied, cx, cy + dy)) continue;
      }

      const next = idx(grid, nx, ny);
      const candidate = cost + step;
      if (candidate < field[next]!) {
        field[next] = candidate;
        heap.push(next, candidate);
      }
    }
  }

  return field;
}

export function hasRoute(grid: Grid, field: Float64Array, tx: number, ty: number): boolean {
  if (!inBounds(grid, tx, ty)) return false;
  return Number.isFinite(field[idx(grid, tx, ty)]);
}

/**
 * The steepest-descent neighbour of a tile: the direction a creep standing
 * there should move. Returns null at the exit or on an unreachable tile.
 */
export function descend(
  grid: Grid,
  field: Float64Array,
  occupied: Uint8Array,
  tx: number,
  ty: number,
): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let bestCost = field[idx(grid, tx, ty)] ?? Infinity;
  if (!Number.isFinite(bestCost)) return null;

  for (const [dx, dy] of NEIGHBOURS) {
    const nx = tx + dx;
    const ny = ty + dy;
    if (!passable(grid, occupied, nx, ny)) continue;
    if (dx !== 0 && dy !== 0) {
      if (!passable(grid, occupied, tx + dx, ty)) continue;
      if (!passable(grid, occupied, tx, ty + dy)) continue;
    }
    const cost = field[idx(grid, nx, ny)]!;
    if (cost < bestCost) {
      bestCost = cost;
      best = { x: nx, y: ny };
    }
  }

  return best;
}
