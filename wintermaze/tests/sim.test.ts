import { describe, expect, it } from 'vitest';
import { checksum, createWorld, step } from '../src/sim/world';
import type { Command } from '../src/sim/commands';
import { canBuild } from '../src/sim/commands';
import { OPEN_FIELD } from '../src/data/maps';
import { idx } from '../src/sim/grid';
import { buildOccupancy, computeField } from '../src/sim/pathfinding';
import type { World } from '../src/sim/state';

/** Run `ticks` ticks, injecting commands on the ticks named in the script. */
function run(seed: number, ticks: number, script: Record<number, Command[]> = {}): World {
  const world = createWorld(OPEN_FIELD, seed);
  for (let t = 0; t < ticks; t++) {
    step(world, script[t] ?? []);
  }
  return world;
}

const MAZE: Record<number, Command[]> = {
  0: [
    { type: 'build', kind: 'arrow', tx: 3, ty: 9 },
    { type: 'build', kind: 'arrow', tx: 3, ty: 11 },
  ],
  5: [{ type: 'build', kind: 'frost', tx: 6, ty: 9 }],
  20: [{ type: 'startWave' }],
  400: [{ type: 'build', kind: 'cannon', tx: 9, ty: 11 }],
};

describe('determinism', () => {
  it('produces identical state from the same seed and command log', () => {
    const a = run(12345, 900, MAZE);
    const b = run(12345, 900, MAZE);

    expect(checksum(a)).toBe(checksum(b));
    expect(a.gold).toBe(b.gold);
    expect(a.lives).toBe(b.lives);
    expect(a.creeps.length).toBe(b.creeps.length);
  });

  it('diverges when the command log differs', () => {
    const withMaze = run(12345, 900, MAZE);
    const bare = run(12345, 900, {});
    expect(checksum(withMaze)).not.toBe(checksum(bare));
  });
});

describe('the maze rule', () => {
  it('rejects a tower that would seal the only route to the exit', () => {
    const world = createWorld(OPEN_FIELD, 1);
    world.gold = 100_000;

    // A full column of towers walls the map off. Every tower but the last is
    // legal; the one that closes the final gap must be refused.
    for (let y = 0; y < world.grid.rows - 1; y++) {
      const check = canBuild(world, 'arrow', 5, y);
      expect(check.ok, `tower at (5, ${y}) should be legal`).toBe(true);
      step(world, [{ type: 'build', kind: 'arrow', tx: 5, ty: y }]);
    }

    const sealing = canBuild(world, 'arrow', 5, world.grid.rows - 1);
    expect(sealing.ok).toBe(false);
    expect(sealing).toMatchObject({ reason: 'That would seal the maze' });
  });

  it('refunds most of the cost on sell and reopens the tile', () => {
    const world = createWorld(OPEN_FIELD, 1);
    const before = world.gold;

    step(world, [{ type: 'build', kind: 'arrow', tx: 4, ty: 4 }]);
    expect(world.gold).toBe(before - 20);
    const tower = world.towers[0]!;

    step(world, [{ type: 'sell', towerId: tower.id }]);
    expect(world.towers).toHaveLength(0);
    expect(world.gold).toBe(before - 20 + 15); // 75% of 20
    expect(canBuild(world, 'arrow', 4, 4).ok).toBe(true);
  });
});

describe('pathfinding', () => {
  it('lengthens the route when towers force a detour', () => {
    const world = createWorld(OPEN_FIELD, 1);
    world.gold = 100_000;
    const spawnIdx = idx(world.grid, world.grid.spawn.x, world.grid.spawn.y);
    const direct = world.field[spawnIdx]!;

    // A wall with a single gap at the top forces creeps far off the straight line.
    for (let y = 3; y < world.grid.rows; y++) {
      step(world, [{ type: 'build', kind: 'arrow', tx: 5, ty: y }]);
    }

    const detour = world.field[spawnIdx]!;
    expect(Number.isFinite(detour)).toBe(true);
    expect(detour).toBeGreaterThan(direct);
  });

  it('marks tiles with no route as unreachable', () => {
    const world = createWorld(OPEN_FIELD, 1);
    const occupied = buildOccupancy(world.grid, []);
    // Box the exit in completely.
    for (const [dx, dy] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1]]) {
      const x = world.grid.exit.x + dx!;
      const y = world.grid.exit.y + dy!;
      if (x >= 0 && y >= 0 && x < world.grid.cols && y < world.grid.rows) {
        occupied[idx(world.grid, x, y)] = 1;
      }
    }
    const field = computeField(world.grid, occupied);
    expect(field[idx(world.grid, world.grid.spawn.x, world.grid.spawn.y)]).toBe(Infinity);
  });
});

describe('combat and waves', () => {
  it('leaks lives when nothing is defending', () => {
    const world = run(7, 2400, {});
    expect(world.wave).toBeGreaterThan(0);
    expect(world.lives).toBeLessThan(OPEN_FIELD.startingLives);
  });

  it('kills creeps and pays bounty when towers cover the lane', () => {
    const script: Record<number, Command[]> = { 0: [] };
    for (let x = 2; x <= 8; x++) {
      script[0]!.push({ type: 'build', kind: 'arrow', tx: x, ty: 9 });
      script[0]!.push({ type: 'build', kind: 'arrow', tx: x, ty: 11 });
    }

    const world = createWorld(OPEN_FIELD, 7);
    world.gold = 100_000;
    for (let t = 0; t < 2400; t++) step(world, script[t] ?? []);

    expect(world.score).toBeGreaterThan(0);
    expect(world.lives).toBe(OPEN_FIELD.startingLives);
  });

  it('stops stepping once the game is decided', () => {
    const world = createWorld(OPEN_FIELD, 3);
    world.status = 'defeat';
    const before = checksum(world);
    for (let t = 0; t < 50; t++) step(world);
    expect(checksum(world)).toBe(before);
  });
});
