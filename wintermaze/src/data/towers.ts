import type { TowerKind } from '../sim/state';

export interface TowerDef {
  kind: TowerKind;
  name: string;
  blurb: string;
  cost: number;
  /** Radius in tiles. */
  range: number;
  damage: number;
  /** Shots per second. */
  fireRate: number;
  /** Damage radius on impact, in tiles. 0 means single target. */
  splash: number;
  /** Projectile travel speed in tiles per second. */
  projectileSpeed: number;
  /** Seconds of slow applied on hit, and the speed multiplier while slowed. */
  slowSeconds: number;
  slowFactor: number;
  /** Flat damage reduction the target's armor applies per hit. */
  armorPiercing: number;
  color: string;
}

export const TOWERS: Record<TowerKind, TowerDef> = {
  arrow: {
    kind: 'arrow',
    name: 'Arrow Tower',
    blurb: 'Fast single-target. The backbone of any maze.',
    cost: 20,
    range: 3.2,
    damage: 11,
    fireRate: 1.6,
    splash: 0,
    projectileSpeed: 14,
    slowSeconds: 0,
    slowFactor: 1,
    armorPiercing: 0,
    color: '#8fd3ff',
  },
  cannon: {
    kind: 'cannon',
    name: 'Cannon',
    blurb: 'Slow, heavy splash. Put it where creeps bunch up.',
    cost: 55,
    range: 2.9,
    damage: 30,
    fireRate: 0.62,
    splash: 1.25,
    projectileSpeed: 8,
    slowSeconds: 0,
    slowFactor: 1,
    armorPiercing: 3,
    color: '#ffb26e',
  },
  frost: {
    kind: 'frost',
    name: 'Frost Tower',
    blurb: 'Chills on hit. Low damage, doubles the value of everything else.',
    cost: 40,
    range: 3.0,
    damage: 5,
    fireRate: 1.1,
    splash: 0,
    projectileSpeed: 11,
    slowSeconds: 1.6,
    slowFactor: 0.5,
    armorPiercing: 0,
    color: '#a9b8ff',
  },
};

export const TOWER_ORDER: readonly TowerKind[] = ['arrow', 'cannon', 'frost'];

/** Each upgrade costs more than the last and scales damage and range. */
export function upgradeCost(def: TowerDef, level: number): number {
  return Math.round(def.cost * 0.8 * Math.pow(1.65, level - 1));
}

export function damageAtLevel(def: TowerDef, level: number): number {
  return def.damage * Math.pow(1.55, level - 1);
}

export function rangeAtLevel(def: TowerDef, level: number): number {
  return def.range + (level - 1) * 0.25;
}

export const MAX_TOWER_LEVEL = 5;

/** Selling refunds most of what was sunk in, so re-mazing stays viable. */
export const SELL_REFUND = 0.75;
