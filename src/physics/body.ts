import { GRAVITY, GROUND_Y } from '../engine/constants';

export interface Rect { x: number; y: number; w: number; h: number }

/** One-way platform: land on the top surface (`y`) when falling; can jump up through. */
export interface Platform {
  x: number;
  /** Top surface (feet land here). */
  y: number;
  w: number;
  /** Visual / solid height downward from top (not used for collision thickness). */
  h: number;
  /** Optional label for debug / art. */
  kind?: 'roof' | 'bridge' | 'pavilion';
}

/** Simple feet-anchored physics body. */
export class Body {
  vx = 0;
  vy = 0;
  onGround = true;
  landed = false;
  impactVy = 0;
  gravityScale = 1;
  noGravity = false;
  hitWall = 0;
  /** Index into last platforms list we stood on, or -1 for ground. */
  onPlatform = -1;

  constructor(public x: number, public y: number, public w: number, public h: number) {}

  /**
   * @param platforms one-way tops (player only in v1)
   * @param dropThrough hold ↓ to fall through a platform
   */
  step(minX: number, maxX: number, platforms?: Platform[], dropThrough = false): void {
    this.landed = false;
    this.hitWall = 0;
    const prevY = this.y;
    if (!this.noGravity) this.vy += GRAVITY * this.gravityScale;
    if (this.vy > 18) this.vy = 18;
    this.x += this.vx;
    this.y += this.vy;

    let grounded = false;
    this.onPlatform = -1;

    // One-way platforms: only when falling / resting, and feet cross the top.
    if (platforms && platforms.length && this.vy >= 0 && !dropThrough) {
      const hw = this.w * 0.35;
      for (let i = 0; i < platforms.length; i++) {
        const pl = platforms[i];
        if (this.x + hw <= pl.x || this.x - hw >= pl.x + pl.w) continue;
        // Crossed or resting on the surface this frame
        if (prevY <= pl.y + 1.5 && this.y >= pl.y) {
          this.y = pl.y;
          if (this.vy > 0) this.vy = 0;
          grounded = true;
          this.onPlatform = i;
          break;
        }
      }
    }

    if (this.y >= GROUND_Y) {
      this.y = GROUND_Y;
      if (this.vy > 0) this.vy = 0;
      grounded = true;
      this.onPlatform = -1;
    }

    if (grounded) {
      if (!this.onGround) { this.landed = true; this.impactVy = Math.max(0, this.vy); }
      this.onGround = true;
    } else {
      this.onGround = false;
    }

    const hw = this.w / 2;
    if (this.x < minX + hw) { this.x = minX + hw; this.hitWall = -1; }
    if (this.x > maxX - hw) { this.x = maxX - hw; this.hitWall = 1; }
  }
}
