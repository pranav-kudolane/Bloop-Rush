import Phaser from 'phaser';
import { W, H } from './config';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { ShopScene } from './scenes/ShopScene';
import { GameScene } from './scenes/GameScene';
import { initAudio } from './audio';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#12161f',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: W,
    height: H,
  },
  input: { activePointers: 2 },
  scene: [BootScene, MenuScene, ShopScene, GameScene],
});

// Handy for debugging from the browser console.
(window as unknown as { __game: Phaser.Game }).__game = game;

window.addEventListener('pointerdown', initAudio);
window.addEventListener('keydown', initAudio);

if (import.meta.env.DEV) void import('./dev/sim');
