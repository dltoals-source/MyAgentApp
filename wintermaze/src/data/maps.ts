import { createGrid } from '../sim/grid';
import type { Grid } from '../sim/state';

export interface MapDef {
  id: string;
  name: string;
  blurb: string;
  startingGold: number;
  startingLives: number;
  create(): Grid;
}

/**
 * An open field with a spawn on the left and an exit on the right, plus a few
 * rock clusters to anchor a maze against. Everything else is buildable -- the
 * route is whatever the player builds, which is the entire point of the genre.
 */
const ROCKS: ReadonlyArray<readonly [number, number]> = [
  [8, 2], [9, 2], [8, 3],
  [15, 11], [16, 11], [16, 12],
  [22, 4], [23, 4], [23, 5],
  [12, 7], [13, 7],
  [29, 9], [30, 9], [29, 10],
];

export const OPEN_FIELD: MapDef = {
  id: 'open-field',
  name: 'Open Field',
  blurb: 'No fixed path. Build the maze yourself.',
  startingGold: 120,
  startingLives: 20,
  create: () => createGrid(38, 20, { x: 0, y: 10 }, { x: 37, y: 10 }, ROCKS),
};

export const MAPS: readonly MapDef[] = [OPEN_FIELD];
