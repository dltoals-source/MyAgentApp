/**
 * World construction and the single authoritative `step` entry point.
 *
 * `step()` is the only way time moves forward. Given the same starting seed and
 * the same commands on the same ticks, it produces byte-identical state -- see
 * `checksum()` and the determinism test in `tests/`.
 */
import type { World } from './state';
import type { Command } from './commands';
import { applyCommand } from './commands';
import { createRng } from '../engine/rng';
import { TICK_HZ } from '../engine/loop';
import { buildOccupancy, computeField } from './pathfinding';
import { refreshField, stepCreeps, stepProjectiles, stepTowers, stepWaves } from './systems';
import { FIRST_WAVE_DELAY } from '../data/waves';
import type { MapDef } from '../data/maps';

export function createWorld(map: MapDef, seed: number): World {
  const grid = map.create();
  const field = computeField(grid, buildOccupancy(grid, []));

  return {
    tick: 0,
    rng: createRng(seed),
    grid,
    towers: [],
    creeps: [],
    projectiles: [],
    gold: map.startingGold,
    lives: map.startingLives,
    score: 0,
    wave: 0,
    waveTimer: FIRST_WAVE_DELAY * TICK_HZ,
    pending: [],
    unclaimed: [],
    status: 'building',
    field,
    fieldDirty: false,
    nextId: 1,
    events: [],
  };
}

/**
 * Advance the world exactly one tick, applying any commands queued for it.
 * System order is fixed and load-bearing; see systems.ts.
 */
export function step(world: World, commands: readonly Command[] = []): void {
  world.events.length = 0;

  if (world.status === 'defeat' || world.status === 'victory') {
    return;
  }

  for (const cmd of commands) applyCommand(world, cmd);

  const occupied = refreshField(world);

  stepWaves(world);
  stepCreeps(world, occupied);
  stepTowers(world);
  stepProjectiles(world);

  world.tick++;
}

/**
 * A cheap order-sensitive hash of everything that must match between two runs.
 * Comparing this across clients is how a multiplayer build would detect desync.
 */
export function checksum(world: World): number {
  let h = 2166136261 >>> 0;
  const mix = (n: number) => {
    h ^= Math.round(n * 1000) | 0;
    h = Math.imul(h, 16777619) >>> 0;
  };

  mix(world.tick);
  mix(world.gold);
  mix(world.lives);
  mix(world.wave);
  mix(world.rng.s);

  for (const c of world.creeps) {
    mix(c.id);
    mix(c.x);
    mix(c.y);
    mix(c.hp);
  }
  for (const t of world.towers) {
    mix(t.id);
    mix(t.tx);
    mix(t.ty);
    mix(t.level);
    mix(t.cooldown);
  }
  for (const p of world.projectiles) {
    mix(p.id);
    mix(p.x);
    mix(p.y);
  }

  return h >>> 0;
}
