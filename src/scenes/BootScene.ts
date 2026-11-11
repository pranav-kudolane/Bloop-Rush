import Phaser from 'phaser';
import { ENEMIES, LEVELS, UPGRADES } from '../config';
import { makeTextures } from '../textures';

const THEMES = ['forest', 'desert', 'frost'];
const PROP_SIZES = [116, 72, 76]; // tall thing, low thing, rock

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Sprites are 100x100 drawings whose body fills about 68% of the frame,
    // so each one is rasterised to match its collision radius.
    const sprite = (key: string, file: string, r: number) => {
      const size = Math.round((r * 100) / 34);
      this.load.svg(key, `assets/sprites/${file}.svg`, { width: size, height: size });
    };
    sprite('player', 'player', 20);
    for (const u of UPGRADES) this.load.svg(`icon_${u.id}`, `assets/icons/${u.id}.svg`, { width: 128, height: 128 });
    for (const [id, def] of Object.entries(ENEMIES)) sprite(`e_${id}`, id, def.r);
    LEVELS.forEach((lvl, i) => {
      sprite(`boss_${i}`, `boss_${i}`, lvl.boss.r);
      this.load.svg(`ground_${i}`, `assets/ground/ground_${i}.svg`, { width: 256, height: 256 });
      PROP_SIZES.forEach((size, j) => {
        this.load.svg(`prop_${i}_${j}`, `assets/props/${THEMES[i % THEMES.length]}_${j}.svg`, { width: size, height: size });
      });
    });
  }

  create() {
    makeTextures(this); // effects, plus fallbacks for any art that failed to load
    this.scene.start('Menu');
  }
}
