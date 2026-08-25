/**
 * Wiring: build a world, start the loop, connect input and HUD to it.
 *
 * This is the only file allowed to know about both the simulation and the
 * browser. Everything under `sim/` stays headless and testable.
 */
import { startLoop } from './engine/loop';
import { createWorld, step } from './sim/world';
import { canBuild } from './sim/commands';
import type { Command } from './sim/commands';
import type { TowerKind, World } from './sim/state';
import { OPEN_FIELD } from './data/maps';
import { TOWER_ORDER } from './data/towers';
import { Renderer } from './render/renderer';
import type { HoverState } from './render/renderer';
import { attachInput } from './input/input';
import { Sidebar } from './ui/sidebar';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
const side = document.querySelector<HTMLElement>('#side');
if (!canvas || !side) throw new Error('Missing #game canvas or #side panel');

const SPEEDS = [1, 2, 3] as const;

let world: World = createWorld(OPEN_FIELD, Date.now() >>> 0);
let renderer = new Renderer(canvas, world);

/** Commands queued by the UI, drained into the simulation once per tick. */
let queued: Command[] = [];

const view = {
  selectedKind: null as TowerKind | null,
  selectedTowerId: -1,
  paused: false,
  speedIndex: 0,
  notice: '',
  noticeUntil: 0,
};

function submit(cmd: Command): void {
  queued.push(cmd);
}

function flash(message: string): void {
  view.notice = message;
  view.noticeUntil = performance.now() + 2000;
}

function restart(): void {
  world = createWorld(OPEN_FIELD, Date.now() >>> 0);
  queued = [];
  view.selectedKind = null;
  view.selectedTowerId = -1;
  view.paused = false;
  renderer = new Renderer(canvas!, world);
  renderer.resize(world);
}

const sidebar = new Sidebar(side, {
  onSelectKind: (kind) => {
    view.selectedKind = view.selectedKind === kind ? null : kind;
    if (view.selectedKind) view.selectedTowerId = -1;
  },
  onUpgrade: (towerId) => submit({ type: 'upgrade', towerId }),
  onSell: (towerId) => {
    submit({ type: 'sell', towerId });
    view.selectedTowerId = -1;
  },
  onStartWave: () => submit({ type: 'startWave' }),
  onTogglePause: () => {
    view.paused = !view.paused;
  },
  onCycleSpeed: () => {
    view.speedIndex = (view.speedIndex + 1) % SPEEDS.length;
  },
  onRestart: restart,
});

const { pointer } = attachInput(
  canvas,
  () => renderer.camera,
  () => world.grid,
  {
    onTileClick: (tx, ty) => {
      if (view.selectedKind) {
        submit({ type: 'build', kind: view.selectedKind, tx, ty });
        return;
      }
      const tower = world.towers.find((t) => t.tx === tx && t.ty === ty);
      view.selectedTowerId = tower ? tower.id : -1;
    },

    onKey: (key) => {
      const lower = key.toLowerCase();

      const slot = Number(key);
      if (slot >= 1 && slot <= TOWER_ORDER.length) {
        const kind = TOWER_ORDER[slot - 1]!;
        view.selectedKind = view.selectedKind === kind ? null : kind;
        if (view.selectedKind) view.selectedTowerId = -1;
        return;
      }

      switch (lower) {
        case 'escape':
          view.selectedKind = null;
          view.selectedTowerId = -1;
          break;
        case ' ':
          submit({ type: 'startWave' });
          break;
        case 'p':
          view.paused = !view.paused;
          break;
        case 'f':
          view.speedIndex = (view.speedIndex + 1) % SPEEDS.length;
          break;
        case 'r':
          restart();
          break;
        case 'u':
          if (view.selectedTowerId >= 0) submit({ type: 'upgrade', towerId: view.selectedTowerId });
          break;
        case 's':
          if (view.selectedTowerId >= 0) {
            submit({ type: 'sell', towerId: view.selectedTowerId });
            view.selectedTowerId = -1;
          }
          break;
      }
    },
  },
);

function hoverState(): HoverState {
  const placing = view.selectedKind;
  let valid = false;
  if (placing && pointer.inside) {
    valid = canBuild(world, placing, pointer.tx, pointer.ty).ok;
  }
  return {
    tx: pointer.tx,
    ty: pointer.ty,
    inside: pointer.inside,
    placing,
    placementValid: valid,
    selectedTowerId: view.selectedTowerId,
  };
}

renderer.resize(world);
window.addEventListener('resize', () => renderer.resize(world));

let lastFrame = performance.now();

startLoop({
  speed: () => (view.paused ? 0 : SPEEDS[view.speedIndex]!),

  update: () => {
    const commands = queued;
    queued = [];
    step(world, commands);
    renderer.ingest(world);

    // Surface the most recent rejection ("that would seal the maze") to the HUD.
    for (const e of world.events) {
      if (e.type === 'rejected') flash(e.reason);
    }
  },

  render: (alpha) => {
    const now = performance.now();
    const dt = Math.min(0.1, (now - lastFrame) / 1000);
    lastFrame = now;

    if (view.notice && now > view.noticeUntil) view.notice = '';

    renderer.draw(world, alpha, hoverState(), dt);
    sidebar.render(world, {
      selectedKind: view.selectedKind,
      selectedTowerId: view.selectedTowerId,
      paused: view.paused,
      speed: SPEEDS[view.speedIndex]!,
      notice: view.notice,
    });
  },
});
