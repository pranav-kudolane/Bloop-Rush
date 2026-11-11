// Generates the game's vector art into public/assets/.
// Run with:  node tools/make-art.mjs
// Every sprite is a 100x100 SVG. To use painted art instead, replace a file
// with your own image of the same name (keep the body centred).
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'public/assets';
mkdirSync(`${OUT}/sprites`, { recursive: true });
mkdirSync(`${OUT}/ground`, { recursive: true });
mkdirSync(`${OUT}/props`, { recursive: true });

// ---------- colour helpers ----------
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const toHex = (rgb) => '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => toHex(hex(a).map((v, i) => v + (hex(b)[i] - v) * t));
const dark = (c, t = 0.35) => mix(c, '#101018', t);
const light = (c, t = 0.4) => mix(c, '#ffffff', t);

// ---------- shared pieces ----------
const svg = (body, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>${defs}</defs>${body}</svg>\n`;
const grad = (id, c, cx = 0.36, cy = 0.3) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="0.85"><stop offset="0" stop-color="${light(c, 0.45)}"/><stop offset="0.5" stop-color="${c}"/><stop offset="1" stop-color="${dark(c, 0.3)}"/></radialGradient>`;
const shadow = (rx = 30, cy = 90) => `<ellipse cx="50" cy="${cy}" rx="${rx}" ry="${rx * 0.24}" fill="#000" opacity="0.22"/>`;
const shine = (x = 34, y = 30, rx = 11, ry = 6) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" opacity="0.55" transform="rotate(-28 ${x} ${y})"/>`;

function eyes({ y = 52, gap = 13, r = 8, angry = true, white = '#fff', pupil = '#15151f', glow = false } = {}) {
  let s = '';
  for (const sx of [-1, 1]) {
    const x = 50 + sx * gap;
    s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${white}" stroke="#15151f" stroke-width="1.5"/>`;
    s += `<circle cx="${x - sx * r * 0.18}" cy="${y + r * 0.12}" r="${r * 0.52}" fill="${pupil}"/>`;
    if (!glow) s += `<circle cx="${x - sx * r * 0.18 - r * 0.2}" cy="${y - r * 0.15}" r="${r * 0.2}" fill="#fff"/>`;
    if (angry) {
      s += `<path d="M${x + sx * r * 1.25} ${y - r * 1.7} L${x - sx * r * 1.15} ${y - r * 0.55}" stroke="#15151f" stroke-width="${r * 0.55}" stroke-linecap="round"/>`;
    }
  }
  return s;
}

const spikes = (cx, cy, r0, r1, n, fill, stroke, width = 0.3, off = 0) => {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = off + (i / n) * Math.PI * 2;
    const p = (ang, rad) => `${(cx + Math.cos(ang) * rad).toFixed(1)} ${(cy + Math.sin(ang) * rad).toFixed(1)}`;
    s += `<path d="M${p(a - width, r0)} L${p(a, r1)} L${p(a + width, r0)} Z" fill="${fill}" stroke="${stroke}" stroke-width="2.5" stroke-linejoin="round"/>`;
  }
  return s;
};

const sprites = {};

// ---------- hero ----------
{
  const c = '#2fd6a3';
  const o = dark(c, 0.5);
  sprites.player = svg(
    shadow(32) +
      `<path d="M47 17 C44 7 55 4 55 13" fill="${c}" stroke="${o}" stroke-width="3.5" stroke-linejoin="round"/>` +
      `<path d="M50 14 C75 14 88 34 88 56 C88 76 72 86 50 86 C28 86 12 76 12 56 C12 34 25 14 50 14Z" fill="url(#g)" stroke="${o}" stroke-width="3.5"/>` +
      shine(33, 30, 12, 6.5) +
      `<ellipse cx="27" cy="63" rx="6" ry="4" fill="#ff8fb0" opacity="0.6"/><ellipse cx="73" cy="63" rx="6" ry="4" fill="#ff8fb0" opacity="0.6"/>` +
      eyes({ y: 51, gap: 14, r: 9.5, angry: false }) +
      `<path d="M41 67 Q50 77 59 67" fill="none" stroke="#15151f" stroke-width="3" stroke-linecap="round"/>`,
    grad('g', c),
  );
}

// ---------- forest enemies ----------
{
  const c = '#d9483b';
  const o = dark(c, 0.5);
  sprites.shroom = svg(
    shadow(26) +
      `<path d="M30 52 h40 v22 a13 13 0 0 1 -13 13 h-14 a13 13 0 0 1 -13 -13z" fill="#f3e3c3" stroke="#7a6748" stroke-width="3"/>` +
      `<path d="M8 50 C8 24 28 11 50 11 C72 11 92 24 92 50 C92 58 80 60 50 60 C20 60 8 58 8 50Z" fill="url(#g)" stroke="${o}" stroke-width="3.5"/>` +
      `<circle cx="29" cy="32" r="7" fill="#fff5ea"/><circle cx="55" cy="24" r="6" fill="#fff5ea"/><circle cx="75" cy="40" r="6" fill="#fff5ea"/><circle cx="45" cy="45" r="4" fill="#fff5ea"/>` +
      eyes({ y: 71, gap: 9, r: 5.5 }) +
      `<path d="M45 81 L50 78 L55 81" fill="none" stroke="#15151f" stroke-width="2" stroke-linecap="round"/>`,
    grad('g', c),
  );
}
{
  const c = '#7a4fd6';
  const o = dark(c, 0.55);
  sprites.beetle = svg(
    shadow(28) +
      `<path d="M40 22 Q34 8 26 8 M60 22 Q66 8 74 8" fill="none" stroke="${o}" stroke-width="3.5" stroke-linecap="round"/>` +
      spikes(50, 52, 26, 45, 10, dark(c, 0.2), o, 0.3, 0.31) +
      `<circle cx="50" cy="52" r="31" fill="url(#g)" stroke="${o}" stroke-width="3.5"/>` +
      shine(38, 34, 9, 5) +
      eyes({ y: 50, gap: 12, r: 8 }) +
      `<path d="M41 67 L45 72 L50 67 L55 72 L59 67" fill="#fff" stroke="#15151f" stroke-width="2" stroke-linejoin="round"/>`,
    grad('g', c),
  );
}
{
  const c = '#8a5a2b';
  const o = dark(c, 0.55);
  sprites.stump = svg(
    shadow(34) +
      `<path d="M16 86 L10 90 M84 86 L90 90 M30 88 L26 93 M70 88 L74 93" stroke="${o}" stroke-width="5" stroke-linecap="round"/>` +
      `<rect x="16" y="22" width="68" height="66" rx="12" fill="url(#g)" stroke="${o}" stroke-width="3.5"/>` +
      `<path d="M26 44 v30 M74 46 v28 M36 78 v6 M64 76 v8" stroke="${o}" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/>` +
      `<ellipse cx="50" cy="25" rx="34" ry="12" fill="#d9b27a" stroke="${o}" stroke-width="3.5"/>` +
      `<ellipse cx="50" cy="25" rx="22" ry="7.5" fill="none" stroke="#a97f45" stroke-width="2"/><ellipse cx="50" cy="25" rx="10" ry="3.5" fill="none" stroke="#a97f45" stroke-width="2"/>` +
      `<path d="M60 16 C62 4 76 4 78 10 C74 16 66 18 60 16Z" fill="#5fbf4a" stroke="#2f6a25" stroke-width="2.5"/>` +
      eyes({ y: 56, gap: 14, r: 7.5, white: '#ffe680' }) +
      `<path d="M36 74 L42 70 L47 75 L53 70 L58 75 L64 71" fill="none" stroke="#15151f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
    grad('g', c),
  );
}

// ---------- desert enemies ----------
{
  const c = '#e08a20';
  const o = dark(c, 0.55);
  sprites.scarab = svg(
    shadow(30) +
      `<path d="M20 44 L6 38 M18 58 L4 60 M22 72 L10 80 M80 44 L94 38 M82 58 L96 60 M78 72 L90 80" stroke="${o}" stroke-width="4" stroke-linecap="round"/>` +
      `<ellipse cx="50" cy="56" rx="33" ry="32" fill="url(#g)" stroke="${o}" stroke-width="3.5"/>` +
      `<path d="M50 40 V88" stroke="${o}" stroke-width="2.5"/>` +
      `<path d="M30 60 Q36 70 32 80 M70 60 Q64 70 68 80" fill="none" stroke="${light(c, 0.5)}" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>` +
      `<path d="M22 44 A28 26 0 0 1 78 44 Q50 52 22 44Z" fill="${dark(c, 0.35)}" stroke="${o}" stroke-width="3.5" stroke-linejoin="round"/>` +
      `<path d="M45 20 L50 6 L55 20Z" fill="#ffd23f" stroke="${o}" stroke-width="2.5" stroke-linejoin="round"/>` +
      eyes({ y: 36, gap: 11, r: 6.5, white: '#fff3b0' }),
    grad('g', c),
  );
}
{
  const c = '#c2452d';
  const o = dark(c, 0.55);
  sprites.viper = svg(
    shadow(32) +
      `<ellipse cx="50" cy="68" rx="36" ry="19" fill="url(#g)" stroke="${o}" stroke-width="3.5"/>` +
      `<ellipse cx="50" cy="65" rx="20" ry="9" fill="${dark(c, 0.3)}" stroke="${o}" stroke-width="2.5"/>` +
      `<path d="M22 66 l5 -5 M34 78 l4 -6 M66 78 l-4 -6 M78 66 l-5 -5" stroke="#ffd23f" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="M50 58 L50 70 M50 70 L45 77 M50 70 L55 77" fill="none" stroke="#ff5f8a" stroke-width="2.5" stroke-linecap="round"/>` +
      `<path d="M28 40 C28 22 38 12 50 12 C62 12 72 22 72 40 C72 52 62 60 50 60 C38 60 28 52 28 40Z" fill="url(#g)" stroke="${o}" stroke-width="3.5"/>` +
      shine(40, 24, 7, 4) +
      eyes({ y: 38, gap: 10, r: 6.5, white: '#ffe14d' }) +
      `<path d="M43 53 L45 59 L47 53 M53 53 L55 59 L57 53" fill="#fff" stroke="#15151f" stroke-width="1.5" stroke-linejoin="round"/>`,
    grad('g', c),
  );
}
{
  const c = '#b98a5e';
  const o = dark(c, 0.6);
  sprites.golem = svg(
    shadow(34) +
      `<path d="M8 50 L18 40 L24 58 L14 66Z M92 50 L82 40 L76 58 L86 66Z" fill="${dark(c, 0.15)}" stroke="${o}" stroke-width="3" stroke-linejoin="round"/>` +
      `<path d="M22 30 L40 14 L66 16 L82 32 L84 66 L70 88 L30 88 L16 68Z" fill="url(#g)" stroke="${o}" stroke-width="3.5" stroke-linejoin="round"/>` +
      `<path d="M40 14 L46 30 L36 40 M82 32 L70 40 M30 88 L38 74 L32 66 M70 88 L64 78" fill="none" stroke="${o}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>` +
      `<path d="M28 44 L44 50 L42 58 L28 54Z M72 44 L56 50 L58 58 L72 54Z" fill="#ffb02e" stroke="#15151f" stroke-width="2" stroke-linejoin="round"/>` +
      `<rect x="38" y="68" width="24" height="8" rx="2" fill="#2a1c12" stroke="#15151f" stroke-width="2"/>` +
      `<path d="M44 68 v8 M50 68 v8 M56 68 v8" stroke="${c}" stroke-width="2"/>`,
    grad('g', c),
  );
}

// ---------- frost enemies ----------
{
  const c = '#e8f4fb';
  const o = '#4d7896';
  sprites.snowling = svg(
    shadow(30) +
      `<path d="M34 24 L38 6 L46 20 L50 4 L55 20 L62 6 L66 24Z" fill="#9fdcff" stroke="${o}" stroke-width="3" stroke-linejoin="round"/>` +
      `<circle cx="50" cy="54" r="34" fill="url(#g)" stroke="${o}" stroke-width="3.5"/>` +
      `<path d="M22 66 A34 34 0 0 0 78 66 A40 40 0 0 1 22 66Z" fill="#9cc4de" opacity="0.6"/>` +
      shine(36, 36, 10, 5.5) +
      eyes({ y: 50, gap: 13, r: 7.5, white: '#15151f', pupil: '#7fd4ff', glow: true }) +
      `<circle cx="38" cy="70" r="2.6" fill="#15151f"/><circle cx="44" cy="73" r="2.6" fill="#15151f"/><circle cx="50" cy="74" r="2.6" fill="#15151f"/><circle cx="56" cy="73" r="2.6" fill="#15151f"/><circle cx="62" cy="70" r="2.6" fill="#15151f"/>`,
    `<radialGradient id="g" cx="0.36" cy="0.3" r="0.85"><stop offset="0" stop-color="#ffffff"/><stop offset="0.6" stop-color="${c}"/><stop offset="1" stop-color="#a9cbe2"/></radialGradient>`,
  );
}
{
  const c = '#57c7ff';
  const o = dark(c, 0.6);
  sprites.shard = svg(
    shadow(24) +
      `<path d="M50 4 L64 34 L94 50 L64 66 L50 96 L36 66 L6 50 L36 34Z" fill="url(#g)" stroke="${o}" stroke-width="3.5" stroke-linejoin="round"/>` +
      `<path d="M50 4 L50 34 L36 34 M50 34 L64 34 M6 50 L36 50 M94 50 L64 50 M50 96 L50 68" fill="none" stroke="#e6f8ff" stroke-width="2" opacity="0.7"/>` +
      `<circle cx="50" cy="50" r="19" fill="${light(c, 0.25)}" stroke="${o}" stroke-width="2.5"/>` +
      eyes({ y: 49, gap: 8, r: 5.5 }) +
      `<path d="M44 60 L50 57 L56 60" fill="none" stroke="#15151f" stroke-width="2.2" stroke-linecap="round"/>`,
    grad('g', c),
  );
}
{
  const c = '#aebbd4';
  const o = dark(c, 0.6);
  sprites.yeti = svg(
    shadow(36) +
      `<path d="M26 26 C14 22 8 10 12 4 C18 8 26 12 34 20Z M74 26 C86 22 92 10 88 4 C82 8 74 12 66 20Z" fill="#f3e3c3" stroke="${o}" stroke-width="3" stroke-linejoin="round"/>` +
      `<path d="M20 22 L30 16 L38 22 L50 15 L62 22 L70 16 L80 22 L88 34 L84 46 L90 58 L84 70 L86 82 L74 88 L62 84 L50 90 L38 84 L26 88 L14 82 L16 70 L10 58 L16 46 L12 34Z" fill="url(#g)" stroke="${o}" stroke-width="3.5" stroke-linejoin="round"/>` +
      `<ellipse cx="50" cy="56" rx="26" ry="22" fill="#dfe8f5" stroke="${o}" stroke-width="2"/>` +
      eyes({ y: 50, gap: 11, r: 6.5 }) +
      `<path d="M36 66 Q50 76 64 66 L60 74 L54 68 L50 75 L46 68 L40 74Z" fill="#fff" stroke="#15151f" stroke-width="2.2" stroke-linejoin="round"/>`,
    grad('g', c),
  );
}

// ---------- bosses ----------
{
  // Elder Thornback: a mossy, thorny stump beast
  const c = '#6b4424';
  const o = dark(c, 0.65);
  sprites.boss_0 = svg(
    shadow(36, 91) +
      spikes(50, 52, 30, 47, 14, '#3e7a35', '#1f4219', 0.2, 0.1) +
      `<circle cx="50" cy="52" r="35" fill="url(#g)" stroke="${o}" stroke-width="3"/>` +
      `<path d="M18 40 C22 22 38 14 50 14 C62 14 78 22 82 40 C74 34 68 42 60 34 C54 42 46 32 40 40 C32 32 26 44 18 40Z" fill="#4f9d3c" stroke="#1f4219" stroke-width="2.5" stroke-linejoin="round"/>` +
      `<circle cx="34" cy="26" r="2.5" fill="#ffd9ec"/><circle cx="64" cy="23" r="2.5" fill="#ffd9ec"/><circle cx="50" cy="19" r="2" fill="#fff3b0"/>` +
      `<path d="M26 62 v10 M74 60 v12 M32 76 v5 M68 76 v5" stroke="${o}" stroke-width="2" stroke-linecap="round" opacity="0.6"/>` +
      eyes({ y: 52, gap: 13, r: 8, white: '#ffe14d', pupil: '#b3121f' }) +
      `<path d="M32 68 Q50 84 68 68 L63 72 L58 67 L54 74 L50 68 L46 74 L42 67 L37 72Z" fill="#2a130a" stroke="#15151f" stroke-width="2" stroke-linejoin="round"/>` +
      `<path d="M38 70 L41 75 L44 70 M56 70 L59 75 L62 70" fill="#fff" stroke="#15151f" stroke-width="1"/>`,
    grad('g', c),
  );
}
{
  // Dune Tyrant: an armoured, horned sand beast with pincers
  const c = '#cf7a22';
  const o = dark(c, 0.65);
  sprites.boss_1 = svg(
    shadow(38, 91) +
      `<path d="M14 58 C2 54 0 38 10 32 C10 40 16 42 20 40 C16 46 18 52 24 54Z M86 58 C98 54 100 38 90 32 C90 40 84 42 80 40 C84 46 82 52 76 54Z" fill="${dark(c, 0.2)}" stroke="${o}" stroke-width="2.5" stroke-linejoin="round"/>` +
      `<path d="M30 24 L26 4 L40 18 L50 0 L60 18 L74 4 L70 24Z" fill="#ffd23f" stroke="#7a5a00" stroke-width="2.5" stroke-linejoin="round"/>` +
      `<circle cx="50" cy="54" r="35" fill="url(#g)" stroke="${o}" stroke-width="3"/>` +
      `<path d="M17 62 Q50 74 83 62 M22 74 Q50 86 78 74" fill="none" stroke="${o}" stroke-width="2.5" opacity="0.55"/>` +
      `<path d="M20 40 Q50 22 80 40 Q50 34 20 40Z" fill="${dark(c, 0.35)}" stroke="${o}" stroke-width="2"/>` +
      shine(34, 32, 9, 4.5) +
      eyes({ y: 50, gap: 13, r: 7.5, white: '#fff3b0', pupil: '#b3121f' }) +
      `<path d="M36 68 L42 64 L47 70 L50 64 L53 70 L58 64 L64 68 L58 74 L42 74Z" fill="#2a130a" stroke="#15151f" stroke-width="2" stroke-linejoin="round"/>` +
      `<circle cx="50" cy="12" r="3" fill="#ff5566" stroke="#7a5a00" stroke-width="1.5"/>`,
    grad('g', c),
  );
}
{
  // Glacier King: an ice giant with a crystal crown and a frost beard
  const c = '#3d6fb8';
  const o = dark(c, 0.65);
  sprites.boss_2 = svg(
    shadow(38, 91) +
      `<path d="M24 30 L20 8 L32 20 L36 2 L44 18 L50 0 L56 18 L64 2 L68 20 L80 8 L76 30Z" fill="#bfeeff" stroke="#2b6f96" stroke-width="2.5" stroke-linejoin="round"/>` +
      `<path d="M36 2 L38 22 M50 0 L50 20 M64 2 L62 22" stroke="#fff" stroke-width="1.5" opacity="0.8"/>` +
      spikes(50, 54, 30, 45, 6, '#8fd8ff', '#2b6f96', 0.22, 0.52) +
      `<circle cx="50" cy="54" r="35" fill="url(#g)" stroke="${o}" stroke-width="3"/>` +
      `<path d="M20 60 C22 80 36 90 50 90 C64 90 78 80 80 60 C74 68 68 62 62 70 C56 62 50 72 44 64 C38 72 30 64 20 60Z" fill="#eef9ff" stroke="#7fa9c6" stroke-width="2.5" stroke-linejoin="round"/>` +
      shine(34, 32, 9, 4.5) +
      eyes({ y: 48, gap: 13, r: 7.5, white: '#0d1a33', pupil: '#9ff2ff', glow: true }) +
      `<path d="M40 64 Q50 60 60 64" fill="none" stroke="#15151f" stroke-width="3" stroke-linecap="round"/>`,
    grad('g', c),
  );
}

for (const [name, data] of Object.entries(sprites)) writeFileSync(`${OUT}/sprites/${name}.svg`, data);

// ---------- scenery props ----------
const props = {};
props.forest_0 = svg(
  shadow(30, 88) +
    `<rect x="44" y="60" width="12" height="28" rx="4" fill="#7a4f28" stroke="#3a240f" stroke-width="3"/>` +
    `<circle cx="34" cy="50" r="20" fill="#3f8f3a" stroke="#1f4a1c" stroke-width="3"/><circle cx="66" cy="50" r="20" fill="#3f8f3a" stroke="#1f4a1c" stroke-width="3"/>` +
    `<circle cx="50" cy="34" r="26" fill="#4fa847" stroke="#1f4a1c" stroke-width="3"/>` +
    `<path d="M34 50 A20 20 0 0 0 66 50" fill="#4fa847"/>` +
    `<ellipse cx="40" cy="24" rx="10" ry="5" fill="#8fd67d" opacity="0.7" transform="rotate(-25 40 24)"/>` +
    `<circle cx="60" cy="42" r="3" fill="#ff6b6b"/><circle cx="38" cy="46" r="3" fill="#ff6b6b"/>`,
);
props.forest_1 = svg(
  shadow(34, 84) +
    `<path d="M14 80 C8 62 22 52 32 58 C34 42 54 40 58 54 C70 46 90 58 86 80Z" fill="#3f8f3a" stroke="#1f4a1c" stroke-width="3" stroke-linejoin="round"/>` +
    `<path d="M26 70 q6 -8 12 0 M52 66 q6 -8 12 0" fill="none" stroke="#8fd67d" stroke-width="2.5" stroke-linecap="round"/>` +
    `<circle cx="44" cy="58" r="3.5" fill="#fff"/><circle cx="44" cy="58" r="1.5" fill="#ffd23f"/><circle cx="70" cy="68" r="3.5" fill="#ffc0dc"/><circle cx="70" cy="68" r="1.5" fill="#ffd23f"/>`,
);
props.forest_2 = svg(
  shadow(30, 84) +
    `<path d="M18 82 L24 56 L44 46 L70 52 L84 70 L80 82Z" fill="#8d949c" stroke="#3d4248" stroke-width="3" stroke-linejoin="round"/>` +
    `<path d="M24 56 L44 62 L44 46 M44 62 L60 82 M44 62 L70 52" fill="none" stroke="#3d4248" stroke-width="2" opacity="0.5"/>` +
    `<path d="M24 58 C30 50 40 48 46 50 C40 54 32 58 26 62Z" fill="#5fbf4a" opacity="0.9"/>`,
);
props.desert_0 = svg(
  shadow(26, 90) +
    `<path d="M26 56 v-12 a7 7 0 0 1 14 0 v10 h4 M74 50 v-12 a7 7 0 0 0 -14 0 v14 h-4" fill="none" stroke="#2f7a45" stroke-width="12" stroke-linecap="round"/>` +
    `<rect x="40" y="10" width="20" height="80" rx="10" fill="#3f9e5a" stroke="#1d5230" stroke-width="3"/>` +
    `<path d="M26 56 v-12 a7 7 0 0 1 14 0 v10 M74 50 v-12 a7 7 0 0 0 -14 0 v14" fill="none" stroke="#3f9e5a" stroke-width="8" stroke-linecap="round"/>` +
    `<path d="M50 16 v68 M45 20 v60 M55 20 v60" stroke="#1d5230" stroke-width="1.5" opacity="0.5"/>` +
    `<circle cx="50" cy="10" r="5" fill="#ff7ab0" stroke="#a8336a" stroke-width="2"/>`,
);
props.desert_1 = svg(
  shadow(30, 84) +
    `<path d="M20 70 a14 12 0 1 1 30 -4 a12 10 0 1 1 22 6 q4 10 -12 10 h-26 q-16 0 -14 -12Z" fill="#f3ead6" stroke="#7a6f58" stroke-width="3" stroke-linejoin="round"/>` +
    `<circle cx="32" cy="64" r="4.5" fill="#3a3326"/><circle cx="46" cy="64" r="4.5" fill="#3a3326"/>` +
    `<path d="M36 76 v6 M42 76 v6 M48 76 v6" stroke="#7a6f58" stroke-width="2"/>` +
    `<path d="M62 50 L88 40 M64 44 L90 48" stroke="#f3ead6" stroke-width="6" stroke-linecap="round"/><path d="M62 50 L88 40 M64 44 L90 48" stroke="#7a6f58" stroke-width="1.5" stroke-dasharray="1 60"/>`,
);
props.desert_2 = svg(
  shadow(34, 84) +
    `<path d="M12 82 L20 54 L38 40 L62 44 L84 60 L90 82Z" fill="#c9925a" stroke="#6a4420" stroke-width="3" stroke-linejoin="round"/>` +
    `<path d="M20 54 L40 60 L38 40 M40 60 L52 82 M40 60 L84 60" fill="none" stroke="#6a4420" stroke-width="2" opacity="0.5"/>` +
    `<path d="M22 56 L38 43 L60 46 L40 58Z" fill="#e6b987" opacity="0.8"/>`,
);
props.frost_0 = svg(
  shadow(28, 90) +
    `<rect x="45" y="72" width="10" height="18" rx="3" fill="#6a4a2c" stroke="#33200f" stroke-width="3"/>` +
    `<path d="M50 6 L72 36 H60 L80 60 H64 L86 80 H14 L36 60 H20 L40 36 H28Z" fill="#2f7d6b" stroke="#15403a" stroke-width="3" stroke-linejoin="round"/>` +
    `<path d="M50 6 L62 22 Q50 28 38 22Z M34 42 Q50 50 66 42 L72 50 Q50 58 28 50Z M24 66 Q50 76 76 66 L82 74 Q50 82 18 74Z" fill="#f4fbff" opacity="0.95"/>`,
);
props.frost_1 = svg(
  shadow(32, 86) +
    `<path d="M18 84 L26 50 L40 30 L52 54 L62 38 L78 56 L84 84Z" fill="#8fd8ff" stroke="#2b6f96" stroke-width="3" stroke-linejoin="round"/>` +
    `<path d="M40 30 L40 84 M62 38 L62 84 M26 50 L40 60 M78 56 L62 64" fill="none" stroke="#e6f8ff" stroke-width="2" opacity="0.8"/>` +
    `<path d="M40 30 L46 44 L40 52 L34 42Z" fill="#fff" opacity="0.7"/>`,
);
props.frost_2 = svg(
  shadow(36, 84) +
    `<path d="M8 82 C10 62 28 52 40 60 C46 46 70 46 74 62 C86 60 94 70 92 82Z" fill="#f4fbff" stroke="#7fa9c6" stroke-width="3" stroke-linejoin="round"/>` +
    `<path d="M22 74 q8 -8 16 0 M56 70 q8 -8 16 0" fill="none" stroke="#b9d6e8" stroke-width="2.5" stroke-linecap="round"/>` +
    `<path d="M48 40 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2Z" fill="#fff" stroke="#7fa9c6" stroke-width="1"/>`,
);
for (const [name, data] of Object.entries(props)) writeFileSync(`${OUT}/props/${name}.svg`, data);

// ---------- seamless ground tiles ----------
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const S = 256;
/** Repeat an element across tile edges so the texture wraps without seams. */
const wrap = (x, y, reach, draw) => {
  let s = '';
  for (const ox of [-S, 0, S]) {
    for (const oy of [-S, 0, S]) {
      const px = x + ox;
      const py = y + oy;
      if (px > -reach && px < S + reach && py > -reach && py < S + reach) s += draw(px.toFixed(1), py.toFixed(1), px, py);
    }
  }
  return s;
};
const tile = (base, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}"><rect width="${S}" height="${S}" fill="${base}"/>${body}</svg>\n`;
const wave = (y, amp, color, width, opacity) => {
  let d = `M-8 ${y}`;
  for (let x = -8; x <= S + 8; x += 8) d += ` L${x} ${(y + Math.sin((x / S) * Math.PI * 4) * amp).toFixed(1)}`;
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" opacity="${opacity}"/>`;
};

function blotches(r, n, colors, opacity) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const rx = 18 + r() * 26;
    const ry = rx * (0.55 + r() * 0.3);
    const col = colors[Math.floor(r() * colors.length)];
    s += wrap(r() * S, r() * S, rx, (x, y) => `<ellipse cx="${x}" cy="${y}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${col}" opacity="${opacity}"/>`);
  }
  return s;
}

{
  const r = rng(11);
  let b = blotches(r, 16, ['#3f8a41', '#5cae55'], 0.35);
  for (let i = 0; i < 46; i++) {
    const col = r() < 0.5 ? '#74c466' : '#2f7434';
    b += wrap(r() * S, r() * S, 10, (x, y, px, py) =>
      `<path d="M${px - 4} ${py + 4} L${px - 2} ${py - 5} M${px} ${py + 4} L${px} ${py - 7} M${px + 4} ${py + 4} L${px + 3} ${py - 4}" stroke="${col}" stroke-width="2" stroke-linecap="round"/>`);
  }
  for (let i = 0; i < 9; i++) {
    const col = ['#ffffff', '#ffe066', '#ffb3d1'][Math.floor(r() * 3)];
    b += wrap(r() * S, r() * S, 6, (x, y) => `<circle cx="${x}" cy="${y}" r="3.2" fill="${col}"/><circle cx="${x}" cy="${y}" r="1.3" fill="#e0a020"/>`);
  }
  for (let i = 0; i < 6; i++) {
    b += wrap(r() * S, r() * S, 10, (x, y, px, py) =>
      `<ellipse cx="${x}" cy="${y}" rx="7" ry="5" fill="#6f7f72"/><ellipse cx="${(px - 1.5).toFixed(1)}" cy="${(py - 1.5).toFixed(1)}" rx="4" ry="2.4" fill="#9fb0a2"/>`);
  }
  writeFileSync(`${OUT}/ground/ground_0.svg`, tile('#4c9a4a', b));
}
{
  const r = rng(22);
  let b = blotches(r, 12, ['#cfa658', '#e8cc8c'], 0.4);
  for (let i = 0; i < 8; i++) {
    const y = 16 + i * 32 + (r() - 0.5) * 6;
    b += wave(y, 5, '#c39a4e', 3, 0.5) + wave(y + 4, 5, '#f0d9a0', 2, 0.6);
  }
  for (let i = 0; i < 12; i++) {
    b += wrap(r() * S, r() * S, 8, (x, y, px, py) =>
      `<ellipse cx="${x}" cy="${y}" rx="5" ry="3.6" fill="#a47c44"/><ellipse cx="${(px - 1).toFixed(1)}" cy="${(py - 1).toFixed(1)}" rx="2.8" ry="1.6" fill="#d9bb86"/>`);
  }
  for (let i = 0; i < 6; i++) {
    b += wrap(r() * S, r() * S, 14, (x, y, px, py) =>
      `<path d="M${px - 8} ${py} l5 -3 l4 4 l6 -2 M${px + 1} ${py + 1} l2 6" fill="none" stroke="#a8823f" stroke-width="1.6" stroke-linecap="round" opacity="0.7"/>`);
  }
  writeFileSync(`${OUT}/ground/ground_1.svg`, tile('#dab66c', b));
}
{
  const r = rng(33);
  let b = blotches(r, 14, ['#ffffff', '#a9cde3'], 0.45);
  for (let i = 0; i < 7; i++) {
    b += wrap(r() * S, r() * S, 26, (x, y, px, py) =>
      `<path d="M${px - 20} ${py + 4} l10 -8 l8 6 l12 -10 M${px - 2} ${py + 2} l4 10" fill="none" stroke="#8fb9d6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>`);
  }
  for (let i = 0; i < 20; i++) {
    const k = 2 + r() * 2.5;
    b += wrap(r() * S, r() * S, 8, (x, y, px, py) =>
      `<path d="M${px} ${py - k * 2} l${k * 0.5} ${k * 1.5} l${k * 1.5} ${k * 0.5} l${-k * 1.5} ${k * 0.5} l${-k * 0.5} ${k * 1.5} l${-k * 0.5} ${-k * 1.5} l${-k * 1.5} ${-k * 0.5} l${k * 1.5} ${-k * 0.5}Z" fill="#ffffff" opacity="0.9"/>`);
  }
  for (let i = 0; i < 8; i++) {
    b += wrap(r() * S, r() * S, 14, (x, y, px, py) =>
      `<path d="M${px - 10} ${py + 4} q10 -12 20 0Z" fill="#f4fbff"/><path d="M${px - 10} ${py + 4} q10 -12 20 0" fill="none" stroke="#9cc4de" stroke-width="1.5"/>`);
  }
  writeFileSync(`${OUT}/ground/ground_2.svg`, tile('#c2dcec', b));
}

// ---------- upgrade icons ----------
mkdirSync(`${OUT}/icons`, { recursive: true });
const badge = (c, glyph) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(c, '#101018', 0.35)}"/><stop offset="1" stop-color="${mix(c, '#101018', 0.68)}"/></linearGradient></defs>` +
  `<rect x="4" y="4" width="92" height="92" rx="22" fill="url(#b)" stroke="#141824" stroke-width="5"/>` +
  `<rect x="9" y="9" width="82" height="82" rx="18" fill="none" stroke="${light(c, 0.2)}" stroke-width="2.5" opacity="0.8"/>${glyph}</svg>\n`;
const K = '#141824';
const ballAt = (x, y, r, c) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="${K}" stroke-width="2.5"/><circle cx="${x - r * 0.3}" cy="${y - r * 0.35}" r="${r * 0.28}" fill="#fff" opacity="0.8"/>`;
const hero = (x, y, r) =>
  ballAt(x, y, r, '#2fd6a3') +
  `<circle cx="${x - r * 0.35}" cy="${y}" r="${r * 0.2}" fill="${K}"/><circle cx="${x + r * 0.35}" cy="${y}" r="${r * 0.2}" fill="${K}"/>`;
const icons = {};

icons.orbit = badge('#39c0ff',
  `<circle cx="50" cy="50" r="29" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="7 6" opacity="0.75"/>` +
  hero(50, 50, 13) +
  [-90, 30, 150].map((d) => ballAt(50 + Math.cos((d * Math.PI) / 180) * 29, 50 + Math.sin((d * Math.PI) / 180) * 29, 10, '#39c0ff')).join(''));

icons.volley = badge('#ffb02e',
  Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 + 0.39;
    const p = (r) => `${(50 + Math.cos(a) * r).toFixed(1)} ${(50 + Math.sin(a) * r).toFixed(1)}`;
    return `<path d="M${p(16)} L${p(23)}" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.8"/>` +
      ballAt(50 + Math.cos(a) * 32, 50 + Math.sin(a) * 32, 7, '#ffb02e');
  }).join('') + hero(50, 50, 11));

icons.big = badge('#ff5fa2',
  `<path d="M10 34 H30 M8 52 H24 M12 70 H30" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="0.85"/>` +
  ballAt(58, 52, 30, '#ff5fa2') +
  `<path d="M44 72 Q58 82 74 72" fill="none" stroke="#b02e68" stroke-width="3" stroke-linecap="round" opacity="0.7"/>`);

icons.frost = badge('#5fcfff',
  `<g stroke="${K}" stroke-width="10" stroke-linecap="round">` +
  [0, 60, 120].map((d) => `<path d="M50 16 V84" transform="rotate(${d} 50 50)"/>`).join('') + `</g>` +
  `<g stroke="#eafaff" stroke-width="5.5" stroke-linecap="round" fill="none">` +
  [0, 60, 120, 180, 240, 300].map((d) => `<path d="M50 50 V16 M50 28 L41 19 M50 28 L59 19" transform="rotate(${d} 50 50)"/>`).join('') + `</g>` +
  `<circle cx="50" cy="50" r="6" fill="#eafaff" stroke="${K}" stroke-width="2"/>`);

icons.maxhp = badge('#ff5566',
  `<path d="M50 82 C18 58 12 40 25 27 C36 17 47 23 50 34 C53 23 64 17 75 27 C88 40 82 58 50 82Z" fill="#ff5566" stroke="${K}" stroke-width="4" stroke-linejoin="round"/>` +
  `<path d="M28 36 C30 29 37 27 41 30" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="0.8"/>` +
  `<path d="M50 40 V62 M39 51 H61" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`);

icons.damage = badge('#ff8a3d',
  `<path d="M84 16 L80 32 L42 70 L30 58 L68 20Z" fill="#e8eef5" stroke="${K}" stroke-width="4" stroke-linejoin="round"/>` +
  `<path d="M76 24 L38 62" stroke="#9fb0c4" stroke-width="3" stroke-linecap="round"/>` +
  `<path d="M22 50 L50 78" stroke="${K}" stroke-width="12" stroke-linecap="round"/><path d="M22 50 L50 78" stroke="#ffd23f" stroke-width="6.5" stroke-linecap="round"/>` +
  `<path d="M32 68 L20 80" stroke="${K}" stroke-width="12" stroke-linecap="round"/><path d="M32 68 L20 80" stroke="#8a5a2b" stroke-width="6.5" stroke-linecap="round"/>` +
  `<path d="M72 60 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3Z" fill="#fff" stroke="${K}" stroke-width="1.5"/>`);

icons.count = badge('#2fd6a3',
  `<path d="M50 80 L24 34 M50 80 L50 26 M50 80 L76 34" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="5 6" opacity="0.8"/>` +
  ballAt(24, 30, 12, '#2fd6a3') + ballAt(50, 22, 12, '#2fd6a3') + ballAt(76, 30, 12, '#2fd6a3') + hero(50, 80, 9));

icons.coin = badge('#ffd23f',
  `<circle cx="46" cy="54" r="30" fill="#ffd23f" stroke="${K}" stroke-width="4"/>` +
  `<circle cx="46" cy="54" r="22" fill="none" stroke="#b8860b" stroke-width="3"/>` +
  `<path d="M46 38 l5 10 l11 1.5 l-8 7.5 l2 11 l-10 -5.5 l-10 5.5 l2 -11 l-8 -7.5 l11 -1.5Z" fill="#fff3b0" stroke="#b8860b" stroke-width="2" stroke-linejoin="round"/>` +
  `<circle cx="78" cy="24" r="13" fill="#3f9b4a" stroke="${K}" stroke-width="3"/><path d="M78 17 V31 M71 24 H85" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/>`);

icons.speed = badge('#b58cff',
  `<path d="M8 36 H26 M6 54 H22 M10 72 H28" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="0.85"/>` +
  `<path d="M66 10 L34 54 H52 L44 90 L80 42 H60Z" fill="#ffe14d" stroke="${K}" stroke-width="4" stroke-linejoin="round"/>`);

icons.magnet = badge('#c9ced9',
  `<path d="M30 44 V60 A20 20 0 0 0 70 60 V44" fill="none" stroke="${K}" stroke-width="24"/>` +
  `<path d="M30 44 V60 A20 20 0 0 0 70 60 V44" fill="none" stroke="#e23b4e" stroke-width="16"/>` +
  `<rect x="20" y="30" width="20" height="16" fill="#f2f4f8" stroke="${K}" stroke-width="4"/><rect x="60" y="30" width="20" height="16" fill="#f2f4f8" stroke="${K}" stroke-width="4"/>` +
  `<circle cx="50" cy="18" r="8" fill="#ffd23f" stroke="${K}" stroke-width="2.5"/>` +
  `<path d="M30 22 L26 12 M70 22 L74 12" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>`);

for (const [name, data] of Object.entries(icons)) writeFileSync(`${OUT}/icons/${name}.svg`, data);

// ---------- contact sheet for eyeballing the art ----------
const cell = (src, label, size) =>
  `<figure><img src="${src}" width="${size}" height="${size}"><figcaption>${label}</figcaption></figure>`;
writeFileSync(
  `${OUT}/art-preview.html`,
  `<!doctype html><meta charset="utf-8"><title>Art preview</title><style>body{background:#5a9e58;font:12px sans-serif;color:#fff;margin:12px;display:flex;flex-wrap:wrap;gap:6px;align-items:flex-end}figure{margin:0;text-align:center}.g img{border:2px solid #0006}</style>` +
    Object.keys(sprites).map((k) => cell(`sprites/${k}.svg`, k, k.startsWith('boss') ? 150 : 96)).join('') +
    Object.keys(props).map((k) => cell(`props/${k}.svg`, k, 96)).join('') +
    Object.keys(icons).map((k) => cell(`icons/${k}.svg`, k, 96)).join('') +
    `<div class="g" style="display:flex;gap:6px">` + [0, 1, 2].map((i) => cell(`ground/ground_${i}.svg`, `ground_${i}`, 200)).join('') + `</div>`,
);
console.log(`wrote ${Object.keys(sprites).length} sprites, ${Object.keys(props).length} props, 3 grounds`);
