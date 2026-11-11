// All sound is synthesized with the Web Audio API: no audio files needed.
import { save, persist } from './save';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const last: Record<string, number> = {};

/** Set by the playtest bot so thousands of simulated hits stay silent. */
export const audioState = { silent: false };

/** Browsers only allow audio after a user gesture, so this runs on first tap. */
export function initAudio() {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = save.muted ? 0 : 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
}

export function toggleMute(): boolean {
  save.muted = !save.muted;
  persist();
  if (master && ctx) master.gain.setTargetAtTime(save.muted ? 0 : 0.5, ctx.currentTime, 0.02);
  return save.muted;
}

function ready(name: string, gapMs: number): boolean {
  if (!ctx || !master || audioState.silent || save.muted || ctx.state !== 'running') return false;
  const now = performance.now();
  if (now - (last[name] ?? 0) < gapMs) return false;
  last[name] = now;
  return true;
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo = freq, delay = 0) {
  if (!ctx || !master) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo !== freq) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

let noiseBuf: AudioBuffer | null = null;
function noise(dur: number, vol: number, cutoff: number, delay = 0) {
  if (!ctx || !master) return;
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(cutoff, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(80, cutoff * 0.2), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.02);
}

export const sfx = {
  shoot() {
    if (ready('shoot', 90)) tone(520, 0.07, 'triangle', 0.05, 300);
  },
  volley() {
    if (ready('volley', 200)) tone(700, 0.16, 'square', 0.04, 1300);
  },
  big() {
    if (ready('big', 200)) {
      tone(160, 0.3, 'sawtooth', 0.09, 60);
      noise(0.2, 0.06, 900);
    }
  },
  hit() {
    if (ready('hit', 70)) noise(0.05, 0.05, 2400);
  },
  pop() {
    if (ready('pop', 60)) tone(300, 0.09, 'sine', 0.09, 90);
  },
  coin() {
    if (ready('coin', 55)) {
      tone(1320, 0.05, 'square', 0.03);
      tone(1760, 0.08, 'square', 0.03, 1760, 0.045);
    }
  },
  hurt() {
    if (ready('hurt', 150)) {
      tone(190, 0.2, 'sawtooth', 0.12, 70);
      noise(0.12, 0.08, 700);
    }
  },
  levelUp() {
    if (ready('levelUp', 300)) [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.1, f, i * 0.07));
  },
  pick() {
    if (ready('pick', 100)) {
      tone(660, 0.08, 'triangle', 0.1);
      tone(990, 0.14, 'triangle', 0.1, 990, 0.07);
    }
  },
  click() {
    if (ready('click', 60)) tone(440, 0.05, 'triangle', 0.08, 560);
  },
  boss() {
    if (ready('boss', 500)) {
      tone(110, 0.5, 'sawtooth', 0.14, 55);
      tone(104, 0.5, 'sawtooth', 0.14, 52, 0.45);
      noise(0.8, 0.06, 500);
    }
  },
  win() {
    if (ready('win', 500)) [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.12, f, i * 0.13));
  },
  lose() {
    if (ready('lose', 500)) [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'triangle', 0.12, f * 0.97, i * 0.2));
  },
};

// ---- music: a tiny step sequencer, one mood per level ----

interface Song {
  bpm: number;
  roots: number[]; // one root note (MIDI) per bar
  scale: number[]; // semitone offsets used by the melody
}

const SONGS: Song[] = [
  { bpm: 116, roots: [48, 45, 41, 43], scale: [0, 2, 4, 7, 9, 12] }, // bright woods
  { bpm: 104, roots: [50, 50, 51, 48], scale: [0, 1, 4, 5, 7, 8, 12] }, // desert
  { bpm: 96, roots: [45, 41, 48, 43], scale: [0, 3, 5, 7, 10, 12] }, // frost
];
const ARP = [0, 2, 4, 2, 5, 4, 2, 1, 0, 2, 4, 5, 4, 2, 3, 1];
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

let timer: number | null = null;
let step = 0;
let nextTime = 0;
let song: Song = SONGS[0];
let musicGain: GainNode | null = null;

function musicNote(freq: number, t: number, dur: number, type: OscillatorType, vol: number) {
  if (!ctx || !musicGain) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(musicGain);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function schedule() {
  if (!ctx || ctx.state !== 'running') return;
  const stepDur = 60 / song.bpm / 4;
  if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05;
  while (nextTime < ctx.currentTime + 0.25) {
    const bar = Math.floor(step / 16) % song.roots.length;
    const s = step % 16;
    const root = song.roots[bar];
    if (s % 4 === 0) musicNote(hz(root - 12), nextTime, stepDur * 3.2, 'triangle', 0.16);
    if (s % 8 === 4) musicNote(hz(root + 7 - 12), nextTime, stepDur * 1.5, 'triangle', 0.09);
    if (s % 2 === 0 || s === 15) {
      const deg = song.scale[ARP[(s + bar * 3) % 16] % song.scale.length];
      musicNote(hz(root + 12 + deg), nextTime, stepDur * 1.6, 'square', 0.028);
    }
    nextTime += stepDur;
    step++;
  }
}

export function startMusic(level: number) {
  stopMusic();
  if (audioState.silent) return;
  initAudio();
  if (!ctx || !master) return;
  song = SONGS[level % SONGS.length];
  step = 0;
  nextTime = 0;
  musicGain = ctx.createGain();
  musicGain.gain.value = 0.8;
  musicGain.connect(master);
  timer = window.setInterval(schedule, 80);
}

export function stopMusic() {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
  if (musicGain && ctx) {
    const g = musicGain;
    g.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
    setTimeout(() => g.disconnect(), 600);
    musicGain = null;
  }
}
