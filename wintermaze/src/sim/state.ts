/**
 * Every type that makes up a game's state.
 *
 * Rule for this whole `sim/` directory: no DOM, no `Math.random`, no
 * `Date.now`, no imports from `render/` or `input/`. The simulation is a pure
 * function of (seed, command list, tick count). Keeping that true is what buys
 * us replays, deterministic tests, and lockstep netcode later on.
 */
import type { Rng } from '../engine/rng';

export type TileKind = 'open' | 'rock' | 'spawn' | 'exit' | 'path';

export interface Grid {
  cols: number;
  rows: number;
  /** Row-major, length cols*rows. */
  tiles: TileKind[];
  spawn: { x: number; y: number };
  exit: { x: number; y: number };
}

export type TowerKind = 'arrow' | 'cannon' | 'frost';

export interface Tower {
  id: number;
  kind: TowerKind;
  /** Tile coordinates. Towers occupy exactly one tile. */
  tx: number;
  ty: number;
  level: number;
  /** Ticks remaining until this tower may fire again. */
  cooldown: number;
  /** Id of the creep currently being tracked, or -1. */
  targetId: number;
  /** Facing in radians, for rendering the turret. */
  angle: number;
  totalGoldSpent: number;
}

export interface Creep {
  id: number;
  /** World position in tile units (1.0 == one tile). */
  x: number;
  y: number;
  /** Previous tick's position, kept purely so the renderer can interpolate. */
  px: number;
  py: number;
  hp: number;
  maxHp: number;
  /** Tiles per second at full speed. */
  speed: number;
  armor: number;
  bounty: number;
  /** Lives drained from the player if this creep reaches the exit. */
  leak: number;
  /** Ticks of remaining slow, and the multiplier while it lasts. */
  slowTicks: number;
  slowFactor: number;
  kind: string;
  /** Wave this creep belongs to, for scoring and UI. */
  wave: number;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  px: number;
  py: number;
  targetId: number;
  /** Last known target position, so a projectile still lands if its target dies. */
  tx: number;
  ty: number;
  speed: number;
  damage: number;
  splash: number;
  slowTicks: number;
  slowFactor: number;
  kind: TowerKind;
}

/** Transient things that happened this tick, for the renderer and audio. */
export type GameEvent =
  | { type: 'creepKilled'; x: number; y: number; bounty: number }
  | { type: 'creepLeaked'; x: number; y: number; leak: number }
  | { type: 'impact'; x: number; y: number; splash: number; kind: TowerKind }
  | { type: 'towerBuilt'; tx: number; ty: number }
  | { type: 'waveStarted'; wave: number }
  | { type: 'rejected'; reason: string };

export interface PendingSpawn {
  kind: string;
  wave: number;
  /** Tick at which this creep enters the map. */
  atTick: number;
}

export type GameStatus = 'building' | 'running' | 'defeat' | 'victory';

export interface World {
  tick: number;
  rng: Rng;
  grid: Grid;

  towers: Tower[];
  creeps: Creep[];
  projectiles: Projectile[];

  gold: number;
  lives: number;
  score: number;

  /** Index of the wave currently spawning or just finished. 0 == none yet. */
  wave: number;
  /** Ticks until the next wave auto-starts. */
  waveTimer: number;
  pending: PendingSpawn[];
  /** Waves fully spawned but not yet paid out; drained as each is wiped. */
  unclaimed: number[];

  status: GameStatus;

  /**
   * Cost-to-exit for every tile, recomputed whenever the maze changes.
   * Infinity means unreachable. Creeps descend this field.
   */
  field: Float64Array;
  /** Set when a tower is built or sold; the field is rebuilt before the next step. */
  fieldDirty: boolean;

  nextId: number;
  events: GameEvent[];
}
