# Wintermaze

A maze tower defense for the browser, in the lineage of the Warcraft III
custom games — Wintermaul, Line Tower Wars, Green TD.

There is no fixed path. Creeps walk from **S** to **E** by the cheapest route
available, and your towers *are* the walls. The game is finding the longest
legal detour you can afford, and you can never seal the exit outright.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Typecheck, then production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Simulation tests (Vitest, headless) |
| `npm run typecheck` | `tsc --noEmit` |

No API keys, no backend, no build step beyond Vite. Zero runtime dependencies —
the shipped bundle is ~23 KB (8.7 KB gzipped).

## Controls

| Input | Action |
|---|---|
| `1` `2` `3` | Select Arrow / Cannon / Frost tower |
| Click | Place selected tower, or select a placed one |
| `Esc` / right-click | Cancel selection |
| `U` / `S` | Upgrade / sell the selected tower |
| `Space` | Send the next wave early (banks unused build time as gold) |
| `P` / `F` | Pause / cycle speed 1x-2x-3x |
| `R` | Restart |

## How it fits together

```
src/
  engine/     Framework-free primitives: fixed-timestep loop, seeded RNG, vectors
  sim/        The game. Headless, deterministic, no DOM.
    state.ts        every type in the world
    world.ts        createWorld() and the single step() entry point
    systems.ts      spawn -> move -> shoot -> resolve, run in that order each tick
    pathfinding.ts  Dijkstra flow field + the "you may not seal the maze" rule
    commands.ts     player intent as data
  data/       Tunable content: towers, creeps, waves, maps
  render/     Canvas 2D drawing. Read-only with respect to the world.
  input/      Pointer and keyboard -> commands
  ui/         The DOM sidebar
```

### The one rule that matters

**`sim/` is deterministic and headless.** No DOM, no `Math.random()`, no
`Date.now()`, no imports from `render/` or `input/`. All randomness goes through
the seeded RNG carried in the world; all player actions arrive as commands
applied at a tick boundary.

That is not architectural purity for its own sake. It is the single decision
that makes replays, save states, and lockstep multiplayer a feature you add
rather than a rewrite you undertake. `checksum(world)` hashes everything that
must match between two clients — comparing it is how you would detect desync.

`tests/sim.test.ts` enforces this: the same seed and command log produce an
identical checksum after 900 ticks.

## Tuning it

Almost everything you would want to change lives in `src/data/`:

- **`towers.ts`** — cost, range, damage, fire rate, splash, slow, upgrade curve
- **`creeps.ts`** — hp, speed, armor, bounty, how many lives a leak costs
- **`waves.ts`** — which creep on which wave, counts, and the `1.21^wave` health ramp
- **`maps.ts`** — grid size, spawn/exit, rock placement

Adding a fourth tower type means one entry in `TOWERS` and one line in
`TOWER_ORDER`. The UI, input, and renderer all read from that table.

## Where this goes next

Roughly in the order I would build them:

1. **Feel** — audio, particles, a proper hit flash. Cheapest fun per hour.
2. **Tower variety** — chain lightning, poison DoT, an anti-air/ground split.
3. **Persistence** — high scores and saved mazes in `localStorage`.
4. **Send-creeps 1v1** — the Line Tower Wars mechanic: spend gold to send a
   creep into the *opponent's* maze, and their bounty becomes your income.
   This is where the genre gets its teeth.
5. **Multiplayer** — the deterministic sim means lockstep: exchange commands
   with a tick delay, apply on the same tick, compare `checksum()` to detect
   desync. Colyseus is the shortest path to an authoritative room server.
