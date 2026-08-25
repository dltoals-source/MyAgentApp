/** Minimal 2D vector helpers. Plain objects so world state stays serialisable. */
export interface Vec2 {
  x: number;
  y: number;
}

export function vec(x: number, y: number): Vec2 {
  return { x, y };
}

export function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt(dist2(ax, ay, bx, by));
}

/** Linear interpolation, used only by the renderer -- never by the simulation. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
