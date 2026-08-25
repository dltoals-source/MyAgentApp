export interface CreepDef {
  kind: string;
  name: string;
  /** Base hp at wave 1; scaled per wave by the wave generator. */
  hp: number;
  /** Tiles per second. */
  speed: number;
  /** Flat damage reduction per hit. */
  armor: number;
  bounty: number;
  /** Lives lost if it reaches the exit. */
  leak: number;
  radius: number;
  color: string;
}

export const CREEPS: Record<string, CreepDef> = {
  grunt: {
    kind: 'grunt',
    name: 'Grunt',
    hp: 60,
    speed: 1.5,
    armor: 0,
    bounty: 4,
    leak: 1,
    radius: 0.3,
    color: '#7fd88f',
  },
  runner: {
    kind: 'runner',
    name: 'Runner',
    hp: 34,
    speed: 2.9,
    armor: 0,
    bounty: 5,
    leak: 1,
    radius: 0.24,
    color: '#ffe27a',
  },
  brute: {
    kind: 'brute',
    name: 'Brute',
    hp: 190,
    speed: 1.1,
    armor: 4,
    bounty: 9,
    leak: 2,
    radius: 0.38,
    color: '#ff8f8f',
  },
  swarm: {
    kind: 'swarm',
    name: 'Swarmling',
    hp: 22,
    speed: 2.0,
    armor: 0,
    bounty: 2,
    leak: 1,
    radius: 0.19,
    color: '#d59bff',
  },
  boss: {
    kind: 'boss',
    name: 'Warlord',
    hp: 1400,
    speed: 1.0,
    armor: 8,
    bounty: 70,
    leak: 8,
    radius: 0.55,
    color: '#ff6bd6',
  },
};

export function creepDef(kind: string): CreepDef {
  return CREEPS[kind] ?? CREEPS['grunt']!;
}
