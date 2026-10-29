import { STEP_MS } from './constants';

/** Fixed-timestep simulation (60Hz) with free-running render. */
export class Loop {
  private acc = 0;
  private last = 0;
  private raf = 0;
  running = false;

  constructor(private update: () => void, private render: () => void) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const frame = (now: number) => {
      if (!this.running) return;
      let dt = now - this.last;
      this.last = now;
      if (dt > 250) dt = 250;
      this.acc += dt;
      let steps = 0;
      while (this.acc >= STEP_MS && steps < 5) {
        this.update();
        this.acc -= STEP_MS;
        steps++;
      }
      if (steps === 5) this.acc = 0;
      this.render();
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  stop(): void { this.running = false; cancelAnimationFrame(this.raf); }
}
