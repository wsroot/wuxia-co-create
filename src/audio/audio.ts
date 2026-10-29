/** WebAudio context, buses and small synthesis helpers. Created lazily on first user gesture. */
export class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  sfxBus!: GainNode;
  musicBus!: GainNode;
  reverb!: ConvolverNode;
  reverbSend!: GainNode;
  noise!: AudioBuffer;
  muted = false;
  private lastPlay = new Map<string, number>();

  ensure(): boolean {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return false;
      const ctx = new AC();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.8;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      this.master.connect(comp).connect(ctx.destination);
      this.sfxBus = ctx.createGain();
      this.sfxBus.gain.value = 0.9;
      this.sfxBus.connect(this.master);
      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = 0.55;
      this.musicBus.connect(this.master);
      this.reverb = ctx.createConvolver();
      this.reverb.buffer = this.makeImpulse(2.8, 2.2);
      this.reverbSend = ctx.createGain();
      this.reverbSend.gain.value = 0.6;
      this.reverbSend.connect(this.reverb).connect(this.master);
      this.noise = this.makeNoise(2);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return true;
  }

  get ready(): boolean { return !!this.ctx && this.ctx.state === 'running'; }
  get now(): number { return this.ctx ? this.ctx.currentTime : 0; }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.05);
  }

  /** Rate-limit identical SFX so mass hits don't clip. */
  allow(key: string, minGap = 0.03): boolean {
    const t = this.now;
    const l = this.lastPlay.get(key) ?? -1;
    if (t - l < minGap) return false;
    this.lastPlay.set(key, t);
    return true;
  }

  private makeNoise(sec: number): AudioBuffer {
    const ctx = this.ctx!;
    const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  private makeImpulse(sec: number, decay: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = ctx.sampleRate * sec;
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }

  /** Oscillator tone with exponential envelope and optional pitch slide. */
  tone(o: { f: number; f2?: number; dur: number; type?: OscillatorType; vol?: number; attack?: number; at?: number; dest?: AudioNode; rev?: number; detune?: number; filter?: number }): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = (o.at ?? ctx.currentTime) + 0.001;
    const osc = ctx.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.detune) osc.detune.value = o.detune;
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t + o.dur);
    const g = ctx.createGain();
    const v = o.vol ?? 0.3;
    const a = o.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    let node: AudioNode = osc;
    if (o.filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.filter;
      node.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(o.dest ?? this.sfxBus);
    if (o.rev) {
      const s = ctx.createGain();
      s.gain.value = o.rev;
      g.connect(s).connect(this.reverbSend);
    }
    osc.start(t);
    osc.stop(t + o.dur + 0.05);
  }

  /** Filtered noise burst with frequency sweep. */
  noiseBurst(o: { dur: number; vol?: number; type?: BiquadFilterType; f: number; f2?: number; q?: number; at?: number; attack?: number; dest?: AudioNode; rev?: number }): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = (o.at ?? ctx.currentTime) + 0.001;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = o.type ?? 'bandpass';
    f.frequency.setValueAtTime(o.f, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur);
    f.Q.value = o.q ?? 1;
    const g = ctx.createGain();
    const v = o.vol ?? 0.3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (o.attack ?? 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f).connect(g).connect(o.dest ?? this.sfxBus);
    if (o.rev) {
      const s = ctx.createGain();
      s.gain.value = o.rev;
      g.connect(s).connect(this.reverbSend);
    }
    src.start(t, Math.random() * 1.5);
    src.stop(t + o.dur + 0.05);
  }
}
