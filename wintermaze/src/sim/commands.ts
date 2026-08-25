/**
 * Player intent, expressed as data.
 *
 * Nothing outside the simulation mutates the world directly -- the UI submits
 * commands and the simulation applies them at a tick boundary. That indirection
 * is what makes a run reproducible from (seed + command log), and it is the
 * seam a lockstep netcode layer would slot into: send commands over the wire,
 * apply them on the same tick on every client.
 */
import type { TowerKind, World } from './state';
import { idx, isBuildableTerrain } from './grid';
import { buildOccupancy, computeField, hasRoute } from './pathfinding';
import { MAX_TOWER_LEVEL, SELL_REFUND, TOWERS, upgradeCost } from '../data/towers';
import { FIRST_WAVE_DELAY } from '../data/waves';

export type Command =
  | { type: 'build'; kind: TowerKind; tx: number; ty: number }
  | { type: 'sell'; towerId: number }
  | { type: 'upgrade'; towerId: number }
  | { type: 'startWave' };

export type BuildCheck = { ok: true } | { ok: false; reason: string };

/**
 * The maze rule: a tower may never leave a creep -- current or future -- with
 * no route to the exit. We test by building the field as if the tower already
 * existed and confirming the spawn and every live creep can still get out.
 */
export function canBuild(world: World, kind: TowerKind, tx: number, ty: number): BuildCheck {
  const def = TOWERS[kind];
  const { grid } = world;

  if (!isBuildableTerrain(grid, tx, ty)) return { ok: false, reason: 'Cannot build there' };
  if (world.towers.some((t) => t.tx === tx && t.ty === ty)) {
    return { ok: false, reason: 'Tile occupied' };
  }
  if (world.gold < def.cost) return { ok: false, reason: `Need ${def.cost} gold` };

  // A creep standing on the tile would be trapped inside the tower.
  for (const c of world.creeps) {
    if (Math.floor(c.x) === tx && Math.floor(c.y) === ty) {
      return { ok: false, reason: 'A creep is standing there' };
    }
  }

  const occupied = buildOccupancy(grid, world.towers);
  occupied[idx(grid, tx, ty)] = 1;
  const field = computeField(grid, occupied);

  if (!hasRoute(grid, field, grid.spawn.x, grid.spawn.y)) {
    return { ok: false, reason: 'That would seal the maze' };
  }
  for (const c of world.creeps) {
    if (!hasRoute(grid, field, Math.floor(c.x), Math.floor(c.y))) {
      return { ok: false, reason: 'That would trap a creep' };
    }
  }

  return { ok: true };
}

export function applyCommand(world: World, cmd: Command): void {
  switch (cmd.type) {
    case 'build': {
      const check = canBuild(world, cmd.kind, cmd.tx, cmd.ty);
      if (!check.ok) {
        world.events.push({ type: 'rejected', reason: check.reason });
        return;
      }
      const def = TOWERS[cmd.kind];
      world.gold -= def.cost;
      world.towers.push({
        id: world.nextId++,
        kind: cmd.kind,
        tx: cmd.tx,
        ty: cmd.ty,
        level: 1,
        cooldown: 0,
        targetId: -1,
        angle: 0,
        totalGoldSpent: def.cost,
      });
      world.fieldDirty = true;
      world.events.push({ type: 'towerBuilt', tx: cmd.tx, ty: cmd.ty });
      return;
    }

    case 'sell': {
      const i = world.towers.findIndex((t) => t.id === cmd.towerId);
      if (i === -1) return;
      const tower = world.towers[i]!;
      world.gold += Math.floor(tower.totalGoldSpent * SELL_REFUND);
      world.towers.splice(i, 1);
      world.fieldDirty = true;
      return;
    }

    case 'upgrade': {
      const tower = world.towers.find((t) => t.id === cmd.towerId);
      if (!tower) return;
      if (tower.level >= MAX_TOWER_LEVEL) {
        world.events.push({ type: 'rejected', reason: 'Already max level' });
        return;
      }
      const cost = upgradeCost(TOWERS[tower.kind], tower.level);
      if (world.gold < cost) {
        world.events.push({ type: 'rejected', reason: `Need ${cost} gold` });
        return;
      }
      world.gold -= cost;
      tower.totalGoldSpent += cost;
      tower.level += 1;
      return;
    }

    case 'startWave': {
      // Calling a wave early banks the unused build time as gold, the classic
      // risk/reward lever: rush for income, or take the time to build.
      if (world.pending.length > 0) return;
      if (world.status !== 'building' && world.status !== 'running') return;
      const remaining = Math.max(0, world.waveTimer);
      const bonus = Math.floor((remaining / 30) * 2);
      world.gold += bonus;
      world.waveTimer = 0;
      return;
    }
  }
}

export const BUILD_TIME_BEFORE_FIRST_WAVE = FIRST_WAVE_DELAY;
