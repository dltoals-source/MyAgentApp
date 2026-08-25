/**
 * The individual simulation systems, run in a fixed order every tick by
 * `world.step()`. Order matters and is deliberate: spawn, then move, then
 * shoot, then resolve projectiles. Changing it changes the game's feel.
 */
import type { Creep, World } from './state';
import { TICK_HZ, TICK_SECONDS } from '../engine/loop';
import { idx } from './grid';
import { buildOccupancy, computeField, descend } from './pathfinding';
import { creepDef } from '../data/creeps';
import { TOTAL_WAVES, WAVE_INTERVAL, waveDef } from '../data/waves';
import { TOWERS, damageAtLevel, rangeAtLevel } from '../data/towers';
import { dist, dist2 } from '../engine/vec';

/** Rebuild the flow field if the maze changed since last tick. */
export function refreshField(world: World): Uint8Array {
  const occupied = buildOccupancy(world.grid, world.towers);
  if (world.fieldDirty) {
    world.field = computeField(world.grid, occupied);
    world.fieldDirty = false;
  }
  return occupied;
}

export function stepWaves(world: World): void {
  // Release any creeps whose spawn tick has arrived.
  while (world.pending.length > 0 && world.pending[0]!.atTick <= world.tick) {
    const spawn = world.pending.shift()!;
    const def = creepDef(spawn.kind);
    const hp = Math.round(def.hp * waveDef(spawn.wave).hpScale);
    world.creeps.push({
      id: world.nextId++,
      x: world.grid.spawn.x + 0.5,
      y: world.grid.spawn.y + 0.5,
      px: world.grid.spawn.x + 0.5,
      py: world.grid.spawn.y + 0.5,
      hp,
      maxHp: hp,
      speed: def.speed,
      armor: def.armor,
      bounty: def.bounty,
      leak: def.leak,
      slowTicks: 0,
      slowFactor: 1,
      kind: def.kind,
      wave: spawn.wave,
    });
  }

  // Pay out waves that have finished spawning and been wiped off the map.
  for (let i = world.unclaimed.length - 1; i >= 0; i--) {
    const wave = world.unclaimed[i]!;
    const stillSpawning = world.pending.some((p) => p.wave === wave);
    const stillAlive = world.creeps.some((c) => c.wave === wave);
    if (!stillSpawning && !stillAlive) {
      world.gold += waveDef(wave).clearBonus;
      world.unclaimed.splice(i, 1);
    }
  }

  if (world.status !== 'building' && world.status !== 'running') return;

  if (world.waveTimer > 0) {
    world.waveTimer--;
    return;
  }

  if (world.wave >= TOTAL_WAVES) {
    if (world.creeps.length === 0 && world.pending.length === 0) {
      world.status = 'victory';
    }
    return;
  }

  // Queue the next wave. Spawn ticks are computed up front so the whole wave is
  // deterministic the moment it is scheduled.
  world.wave++;
  const def = waveDef(world.wave);
  const spacingTicks = Math.max(1, Math.round(def.spacing * TICK_HZ));
  for (let i = 0; i < def.count; i++) {
    world.pending.push({
      kind: def.kind,
      wave: world.wave,
      atTick: world.tick + i * spacingTicks,
    });
  }
  world.unclaimed.push(world.wave);
  world.waveTimer = WAVE_INTERVAL * TICK_HZ;
  world.status = 'running';
  world.events.push({ type: 'waveStarted', wave: world.wave });
}

export function stepCreeps(world: World, occupied: Uint8Array): void {
  const { grid } = world;
  const exitX = grid.exit.x + 0.5;
  const exitY = grid.exit.y + 0.5;

  for (let i = world.creeps.length - 1; i >= 0; i--) {
    const c = world.creeps[i]!;
    c.px = c.x;
    c.py = c.y;

    if (c.slowTicks > 0) {
      c.slowTicks--;
      if (c.slowTicks === 0) c.slowFactor = 1;
    }

    const speed = c.speed * (c.slowTicks > 0 ? c.slowFactor : 1);
    let budget = speed * TICK_SECONDS;

    // Walk toward the centre of the next tile downhill, consuming the move
    // budget across tile boundaries so high speeds don't overshoot corners.
    let guard = 0;
    while (budget > 0 && guard++ < 4) {
      const tx = Math.floor(c.x);
      const ty = Math.floor(c.y);

      let goalX: number;
      let goalY: number;
      if (tx === grid.exit.x && ty === grid.exit.y) {
        goalX = exitX;
        goalY = exitY;
      } else {
        const next = descend(grid, world.field, occupied, tx, ty);
        if (!next) break; // Boxed in; hold position until the maze changes.
        goalX = next.x + 0.5;
        goalY = next.y + 0.5;
      }

      const d = dist(c.x, c.y, goalX, goalY);
      if (d <= budget) {
        c.x = goalX;
        c.y = goalY;
        budget -= d;
        if (d === 0) break;
      } else {
        c.x += ((goalX - c.x) / d) * budget;
        c.y += ((goalY - c.y) / d) * budget;
        budget = 0;
      }
    }

    if (Math.floor(c.x) === grid.exit.x && Math.floor(c.y) === grid.exit.y) {
      world.lives -= c.leak;
      world.events.push({ type: 'creepLeaked', x: c.x, y: c.y, leak: c.leak });
      world.creeps.splice(i, 1);
      if (world.lives <= 0) {
        world.lives = 0;
        world.status = 'defeat';
      }
    }
  }
}

function creepById(world: World, id: number): Creep | undefined {
  return world.creeps.find((c) => c.id === id);
}

export function stepTowers(world: World): void {
  for (const tower of world.towers) {
    const def = TOWERS[tower.kind];
    const range = rangeAtLevel(def, tower.level);
    const rangeSq = range * range;
    const cx = tower.tx + 0.5;
    const cy = tower.ty + 0.5;

    if (tower.cooldown > 0) tower.cooldown--;

    // Target the creep closest to the exit -- "first" targeting, which is what
    // makes a long maze worth building.
    let best: Creep | undefined;
    let bestCost = Infinity;
    for (const c of world.creeps) {
      if (dist2(cx, cy, c.x, c.y) > rangeSq) continue;
      const cost = world.field[idx(world.grid, Math.floor(c.x), Math.floor(c.y))] ?? Infinity;
      if (cost < bestCost) {
        bestCost = cost;
        best = c;
      }
    }

    if (!best) {
      tower.targetId = -1;
      continue;
    }

    tower.targetId = best.id;
    tower.angle = Math.atan2(best.y - cy, best.x - cx);

    if (tower.cooldown > 0) continue;
    tower.cooldown = Math.max(1, Math.round(TICK_HZ / def.fireRate));

    world.projectiles.push({
      id: world.nextId++,
      x: cx,
      y: cy,
      px: cx,
      py: cy,
      targetId: best.id,
      tx: best.x,
      ty: best.y,
      speed: def.projectileSpeed,
      damage: damageAtLevel(def, tower.level),
      splash: def.splash,
      slowTicks: Math.round(def.slowSeconds * TICK_HZ),
      slowFactor: def.slowFactor,
      kind: tower.kind,
    });
  }
}

function damageCreep(c: Creep, raw: number, piercing: number): void {
  const effectiveArmor = Math.max(0, c.armor - piercing);
  const dealt = Math.max(1, raw - effectiveArmor);
  c.hp -= dealt;
}

function reapDead(world: World): void {
  for (let i = world.creeps.length - 1; i >= 0; i--) {
    const c = world.creeps[i]!;
    if (c.hp > 0) continue;
    world.gold += c.bounty;
    world.score += c.bounty;
    world.events.push({ type: 'creepKilled', x: c.x, y: c.y, bounty: c.bounty });
    world.creeps.splice(i, 1);
  }
}

export function stepProjectiles(world: World): void {
  for (let i = world.projectiles.length - 1; i >= 0; i--) {
    const p = world.projectiles[i]!;
    p.px = p.x;
    p.py = p.y;

    // Home on the target while it lives; otherwise fly on to where it was.
    const target = creepById(world, p.targetId);
    if (target) {
      p.tx = target.x;
      p.ty = target.y;
    }

    const step = p.speed * TICK_SECONDS;
    const d = dist(p.x, p.y, p.tx, p.ty);

    if (d > step) {
      p.x += ((p.tx - p.x) / d) * step;
      p.y += ((p.ty - p.y) / d) * step;
      continue;
    }

    // Impact.
    p.x = p.tx;
    p.y = p.ty;
    const piercing = TOWERS[p.kind].armorPiercing;

    if (p.splash > 0) {
      const splashSq = p.splash * p.splash;
      for (const c of world.creeps) {
        if (dist2(p.x, p.y, c.x, c.y) > splashSq) continue;
        damageCreep(c, p.damage, piercing);
      }
    } else if (target) {
      damageCreep(target, p.damage, piercing);
      if (p.slowTicks > 0) {
        target.slowTicks = p.slowTicks;
        target.slowFactor = p.slowFactor;
      }
    }

    if (p.slowTicks > 0 && p.splash > 0) {
      const splashSq = p.splash * p.splash;
      for (const c of world.creeps) {
        if (dist2(p.x, p.y, c.x, c.y) > splashSq) continue;
        c.slowTicks = p.slowTicks;
        c.slowFactor = p.slowFactor;
      }
    }

    world.events.push({ type: 'impact', x: p.x, y: p.y, splash: p.splash, kind: p.kind });
    world.projectiles.splice(i, 1);
  }

  reapDead(world);
}
