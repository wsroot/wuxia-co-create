export interface FText {
  text: string; x: number; y: number; vy: number;
  life: number; max: number; color: string; size: number; big: boolean;
}

export class FloatTexts {
  list: FText[] = [];

  damage(n: number, x: number, y: number, heavy = false): void {
    this.list.push({ text: String(Math.round(n)), x: x + (Math.random() - 0.5) * 20, y, vy: -2.2, life: 42, max: 42, color: heavy ? '#ffd27a' : '#ffffff', size: heavy ? 26 : 19, big: false });
  }

  add(text: string, x: number, y: number, color = '#ffffff', size = 20, big = false): void {
    this.list.push({ text, x, y, vy: big ? -0.6 : -1.4, life: big ? 70 : 50, max: big ? 70 : 50, color, size, big });
  }

  update(): void {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const t = this.list[i];
      t.y += t.vy;
      t.vy *= 0.94;
      if (--t.life <= 0) this.list.splice(i, 1);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.list) {
      const age = t.max - t.life;
      const pop = age < 6 ? 1 + (6 - age) * 0.12 : 1;
      ctx.globalAlpha = Math.min(1, t.life / 15);
      ctx.font = `900 ${Math.round(t.size * pop)}px "Noto Serif SC", "Noto Serif CJK SC", "Source Han Serif SC", "Songti SC", "SimSun", serif`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(20,0,10,0.85)';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}
