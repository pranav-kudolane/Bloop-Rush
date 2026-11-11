// Small effects (shots, coin, aura) are drawn in code. Characters and grounds
// are loaded from public/assets; the code-drawn versions below are only a
// fallback if a file is missing.
import Phaser from 'phaser';
import { ENEMIES, LEVELS, PLAYER_COLOR, Shape } from './config';

const darker = (c: number, amt = 30) => Phaser.Display.Color.ValueToColor(c).darken(amt).color;
const lighter = (c: number, amt = 30) => Phaser.Display.Color.ValueToColor(c).lighten(amt).color;

function creature(
  scene: Phaser.Scene,
  key: string,
  r: number,
  color: number,
  shape: Shape,
  angry: boolean,
  crown = false,
) {
  if (scene.textures.exists(key)) return;
  const pad = shape === 'spiky' || crown ? Math.ceil(r * 0.45) + 4 : 6;
  const w = (r + pad) * 2;
  const h = (r + pad) * 2 + 6;
  const cx = w / 2;
  const cy = r + pad;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const dark = darker(color, 35);

  // ground shadow
  g.fillStyle(0x000000, 0.22);
  g.fillEllipse(cx, cy + r * 0.92, r * 1.7, r * 0.55);

  if (shape === 'spiky' || crown) {
    const n = crown ? 9 : 8;
    g.fillStyle(dark, 1);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const a1 = a - 0.28;
      const a2 = a + 0.28;
      const tip = r * 1.4;
      g.fillTriangle(
        cx + Math.cos(a) * tip, cy + Math.sin(a) * tip,
        cx + Math.cos(a1) * r * 0.9, cy + Math.sin(a1) * r * 0.9,
        cx + Math.cos(a2) * r * 0.9, cy + Math.sin(a2) * r * 0.9,
      );
    }
  }

  if (shape === 'square') {
    g.fillStyle(dark, 1);
    g.fillRoundedRect(cx - r, cy - r, r * 2, r * 2, r * 0.4);
    g.fillStyle(color, 1);
    g.fillRoundedRect(cx - r + 3, cy - r + 3, r * 2 - 6, r * 2 - 6, r * 0.32);
  } else {
    g.fillStyle(dark, 1);
    g.fillCircle(cx, cy, r);
    g.fillStyle(color, 1);
    g.fillCircle(cx, cy, r - 2.5);
  }

  // glossy highlight
  g.fillStyle(lighter(color, 35), 0.75);
  g.fillEllipse(cx - r * 0.35, cy - r * 0.45, r * 0.55, r * 0.32);

  // eyes
  const ex = r * 0.36;
  const ey = -r * 0.05;
  const er = Math.max(2.5, r * 0.24);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(cx - ex, cy + ey, er);
  g.fillCircle(cx + ex, cy + ey, er);
  g.fillStyle(0x15151f, 1);
  g.fillCircle(cx - ex + er * 0.15, cy + ey + er * 0.1, er * 0.55);
  g.fillCircle(cx + ex + er * 0.15, cy + ey + er * 0.1, er * 0.55);
  if (angry) {
    g.lineStyle(Math.max(2, r * 0.14), 0x15151f, 1);
    g.lineBetween(cx - ex - er, cy + ey - er * 1.5, cx - ex + er, cy + ey - er * 0.6);
    g.lineBetween(cx + ex + er, cy + ey - er * 1.5, cx + ex - er, cy + ey - er * 0.6);
  } else {
    // smile
    g.lineStyle(2, 0x15151f, 1);
    g.beginPath();
    g.arc(cx, cy + r * 0.25, r * 0.28, 0.15 * Math.PI, 0.85 * Math.PI);
    g.strokePath();
  }

  g.generateTexture(key, w, h);
  g.destroy();
}

function ball(scene: Phaser.Scene, key: string, r: number, color: number) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const s = r * 2 + 4;
  g.fillStyle(darker(color, 30), 1);
  g.fillCircle(s / 2, s / 2, r);
  g.fillStyle(color, 1);
  g.fillCircle(s / 2, s / 2, r - Math.max(1.5, r * 0.14));
  g.fillStyle(0xffffff, 0.7);
  g.fillCircle(s / 2 - r * 0.3, s / 2 - r * 0.35, r * 0.25);
  g.generateTexture(key, s, s);
  g.destroy();
}

function ground(scene: Phaser.Scene, key: string, cols: [number, number, number], seed: number) {
  if (scene.textures.exists(key)) return;
  const S = 256;
  const rnd = new Phaser.Math.RandomDataGenerator([`ground${seed}`]);
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(cols[0], 1);
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 26; i++) {
    const r = rnd.between(6, 20);
    g.fillStyle(cols[1], 0.55);
    g.fillEllipse(rnd.between(r, S - r), rnd.between(r, S - r), r * 2, r * 1.3);
  }
  for (let i = 0; i < 22; i++) {
    const x = rnd.between(8, S - 8);
    const y = rnd.between(8, S - 8);
    g.fillStyle(cols[2], 0.9);
    g.fillTriangle(x - 3, y + 4, x, y - 5, x + 3, y + 4);
    g.fillTriangle(x + 2, y + 4, x + 6, y - 2, x + 8, y + 4);
  }
  for (let i = 0; i < 5; i++) {
    const x = rnd.between(14, S - 14);
    const y = rnd.between(14, S - 14);
    g.fillStyle(darker(cols[1], 25), 0.9);
    g.fillEllipse(x, y, 16, 11);
    g.fillStyle(lighter(cols[1], 10), 0.9);
    g.fillEllipse(x - 2, y - 2, 9, 5);
  }
  g.generateTexture(key, S, S);
  g.destroy();
}

export function makeTextures(scene: Phaser.Scene) {
  creature(scene, 'player', 20, PLAYER_COLOR, 'round', false);

  for (const [id, def] of Object.entries(ENEMIES)) {
    creature(scene, `e_${id}`, def.r, def.color, def.shape, true);
  }
  LEVELS.forEach((lvl, i) => {
    creature(scene, `boss_${i}`, lvl.boss.r, lvl.boss.color, 'round', true, true);
    ground(scene, `ground_${i}`, lvl.ground, i);
  });

  ball(scene, 'shot', 8, PLAYER_COLOR);
  ball(scene, 'mini', 6, 0xffb02e);
  ball(scene, 'big', 26, 0xff5fa2);
  ball(scene, 'orb', 11, 0x39c0ff);
  ball(scene, 'eshot', 9, 0xff3b3b);

  // coin
  let g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0xb8860b, 1);
  g.fillCircle(9, 9, 8);
  g.fillStyle(0xffd23f, 1);
  g.fillCircle(9, 9, 6.2);
  g.fillStyle(0xfff3b0, 1);
  g.fillCircle(7, 7, 2.2);
  g.generateTexture('coin', 18, 18);
  g.destroy();

  // particle
  g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(4, 4, 4);
  g.generateTexture('dot', 8, 8);
  g.destroy();

  // frost aura (scaled at runtime)
  g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x9fe8ff, 0.16);
  g.fillCircle(128, 128, 126);
  g.lineStyle(4, 0xd8f6ff, 0.55);
  g.strokeCircle(128, 128, 124);
  g.generateTexture('aura', 256, 256);
  g.destroy();
}
