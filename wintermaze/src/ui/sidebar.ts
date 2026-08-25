/**
 * The DOM sidebar: stats, the build bar, and the selected-tower panel.
 *
 * Plain DOM on purpose -- there is no framework in this project and the HUD is
 * small enough that one doesn't earn its keep. It re-renders from world state
 * each frame, diffing only what's cheap to diff.
 */
import type { TowerKind, World } from '../sim/state';
import { MAX_TOWER_LEVEL, TOWERS, TOWER_ORDER, SELL_REFUND, upgradeCost } from '../data/towers';
import { TICK_HZ } from '../engine/loop';
import { TOTAL_WAVES } from '../data/waves';

export interface SidebarCallbacks {
  onSelectKind(kind: TowerKind | null): void;
  onUpgrade(towerId: number): void;
  onSell(towerId: number): void;
  onStartWave(): void;
  onTogglePause(): void;
  onCycleSpeed(): void;
  onRestart(): void;
}

export interface SidebarView {
  selectedKind: TowerKind | null;
  selectedTowerId: number;
  paused: boolean;
  speed: number;
  notice: string;
}

export class Sidebar {
  private readonly root: HTMLElement;
  private lastSignature = '';

  constructor(root: HTMLElement, private readonly cb: SidebarCallbacks) {
    this.root = root;
    this.root.addEventListener('click', (e) => this.handleClick(e));
  }

  private handleClick(e: Event): void {
    const target = (e.target as HTMLElement).closest('[data-action]');
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset['action']!;
    const value = target.dataset['value'] ?? '';

    switch (action) {
      case 'kind':
        this.cb.onSelectKind(value as TowerKind);
        break;
      case 'upgrade':
        this.cb.onUpgrade(Number(value));
        break;
      case 'sell':
        this.cb.onSell(Number(value));
        break;
      case 'wave':
        this.cb.onStartWave();
        break;
      case 'pause':
        this.cb.onTogglePause();
        break;
      case 'speed':
        this.cb.onCycleSpeed();
        break;
      case 'restart':
        this.cb.onRestart();
        break;
    }
  }

  render(world: World, view: SidebarView): void {
    const selected = world.towers.find((t) => t.id === view.selectedTowerId);
    const countdown = Math.ceil(world.waveTimer / TICK_HZ);

    // Cheap change detection so we're not rebuilding DOM 60 times a second.
    const signature = [
      world.gold,
      world.lives,
      world.wave,
      countdown,
      world.status,
      view.selectedKind,
      view.selectedTowerId,
      selected?.level ?? 0,
      view.paused,
      view.speed,
      view.notice,
    ].join('|');
    if (signature === this.lastSignature) return;
    this.lastSignature = signature;

    this.root.innerHTML = `
      <div>
        <h1>WINTERMAZE</h1>
        <p class="sub">Build the path. Then make it long.</p>
      </div>

      <div class="stats">
        <div class="stat"><span>Gold</span><b>${world.gold}</b></div>
        <div class="stat"><span>Lives</span><b>${world.lives}</b></div>
        <div class="stat"><span>Wave</span><b>${world.wave}/${TOTAL_WAVES}</b></div>
        <div class="stat"><span>Next in</span><b>${countdown}s</b></div>
      </div>

      <div class="towers">
        ${TOWER_ORDER.map((kind) => this.towerButton(world, kind, view)).join('')}
      </div>

      ${selected ? this.selectedPanel(world, selected.id) : '<p class="hint">Click a tower to upgrade or sell it.</p>'}

      <div class="row">
        <button data-action="wave" title="Start the next wave now for bonus gold">Send wave</button>
        <button data-action="pause">${view.paused ? 'Resume' : 'Pause'}</button>
      </div>
      <div class="row">
        <button data-action="speed">Speed ${view.speed}x</button>
        <button data-action="restart">Restart</button>
      </div>

      ${view.notice ? `<p class="hint" style="color:#ff9c9c">${view.notice}</p>` : ''}

      <p class="hint">
        <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> pick tower ·
        <kbd>Esc</kbd> cancel · <kbd>Space</kbd> send wave ·
        <kbd>P</kbd> pause · <kbd>F</kbd> speed · <kbd>U</kbd> upgrade ·
        <kbd>S</kbd> sell · <kbd>R</kbd> restart
      </p>

      <p class="hint">
        Towers block movement — creeps path around them. You can't fully wall off
        the exit, so the game is finding the longest legal detour.
      </p>
    `;
  }

  private towerButton(world: World, kind: TowerKind, view: SidebarView): string {
    const def = TOWERS[kind];
    const affordable = world.gold >= def.cost;
    return `
      <button data-action="kind" data-value="${kind}"
              aria-pressed="${view.selectedKind === kind}"
              ${affordable ? '' : 'disabled'}>
        <span style="color:${def.color}">${def.name}</span> — ${def.cost}g
        <small>${def.blurb}</small>
      </button>`;
  }

  private selectedPanel(world: World, towerId: number): string {
    const tower = world.towers.find((t) => t.id === towerId);
    if (!tower) return '';
    const def = TOWERS[tower.kind];
    const maxed = tower.level >= MAX_TOWER_LEVEL;
    const cost = maxed ? 0 : upgradeCost(def, tower.level);
    const refund = Math.floor(tower.totalGoldSpent * SELL_REFUND);

    return `
      <div class="stat">
        <span>Selected</span>
        <b style="color:${def.color}">${def.name} · L${tower.level}</b>
        <div class="row" style="margin-top:8px">
          <button data-action="upgrade" data-value="${tower.id}"
                  ${maxed || world.gold < cost ? 'disabled' : ''}>
            ${maxed ? 'Max level' : `Upgrade ${cost}g`}
          </button>
          <button data-action="sell" data-value="${tower.id}">Sell ${refund}g</button>
        </div>
      </div>`;
  }
}
