/**
 * Seeded, deterministic PRNG (mulberry32).
 *
 * The simulation must never touch `Math.random()`. Every random draw goes
 * through an Rng carried inside the game state, so replaying the same seed and
 * the same command list reproduces a run exactly -- which is what makes
 * replays, desync detection and lockstep multiplayer possible later.
 */
export interface Rng {
  /** Internal state. Serialised with the world, so it must stay a plain number. */
  s: number;
}

export function createRng(seed: number): Rng {
  return { s: seed >>> 0 };
}

/** Uniform float in [0, 1). */
export function nextFloat(rng: Rng): number {
  rng.s = (rng.s + 0x6d2b79f5) >>> 0;
  let t = rng.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Uniform integer in [min, max]. */
export function nextInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(nextFloat(rng) * (max - min + 1));
}

/** True with probability `p`. */
export function chance(rng: Rng, p: number): boolean {
  return nextFloat(rng) < p;
}
