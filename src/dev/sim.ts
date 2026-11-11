// Dev-only playtest bot. Runs whole levels at high speed with a simple
// dodge-and-collect AI so balance changes can be measured, not guessed.
// Usage from the browser console:  await __batch(0, 6)          // level 1, 6 runs
//                                  await __batch(1, 6, {hp:3})  // with shop upgrades
/* eslint-disable @typescript-eslint/no-explicit-any */
import { UPGRADES } from '../config';
import { save } from '../save';
import { audioState, stopMusic } from '../audio';

const w = window as any;
const WEAPONS = ['orbit', 'volley', 'big', 'frost', 'damage', 'count'];

async function sim(level: number, meta: Record<string, number> = {}, policy = 'random') {
  const game = w.__game;
  const backup = JSON.stringify(save);
  Object.assign(save.meta, { hp: 0, dmg: 0, coin: 0, speed: 0 }, meta);
  audioState.silent = true;
  stopMusic();
  game.loop.wake();
  for (const k of ['Menu', 'Shop', 'Game']) if (game.scene.isActive(k)) game.scene.stop(k);
  game.scene.start('Game', { level });
  await new Promise((r) => setTimeout(r, 250));
  const s = game.scene.getScene('Game');
  if (s.time_ > 2 || s.levelIdx !== level) game.step(performance.now(), 16);
  game.loop.sleep();

  const dt = 1000 / 30;
  const log: any = { result: 'timeout' };
  let dmgTaken = 0;
  let lastHp = s.hp;
  for (let steps = 0; steps < 30000; steps++) {
    let fx = 0;
    let fy = 0;
    const all = s.boss ? s.enemies.concat([s.boss]) : s.enemies;
    for (const e of all) {
      const dx = s.px - e.x;
      const dy = s.py - e.y;
      const dc = Math.hypot(dx, dy) || 1;
      const d = dc - e.r;
      if (d < (e.boss ? 170 : 200)) {
        const wt = (e.boss ? 4 : 1) / Math.max(18, d) ** 2;
        fx += (dx / dc) * wt;
        fy += (dy / dc) * wt;
      } else if (e.boss && d > 240) {
        // stay in the fight instead of kiting forever, like a real player would
        fx -= (dx / dc) * 0.0003;
        fy -= (dy / dc) * 0.0003;
      }
    }
    for (const e of s.eshots) {
      const dx = s.px - e.x;
      const dy = s.py - e.y;
      const dc = Math.hypot(dx, dy) || 1;
      if (dc < 110) {
        const wt = 1.5 / Math.max(18, dc) ** 2;
        fx += (dx / dc) * wt;
        fy += (dy / dc) * wt;
      }
    }
    let best: any = null;
    let bd = 1e12;
    for (const c of s.coins) {
      const d2 = (c.x - s.px) ** 2 + (c.y - s.py) ** 2;
      if (d2 < bd) {
        bd = d2;
        best = c;
      }
    }
    if (best) {
      const d = Math.sqrt(bd) || 1;
      fx += ((best.x - s.px) / d) * 0.00015;
      fy += ((best.y - s.py) / d) * 0.00015;
    }
    const l = Math.hypot(fx, fy);
    s.joy.dx = l > 1e-9 ? fx / l : 0;
    s.joy.dy = l > 1e-9 ? fy / l : 0;

    s.update(0, dt);
    if (s.hp < lastHp) dmgTaken += lastHp - s.hp;
    lastHp = s.hp;

    for (let guard = 0; s.state === 'choose' && guard < 10; guard++) {
      const pool = UPGRADES.filter((u) => (s.ups[u.id] || 0) < u.max)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      let pick = pool[0];
      if (policy === 'smart') pick = pool.find((u) => WEAPONS.includes(u.id)) ?? pick;
      s.pick(pick);
      lastHp = s.hp;
    }
    if (s.bossSpawned && !log.atBoss) {
      log.atBoss = `hp=${Math.round(s.hp)}/${s.maxHp} lv=${s.runLevel} kills=${s.kills} dmgTaken=${Math.round(dmgTaken)}`;
    }
    if (s.state === 'over') {
      log.result = 'dead';
      break;
    }
    if (s.bossSpawned && !s.boss) {
      log.result = 'win';
      break;
    }
  }
  log.t = Math.round(s.time_);
  log.lv = s.runLevel;
  log.coins = Math.round(s.runCoins);
  log.endHp = `${Math.round(s.hp)}/${s.maxHp}`;
  log.bossFight = s.bossSpawned ? Math.round(s.time_ - s.bossTime) : null;
  log.bossAt = s.bossSpawned ? Math.round(s.bossTime) : null;
  log.bossLeft = s.boss ? `${Math.round((s.boss.hp / s.boss.maxHp) * 100)}%` : '0%';
  Object.assign(save, JSON.parse(backup));
  audioState.silent = false;
  game.loop.wake();
  return log;
}

w.__sim = sim;
w.__batch = async (level: number, n = 5, meta = {}, policy = 'random') => {
  const backup = localStorage.getItem('gloop-rush-save-v1');
  const out: string[] = [];
  let wins = 0;
  for (let i = 0; i < n; i++) {
    const r = await sim(level, meta, policy);
    if (r.result === 'win') wins++;
    out.push(`${r.result} t=${r.t}s bossAt=${r.bossAt}s lv=${r.lv} coins=${r.coins} end=${r.endHp} | atBoss[${r.atBoss ?? '-'}] fight=${r.bossFight}s bossLeft=${r.bossLeft}`);
  }
  if (backup === null) localStorage.removeItem('gloop-rush-save-v1');
  else localStorage.setItem('gloop-rush-save-v1', backup);
  out.unshift(`level ${level + 1}: ${wins}/${n} wins`);
  w.__game.scene.stop('Game');
  w.__game.scene.start('Menu');
  return out;
};
