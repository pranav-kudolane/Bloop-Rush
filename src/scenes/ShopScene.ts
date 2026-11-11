import Phaser from 'phaser';
import { W, H, META, metaCost } from '../config';
import { save, persist } from '../save';
import { button, label } from '../ui';

export class ShopScene extends Phaser.Scene {
  constructor() {
    super('Shop');
  }

  create() {
    this.add.tileSprite(0, 0, W, H, 'ground_0').setOrigin(0);
    this.add.rectangle(0, 0, W, H, 0x0b1020, 0.6).setOrigin(0);

    label(this, W / 2, 80, 'UPGRADES', 52, '#ffd23f');
    this.add.image(W / 2 - 54, 150, 'coin').setScale(1.6);
    label(this, W / 2 + 8, 150, `${Math.floor(save.coins)}`, 30, '#ffd23f');

    META.forEach((m, i) => {
      const y = 260 + i * 140;
      const lvl = save.meta[m.id];
      const g = this.add.graphics();
      g.fillStyle(0x141824, 0.9);
      g.fillRoundedRect(30, y - 56, W - 60, 118, 16);
      const icon = { hp: 'maxhp', dmg: 'damage', coin: 'coin', speed: 'speed' }[m.id];
      this.add.image(78, y - 12, `icon_${icon}`).setDisplaySize(60, 60);

      label(this, 122, y - 28, m.name, 26).setOrigin(0, 0.5);
      label(this, 122, y + 2, m.desc, 17, '#c9d3ea').setOrigin(0, 0.5);

      // level pips
      for (let p = 0; p < m.max; p++) {
        g.fillStyle(p < lvl ? m.color : 0x353c52, 1);
        g.fillRoundedRect(52 + p * 23, y + 32, 18, 10, 4);
      }

      if (lvl >= m.max) {
        label(this, W - 110, y - 8, 'MAX', 26, '#7dffd0');
      } else {
        const cost = metaCost(lvl);
        const afford = save.coins >= cost;
        const b = button(this, W - 110, y - 8, 130, 60, `${cost}`, afford ? 0x3f9b4a : 0x4a5063, () => {
          if (save.coins < cost) return;
          save.coins -= cost;
          save.meta[m.id] += 1;
          persist();
          this.scene.restart();
        }, 24);
        if (!afford) b.setAlpha(0.7);
      }
    });

    button(this, W / 2, H - 90, 260, 70, 'BACK', 0x3d7fc4, () => this.scene.start('Menu'));
  }
}
