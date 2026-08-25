# Wintermaze — Project Context

## What this is
A maze tower defense for the browser, modelled on the Warcraft III custom games
(Wintermaul / Line Tower Wars / Green TD). Towers double as maze walls; creeps
path around them toward the exit; the skill is building the longest legal
detour. Completely separate from the MyAgentApp project in the repo root — it
shares no code, config, or dependencies with it.

## Tech stack
- **TypeScript + Vite** — no framework, no runtime dependencies
- **Canvas 2D** for rendering
- **Vitest** for the simulation tests
- Ships as static files; no backend

## How to run
```bash
cd wintermaze
npm install
npm run dev        # http://localhost:5173
npm test           # simulation tests
npm run build      # typecheck + production build
```

## Architecture rules — do not break these

1. **`src/sim/` is deterministic and headless.** No DOM, no `Math.random()`, no
   `Date.now()`, no imports from `render/`, `input/`, or `ui/`. Randomness goes
   through the seeded RNG in `world.rng`.
2. **Player actions are commands, not mutations.** The UI submits a `Command`;
   `step()` applies it at a tick boundary. Nothing outside `sim/` writes to the
   world.
3. **The simulation runs at a fixed 30Hz.** Rendering interpolates with the
   `alpha` the loop provides. Never advance game state from a render frame.
4. **The renderer is read-only.** Visual-only state (floating text, impact
   rings) lives in `Renderer`, never in the world.

These exist so that replays, save states, and lockstep multiplayer stay
additive. `checksum(world)` in `sim/world.ts` hashes the state that must match
across clients; `tests/sim.test.ts` asserts two runs of the same seed and
command log stay identical.

## Key files
- `src/sim/world.ts` — `createWorld()`, `step()`, `checksum()`
- `src/sim/systems.ts` — spawn / move / shoot / resolve, in that fixed order
- `src/sim/pathfinding.ts` — Dijkstra flow field, 8-way, no corner cutting
- `src/sim/commands.ts` — command types and `canBuild()` (the anti-seal rule)
- `src/data/` — all tunable content: towers, creeps, waves, maps
- `src/render/renderer.ts` — canvas drawing
- `src/main.ts` — the only file that knows about both the sim and the browser

## Game rules as built
- 38x20 grid, spawn on the west edge, exit on the east, a few unbuildable rocks
- Towers occupy one tile and block movement
- A tower may never leave the spawn — or any live creep — without a route out
- Selling refunds 75% of everything sunk into a tower, so re-mazing stays viable
- Towers target the creep **closest to the exit**, which is what makes length pay
- Waves arrive on a 20s timer whether or not the last one is dead; `Space` calls
  the next one early and banks the unused time as gold
- 30 waves; boss every 10th; creep health scales 1.21^wave

## Roadmap
1. **Feel** — audio, particles, hit flash
2. **Tower variety** — chain lightning, poison DoT, air/ground split
3. **Persistence** — high scores and saved mazes in `localStorage`
4. **Send-creeps 1v1** — spend gold to send a creep into the opponent's maze;
   their bounty becomes your income. This is the Line Tower Wars hook.
5. **Multiplayer** — lockstep over the existing command layer; Colyseus for the
   room server; compare `checksum()` per tick to catch desync

## Notes
- `npm test` is fast and headless — run it after any change to `sim/`
- Balance lives entirely in `src/data/`; prefer retuning there over code changes
- Build order: get single-player genuinely fun before starting the netcode
