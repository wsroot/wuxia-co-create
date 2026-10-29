import type { AudioEngine } from './audio';

export type Sfx =
  | 'slash' | 'heavy' | 'kick' | 'hit' | 'hitHeavy' | 'clang' | 'parry' | 'block' | 'bone' | 'jump' | 'land'
  | 'hurt' | 'dash' | 'roar' | 'arrow' | 'fire' | 'boom' | 'potion' | 'super' | 'superSlash' | 'telegraph'
  | 'shieldBang' | 'claw' | 'whip' | 'bash' | 'ui' | 'death' | 'wave' | 'stagger' | 'flap';

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export function playSfx(a: AudioEngine, name: Sfx | string): void {
  if (!a.ready || !a.allow(name, name === 'hit' ? 0.02 : 0.03)) return;
  const p = rnd(0.94, 1.06);
  switch (name) {
    case 'slash':
      // silk whoosh
      a.noiseBurst({ dur: 0.11, vol: 0.26, f: 2200 * p, f2: 7000, q: 0.9, type: 'bandpass' });
      a.tone({ f: 780 * p, f2: 220, dur: 0.08, type: 'sine', vol: 0.04 });
      break;
    case 'heavy':
      // heavier cloth/wood cut
      a.noiseBurst({ dur: 0.2, vol: 0.34, f: 900 * p, f2: 3200, q: 0.85, type: 'bandpass' });
      a.tone({ f: 360 * p, f2: 90, dur: 0.18, type: 'triangle', vol: 0.06, filter: 1200 });
      a.noiseBurst({ dur: 0.06, vol: 0.12, type: 'bandpass', f: 1800, q: 3, at: a.now + 0.04 });
      break;
    case 'claw':
      a.noiseBurst({ dur: 0.2, vol: 0.35, f: 900 * p, f2: 3000, q: 2 });
      a.noiseBurst({ dur: 0.12, vol: 0.2, f: 2600 * p, f2: 5000, q: 3, at: a.now + 0.04 });
      break;
    case 'kick':
    case 'whip':
      a.noiseBurst({ dur: 0.12, vol: 0.3, f: 600 * p, f2: 2400, q: 1 });
      break;
    case 'bash':
      a.noiseBurst({ dur: 0.16, vol: 0.3, f: 400 * p, f2: 1200, q: 1 });
      break;
    case 'hit':
      a.noiseBurst({ dur: 0.09, vol: 0.45, type: 'lowpass', f: 2400 * p, f2: 500 });
      a.tone({ f: 170 * p, f2: 55, dur: 0.13, type: 'sine', vol: 0.55 });
      a.noiseBurst({ dur: 0.05, vol: 0.2, type: 'highpass', f: 3000 });
      break;
    case 'hitHeavy':
      a.noiseBurst({ dur: 0.18, vol: 0.55, type: 'lowpass', f: 1800 * p, f2: 200 });
      a.tone({ f: 120 * p, f2: 36, dur: 0.3, type: 'sine', vol: 0.75 });
      a.tone({ f: 240 * p, f2: 60, dur: 0.15, type: 'square', vol: 0.06, filter: 900 });
      break;
    case 'clang':
    case 'block': {
      const base = name === 'block' ? 620 : 520;
      const vol = name === 'block' ? 0.07 : 0.1;
      for (const m of [1, 2.32, 3.81, 5.27]) a.tone({ f: base * m * p, dur: name === 'block' ? 0.35 : 0.6, type: 'sine', vol: vol / m * 1.6, rev: 0.4 });
      a.noiseBurst({ dur: 0.06, vol: 0.25, type: 'highpass', f: 2500 });
      break;
    }
    case 'parry':
      for (const m of [1, 2.01, 2.76, 4.1, 5.43]) a.tone({ f: 880 * m, dur: 1.2, type: 'sine', vol: 0.11 / Math.sqrt(m), rev: 0.9 });
      a.noiseBurst({ dur: 0.1, vol: 0.4, type: 'highpass', f: 3000 });
      a.tone({ f: 220, f2: 110, dur: 0.6, type: 'triangle', vol: 0.2, rev: 0.6 });
      break;
    case 'bone':
      // wood / bamboo clack (clothed foes fall)
      for (let i = 0; i < 5; i++) a.noiseBurst({ dur: 0.035, vol: 0.22, type: 'bandpass', f: rnd(900, 2400), q: 5, at: a.now + i * rnd(0.02, 0.045) });
      a.tone({ f: 240, f2: 80, dur: 0.16, type: 'triangle', vol: 0.1 });
      break;
    case 'death':
      a.tone({ f: 200, f2: 40, dur: 1.4, type: 'sawtooth', vol: 0.16, filter: 700, rev: 0.8 });
      break;
    case 'jump':
      a.noiseBurst({ dur: 0.12, vol: 0.12, f: 500, f2: 1600, q: 0.8 });
      break;
    case 'land':
      a.noiseBurst({ dur: 0.08, vol: 0.18, type: 'lowpass', f: 500, f2: 120 });
      break;
    case 'hurt':
      a.tone({ f: 320 * p, f2: 90, dur: 0.28, type: 'sawtooth', vol: 0.14, filter: 1200 });
      a.noiseBurst({ dur: 0.1, vol: 0.3, type: 'lowpass', f: 1500, f2: 300 });
      break;
    case 'dash':
      a.noiseBurst({ dur: 0.2, vol: 0.18, f: 600, f2: 2800, q: 1.1, type: 'bandpass' });
      break;
    case 'flap':
      a.noiseBurst({ dur: 0.18, vol: 0.18, type: 'lowpass', f: 600, f2: 200 });
      break;
    case 'roar': {
      const ctx = a.ctx!;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(95, t);
      osc.frequency.linearRampToValueAtTime(140, t + 0.3);
      osc.frequency.exponentialRampToValueAtTime(55, t + 1.6);
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 23;
      const lg = ctx.createGain();
      lg.gain.value = 30;
      lfo.connect(lg).connect(osc.frequency);
      const ws = ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 4); }
      ws.curve = curve;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 900;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
      osc.connect(ws).connect(f).connect(g).connect(a.sfxBus);
      g.connect(a.reverbSend);
      osc.start(t); lfo.start(t);
      osc.stop(t + 1.8); lfo.stop(t + 1.8);
      a.noiseBurst({ dur: 1.5, vol: 0.3, type: 'lowpass', f: 900, f2: 200, attack: 0.1, rev: 0.6 });
      break;
    }
    case 'arrow':
      a.tone({ f: 700, f2: 340, dur: 0.12, type: 'triangle', vol: 0.12 });
      a.noiseBurst({ dur: 0.15, vol: 0.12, f: 3000, f2: 1500, q: 2 });
      break;
    case 'fire':
      a.noiseBurst({ dur: 0.45, vol: 0.32, type: 'lowpass', f: 300, f2: 1600, attack: 0.03 });
      a.tone({ f: 90, f2: 60, dur: 0.4, type: 'sawtooth', vol: 0.06, filter: 400 });
      break;
    case 'boom':
      a.tone({ f: 90, f2: 28, dur: 0.9, type: 'sine', vol: 0.8 });
      a.noiseBurst({ dur: 0.7, vol: 0.5, type: 'lowpass', f: 1400, f2: 90, rev: 0.5 });
      break;
    case 'potion':
      [660, 880, 1320, 1760].forEach((f, i) => a.tone({ f, dur: 0.4, type: 'sine', vol: 0.09, at: a.now + i * 0.06, rev: 0.7 }));
      break;
    case 'super':
      a.tone({ f: 70, f2: 30, dur: 1.6, type: 'sine', vol: 0.8 });
      a.noiseBurst({ dur: 1.2, vol: 0.35, type: 'bandpass', f: 200, f2: 3000, q: 0.6, attack: 0.3, rev: 0.6 });
      [146.8, 174.6, 220, 293.7].forEach((f) => a.tone({ f, dur: 2.2, type: 'sawtooth', vol: 0.04, attack: 0.2, filter: 1500, rev: 1 }));
      break;
    case 'superSlash':
      a.noiseBurst({ dur: 0.18, vol: 0.4, f: 1200, f2: 7000, q: 1 });
      a.tone({ f: 150, f2: 50, dur: 0.2, type: 'sine', vol: 0.4 });
      break;
    case 'telegraph':
      a.tone({ f: 1400, f2: 2200, dur: 0.18, type: 'sine', vol: 0.07, rev: 0.6 });
      break;
    case 'shieldBang':
      for (const m of [1, 1.7, 2.9]) a.tone({ f: 260 * m * p, dur: 0.3, type: 'square', vol: 0.03, filter: 2000, rev: 0.5 });
      a.noiseBurst({ dur: 0.1, vol: 0.35, type: 'lowpass', f: 1500, f2: 300 });
      break;
    case 'stagger':
      a.tone({ f: 600, f2: 150, dur: 0.5, type: 'triangle', vol: 0.15, rev: 0.6 });
      a.noiseBurst({ dur: 0.3, vol: 0.3, type: 'lowpass', f: 1200, f2: 200 });
      break;
    case 'wave':
      a.tone({ f: 146.8, dur: 1.6, type: 'triangle', vol: 0.14, rev: 1 });
      a.tone({ f: 220, dur: 1.6, type: 'sine', vol: 0.1, at: a.now + 0.12, rev: 1 });
      a.tone({ f: 293.7, dur: 1.8, type: 'sine', vol: 0.08, at: a.now + 0.24, rev: 1 });
      break;
    case 'ui':
      a.tone({ f: 880, f2: 660, dur: 0.12, type: 'triangle', vol: 0.08, rev: 0.4 });
      break;
    default:
      // Soft-skip unknown / pack-only ids (catalog may register file assets later).
      break;
  }
}
