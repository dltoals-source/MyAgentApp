/**
 * Canvas renderer.
 *
 * Read-only with respect to the world: it never mutates simulation state. Its
 * own transient effects (floating gold, impact rings) live here, because they
 * are pure decoration and must not affect determinism.
 *
 * Positions are interpolated between the previous and current tick using the
 * `alpha` handed down by the loop, so 30Hz simulation still looks smooth.
 */
import type { Camera } from './camera';
import { fitCamera, tileToScreenX, tileToScreenY } from './camera';
import type { TowerKind, World } from '../sim/state';
import { tileAt } from '../sim/grid';
import { creepDef } from '../data/creeps';
import { TOWERS, rangeAtLevel } from '../data/towers';
import { lerp } from '../engine/vec';

interface Floater {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

interface Ring {
  x: number;
  y: number;
  radius: number;
  color: string;
  life: number;
}

export interface HoverState {
  tx: number;
  ty: number;
  inside: boolean;
  /** Tower kind queued for placement, if the player has one selected. */
  placing: TowerKind | null;
  placementValid: boolean;
  selectedTowerId: number;
}

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private floaters: Floater[] = [];
  private rings: Ring[] = [];
  camera: Camera;

  constructor(private readonly canvas: HTMLCanvasElement, world: World) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.ctx = ctx;
    this.camera = fitCamera(world.grid, canvas.width, canvas.height);
  }

  resize(world: World): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.camera = fitCamera(world.grid, rect.width, rect.height);
  }

  /** Turn this tick's simulation events into visual effects. */
  ingest(world: World): void {
    for (const e of world.events) {
      switch (e.type) {
        case 'creepKilled':
          this.floaters.push({ x: e.x, y: e.y, text: `+${e.bounty}`, color: '#ffd76e', life: 1 });
          break;
        case 'creepLeaked':
          this.floaters.push({ x: e.x, y: e.y, text: `-${e.leak}`, color: '#ff7b7b', life: 1.2 });
          break;
        case 'impact':
          if (e.splash > 0) {
            this.rings.push({
              x: e.x,
              y: e.y,
              radius: e.splash,
              color: TOWERS[e.kind].color,
              life: 1,
            });
          }
          break;
        default:
          break;
      }
    }
  }

  draw(world: World, alpha: number, hover: HoverState, dt: number): void {
    const { ctx } = this;
    const cam = this.camera;
    const ts = cam.tileSize;

    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawTerrain(world, cam);
    this.drawSelection(world, cam, hover);
    this.drawTowers(world, cam);
    this.drawCreeps(world, cam, alpha);
    this.drawProjectiles(world, cam, alpha);
    this.drawPlacementGhost(cam, hover);
    this.drawEffects(cam, dt, ts);
    this.drawBanner(world);
  }

  private drawTerrain(world: World, cam: Camera): void {
    const { ctx } = this;
    const ts = cam.tileSize;
    const { grid } = world;

    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        const kind = tileAt(grid, x, y);
        const sx = tileToScreenX(cam, x);
        const sy = tileToScreenY(cam, y);

        let fill = (x + y) % 2 === 0 ? '#14203a' : '#121c33';
        if (kind === 'rock') fill = '#2a3350';
        else if (kind === 'spawn') fill = '#4a2340';
        else if (kind === 'exit') fill = '#1d4a3a';

        ctx.fillStyle = fill;
        ctx.fillRect(sx, sy, ts, ts);
      }
    }

    // Spawn and exit markers.
    ctx.font = `${Math.floor(ts * 0.5)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff9ada';
    ctx.fillText('S', tileToScreenX(cam, grid.spawn.x) + ts / 2, tileToScreenY(cam, grid.spawn.y) + ts / 2);
    ctx.fillStyle = '#7fe6b8';
    ctx.fillText('E', tileToScreenX(cam, grid.exit.x) + ts / 2, tileToScreenY(cam, grid.exit.y) + ts / 2);
  }

  private drawSelection(world: World, cam: Camera, hover: HoverState): void {
    if (hover.selectedTowerId < 0) return;
    const tower = world.towers.find((t) => t.id === hover.selectedTowerId);
    if (!tower) return;
    const ts = cam.tileSize;
    const def = TOWERS[tower.kind];
    const { ctx } = this;

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.fillStyle = 'rgba(140,190,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(
      tileToScreenX(cam, tower.tx) + ts / 2,
      tileToScreenY(cam, tower.ty) + ts / 2,
      rangeAtLevel(def, tower.level) * ts,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawTowers(world: World, cam: Camera): void {
    const { ctx } = this;
    const ts = cam.tileSize;

    for (const tower of world.towers) {
      const def = TOWERS[tower.kind];
      const sx = tileToScreenX(cam, tower.tx);
      const sy = tileToScreenY(cam, tower.ty);
      const cx = sx + ts / 2;
      const cy = sy + ts / 2;

      ctx.fillStyle = '#1c2947';
      ctx.fillRect(sx + 1, sy + 1, ts - 2, ts - 2);
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(sx + 1.5, sy + 1.5, ts - 3, ts - 3);

      // Turret barrel, pointing at the current target.
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(tower.angle);
      ctx.fillStyle = def.color;
      ctx.fillRect(0, -ts * 0.09, ts * 0.42, ts * 0.18);
      ctx.beginPath();
      ctx.arc(0, 0, ts * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Level pips along the bottom edge.
      if (tower.level > 1) {
        ctx.fillStyle = '#ffd76e';
        for (let i = 0; i < tower.level - 1; i++) {
          ctx.fillRect(sx + 3 + i * 4, sy + ts - 5, 3, 3);
        }
      }
    }
  }

  private drawCreeps(world: World, cam: Camera, alpha: number): void {
    const { ctx } = this;
    const ts = cam.tileSize;

    for (const c of world.creeps) {
      const def = creepDef(c.kind);
      const x = tileToScreenX(cam, lerp(c.px, c.x, alpha));
      const y = tileToScreenY(cam, lerp(c.py, c.y, alpha));
      const r = def.radius * ts;

      ctx.beginPath();
      ctx.fillStyle = c.slowTicks > 0 ? '#9fd8ff' : def.color;
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      if (c.slowTicks > 0) {
        ctx.strokeStyle = 'rgba(180,225,255,0.9)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Health bar, only once the creep has taken a hit.
      if (c.hp < c.maxHp) {
        const w = Math.max(10, r * 2.2);
        const bx = x - w / 2;
        const by = y - r - 6;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(bx, by, w, 3);
        ctx.fillStyle = c.hp / c.maxHp > 0.4 ? '#77dd77' : '#ff7b7b';
        ctx.fillRect(bx, by, w * Math.max(0, c.hp / c.maxHp), 3);
      }
    }
  }

  private drawProjectiles(world: World, cam: Camera, alpha: number): void {
    const { ctx } = this;
    const ts = cam.tileSize;

    for (const p of world.projectiles) {
      const x = tileToScreenX(cam, lerp(p.px, p.x, alpha));
      const y = tileToScreenY(cam, lerp(p.py, p.y, alpha));
      ctx.fillStyle = TOWERS[p.kind].color;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.5, ts * (p.splash > 0 ? 0.12 : 0.07)), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawPlacementGhost(cam: Camera, hover: HoverState): void {
    if (!hover.placing || !hover.inside) return;
    const { ctx } = this;
    const ts = cam.tileSize;
    const def = TOWERS[hover.placing];
    const sx = tileToScreenX(cam, hover.tx);
    const sy = tileToScreenY(cam, hover.ty);

    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = hover.placementValid ? 'rgba(120,220,150,0.25)' : 'rgba(255,110,110,0.25)';
    ctx.fillRect(sx, sy, ts, ts);
    ctx.strokeStyle = hover.placementValid ? '#7fd88f' : '#ff7b7b';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 1, sy + 1, ts - 2, ts - 2);

    ctx.globalAlpha = 0.28;
    ctx.beginPath();
    ctx.fillStyle = def.color;
    ctx.arc(sx + ts / 2, sy + ts / 2, def.range * ts, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawEffects(cam: Camera, dt: number, ts: number): void {
    const { ctx } = this;

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i]!;
      ring.life -= dt * 2.5;
      if (ring.life <= 0) {
        this.rings.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = ring.life * 0.5;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        tileToScreenX(cam, ring.x),
        tileToScreenY(cam, ring.y),
        ring.radius * ts * (1.4 - ring.life * 0.4),
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      ctx.restore();
    }

    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i]!;
      f.life -= dt * 1.4;
      if (f.life <= 0) {
        this.floaters.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = Math.min(1, f.life);
      ctx.fillStyle = f.color;
      ctx.fillText(
        f.text,
        tileToScreenX(cam, f.x),
        tileToScreenY(cam, f.y) - (1 - f.life) * 22,
      );
      ctx.restore();
    }
  }

  private drawBanner(world: World): void {
    if (world.status !== 'defeat' && world.status !== 'victory') return;
    const { ctx } = this;
    const rect = this.canvas.getBoundingClientRect();

    ctx.save();
    ctx.fillStyle = 'rgba(6,10,22,0.72)';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = world.status === 'victory' ? '#7fe6b8' : '#ff8f8f';
    ctx.font = '700 44px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(
      world.status === 'victory' ? 'THE MAZE HOLDS' : 'THE MAZE HAS FALLEN',
      rect.width / 2,
      rect.height / 2 - 14,
    );
    ctx.fillStyle = '#c3d1ea';
    ctx.font = '400 15px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(
      `Wave ${world.wave} · ${world.score} gold earned · press R to try again`,
      rect.width / 2,
      rect.height / 2 + 24,
    );
    ctx.restore();
  }
}
