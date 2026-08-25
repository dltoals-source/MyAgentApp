/**
 * Fixed-timestep game loop with an accumulator.
 *
 * The simulation advances in whole ticks of exactly TICK_MS, regardless of
 * display refresh rate or frame hitches. Rendering happens once per animation
 * frame and receives `alpha`, the fraction of a tick elapsed, so it can
 * interpolate between the previous and current sim state for smooth motion.
 *
 * Decoupling the two is what keeps the simulation deterministic: a 144Hz
 * monitor and a 60Hz monitor run the identical sequence of ticks.
 */

/** Simulation rate. 30Hz is plenty for a tower defense and keeps ticks cheap. */
export const TICK_HZ = 30;
export const TICK_MS = 1000 / TICK_HZ;
export const TICK_SECONDS = 1 / TICK_HZ;

/** Guard against the spiral of death after a tab has been backgrounded. */
const MAX_TICKS_PER_FRAME = 5;

export interface LoopHandle {
  stop(): void;
}

export interface LoopOptions {
  /** Advance the simulation exactly one tick. */
  update(): void;
  /** Draw. `alpha` is in [0, 1): how far we are into the next tick. */
  render(alpha: number): void;
  /** Ticks to run per real-time tick; 0 pauses, 2 is double speed. */
  speed(): number;
}

export function startLoop(opts: LoopOptions): LoopHandle {
  let accumulator = 0;
  let last = performance.now();
  let frame = 0;
  let running = true;

  const tick = (now: number) => {
    if (!running) return;
    frame = requestAnimationFrame(tick);

    // Clamp the frame delta so a long stall (alt-tab, GC pause) doesn't try to
    // catch up with hundreds of ticks at once.
    const delta = Math.min(now - last, MAX_TICKS_PER_FRAME * TICK_MS);
    last = now;

    const speed = opts.speed();
    if (speed > 0) {
      accumulator += delta * speed;
      let ticks = 0;
      while (accumulator >= TICK_MS && ticks < MAX_TICKS_PER_FRAME * speed) {
        opts.update();
        accumulator -= TICK_MS;
        ticks++;
      }
      // Whatever we couldn't consume is dropped rather than banked, so the
      // game never runs away from the player after a hitch.
      if (accumulator >= TICK_MS) accumulator = 0;
    } else {
      accumulator = 0;
    }

    opts.render(speed > 0 ? accumulator / TICK_MS : 0);
  };

  frame = requestAnimationFrame(tick);

  return {
    stop() {
      running = false;
      cancelAnimationFrame(frame);
    },
  };
}
