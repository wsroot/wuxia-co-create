import type { Action, Input } from '../engine/input';

/** On-screen controls: left virtual d-pad, right action buttons. Multi-touch via pointer events. */
export class TouchControls {
  root: HTMLDivElement;
  private padDirs = new Set<Action>();

  constructor(container: HTMLElement, private input: Input) {
    this.root = container as HTMLDivElement;
    this.root.innerHTML = `
      <div class="pad" data-pad><div class="pad-ring"></div><div class="pad-knob"></div></div>
      <div class="btns">
        <button class="tb tb-attack" data-a="attack">攻</button>
        <button class="tb tb-jump" data-a="jump">跳</button>
        <button class="tb tb-guard" data-a="guard">防</button>
        <button class="tb tb-dash locked" data-a="dash" disabled>闪</button>
        <button class="tb tb-skill" data-a="skill" title="外功 / 处决">技</button>
        <div class="tb-pills">
          <button class="tb tb-pill" data-a="pill0">1</button>
          <button class="tb tb-pill" data-a="pill1">2</button>
          <button class="tb tb-pill" data-a="pill2">3</button>
          <button class="tb tb-pill" data-a="pill3">4</button>
        </div>
        <div class="tb-fu">
          <button class="tb tb-fu-use" data-a="talisman" title="释放灵符">符</button>
          <button class="tb tb-fu-cycle" data-a="talismanCycle" title="轮换灵符">换</button>
        </div>
      </div>`;
    const pad = this.root.querySelector<HTMLDivElement>('[data-pad]')!;
    const knob = this.root.querySelector<HTMLDivElement>('.pad-knob')!;
    let padId = -1;
    const setDirs = (dirs: Action[]) => {
      for (const d of this.padDirs) if (!dirs.includes(d)) this.input.release(d, 't:pad');
      for (const d of dirs) if (!this.padDirs.has(d)) this.input.press(d, 't:pad');
      this.padDirs = new Set(dirs);
    };
    const move = (e: PointerEvent) => {
      const r = pad.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const max = r.width * 0.38;
      const len = Math.hypot(dx, dy);
      if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      const dirs: Action[] = [];
      const dead = r.width * 0.12;
      if (dx < -dead) dirs.push('left');
      if (dx > dead) dirs.push('right');
      if (dy < -r.width * 0.2) dirs.push('up');
      if (dy > r.width * 0.2) dirs.push('down');
      setDirs(dirs);
    };
    pad.addEventListener('pointerdown', (e) => { e.preventDefault(); padId = e.pointerId; pad.setPointerCapture(e.pointerId); move(e); });
    pad.addEventListener('pointermove', (e) => { if (e.pointerId === padId) move(e); });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== padId) return;
      padId = -1;
      knob.style.transform = '';
      setDirs([]);
    };
    pad.addEventListener('pointerup', end);
    pad.addEventListener('pointercancel', end);

    this.root.querySelectorAll<HTMLButtonElement>('[data-a]').forEach((btn) => {
      const a = btn.dataset.a as Action;
      const src = 't:' + a;
      btn.addEventListener('pointerdown', (e) => { e.preventDefault(); btn.setPointerCapture(e.pointerId); btn.classList.add('on'); this.input.press(a, src); });
      const up = () => { btn.classList.remove('on'); this.input.release(a, src); };
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    });
  }

  setVisible(v: boolean): void { this.root.classList.toggle('show', v); }
  setRageReady(_v: boolean): void { /* rage super removed */ }
  /** compact | wide — touch layout presets. */
  setLayout(preset: 'compact' | 'wide' = 'compact'): void {
    this.root.classList.toggle('layout-wide', preset === 'wide');
    this.root.classList.toggle('layout-compact', preset === 'compact');
  }


  /** Highlight skill button as 处决 when an execute window is open. */
  setExecuteReady(v: boolean): void {
    const el = this.root.querySelector('.tb-skill') as HTMLButtonElement | null;
    if (!el) return;
    el.classList.toggle('exec', v);
    if (v) {
      el.textContent = '处决';
      el.title = '处决';
    } else {
      el.textContent = '技';
      el.title = '外功 / 处决';
    }
  }

  setDashUnlocked(v: boolean): void {
    const el = this.root.querySelector('.tb-dash') as HTMLButtonElement | null;
    if (!el) return;
    el.classList.toggle('locked', !v);
    el.disabled = !v;
    el.title = v ? '闪身' : '未习闪身步';
  }

  /** Update 符键: empty / cooling / ready. */
  setTalismanState(opts: { has: boolean; cooling: boolean; label?: string }): void {
    const use = this.root.querySelector('.tb-fu-use') as HTMLButtonElement | null;
    const cyc = this.root.querySelector('.tb-fu-cycle') as HTMLButtonElement | null;
    if (use) {
      use.classList.toggle('empty', !opts.has);
      use.classList.toggle('cooling', opts.cooling);
      use.disabled = !opts.has || opts.cooling;
      use.title = !opts.has ? '无灵符' : opts.cooling ? '冷却中' : (opts.label ?? '释放灵符');
      if (opts.label) use.textContent = opts.label.length <= 2 ? opts.label : '符';
      else use.textContent = '符';
    }
    if (cyc) {
      cyc.classList.toggle('empty', !opts.has);
      cyc.disabled = !opts.has;
    }
  }
}
