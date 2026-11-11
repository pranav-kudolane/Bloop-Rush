# 🟢 Gloop Rush

A fast, mobile-first **auto-shooter survival game** built with [Phaser 3](https://phaser.io/), TypeScript and Vite.

You are a small green blob. Monsters pour in from every side. Your blob attacks on its own, so all you do is **move**: dodge the horde, grab the coins they drop, pick upgrades, and live long enough to beat each zone's boss.

> Drag anywhere to move • attacks are automatic

---

## ✨ Features

- **One-thumb controls.** Touch anywhere to get a floating joystick. On desktop, use WASD or the arrow keys.
- **Automatic attacks.** Your blob fires at the nearest enemy, so the game is about where you stand.
- **Three zones, each ending in a boss fight**

  | Zone | Enemies | Boss |
  | --- | --- | --- |
  | 🌲 **Mossy Woods** | Shroom, Beetle, Stump | **Elder Thornback** |
  | 🏜️ **Sunscorch Dunes** | Scarab, Viper, Golem | **Dune Tyrant** |
  | 🏔️ **Frostbite Peaks** | Snowling, Shard, Yeti | **Glacier King** |

  Bosses mix **dash**, **projectile burst** and **minion summon** attacks, and the later ones use more of them.
- **10 in-run upgrades.** Each time the coin bar fills, you choose one of 3 random upgrade cards:

  | Upgrade | Effect |
  | --- | --- |
  | Spinning Blobs | Blobs orbit you and smash enemies |
  | Mini-Blob Burst | Sprays mini-blobs in all directions |
  | Mega Blob | A huge piercing shot |
  | Frozen Aura | Slows nearby enemies |
  | Split Shot | Fires more blobs per attack |
  | Power Goo | +15% attack damage |
  | Thick Skin | +20 max HP and heals you |
  | Slippery | +8% move speed |
  | Gold Rush | +20% coins earned |
  | Coin Magnet | +35% pickup range |

- **Permanent progression.** Coins are kept after every run, win or lose. Spend them in the **Shop** on Vitality, Might, Fortune and Swiftness.
- **Unlocking zones.** Beat a zone's boss to unlock the next one and earn a coin bonus.
- **Sound made in code.** Sound effects and per-zone music are generated with the Web Audio API, so there are no audio files. There is a mute toggle.
- **Vector art.** Every sprite, ground tile and prop is an SVG made by a script.
- **Auto-save.** Progress is stored in `localStorage`.

---

## 🚀 Getting Started

**Requirements:** [Node.js](https://nodejs.org/) 18 or newer.

```bash
# install dependencies
npm install

# start the dev server (http://localhost:5173)
npm run dev
```

To play on your phone, run `npx vite --host` and open the network URL it prints on a device connected to the same Wi-Fi.

### Production build

```bash
npm run build     # type-checks, then builds to dist/
npm run preview   # serves the built game locally
```

The `dist/` folder is a static site. You can host it on GitHub Pages, Netlify, Vercel, itch.io or any other static host.

---

## 🎮 Controls

| Action | Touch | Keyboard |
| --- | --- | --- |
| Move | Drag anywhere (floating joystick) | `WASD` / arrow keys |
| Attack | Automatic | Automatic |
| Pause / resume | Pause button (top-right) | `Esc` |
| Choose upgrade | Tap a card | Click a card |

---

## 🗂️ Project Structure

```
blob-attack-game/
├── index.html              # Page shell and full-screen canvas
├── public/assets/          # Generated SVG art
│   ├── sprites/            #   player, enemies, bosses
│   ├── ground/             #   tiling ground textures per zone
│   ├── props/              #   scenery per zone
│   ├── icons/              #   upgrade card icons
│   └── art-preview.html    #   page for previewing all the art
├── src/
│   ├── main.ts             # Phaser game setup (540×960, scaled to fit)
│   ├── config.ts           # ⭐ All tuning: zones, enemies, bosses, upgrades
│   ├── save.ts             # localStorage save/load
│   ├── audio.ts            # Generated SFX and music (Web Audio)
│   ├── textures.ts         # Texture loading and fallbacks
│   ├── ui.ts               # Shared button/label helpers
│   ├── scenes/
│   │   ├── BootScene.ts    # Asset loading
│   │   ├── MenuScene.ts    # Title screen and zone select
│   │   ├── ShopScene.ts    # Permanent upgrades
│   │   └── GameScene.ts    # Core gameplay loop
│   └── dev/sim.ts          # Dev-only playtest bot for balance testing
└── tools/make-art.mjs      # Script that generates all the SVG art
```

---

## 🛠️ Modding & Balancing

### Tweak the numbers

Almost every gameplay value is in [`src/config.ts`](src/config.ts):

- `ENEMIES`: HP, speed, damage, size and coin drop for each enemy
- `LEVELS`: zone colors, enemy mix over time, difficulty scaling, boss stats and attack patterns
- `UPGRADES`: in-run upgrade cards and their max levels
- `META` / `metaCost`: shop upgrades and their prices
- `TUNE`: base player stats, fire rate and spawn rates

### Regenerate or replace the art

```bash
node tools/make-art.mjs
```

This rebuilds every SVG in `public/assets/`. Each sprite is a 100×100 image. To use your own art, replace a file with an image of the same name and keep the body centred. Open `/assets/art-preview.html` in the dev server to see all the art at once.

### Test balance with the playtest bot

In dev mode (`npm run dev`), a simple AI that dodges enemies and collects coins can play whole zones at high speed. Run it from the browser console:

```js
await __batch(0, 6)            // Zone 1, 6 runs, no shop upgrades
await __batch(1, 6, { hp: 3 }) // Zone 2, 6 runs, with Vitality level 3
```

It reports results so you can measure the effect of a balance change.

### Reset your save

In the browser console:

```js
localStorage.removeItem('gloop-rush-save-v1'); location.reload();
```

---

## 🧰 Tech Stack

- **[Phaser 3](https://phaser.io/)** game framework
- **TypeScript** in strict mode
- **[Vite](https://vitejs.dev/)** dev server and bundler
- **Web Audio API** for sound
- **SVG** for all art

---

Made by Pranav Kudolane.
