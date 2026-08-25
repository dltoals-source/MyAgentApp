/**
 * Pointer and keyboard input.
 *
 * Input never touches the world directly -- it produces commands and toggles
 * view state, which `main.ts` feeds into the simulation at a tick boundary.
 */
import type { Camera } from '../render/camera';
import { screenToTile } from '../render/camera';
import type { Grid } from '../sim/state';
import { inBounds } from '../sim/grid';

export interface PointerState {
  tx: number;
  ty: number;
  inside: boolean;
}

export interface InputHandlers {
  onTileClick(tx: number, ty: number): void;
  onKey(key: string): void;
}

export function attachInput(
  canvas: HTMLCanvasElement,
  getCamera: () => Camera,
  getGrid: () => Grid,
  handlers: InputHandlers,
): { pointer: PointerState; detach(): void } {
  const pointer: PointerState = { tx: -1, ty: -1, inside: false };

  const toTile = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    return screenToTile(getCamera(), e.clientX - rect.left, e.clientY - rect.top);
  };

  const onMove = (e: MouseEvent) => {
    const { tx, ty } = toTile(e);
    pointer.tx = tx;
    pointer.ty = ty;
    pointer.inside = inBounds(getGrid(), tx, ty);
  };

  const onLeave = () => {
    pointer.inside = false;
  };

  const onClick = (e: MouseEvent) => {
    const { tx, ty } = toTile(e);
    if (!inBounds(getGrid(), tx, ty)) return;
    handlers.onTileClick(tx, ty);
  };

  const onContext = (e: MouseEvent) => {
    // Right-click cancels whatever is selected, the usual RTS reflex.
    e.preventDefault();
    handlers.onKey('Escape');
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    if (e.key === ' ') e.preventDefault();
    handlers.onKey(e.key);
  };

  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseleave', onLeave);
  canvas.addEventListener('click', onClick);
  canvas.addEventListener('contextmenu', onContext);
  window.addEventListener('keydown', onKeyDown);

  return {
    pointer,
    detach() {
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('contextmenu', onContext);
      window.removeEventListener('keydown', onKeyDown);
    },
  };
}
