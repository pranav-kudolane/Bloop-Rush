// Local save: banked coins, unlocked levels, permanent upgrades.

export interface SaveData {
  coins: number;
  unlocked: number; // number of levels available
  meta: { hp: number; dmg: number; coin: number; speed: number };
  muted: boolean;
}

const KEY = 'gloop-rush-save-v1';

const fresh = (): SaveData => ({ coins: 0, unlocked: 1, meta: { hp: 0, dmg: 0, coin: 0, speed: 0 }, muted: false });

function load(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      const f = fresh();
      return { ...f, ...d, meta: { ...f.meta, ...(d.meta ?? {}) } };
    }
  } catch {
    /* storage unavailable: play without saving */
  }
  return fresh();
}

export const save: SaveData = load();

export function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* ignore */
  }
}
