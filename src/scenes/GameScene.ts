import Phaser from 'phaser';
import {
  W, H, FONT, TUNE, LEVELS, ENEMIES, UPGRADES, LevelDef, EnemyDef, BossDef, UpgradeDef, coinsForLevel,
} from '../config';
import { save, persist } from '../save';
import { button, label } from '../ui';
import { sfx, startMusic, stopMusic, toggleMute } from '../audio';

type Img = Phaser.GameObjects.Image;

interface BossState {
  def: BossDef;
  mode: 'chase' | 'windup' | 'dash';
  t: number; // time left in current mode
  next: number; // time until next special
  pat: number; // index into patterns
  dx: number;
  dy: number;
}

interface Enemy {
  s: Img;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  def: EnemyDef | BossDef;
  r: number;
  speed: number;
  dmg: number;
  coin: number;
  color: number;
  slow: number;
  orbitCd: number;
  flash: number;
  phase: number;
  dead: boolean;
  boss?: BossState;
}

interface Shot {
  s: Img;
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  r: number;
  life: number;
  pierce: boolean;
  hit?: Set<Enemy>;
}

interface Coin {
  s: Img;
  x: number;
  y: number;
  value: number;
  age: number;
}

const CELL = 56;
const MAX_ENEMIES = 240;
const cellKey = (cx: number, cy: number) => ((cx & 0xffff) << 16) | (cy & 0xffff);

export class GameScene extends Phaser.Scene {
  private levelIdx = 0;
  private level!: LevelDef;
  private state: 'play' | 'choose' | 'paused' | 'over' = 'play';

  private bg!: Phaser.GameObjects.TileSprite;
  private player!: Img;
  private aura!: Img;
  private px = 0;
  private py = 0;
  private hp = 100;
  private invuln = 0;
  private time_ = 0;

  // derived stats
  private maxHp = 100;
  private dmgMult = 1;
  private coinMult = 1;
  private moveSpeed = 190;
  private magnet = 70;

  private ups: Record<string, number> = {};
  private runLevel = 0;
  private xp = 0;
  private runCoins = 0;
  private kills = 0;
  private pendingPicks = 0;

  private enemies: Enemy[] = [];
  private shots: Shot[] = [];
  private eshots: Shot[] = [];
  private coins: Coin[] = [];
  private orbs: Img[] = [];
  private grid = new Map<number, Enemy[]>();
  private props = new Map<number, Img | null>();
  private boss: Enemy | null = null;
  private bossSpawned = false;
  private bossTime = 0;
  private equipped: Phaser.GameObjects.GameObject[] = [];

  private spawnT = 0;
  private atkT = 0;
  private volleyT = 0;
  private bigT = 0;
  private frostT = 0;
  private orbitA = 0;
  private dmgTexts = 0;

  private hudG!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private lvlText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private coinText!: Phaser.GameObjects.Text;
  private bossText!: Phaser.GameObjects.Text;
  private overlay: Phaser.GameObjects.GameObject[] = [];
  private burst!: Phaser.GameObjects.Particles.ParticleEmitter;

  private joy = { active: false, id: -1, ox: 0, oy: 0, dx: 0, dy: 0 };
  private joyBase!: Phaser.GameObjects.Arc;
  private joyKnob!: Phaser.GameObjects.Arc;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('Game');
  }

  init(data: { level?: number }) {
    this.levelIdx = Phaser.Math.Clamp(data.level ?? 0, 0, LEVELS.length - 1);
  }

  create() {
    this.level = LEVELS[this.levelIdx];
    this.state = 'play';
    this.enemies = [];
    this.shots = [];
    this.eshots = [];
    this.coins = [];
    this.orbs = [];
    this.props = new Map();
    this.overlay = [];
    this.grid.clear();
    this.boss = null;
    this.bossSpawned = false;
    this.bossTime = 0;
    this.equipped = [];
    this.ups = {};
    this.runLevel = 0;
    this.xp = 0;
    this.runCoins = 0;
    this.kills = 0;
    this.pendingPicks = 0;
    this.time_ = 0;
    this.spawnT = 0.5;
    this.atkT = 0.3;
    this.volleyT = 1;
    this.bigT = 1.5;
    this.frostT = 0;
    this.orbitA = 0;
    this.dmgTexts = 0;
    this.invuln = 0;
    this.px = 0;
    this.py = 0;
    this.joy.active = false;

    this.bg = this.add.tileSprite(0, 0, W, H, `ground_${this.levelIdx}`).setOrigin(0).setScrollFactor(0).setDepth(0);
    this.aura = this.add.image(0, 0, 'aura').setDepth(1).setVisible(false);
    this.player = this.add.image(0, 0, 'player').setDepth(4);
    this.cameras.main.startFollow(this.player, false, 0.18, 0.18);
    this.cameras.main.fadeIn(250);
    startMusic(this.levelIdx);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, stopMusic);

    this.burst = this.add.particles(0, 0, 'dot', {
      speed: { min: 60, max: 190 },
      lifespan: 380,
      scale: { start: 1.3, end: 0 },
      emitting: false,
    });
    this.burst.setDepth(5);

    this.recalc();
    this.hp = this.maxHp;
    this.buildHud();
    this.setupInput();
    this.banner(this.level.name, '#ffffff');
  }

  // ---------------------------------------------------------------- stats

  private up(id: string) {
    return this.ups[id] ?? 0;
  }

  private recalc() {
    const m = save.meta;
    this.maxHp = TUNE.baseHp + m.hp * 10 + this.up('maxhp') * 20;
    this.dmgMult = (1 + m.dmg * 0.05) * (1 + this.up('damage') * 0.15);
    this.coinMult = (1 + m.coin * 0.1) * (1 + this.up('coin') * 0.2);
    this.moveSpeed = TUNE.baseSpeed * (1 + m.speed * 0.03) * (1 + this.up('speed') * 0.08);
    this.magnet = TUNE.baseMagnet * (1 + this.up('magnet') * 0.35);
  }

  // ---------------------------------------------------------------- input

  private setupInput() {
    this.joyBase = this.add.circle(0, 0, 54, 0xffffff, 0.14).setStrokeStyle(3, 0xffffff, 0.4);
    this.joyKnob = this.add.circle(0, 0, 24, 0xffffff, 0.45);
    for (const o of [this.joyBase, this.joyKnob]) o.setScrollFactor(0).setDepth(900).setVisible(false);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.state !== 'play' || this.joy.active) return;
      if (p.y < 80 && p.x > W - 80) return; // pause button area
      this.joy.active = true;
      this.joy.id = p.id;
      this.joy.ox = p.x;
      this.joy.oy = p.y;
      this.joy.dx = 0;
      this.joy.dy = 0;
      this.joyBase.setPosition(p.x, p.y).setVisible(true);
      this.joyKnob.setPosition(p.x, p.y).setVisible(true);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.joy.active || p.id !== this.joy.id) return;
      let dx = (p.x - this.joy.ox) / 54;
      let dy = (p.y - this.joy.oy) / 54;
      const len = Math.hypot(dx, dy);
      if (len > 1) {
        dx /= len;
        dy /= len;
      }
      this.joy.dx = dx;
      this.joy.dy = dy;
      this.joyKnob.setPosition(this.joy.ox + dx * 54, this.joy.oy + dy * 54);
    });
    const release = (p: Phaser.Input.Pointer) => {
      if (p.id !== this.joy.id) return;
      this.stopJoy();
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);

    const kb = this.input.keyboard;
    if (kb) {
      this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<string, Phaser.Input.Keyboard.Key>;
      kb.on('keydown-ESC', () => {
        if (this.state === 'play') this.pause();
        else if (this.state === 'paused') this.resume();
      });
    }
  }

  private stopJoy() {
    this.joy.active = false;
    this.joy.dx = 0;
    this.joy.dy = 0;
    this.joyBase.setVisible(false);
    this.joyKnob.setVisible(false);
  }

  // ---------------------------------------------------------------- HUD

  private buildHud() {
    this.hudG = this.add.graphics().setScrollFactor(0).setDepth(1000);
    const mk = (x: number, y: number, size: number, color = '#ffffff') =>
      label(this, x, y, '', size, color).setScrollFactor(0).setDepth(1001);
    this.hpText = mk(166, 28, 15);
    this.lvlText = mk(166, 54, 13);
    this.timeText = mk(W / 2 + 110, 28, 22);
    this.coinText = mk(W - 150, 60, 18, '#ffd23f').setOrigin(0, 0.5);
    this.bossText = mk(W / 2, 122, 18, '#ff8a8a').setVisible(false);
    this.add.image(W - 166, 60, 'coin').setScrollFactor(0).setDepth(1001);

    const pb = button(this, W - 40, 34, 48, 44, 'II', 0x4a5063, () => {
      if (this.state === 'play') this.pause();
    }, 20);
    pb.setScrollFactor(0, 0, true).setDepth(1001);
  }

  /** Row of icons under the bars showing every upgrade picked this run. */
  private refreshEquipped() {
    for (const o of this.equipped) o.destroy();
    this.equipped = [];
    const owned = UPGRADES.filter((u) => this.up(u.id) > 0);
    owned.forEach((u, i) => {
      const x = 32 + i * 34;
      const y = 86;
      const img = this.add.image(x, y, `icon_${u.id}`).setDisplaySize(30, 30).setScrollFactor(0).setDepth(1001);
      const lv = this.up(u.id);
      const t = label(this, x + 9, y + 10, lv >= u.max ? 'M' : `${lv}`, 12, lv >= u.max ? '#7dffd0' : '#ffffff')
        .setScrollFactor(0)
        .setDepth(1002);
      this.equipped.push(img, t);
    });
  }

  private drawHud() {
    const g = this.hudG;
    g.clear();
    // HP
    g.fillStyle(0x141824, 0.85);
    g.fillRoundedRect(16, 16, 300, 24, 8);
    g.fillStyle(0xff5566, 1);
    g.fillRect(20, 20, Math.max(0, 292 * (this.hp / this.maxHp)), 16);
    // coin / upgrade bar
    const need = coinsForLevel(this.runLevel);
    g.fillStyle(0x141824, 0.85);
    g.fillRoundedRect(16, 45, 300, 18, 7);
    g.fillStyle(0xffd23f, 1);
    g.fillRect(19, 48, (this.bossSpawned ? 1 : Math.min(1, this.xp / need)) * 294, 12);
    // boss bar
    if (this.boss) {
      g.fillStyle(0x141824, 0.85);
      g.fillRoundedRect(40, 136, W - 80, 20, 8);
      g.fillStyle(0xc03a3a, 1);
      g.fillRect(44, 140, Math.max(0, (W - 88) * (this.boss.hp / this.boss.maxHp)), 12);
    }
    this.hpText.setText(`${Math.ceil(this.hp)} / ${this.maxHp}`);
    this.lvlText.setText(`Lv ${this.runLevel}/${this.level.bossLevel}`);
    this.coinText.setText(`${Math.floor(this.runCoins)}`);
    if (this.bossSpawned) {
      this.timeText.setText('BOSS');
    } else {
      const sec = Math.floor(this.time_);
      this.timeText.setText(`${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`);
    }
  }

  private banner(text: string, color: string) {
    const t = label(this, W / 2, 300, text, 40, color).setScrollFactor(0).setDepth(1500).setAlpha(0).setScale(0.6);
    this.tweens.add({
      targets: t,
      alpha: 1,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut',
      hold: 1100,
      yoyo: true,
      onComplete: () => t.destroy(),
    });
  }

  // ---------------------------------------------------------------- spawning

  private ringPos(dist = 640) {
    const a = Math.random() * Math.PI * 2;
    return { x: this.px + Math.cos(a) * dist, y: this.py + Math.sin(a) * dist * 1.05 };
  }

  private spawnEnemy(id: string, x?: number, y?: number) {
    if (this.enemies.length >= MAX_ENEMIES) return;
    const def = ENEMIES[id];
    const p = x === undefined || y === undefined ? this.ringPos() : { x, y };
    const prog = this.progress();
    const hp = def.hp * (1 + this.level.hpGrowth * prog);
    this.enemies.push({
      s: this.add.image(p.x, p.y, `e_${id}`).setDepth(3),
      x: p.x,
      y: p.y,
      hp,
      maxHp: hp,
      def,
      r: def.r,
      speed: def.speed,
      dmg: def.dmg * this.level.dmgScale,
      coin: def.coin,
      color: def.color,
      slow: 0,
      orbitCd: 0,
      flash: 0,
      phase: Math.random() * 6.28,
      dead: false,
    });
  }

  private spawnBoss() {
    this.bossSpawned = true;
    this.bossTime = this.time_;
    const def = this.level.boss;
    const p = this.ringPos(520);
    const e: Enemy = {
      s: this.add.image(p.x, p.y, `boss_${this.levelIdx}`).setDepth(3),
      x: p.x,
      y: p.y,
      hp: def.hp,
      maxHp: def.hp,
      def,
      r: def.r,
      speed: def.speed,
      dmg: def.dmg,
      coin: 40,
      color: def.color,
      slow: 0,
      orbitCd: 0,
      flash: 0,
      phase: 0,
      dead: false,
      boss: { def, mode: 'chase', t: 0, next: 3, pat: 0, dx: 0, dy: 0 },
    };
    this.boss = e;
    this.bossText.setText(def.name).setVisible(true);
    this.banner('BOSS INCOMING!', '#ff6b6b');
    sfx.boss();
    this.cameras.main.shake(400, 0.008);
  }

  private updateSpawning(dt: number) {
    const lvl = this.level;
    if (!this.bossSpawned && this.runLevel >= lvl.bossLevel && this.pendingPicks === 0) this.spawnBoss();

    this.spawnT -= dt;
    if (this.spawnT > 0) return;
    const prog = this.progress();
    let interval = Phaser.Math.Linear(TUNE.spawnStart, TUNE.spawnEnd, prog) / lvl.spawnScale;
    let count = 1 + Math.floor(prog * TUNE.spawnExtra);
    if (this.bossSpawned) {
      interval = TUNE.bossPhaseInterval;
      count = 2;
    }
    this.spawnT = interval;
    const pool = lvl.enemies.filter((e) => e.from <= prog);
    const total = pool.reduce((a, e) => a + e.weight, 0);
    for (let i = 0; i < count; i++) {
      let r = Math.random() * total;
      let pick = pool[0];
      for (const e of pool) {
        r -= e.weight;
        if (r <= 0) {
          pick = e;
          break;
        }
      }
      this.spawnEnemy(pick.id);
    }
  }

  // ---------------------------------------------------------------- combat helpers

  private fire(tex: string, angle: number, speed: number, dmg: number, r: number, life: number, pierce = false) {
    this.shots.push({
      s: this.add.image(this.px, this.py, tex).setDepth(5),
      x: this.px,
      y: this.py,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      dmg,
      r,
      life,
      pierce,
      hit: pierce ? new Set() : undefined,
    });
  }

  private nearest(maxDist: number): Enemy | null {
    let best: Enemy | null = null;
    let bd = maxDist * maxDist;
    const check = (e: Enemy) => {
      if (e.dead) return;
      const d = (e.x - this.px) ** 2 + (e.y - this.py) ** 2;
      if (d < bd) {
        bd = d;
        best = e;
      }
    };
    for (const e of this.enemies) check(e);
    if (this.boss) check(this.boss);
    return best;
  }

  private hurt(e: Enemy, dmg: number) {
    if (e.dead) return;
    e.hp -= dmg;
    e.flash = 0.08;
    sfx.hit();
    if (this.dmgTexts < 14) {
      this.dmgTexts++;
      const t = this.add
        .text(e.x + Phaser.Math.Between(-8, 8), e.y - e.r - 6, `${Math.round(dmg)}`, {
          fontFamily: FONT,
          fontSize: e.boss ? '22px' : '16px',
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#141824',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(6);
      this.tweens.add({
        targets: t,
        y: t.y - 26,
        alpha: 0,
        duration: 420,
        onComplete: () => {
          t.destroy();
          this.dmgTexts--;
        },
      });
    }
    if (e.hp <= 0) this.kill(e);
  }

  private kill(e: Enemy) {
    e.dead = true;
    this.kills++;
    sfx.pop();
    this.burst.setParticleTint(e.color);
    this.burst.explode(e.boss ? 40 : 7, e.x, e.y);
    const drops = e.boss ? 20 : 1;
    for (let i = 0; i < drops; i++) {
      if (this.coins.length >= 350) {
        this.gainCoins(e.coin / drops);
        continue;
      }
      const ox = e.boss ? Phaser.Math.Between(-70, 70) : 0;
      const oy = e.boss ? Phaser.Math.Between(-70, 70) : 0;
      this.coins.push({
        s: this.add.image(e.x + ox, e.y + oy, 'coin').setDepth(2),
        x: e.x + ox,
        y: e.y + oy,
        value: e.coin / drops,
        age: 0,
      });
    }
    e.s.destroy();
    if (e.boss) {
      this.boss = null;
      this.cameras.main.shake(500, 0.012);
      this.time.delayedCall(900, () => this.finish(true));
    }
  }

  /** How far through the level you are (0..1), measured in upgrades earned. */
  private progress() {
    if (this.bossSpawned) return 1;
    const frac = Math.min(1, this.xp / coinsForLevel(this.runLevel));
    return Math.min(1, (this.runLevel + frac) / this.level.bossLevel);
  }

  private gainCoins(value: number) {
    const v = value * this.coinMult;
    this.runCoins += v;
    // upgrades stop once the boss is called: no pop-ups mid boss fight
    if (this.runLevel >= this.level.bossLevel) return;
    this.xp += v;
    let need = coinsForLevel(this.runLevel);
    while (this.xp >= need && this.runLevel < this.level.bossLevel) {
      this.xp -= need;
      this.runLevel++;
      this.pendingPicks++;
      need = coinsForLevel(this.runLevel);
    }
  }

  private damagePlayer(dmg: number) {
    if (this.invuln > 0 || this.state !== 'play') return;
    this.hp -= dmg;
    this.invuln = 0.45;
    sfx.hurt();
    this.player.setTintFill(0xff5566);
    this.time.delayedCall(90, () => this.player.clearTint());
    this.cameras.main.shake(110, 0.006);
    if (this.hp <= 0) {
      this.hp = 0;
      this.finish(false);
    }
  }

  // ---------------------------------------------------------------- update

  update(_t: number, dms: number) {
    this.bg.tilePositionX = this.cameras.main.scrollX;
    this.bg.tilePositionY = this.cameras.main.scrollY;
    if (this.state !== 'play') {
      this.drawHud();
      return;
    }
    const dt = Math.min(0.05, dms / 1000);
    this.time_ += dt;
    this.invuln -= dt;

    this.updatePlayer(dt);
    this.updateSpawning(dt);
    this.buildGrid();
    this.updateEnemies(dt);
    if (this.boss) this.updateBoss(this.boss, dt);
    this.updateWeapons(dt);
    this.updateShots(dt);
    this.updateEnemyShots(dt);
    this.updateCoins(dt);
    this.updateProps();

    this.enemies = this.enemies.filter((e) => !e.dead);
    this.drawHud();

    if (this.pendingPicks > 0 && this.state === 'play') this.openUpgradeChoice();
  }

  private updatePlayer(dt: number) {
    let mx = this.joy.dx;
    let my = this.joy.dy;
    const k = this.keys;
    if (k) {
      if (k.A.isDown || k.LEFT.isDown) mx -= 1;
      if (k.D.isDown || k.RIGHT.isDown) mx += 1;
      if (k.W.isDown || k.UP.isDown) my -= 1;
      if (k.S.isDown || k.DOWN.isDown) my += 1;
    }
    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    this.px += mx * this.moveSpeed * dt;
    this.py += my * this.moveSpeed * dt;
    this.player.setPosition(this.px, this.py);
    const wob = Math.sin(this.time_ * (len > 0.1 ? 14 : 5)) * (len > 0.1 ? 0.1 : 0.05);
    this.player.setScale(1 + wob, 1 - wob);
    this.player.setAlpha(this.invuln > 0 ? 0.65 : 1);
  }

  private buildGrid() {
    this.grid.clear();
    for (const e of this.enemies) {
      const key = cellKey(Math.floor(e.x / CELL), Math.floor(e.y / CELL));
      const cell = this.grid.get(key);
      if (cell) cell.push(e);
      else this.grid.set(key, [e]);
    }
  }

  private updateEnemies(dt: number) {
    const t = this.time_;
    for (const e of this.enemies) {
      if (e.dead) continue;
      let dx = this.px - e.x;
      let dy = this.py - e.y;
      const d = Math.hypot(dx, dy) || 1;

      // recycle enemies left far behind
      if (d > 1000) {
        const p = this.ringPos();
        e.x = p.x;
        e.y = p.y;
        continue;
      }
      dx /= d;
      dy /= d;
      const sp = e.speed * (1 - e.slow);
      e.x += dx * sp * dt;
      e.y += dy * sp * dt;

      // keep enemies from stacking on top of each other
      const cx = Math.floor(e.x / CELL);
      const cy = Math.floor(e.y / CELL);
      for (let gx = cx - 1; gx <= cx + 1; gx++) {
        for (let gy = cy - 1; gy <= cy + 1; gy++) {
          const cell = this.grid.get(cellKey(gx, gy));
          if (!cell) continue;
          for (const o of cell) {
            if (o === e || o.dead) continue;
            const ox = e.x - o.x;
            const oy = e.y - o.y;
            const min = e.r + o.r;
            const dd = ox * ox + oy * oy;
            if (dd < min * min && dd > 0.01) {
              const od = Math.sqrt(dd);
              const push = ((min - od) / od) * 0.25;
              e.x += ox * push;
              e.y += oy * push;
            }
          }
        }
      }

      if (d < e.r + 16) this.damagePlayer(e.dmg);

      e.orbitCd -= dt;
      this.paint(e, dt, Math.sin(t * 9 + e.phase) * 0.08);
      e.slow = 0;
    }
  }

  private paint(e: Enemy, dt: number, wob: number) {
    e.s.setPosition(e.x, e.y);
    e.s.setScale(1 + wob, 1 - wob);
    if (e.flash > 0) {
      e.flash -= dt;
      e.s.setTintFill(0xffffff);
    } else if (e.boss && e.boss.mode === 'windup') {
      e.s.setTint(0xff7070);
    } else if (e.slow > 0) {
      e.s.setTint(0x9fdcff);
    } else {
      e.s.clearTint();
    }
  }

  private updateBoss(e: Enemy, dt: number) {
    const b = e.boss!;
    const rage = e.hp < e.maxHp * 0.5 ? 0.7 : 1;
    let dx = this.px - e.x;
    let dy = this.py - e.y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d;
    dy /= d;

    if (b.mode === 'chase') {
      const sp = e.speed * (1 - e.slow * 0.5);
      e.x += dx * sp * dt;
      e.y += dy * sp * dt;
      b.next -= dt;
      if (b.next <= 0) {
        const pat = b.def.patterns[b.pat % b.def.patterns.length];
        b.pat++;
        if (pat === 'dash') {
          b.mode = 'windup';
          b.t = 0.75 * rage;
        } else if (pat === 'burst') {
          const n = 12 + this.levelIdx * 4;
          const off = Math.random() * 6.28;
          for (let i = 0; i < n; i++) {
            const a = off + (i / n) * Math.PI * 2;
            this.eshots.push({
              s: this.add.image(e.x, e.y, 'eshot').setDepth(5),
              x: e.x,
              y: e.y,
              vx: Math.cos(a) * 175,
              vy: Math.sin(a) * 175,
              dmg: e.dmg * 0.6,
              r: 9,
              life: 4,
              pierce: false,
            });
          }
          b.next = 2.6 * rage;
        } else {
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            this.spawnEnemy(b.def.minion, e.x + Math.cos(a) * 80, e.y + Math.sin(a) * 80);
          }
          b.next = 3 * rage;
        }
      }
    } else if (b.mode === 'windup') {
      b.t -= dt;
      b.dx = dx;
      b.dy = dy;
      if (b.t <= 0) {
        b.mode = 'dash';
        b.t = 0.6;
      }
    } else {
      e.x += b.dx * 540 * dt;
      e.y += b.dy * 540 * dt;
      b.t -= dt;
      if (b.t <= 0) {
        b.mode = 'chase';
        b.next = 2.4 * rage;
      }
    }

    if (d < e.r + 16) this.damagePlayer(e.dmg * (b.mode === 'dash' ? 1.5 : 1));
    e.orbitCd -= dt;
    const wob = b.mode === 'windup' ? Math.sin(this.time_ * 40) * 0.06 : Math.sin(this.time_ * 5) * 0.05;
    this.paint(e, dt, wob);
    e.slow = 0;
  }

  private updateWeapons(dt: number) {
    // basic attack: shoot the nearest enemy
    this.atkT -= dt;
    if (this.atkT <= 0) {
      const target = this.nearest(430);
      if (target) {
        this.atkT = TUNE.atkInterval;
        sfx.shoot();
        const base = Math.atan2(target.y - this.py, target.x - this.px);
        const n = 1 + this.up('count');
        for (let i = 0; i < n; i++) {
          this.fire('shot', base + (i - (n - 1) / 2) * 0.17, 540, TUNE.atkDamage * this.dmgMult, 8, 1.0);
        }
      }
    }

    // mini-blob burst
    const vol = this.up('volley');
    if (vol > 0) {
      this.volleyT -= dt;
      if (this.volleyT <= 0) {
        this.volleyT = 3.2 - vol * 0.25;
        sfx.volley();
        const n = 6 + 2 * vol;
        const off = Math.random() * 6.28;
        for (let i = 0; i < n; i++) {
          this.fire('mini', off + (i / n) * Math.PI * 2, 360, (6 + 3 * vol) * this.dmgMult, 6, 0.9);
        }
      }
    }

    // mega blob
    const big = this.up('big');
    if (big > 0) {
      this.bigT -= dt;
      if (this.bigT <= 0) {
        const target = this.nearest(520);
        if (target) {
          this.bigT = 4.2 - big * 0.4;
          sfx.big();
          const a = Math.atan2(target.y - this.py, target.x - this.px);
          this.fire('big', a, 300, (40 + 25 * big) * this.dmgMult, 26, 1.9, true);
        }
      }
    }

    // spinning blobs
    const orb = this.up('orbit');
    const want = orb > 0 ? orb + 1 : 0;
    while (this.orbs.length < want) this.orbs.push(this.add.image(this.px, this.py, 'orb').setDepth(5));
    if (want > 0) {
      this.orbitA += dt * 3.3;
      const R = 78;
      const dmg = (8 + 5 * orb) * this.dmgMult;
      for (let i = 0; i < want; i++) {
        const a = this.orbitA + (i / want) * Math.PI * 2;
        const ox = this.px + Math.cos(a) * R;
        const oy = this.py + Math.sin(a) * R;
        this.orbs[i].setPosition(ox, oy);
        const test = (e: Enemy) => {
          if (e.dead || e.orbitCd > 0) return;
          const min = e.r + 12;
          if ((e.x - ox) ** 2 + (e.y - oy) ** 2 < min * min) {
            e.orbitCd = 0.35;
            this.hurt(e, dmg);
          }
        };
        for (const e of this.enemies) test(e);
        if (this.boss) test(this.boss);
      }
    }

    // frozen aura
    const frost = this.up('frost');
    if (frost > 0) {
      const R = 85 + 15 * frost;
      const slow = 0.25 + 0.07 * frost;
      this.aura.setVisible(true).setPosition(this.px, this.py).setScale((R / 128) * (1 + Math.sin(this.time_ * 4) * 0.03));
      this.frostT -= dt;
      const tick = this.frostT <= 0;
      if (tick) this.frostT = 0.5;
      const dmg = (3 + 3 * frost) * this.dmgMult;
      const test = (e: Enemy) => {
        if (e.dead) return;
        const min = R + e.r;
        if ((e.x - this.px) ** 2 + (e.y - this.py) ** 2 < min * min) {
          e.slow = slow;
          if (tick) this.hurt(e, dmg);
        }
      };
      for (const e of this.enemies) test(e);
      if (this.boss) test(this.boss);
    }
  }

  private updateShots(dt: number) {
    for (const s of this.shots) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      s.s.setPosition(s.x, s.y);
      if (s.pierce) s.s.rotation += dt * 6;

      const tryHit = (e: Enemy) => {
        if (s.life <= 0 || e.dead || s.hit?.has(e)) return;
        const min = s.r + e.r;
        if ((e.x - s.x) ** 2 + (e.y - s.y) ** 2 < min * min) {
          this.hurt(e, s.dmg);
          if (s.pierce) s.hit!.add(e);
          else s.life = 0;
        }
      };
      if (this.boss) tryHit(this.boss);
      const cx = Math.floor(s.x / CELL);
      const cy = Math.floor(s.y / CELL);
      for (let gx = cx - 1; gx <= cx + 1 && s.life > 0; gx++) {
        for (let gy = cy - 1; gy <= cy + 1 && s.life > 0; gy++) {
          const cell = this.grid.get(cellKey(gx, gy));
          if (cell) for (const e of cell) tryHit(e);
        }
      }
      if (s.life <= 0) s.s.destroy();
    }
    this.shots = this.shots.filter((s) => s.life > 0);
  }

  private updateEnemyShots(dt: number) {
    for (const s of this.eshots) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      s.s.setPosition(s.x, s.y);
      const min = s.r + 14;
      if ((s.x - this.px) ** 2 + (s.y - this.py) ** 2 < min * min) {
        this.damagePlayer(s.dmg);
        s.life = 0;
      }
      if (s.life <= 0) s.s.destroy();
    }
    this.eshots = this.eshots.filter((s) => s.life > 0);
  }

  private updateCoins(dt: number) {
    const mag2 = this.magnet * this.magnet;
    for (const c of this.coins) {
      c.age += dt;
      const dx = this.px - c.x;
      const dy = this.py - c.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 22 * 22) {
        this.gainCoins(c.value);
        sfx.coin();
        c.value = -1;
        c.s.destroy();
        continue;
      }
      if (d2 < mag2 || !this.boss && this.bossSpawned) {
        const d = Math.sqrt(d2) || 1;
        const sp = 460;
        c.x += (dx / d) * sp * dt;
        c.y += (dy / d) * sp * dt;
        c.s.setPosition(c.x, c.y);
      }
    }
    this.coins = this.coins.filter((c) => c.value >= 0);
  }

  // ---------------------------------------------------------------- overlays

  private track<T extends Phaser.GameObjects.GameObject>(o: T, depth = 2001): T {
    const any = o as unknown as { setScrollFactor: (x: number, y?: number, u?: boolean) => void; setDepth: (d: number) => void };
    any.setScrollFactor(0, 0, true);
    any.setDepth(depth);
    this.overlay.push(o);
    return o;
  }

  private clearOverlay() {
    for (const o of this.overlay) o.destroy();
    this.overlay = [];
  }

  private dim(alpha = 0.6) {
    this.track(this.add.rectangle(0, 0, W, H, 0x0b1020, alpha).setOrigin(0).setInteractive(), 2000);
  }

  private openUpgradeChoice() {
    this.state = 'choose';
    this.stopJoy();
    sfx.levelUp();
    const pool = UPGRADES.filter((u) => this.up(u.id) < u.max);
    if (pool.length === 0) {
      // everything maxed: just heal
      this.pendingPicks = 0;
      this.hp = Math.min(this.maxHp, this.hp + 25);
      this.state = 'play';
      return;
    }
    const picks = Phaser.Utils.Array.Shuffle(pool.slice()).slice(0, 3);
    this.dim();
    this.track(label(this, W / 2, 150, 'LEVEL UP!', 48, '#ffd23f'));
    this.track(label(this, W / 2, 200, 'Choose an upgrade', 20, '#dfe6f5'));
    picks.forEach((u, i) => this.card(u, 330 + i * 180));
  }

  private card(u: UpgradeDef, y: number) {
    const cur = this.up(u.id);
    const w = 460;
    const h = 150;
    const g = this.add.graphics();
    g.fillStyle(0x141824, 1);
    g.fillRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 20);
    g.fillStyle(0x2a3350, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
    g.fillStyle(u.color, 1);
    g.fillRoundedRect(-w / 2, -h / 2, 12, h, { tl: 16, bl: 16, tr: 0, br: 0 });
    const icon = this.add.image(-w / 2 + 68, 0, `icon_${u.id}`).setDisplaySize(84, 84);

    const name = label(this, -w / 2 + 122, -38, u.name, 26).setOrigin(0, 0.5);
    const lv = label(this, w / 2 - 20, -38, cur === 0 ? 'NEW' : `Lv ${cur + 1}`, 18, cur === 0 ? '#7dffd0' : '#ffd23f').setOrigin(1, 0.5);
    const desc = this.add
      .text(-w / 2 + 122, 14, u.desc(cur + 1), {
        fontFamily: FONT,
        fontSize: '18px',
        color: '#dfe6f5',
        wordWrap: { width: w - 150 },
      })
      .setOrigin(0, 0.5);

    const c = this.add.container(W / 2, y, [g, icon, name, lv, desc]);
    c.setSize(w, h);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerup', () => this.pick(u));
    this.track(c);
    c.setScale(0.8).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 180, ease: 'Back.easeOut' });
  }

  private pick(u: UpgradeDef) {
    if (this.state !== 'choose') return;
    sfx.pick();
    this.ups[u.id] = this.up(u.id) + 1;
    this.recalc();
    this.refreshEquipped();
    if (u.id === 'maxhp') this.hp += 20;
    this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.08);
    this.pendingPicks--;
    this.clearOverlay();
    this.invuln = Math.max(this.invuln, 0.6);
    if (this.pendingPicks > 0) this.openUpgradeChoice();
    else this.state = 'play';
  }

  private pause() {
    this.state = 'paused';
    this.stopJoy();
    this.dim(0.8);
    this.track(label(this, W / 2, 110, 'PAUSED', 52));
    this.track(button(this, W / 2, 210, 300, 68, 'RESUME', 0x3f9b4a, () => this.resume()));
    const snd = this.track(button(this, W / 2, 296, 300, 68, save.muted ? 'SOUND: OFF' : 'SOUND: ON', 0x4a5063, () => {
      const muted = toggleMute();
      (snd.list[1] as Phaser.GameObjects.Text).setText(muted ? 'SOUND: OFF' : 'SOUND: ON');
    }));
    this.track(button(this, W / 2, 382, 300, 68, 'QUIT', 0xc0483a, () => {
      this.bank(0);
      this.scene.start('Menu');
    }));

    // what you have equipped this run
    this.track(label(this, W / 2, 470, 'YOUR UPGRADES', 24, '#ffd23f'));
    const owned = UPGRADES.filter((u) => this.up(u.id) > 0);
    if (owned.length === 0) this.track(label(this, W / 2, 530, 'None yet: collect coins to level up', 17, '#c9d3ea'));
    owned.forEach((u, i) => {
      const x = 34 + (i % 2) * 246;
      const y = 530 + Math.floor(i / 2) * 68;
      const lv = this.up(u.id);
      this.track(this.add.image(x + 24, y, `icon_${u.id}`).setDisplaySize(52, 52));
      this.track(label(this, x + 58, y - 12, u.name, 16).setOrigin(0, 0.5));
      this.track(label(this, x + 58, y + 12, lv >= u.max ? 'MAX' : `Lv ${lv} / ${u.max}`, 14, lv >= u.max ? '#7dffd0' : '#c9d3ea').setOrigin(0, 0.5));
    });
  }

  private updateProps() {
    // Scenery is placed by a hash of the world cell, so it is stable as you roam.
    const C = 190;
    const cam = this.cameras.main;
    const x0 = Math.floor((cam.scrollX - 90) / C);
    const x1 = Math.floor((cam.scrollX + W + 90) / C);
    const y0 = Math.floor((cam.scrollY - 90) / C);
    const y1 = Math.floor((cam.scrollY + H + 90) / C);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const key = cellKey(cx, cy);
        if (this.props.has(key)) continue;
        let h = Math.imul(cx, 374761393) + Math.imul(cy, 668265263) + this.levelIdx * 1013;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        h = (h ^ (h >>> 16)) >>> 0;
        let img: Img | null = null;
        if (h % 100 < 34 && !(cx === 0 && cy === 0) && !(cx === -1 && cy === -1)) {
          const type = (h >>> 8) % 5 === 0 ? 0 : 1 + ((h >>> 11) % 2);
          const px = cx * C + 30 + ((h >>> 14) % (C - 60));
          const py = cy * C + 30 + ((h >>> 22) % (C - 60));
          img = this.add.image(px, py, `prop_${this.levelIdx}_${type}`).setDepth(1.5);
        }
        this.props.set(key, img);
      }
    }
    if (this.props.size > 120) {
      for (const [key, img] of this.props) {
        const cx = key >> 16;
        const cy = (key << 16) >> 16;
        if (cx < x0 - 1 || cx > x1 + 1 || cy < y0 - 1 || cy > y1 + 1) {
          img?.destroy();
          this.props.delete(key);
        }
      }
    }
  }

  private resume() {
    this.clearOverlay();
    this.state = 'play';
  }

  private bank(bonus: number) {
    save.coins += Math.floor(this.runCoins) + bonus;
    persist();
  }

  private finish(won: boolean) {
    if (this.state === 'over') return;
    this.clearOverlay();
    this.state = 'over';
    this.stopJoy();
    stopMusic();
    if (won) sfx.win();
    else sfx.lose();
    const bonus = won ? 50 * (this.levelIdx + 1) : 0;
    if (won) save.unlocked = Math.min(LEVELS.length, Math.max(save.unlocked, this.levelIdx + 2));
    this.bank(bonus);

    this.dim(0.7);
    this.track(label(this, W / 2, 230, won ? 'LEVEL CLEAR!' : 'DEFEATED', 54, won ? '#7dffd0' : '#ff6b6b'));
    this.track(label(this, W / 2, 320, `Enemies squished: ${this.kills}`, 22));
    this.track(label(this, W / 2, 362, `Coins earned: ${Math.floor(this.runCoins)}${won ? `  +${bonus} bonus` : ''}`, 22, '#ffd23f'));
    this.track(label(this, W / 2, 404, `Total coins: ${Math.floor(save.coins)}`, 20, '#dfe6f5'));

    let y = 510;
    const hasNext = won && this.levelIdx + 1 < LEVELS.length;
    if (hasNext) {
      this.track(button(this, W / 2, y, 320, 76, 'NEXT LEVEL', 0x3f9b4a, () => this.scene.start('Game', { level: this.levelIdx + 1 })));
      y += 96;
    }
    this.track(button(this, W / 2, y, 320, 76, won ? 'PLAY AGAIN' : 'RETRY', won ? 0x3d7fc4 : 0x3f9b4a, () =>
      this.scene.start('Game', { level: this.levelIdx }),
    ));
    y += 96;
    this.track(button(this, W / 2, y, 320, 76, 'UPGRADES', 0x8a5cd6, () => this.scene.start('Shop')));
    y += 96;
    this.track(button(this, W / 2, y, 320, 76, 'MENU', 0x4a5063, () => this.scene.start('Menu')));
  }
}
