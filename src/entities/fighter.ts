import { Body, type Rect } from '../physics/body';
import { worldBox } from '../physics/collision';
import type { AttackDef, AttackInst } from '../combat/types';
import type { Game } from '../game';
import type { Pose } from '../render/rig';

export type Team = 'player' | 'enemy';

let nextId = 1;

export abstract class Fighter {
  abstract readonly team: Team;
  readonly id = nextId++;
  body: Body;
  facing: 1 | -1 = 1;
  hp: number;
  maxHp: number;
  state = 'idle';
  t = 0;
  atk: AttackInst | null = null;
  invuln = 0;
  flash = 0;
  /** Jitter frames shown while frozen in hitstop. */
  shakeT = 0;
  /* ── AnimStep visual hooks (look-only; core AnimScriptPlayer drives) ── */
  /** Temporary pose override from playPose / holdPose. */
  animPoseOverride: Pose | null = null;
  animPoseT = 0;
  /** Paper-ink tint overlay while tintCaster active. */
  animTintT = 0;
  animTintColor = '#e8d0a0';
  animTintAlpha = 0.25;
  /** Weapon trail boost frames from weaponTrail step. */
  animTrailT = 0;
  animTrailColor = '#e8d0a0';
  animTrailWidth = 4;
  /** Brief noGravity from AnimStep hover; ticks down in AnimScriptPlayer. */
  animHoverT = 0;
  /** Brief body scale punch from AnimStep scalePunch (1 = normal). */
  animScale = 1;
  animScaleT = 0;
  hitstun = 0;
  dead = false;
  remove = false;
  superArmor = false;

  constructor(x: number, y: number, w: number, h: number, hp: number) {
    this.body = new Body(x, y, w, h);
    this.hp = hp;
    this.maxHp = hp;
  }

  get x(): number { return this.body.x; }
  get y(): number { return this.body.y; }

  setState(s: string): void { this.state = s; this.t = 0; }

  startAttack(def: AttackDef): void {
    this.atk = { def, f: 0, hit: new Set() };
    this.setState('attack');
  }

  hitbox(): Rect | null {
    const a = this.atk;
    if (!a) return null;
    const d = a.def;
    if (a.f < d.startup || a.f >= d.startup + d.active) return null;
    return worldBox(d.box, this.body.x, this.body.y, this.facing);
  }

  hurtbox(): Rect | null {
    if (this.dead) return null;
    const b = this.body;
    return { x: b.x - b.w / 2, y: b.y - b.h, w: b.w, h: b.h };
  }

  faceToward(x: number): void { this.facing = x >= this.body.x ? 1 : -1; }

  abstract update(g: Game): void;
  abstract draw(ctx: CanvasRenderingContext2D, g: Game): void;
}
