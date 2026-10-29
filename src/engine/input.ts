export type Action =
  | 'left' | 'right' | 'up' | 'down' | 'jump' | 'attack' | 'guard' | 'dash'
  | 'super' | 'skill' | 'talisman' | 'talismanCycle' | 'pill0' | 'pill1' | 'pill2' | 'pill3' | 'pause';

const KEYS: Record<string, Action[]> = {
  KeyA: ['left'], ArrowLeft: ['left'],
  KeyD: ['right'], ArrowRight: ['right'],
  KeyW: ['up', 'jump'], ArrowUp: ['up', 'jump'],
  KeyS: ['down'], ArrowDown: ['down'],
  Space: ['jump'],
  KeyJ: ['attack'], KeyZ: ['attack'],
  KeyK: ['guard'], KeyX: ['guard'],
  KeyL: ['dash'], ShiftLeft: ['dash'], ShiftRight: ['dash'],
  KeyI: ['skill'],
  KeyU: ['talisman'], Digit5: ['talisman'], Numpad5: ['talisman'],
  KeyY: ['talismanCycle'], Digit6: ['talismanCycle'], Numpad6: ['talismanCycle'],
  Digit1: ['pill0'], Numpad1: ['pill0'],
  Digit2: ['pill1'], Numpad2: ['pill1'],
  Digit3: ['pill2'], Numpad3: ['pill2'],
  Digit4: ['pill3'], Numpad4: ['pill3'],
  Escape: ['pause'], KeyP: ['pause'],
};

/** Frames a press stays "buffered" so inputs slightly early still register. */
const BUFFER = 9;

export class Input {
  private sources = new Map<Action, Set<string>>();
  private buf = new Map<Action, number>();
  private listeners: Array<(a: Action) => void> = [];

  attachKeyboard(target: Window): void {
    target.addEventListener('keydown', (e) => {
      const acts = KEYS[e.code];
      if (!acts) return;
      e.preventDefault();
      if (e.repeat) return;
      for (const a of acts) this.press(a, 'k:' + e.code);
    });
    target.addEventListener('keyup', (e) => {
      const acts = KEYS[e.code];
      if (!acts) return;
      for (const a of acts) this.release(a, 'k:' + e.code);
    });
    target.addEventListener('blur', () => this.clear());
  }

  onPress(fn: (a: Action) => void): void { this.listeners.push(fn); }

  press(a: Action, src: string): void {
    let s = this.sources.get(a);
    if (!s) { s = new Set(); this.sources.set(a, s); }
    const was = s.size > 0;
    s.add(src);
    if (!was) {
      this.buf.set(a, BUFFER);
      for (const f of this.listeners) f(a);
    }
  }

  release(a: Action, src: string): void { this.sources.get(a)?.delete(src); }
  down(a: Action): boolean { return (this.sources.get(a)?.size ?? 0) > 0; }
  pressed(a: Action): boolean { return (this.buf.get(a) ?? 0) > 0; }
  consume(a: Action): boolean {
    if (!this.pressed(a)) return false;
    this.buf.set(a, 0);
    return true;
  }
  axisX(): number { return (this.down('right') ? 1 : 0) - (this.down('left') ? 1 : 0); }
  tick(): void { for (const [a, v] of this.buf) if (v > 0) this.buf.set(a, v - 1); }
  clearBuffer(): void { this.buf.clear(); }
  clear(): void { this.sources.clear(); this.buf.clear(); }
}
