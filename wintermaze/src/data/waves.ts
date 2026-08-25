/**
 * Waves are generated from a formula rather than hand-authored, so the ladder
 * keeps going indefinitely and stays easy to retune from one place.
 */

export interface WaveDef {
  wave: number;
  kind: string;
  count: number;
  /** Seconds between each creep in the wave. */
  spacing: number;
  /** Multiplier applied to the creep's base hp. */
  hpScale: number;
  /** Gold handed out when the wave is cleared. */
  clearBonus: number;
  label: string;
}

export const TOTAL_WAVES = 30;

/** Seconds of build time before wave 1, and between waves after that. */
export const FIRST_WAVE_DELAY = 25;
export const WAVE_INTERVAL = 20;

function kindForWave(wave: number): string {
  if (wave % 10 === 0) return 'boss';
  if (wave % 7 === 0) return 'brute';
  if (wave % 5 === 0) return 'swarm';
  if (wave % 3 === 0) return 'runner';
  return 'grunt';
}

export function waveDef(wave: number): WaveDef {
  const kind = kindForWave(wave);

  // Health climbs a little over 20% per wave. Steep enough that a maze which
  // coasts on wave 5's towers will visibly start leaking by wave 12.
  const hpScale = Math.pow(1.21, wave - 1);

  let count: number;
  let spacing: number;
  switch (kind) {
    case 'boss':
      count = 1;
      spacing = 0;
      break;
    case 'swarm':
      count = 16 + wave;
      spacing = 0.22;
      break;
    case 'brute':
      count = 6 + Math.floor(wave / 4);
      spacing = 0.9;
      break;
    case 'runner':
      count = 10 + Math.floor(wave / 3);
      spacing = 0.42;
      break;
    default:
      count = 9 + Math.floor(wave / 2);
      spacing = 0.6;
  }

  return {
    wave,
    kind,
    count,
    spacing,
    hpScale,
    clearBonus: 12 + wave * 3,
    label: kind === 'boss' ? `Wave ${wave} — WARLORD` : `Wave ${wave}`,
  };
}
