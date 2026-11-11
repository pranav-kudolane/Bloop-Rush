// All tunable numbers live here: levels, enemies, bosses, upgrades.

export const W = 540;
export const H = 960;
export const FONT = '"Trebuchet MS", "Segoe UI", Verdana, sans-serif';
export const PLAYER_COLOR = 0x2fd6a3;

export type Shape = 'round' | 'spiky' | 'square';

export interface EnemyDef {
  shape: Shape;
  color: number;
  r: number;
  hp: number;
  speed: number;
  dmg: number;
  coin: number;
}

export const ENEMIES: Record<string, EnemyDef> = {
  // Forest
  shroom: { shape: 'round', color: 0xd9483b, r: 14, hp: 18, speed: 72, dmg: 8, coin: 1 },
  beetle: { shape: 'spiky', color: 0x7a4fd6, r: 11, hp: 12, speed: 135, dmg: 6, coin: 1 },
  stump: { shape: 'square', color: 0x8a5a2b, r: 20, hp: 80, speed: 52, dmg: 14, coin: 4 },
  // Desert
  scarab: { shape: 'round', color: 0xe08a20, r: 14, hp: 24, speed: 85, dmg: 10, coin: 1 },
  viper: { shape: 'spiky', color: 0xc2452d, r: 11, hp: 16, speed: 140, dmg: 9, coin: 1 },
  golem: { shape: 'square', color: 0x9c6b4a, r: 22, hp: 130, speed: 55, dmg: 18, coin: 5 },
  // Frost
  snowling: { shape: 'round', color: 0xcfe6f5, r: 14, hp: 30, speed: 95, dmg: 12, coin: 1 },
  shard: { shape: 'spiky', color: 0x57c7ff, r: 11, hp: 20, speed: 150, dmg: 11, coin: 1 },
  yeti: { shape: 'square', color: 0x9fb0cc, r: 24, hp: 200, speed: 60, dmg: 22, coin: 6 },
};

export type BossPattern = 'dash' | 'burst' | 'summon';

export interface BossDef {
  name: string;
  color: number;
  r: number;
  hp: number;
  speed: number;
  dmg: number;
  patterns: BossPattern[];
  minion: string;
}

export interface LevelDef {
  name: string;
  ground: [number, number, number]; // base, speckle, detail
  bossLevel: number; // the boss arrives once this many upgrades have been earned
  hpGrowth: number; // enemy HP multiplier grows from 1 to 1+hpGrowth over the level
  dmgScale: number;
  spawnScale: number; // >1 = more enemies
  enemies: { id: string; from: number; weight: number }[]; // from = level progress 0..1
  boss: BossDef;
}

export const LEVELS: LevelDef[] = [
  {
    name: 'Mossy Woods',
    ground: [0x4c9a4a, 0x3f8740, 0x6fb85e],
    bossLevel: 20,
    hpGrowth: 2.0,
    dmgScale: 1,
    spawnScale: 1,
    enemies: [
      { id: 'shroom', from: 0, weight: 6 },
      { id: 'beetle', from: 0.2, weight: 3 },
      { id: 'stump', from: 0.45, weight: 1 },
    ],
    boss: {
      name: 'Elder Thornback',
      color: 0x5b3a1e,
      r: 52,
      hp: 3500,
      speed: 115,
      dmg: 20,
      patterns: ['dash', 'summon'],
      minion: 'shroom',
    },
  },
  {
    name: 'Sunscorch Dunes',
    ground: [0xd9b56a, 0xc9a257, 0xe9cc8a],
    bossLevel: 22,
    hpGrowth: 2.5,
    dmgScale: 1.2,
    spawnScale: 1.2,
    enemies: [
      { id: 'scarab', from: 0, weight: 6 },
      { id: 'viper', from: 0.2, weight: 3 },
      { id: 'golem', from: 0.45, weight: 1 },
    ],
    boss: {
      name: 'Dune Tyrant',
      color: 0xb5651d,
      r: 54,
      hp: 4500,
      speed: 125,
      dmg: 26,
      patterns: ['burst', 'dash', 'summon'],
      minion: 'viper',
    },
  },
  {
    name: 'Frostbite Peaks',
    ground: [0xbcd8ea, 0xa6c8de, 0xe6f4fb],
    bossLevel: 25,
    hpGrowth: 3.2,
    dmgScale: 1.4,
    spawnScale: 1.4,
    enemies: [
      { id: 'snowling', from: 0, weight: 6 },
      { id: 'shard', from: 0.2, weight: 3 },
      { id: 'yeti', from: 0.45, weight: 1 },
    ],
    boss: {
      name: 'Glacier King',
      color: 0x3d6fb8,
      r: 58,
      hp: 7500,
      speed: 135,
      dmg: 32,
      patterns: ['burst', 'dash', 'burst', 'summon'],
      minion: 'shard',
    },
  },
];

// ---- In-run upgrades (picked from cards when the coin bar fills) ----

export interface UpgradeDef {
  id: string;
  name: string;
  color: number;
  max: number;
  desc: (next: number) => string;
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'orbit', name: 'Spinning Blobs', color: 0x39c0ff, max: 5, desc: (n) => `${n + 1} blobs circle you and smash enemies` },
  { id: 'volley', name: 'Mini-Blob Burst', color: 0xffb02e, max: 5, desc: (n) => `Sprays ${6 + 2 * n} mini-blobs in all directions` },
  { id: 'big', name: 'Mega Blob', color: 0xff5fa2, max: 5, desc: (n) => `Huge piercing blob, ${40 + 25 * n} damage` },
  { id: 'frost', name: 'Frozen Aura', color: 0x9fe8ff, max: 5, desc: (n) => `Chills and slows enemies by ${Math.round((0.25 + 0.07 * n) * 100)}%` },
  { id: 'maxhp', name: 'Thick Skin', color: 0xff5566, max: 5, desc: () => '+20 max HP and heal 20' },
  { id: 'damage', name: 'Power Goo', color: 0xff8a3d, max: 5, desc: () => '+15% attack damage' },
  { id: 'count', name: 'Split Shot', color: 0x2fd6a3, max: 4, desc: (n) => `Shoot ${n + 1} blobs per attack` },
  { id: 'coin', name: 'Gold Rush', color: 0xffd23f, max: 5, desc: () => '+20% coins earned' },
  { id: 'speed', name: 'Slippery', color: 0xb58cff, max: 5, desc: () => '+8% move speed' },
  { id: 'magnet', name: 'Coin Magnet', color: 0xf2f2f2, max: 5, desc: () => '+35% pickup range' },
];

/** Coins needed to fill the upgrade bar at a given run level. */
export const coinsForLevel = (lvl: number) => 8 + lvl * 4;

// ---- Permanent upgrades bought in the shop ----

export interface MetaDef {
  id: 'hp' | 'dmg' | 'coin' | 'speed';
  name: string;
  desc: string;
  color: number;
  max: number;
}

export const META: MetaDef[] = [
  { id: 'hp', name: 'Vitality', desc: '+10 starting HP', color: 0xff5566, max: 10 },
  { id: 'dmg', name: 'Might', desc: '+5% damage', color: 0xff8a3d, max: 10 },
  { id: 'coin', name: 'Fortune', desc: '+10% coins', color: 0xffd23f, max: 10 },
  { id: 'speed', name: 'Swiftness', desc: '+3% move speed', color: 0xb58cff, max: 10 },
];

export const metaCost = (lvl: number) => 50 + lvl * 50;

// ---- Core tuning knobs ----
export const TUNE = {
  baseHp: 100,
  baseSpeed: 190,
  baseMagnet: 95,
  atkInterval: 0.45, // seconds between basic shots
  atkDamage: 12,
  spawnStart: 0.5, // seconds between spawns at the start of a level
  spawnEnd: 0.14, // ...and right before the boss
  spawnExtra: 5, // extra enemies per spawn by the end of the level
  bossPhaseInterval: 1.2, // trickle of minions during the boss fight
};
