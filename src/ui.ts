import Phaser from 'phaser';
import { FONT } from './config';
import { sfx } from './audio';

export function label(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size = 24,
  color = '#ffffff',
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, {
      fontFamily: FONT,
      fontSize: `${size}px`,
      fontStyle: 'bold',
      color,
      stroke: '#141824',
      strokeThickness: Math.max(3, Math.round(size / 6)),
      align: 'center',
    })
    .setOrigin(0.5);
}

export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  color: number,
  onClick: () => void,
  size = 26,
): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  const dark = Phaser.Display.Color.ValueToColor(color).darken(30).color;
  g.fillStyle(0x141824, 1);
  g.fillRoundedRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 10, 16);
  g.fillStyle(dark, 1);
  g.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 13);
  g.fillStyle(color, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h - 2, 13);
  const t = label(scene, 0, -2, text, size);
  const c = scene.add.container(x, y, [g, t]);
  c.setSize(w, h);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerdown', () => c.setScale(0.95));
  c.on('pointerout', () => c.setScale(1));
  c.on('pointerup', () => {
    c.setScale(1);
    sfx.click();
    onClick();
  });
  return c;
}
