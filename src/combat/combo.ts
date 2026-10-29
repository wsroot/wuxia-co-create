export interface Rating { letter: string; name: string; color: string }

const RATINGS: Array<[number, Rating]> = [
  [60, { letter: 'SSS', name: '剑心', color: '#ffe08a' }],
  [40, { letter: 'S', name: '血舞', color: '#ff4060' }],
  [25, { letter: 'A', name: '狂暴', color: '#ff7a3c' }],
  [15, { letter: 'B', name: '华丽', color: '#d070ff' }],
  [8, { letter: 'C', name: '凌厉', color: '#8fb0ff' }],
  [3, { letter: 'D', name: '尚可', color: '#b8b0c8' }],
];

export class Combo {
  count = 0;
  timer = 0;
  pop = 0;
  best = 0;
  fade = 0;
  shown = 0;

  add(): void {
    this.count++;
    this.shown = this.count;
    this.timer = 110;
    this.pop = 1;
    this.fade = 1;
    if (this.count > this.best) this.best = this.count;
  }

  break(): void { this.timer = Math.min(this.timer, 1); }

  update(): void {
    if (this.timer > 0) {
      this.timer--;
      if (this.timer === 0) this.count = 0;
    }
    this.pop *= 0.82;
    if (this.count === 0) this.fade = Math.max(0, this.fade - 0.05);
  }

  rating(n = this.count): Rating | null {
    for (const [min, r] of RATINGS) if (n >= min) return r;
    return null;
  }
}
