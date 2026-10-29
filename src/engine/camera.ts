import { VIEW_WW, VIEW_WH } from './constants';
import { clamp } from './math';

/**
 * Camera x/y are the top-left of the visible world window (in world units).
 * Visible size is VIEW_WW × VIEW_WH (not the 960×540 UI canvas — WORLD_ZOOM shrinks it).
 */
export class Camera {
  x = 0;
  /** Vertical look offset: negative = look up (for rooftops). */
  y = 0;
  minX = 0;
  maxX = 100000;
  minY = -160;
  maxY = 40;
  zoom = 1;
  /** Max punch zoom (1 = off). Touch mode uses a near-1 cap so HUD/stick stay framed. */
  punchCap = 1.08;
  ox = 0;
  oy = 0;
  private shakeMag = 0;
  private shakeT = 0;

  setBounds(min: number, max: number): void {
    this.minX = min;
    // Span must be at least one visible world-width or follow clamps to a single point.
    this.maxX = Math.max(max, min + VIEW_WW);
  }

  /**
   * @param tx player world x
   * @param ty player world y (feet)
   * @param lead facing bias in world units
   * @param groundY baseline ground for vertical framing
   */
  follow(tx: number, ty: number, lead: number, groundY: number, snap = false): void {
    const halfW = VIEW_WW * 0.5;
    const targetX = clamp(tx - halfW + lead, this.minX, Math.max(this.minX, this.maxX - VIEW_WW));
    // When airborne / on roofs, lift the view so the fighter stays framed.
    const lift = clamp(groundY - ty - 20, 0, 140);
    const targetY = clamp(-lift * 0.65, this.minY, this.maxY);
    const k = snap ? 1 : 0.16;
    this.x += (targetX - this.x) * k;
    this.y += (targetY - this.y) * (snap ? 1 : 0.12);
  }

  shake(mag: number, frames: number): void {
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shakeT = Math.max(this.shakeT, frames);
  }

  punch(z: number): void {
    if (this.punchCap <= 1) return;
    const capped = Math.min(z, this.punchCap);
    this.zoom = Math.max(this.zoom, capped);
  }

  update(): void {
    if (this.shakeT > 0) {
      this.shakeT--;
      this.ox = (Math.random() * 2 - 1) * this.shakeMag;
      this.oy = (Math.random() * 2 - 1) * this.shakeMag * 0.7;
      this.shakeMag *= 0.88;
    } else {
      this.ox = this.oy = 0;
      this.shakeMag = 0;
    }
    this.zoom += (1 - this.zoom) * 0.14;
  }
}

export { VIEW_WW, VIEW_WH };
