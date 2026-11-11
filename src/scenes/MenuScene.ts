import Phaser from 'phaser';
import { W, H, LEVELS } from '../config';
import { save } from '../save';
import { button, label } from '../ui';

export class MenuScene extends Phaser.Scene {
  private bg!: Phaser.GameObjects.TileSprite;

  constructor() {
    super('Menu');
  }

  create() {
    this.bg = this.add.tileSprite(0, 0, W, H, 'ground_0').setOrigin(0);
    this.add.rectangle(0, 0, W, H, 0x0b1020, 0.35).setOrigin(0);

    label(this, W / 2, 120, 'GLOOP', 84, '#7dffd0');
    label(this, W / 2, 196, 'RUSH', 64, '#ffd23f');

    const hero = this.add.image(W / 2, 300, 'player').setScale(2.6);
    this.tweens.add({
      targets: hero,
      scaleX: 2.85,
      scaleY: 2.35,
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add.image(W / 2 - 54, 392, 'coin').setScale(1.6);
    label(this, W / 2 + 8, 392, `${Math.floor(save.coins)}`, 30, '#ffd23f');

    LEVELS.forEach((lvl, i) => {
      const y = 480 + i * 96;
      const open = i < save.unlocked;
      if (open) {
        button(this, W / 2, y, 400, 74, `${i + 1}. ${lvl.name}`, [0x3f9b4a, 0xc98a2b, 0x3d7fc4][i % 3], () =>
          this.scene.start('Game', { level: i }),
        );
      } else {
        const b = button(this, W / 2, y, 400, 74, `${i + 1}. Locked`, 0x4a5063, () => {});
        b.setAlpha(0.75);
      }
    });

    button(this, W / 2, 480 + LEVELS.length * 96 + 20, 300, 70, 'UPGRADES', 0x8a5cd6, () =>
      this.scene.start('Shop'),
    );

    label(this, W / 2, H - 40, 'Drag anywhere to move  •  attacks are automatic', 16, '#dfe6f5');
  }

  update(_t: number, dms: number) {
    this.bg.tilePositionY -= dms * 0.02;
  }
}
