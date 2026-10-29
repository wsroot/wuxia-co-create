import type { AudioEngine } from './audio';

export type MusicMode = 'off' | 'title' | 'stage' | 'boss' | 'victory';

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

interface Song {
  bpm: number;
  /** Pentatonic chord tones (MIDI). */
  chords: number[][];
  bass: boolean;
  drums: boolean;
  arp: number[];
  arpOct: number;
  pad: number;
  bell: boolean;
}

/**
 * Jianghu night — Chinese-ish pentatonic (宫/徵 feel).
 * Root clusters around D (徵) / G (宫): D E G A C and G A B D E.
 * Waveforms lean guzheng (plucky triangle) + dizi (soft sine) — no asset files.
 */
const SONGS: Record<Exclude<MusicMode, 'off'>, Song> = {
  // G A B D E  +  D E G A C
  title: {
    bpm: 52,
    chords: [[55, 57, 59, 62], [50, 52, 55, 57], [53, 55, 57, 60], [50, 54, 57, 62]],
    bass: false, drums: false, arp: [0, -1, 2, -1, 1, -1, 3, -1], arpOct: 24, pad: 0.028, bell: true,
  },
  stage: {
    bpm: 78,
    chords: [[50, 52, 55, 57], [55, 57, 59, 62], [48, 50, 53, 55], [50, 53, 57, 60]],
    bass: true, drums: false, arp: [0, 2, 1, 3, 2, 1, 0, 2], arpOct: 24, pad: 0.02, bell: true,
  },
  boss: {
    bpm: 112,
    chords: [[50, 52, 55, 58], [53, 55, 57, 60], [48, 50, 53, 57], [50, 54, 57, 62]],
    bass: true, drums: true, arp: [0, 1, 2, 3, 2, 1, 0, 1], arpOct: 24, pad: 0.018, bell: false,
  },
  victory: {
    bpm: 66,
    chords: [[55, 59, 62, 64], [50, 54, 57, 62], [53, 57, 60, 64], [55, 57, 62, 67]],
    bass: true, drums: false, arp: [0, 1, 2, 3, 2, 1, 2, 1], arpOct: 24, pad: 0.026, bell: true,
  },
};

export class Music {
  mode: MusicMode = 'off';
  private timer = 0;
  private next = 0;
  private step = 0;
  private bar = 0;

  constructor(private a: AudioEngine) {}

  setMode(m: MusicMode): void {
    if (m === this.mode) return;
    this.mode = m;
    if (this.timer) { clearInterval(this.timer); this.timer = 0; }
    if (m === 'off' || !this.a.ctx) return;
    this.step = 0;
    this.bar = 0;
    this.next = this.a.now + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  resume(): void {
    const m = this.mode;
    this.mode = 'off';
    this.setMode(m);
  }

  private schedule(): void {
    const a = this.a;
    if (!a.ctx || this.mode === 'off') return;
    const song = SONGS[this.mode];
    const stepDur = 60 / song.bpm / 2;
    if (this.next < a.now - 0.5) this.next = a.now + 0.05;
    while (this.next < a.now + 0.15) {
      this.playStep(song, this.next, stepDur);
      this.next += stepDur;
      this.step++;
      if (this.step >= 8) { this.step = 0; this.bar = (this.bar + 1) % song.chords.length; }
    }
  }

  private playStep(s: Song, t: number, sd: number): void {
    const a = this.a;
    const dest = a.musicBus;
    const chord = s.chords[this.bar];
    if (this.step === 0) {
      // soft dizi-like pad (sine) + light guzheng body (triangle)
      for (const n of chord) {
        a.tone({ f: mtof(n + 12), dur: sd * 7.5, type: 'sine', vol: s.pad * 1.1, attack: sd * 2.2, at: t, dest, filter: 1400, rev: 0.7 });
        a.tone({ f: mtof(n), dur: sd * 3.5, type: 'triangle', vol: s.pad * 0.7, attack: 0.01, at: t, dest, filter: 1800, rev: 0.4 });
      }
      // temple bell / 磬
      if (s.bell && this.bar % 2 === 0) {
        a.tone({ f: mtof(chord[0] + 36), dur: 2.8, type: 'sine', vol: 0.03, at: t, dest, rev: 1.4 });
        a.tone({ f: mtof(chord[0] + 36) * 2.01, dur: 2.2, type: 'sine', vol: 0.012, at: t, dest, rev: 1.2 });
      }
    }
    const idx = s.arp[this.step];
    if (idx >= 0) {
      const n = idx >= chord.length ? chord[0] + 12 : chord[idx];
      // guzheng pluck
      a.tone({ f: mtof(n + s.arpOct - 12), dur: sd * 1.1, type: 'triangle', vol: 0.028, at: t, dest, filter: 3200, rev: 0.5 });
      a.tone({ f: mtof(n + s.arpOct), dur: sd * 0.85, type: 'sine', vol: 0.016, at: t, dest, rev: 0.55 });
    }
    if (s.bass) {
      if (s.drums) {
        const n = chord[0] - 12 + (this.step % 2 === 1 ? 7 : 0);
        a.tone({ f: mtof(n), dur: sd * 0.85, type: 'triangle', vol: 0.07, at: t, dest, filter: 420 });
      } else if (this.step === 0 || this.step === 5) {
        a.tone({ f: mtof(chord[0] - 12), dur: sd * 3.2, type: 'sine', vol: 0.14, at: t, dest });
      }
    }
    if (s.drums) {
      // wood-block / 板鼓 feel
      if (this.step === 0 || this.step === 4) a.tone({ f: 95, f2: 42, dur: 0.28, type: 'sine', vol: 0.32, at: t, dest });
      if (this.step === 2 || this.step === 6) a.noiseBurst({ dur: 0.05, vol: 0.07, type: 'bandpass', f: 2800, q: 4, at: t, dest });
      if (this.step === 3 || this.step === 7) a.noiseBurst({ dur: 0.04, vol: 0.05, type: 'bandpass', f: 4200, q: 5, at: t, dest });
      if (this.step === 4) a.noiseBurst({ dur: 0.18, vol: 0.08, type: 'bandpass', f: 900, q: 0.8, at: t, dest, rev: 0.25 });
    }
  }
}
