/**
 * Animation building blocks (AnimStep) — look-only timelines for skills & talismans.
 * Data + core interpreter only. No arbitrary JS / Canvas / URL PNG.
 * Damage still goes through attackKey / ScriptStep damage*; AnimStep does not deal damage.
 */
import type { Game } from '../game';
import type { Fighter } from '../entities/fighter';
import { playCatalogSfx } from '../audio/sfxCatalog';
import type { Pose } from '../render/rig';
import { getAnimRecipe, getPose, getFxRecipe } from './contentRegistry';
import { GROUND_Y } from '../engine/constants';

/* ── AnimStep whitelist ────────────────────────────────────── */

export const ANIM_STEP_KINDS = [
  /* base */
  'wait',
  'playPose',
  'holdPose',
  'afterimage',
  'weaponTrail',
  'swingArc',
  'sealGlyph',
  'inkBurst',
  'tintCaster',
  'sfx',
  'flash',
  'hitstop',
  'shake',
  'hop',
  'bounce',
  'hover',
  'fallStrike',
  /* A. skill / general */
  'dash',
  'face',
  'scalePunch',
  'landDust',
  'sparkBurst',
  'flareBurst',
  'ringPulse',
  'swordQiFlash',
  'camZoom',
  'slowmo',
  'parryFlash',
  'guardGlow',
  'chainPose',
  'loopPose',
  'pullIn',
  'orbitRing',
  'beamLine',
  'crescentSlash',
  'groundCrack',
  'riseMist',
  /* B. talisman / seal */
  'sealPaper',
  'sealStamp',
  'sealSpin',
  'sealRain',
  'sealChain',
  'talismanTrail',
  'inkSplash',
  'baguaRing',
  'runeOrbit',
  'paperBurn',
  'exorcismWave',
  'bindThreads',
  'soulBell',
] as const;

export type AnimStepKind = (typeof ANIM_STEP_KINDS)[number];

export type AnimFaceDir = 1 | -1 | 'player' | 'away';

export type AnimStep =
  | { kind: 'wait'; frames: number }
  | { kind: 'playPose'; poseId: string; frames?: number; timeline?: 'strike' | 'full' }
  | { kind: 'holdPose'; poseId: string; frames: number }
  | { kind: 'afterimage'; count?: number; life?: number; color?: string; alpha?: number }
  | { kind: 'weaponTrail'; frames?: number; color?: string; width?: number }
  | { kind: 'swingArc'; radius?: number; sweep?: number; color?: string; frames?: number }
  | { kind: 'sealGlyph'; text?: string; color?: string; frames?: number; scale?: number }
  | { kind: 'inkBurst'; size?: number; color?: string; n?: number; recipeId?: string }
  | { kind: 'tintCaster'; color: string; frames: number; alpha?: number }
  | { kind: 'sfx'; id: string }
  | { kind: 'flash'; color: string; a: number }
  | { kind: 'hitstop'; frames: number }
  | { kind: 'shake'; amp: number; frames: number }
  | { kind: 'hop'; vy?: number; vx?: number; faceMul?: boolean }
  | { kind: 'bounce'; hops: number; vy?: number; gapFrames?: number; vx?: number }
  | { kind: 'hover'; frames: number; vy?: number }
  | { kind: 'fallStrike'; vy?: number }
  /* A */
  | { kind: 'dash'; dist?: number; frames?: number; faceMul?: boolean }
  | { kind: 'face'; dir?: AnimFaceDir }
  | { kind: 'scalePunch'; scale?: number; frames?: number }
  | { kind: 'landDust'; n?: number; color?: string }
  | { kind: 'sparkBurst'; color?: string; n?: number }
  | { kind: 'flareBurst'; size?: number; color?: string; frames?: number }
  | { kind: 'ringPulse'; size?: number; color?: string; frames?: number }
  | { kind: 'swordQiFlash'; color?: string }
  | { kind: 'camZoom'; z?: number; frames?: number }
  | { kind: 'slowmo'; rate?: number; frames?: number }
  | { kind: 'parryFlash'; color?: string }
  | { kind: 'guardGlow'; color?: string; frames?: number }
  | { kind: 'chainPose'; poseIds: string[]; frameEach?: number }
  | { kind: 'loopPose'; poseId: string; frames: number }
  | { kind: 'pullIn'; n?: number; color?: string; frames?: number }
  | { kind: 'orbitRing'; n?: number; color?: string; frames?: number; radius?: number }
  | { kind: 'beamLine'; length?: number; color?: string; frames?: number }
  | { kind: 'crescentSlash'; radius?: number; color?: string; frames?: number }
  | { kind: 'groundCrack'; width?: number; frames?: number; color?: string }
  | { kind: 'riseMist'; frames?: number; color?: string }
  /* B */
  | { kind: 'sealPaper'; frames?: number; color?: string; w?: number; h?: number }
  | { kind: 'sealStamp'; text?: string; frames?: number; scale?: number }
  | { kind: 'sealSpin'; text?: string; frames?: number; revs?: number }
  | { kind: 'sealRain'; count?: number; text?: string; color?: string }
  | { kind: 'sealChain'; count?: number; gap?: number; text?: string }
  | { kind: 'talismanTrail'; frames?: number; color?: string }
  | { kind: 'inkSplash'; size?: number; color?: string }
  | { kind: 'baguaRing'; frames?: number; color?: string; radius?: number }
  | { kind: 'runeOrbit'; count?: number; frames?: number; color?: string }
  | { kind: 'paperBurn'; frames?: number; color?: string }
  | { kind: 'exorcismWave'; radius?: number; frames?: number; color?: string }
  | { kind: 'bindThreads'; frames?: number; color?: string }
  | { kind: 'soulBell'; frames?: number };

export interface AnimRecipeDef {
  id: string;
  steps: AnimStep[];
  label?: string;
}

/** Resolve id or inline steps → AnimStep[]. Missing recipe → undefined (soft). */
export function resolveAnimSteps(src: string | AnimStep[] | undefined | null): AnimStep[] | undefined {
  if (!src) return undefined;
  if (Array.isArray(src)) return src;
  return getAnimRecipe(src)?.steps;
}

/* ── Runtime overlays ──────────────────────────────────────── */

interface AnimGhost {
  x: number;
  y: number;
  facing: number;
  age: number;
  life: number;
  color: string;
  alpha: number;
}

interface AnimArc {
  x: number;
  y: number;
  facing: number;
  radius: number;
  sweep: number;
  color: string;
  age: number;
  life: number;
  width: number;
}

interface AnimGlyph {
  x: number;
  y: number;
  text: string;
  color: string;
  age: number;
  life: number;
  scale: number;
  /** spin radians / frame; 0 = static */
  spin?: number;
  /** stamp: start large then press down */
  stamp?: boolean;
  ox?: number;
  oy?: number;
  vy?: number;
}

interface AnimPaper {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  age: number;
  life: number;
  burn?: boolean;
}

interface AnimCrack {
  x: number;
  y: number;
  width: number;
  color: string;
  age: number;
  life: number;
  seeds: number[];
}

interface AnimBagua {
  x: number;
  y: number;
  radius: number;
  color: string;
  age: number;
  life: number;
}

interface AnimThreads {
  x: number;
  y: number;
  facing: number;
  color: string;
  age: number;
  life: number;
  tips: { x: number; y: number }[];
}

interface AnimOrbit {
  cx: number;
  cy: number;
  radius: number;
  color: string;
  age: number;
  life: number;
  count: number;
  rune?: boolean;
}

interface AnimCast {
  steps: AnimStep[];
  index: number;
  wait: number;
  color: string;
  caster: Fighter | null;
  done: boolean;
  arcEmit?: { remaining: number; radius: number; sweep: number; color: string };
  trailEmit?: { remaining: number; color: string; width: number };
  mistEmit?: { remaining: number; color: string };
  orbitEmit?: { remaining: number; n: number; color: string; radius: number };
  pullEmit?: { remaining: number; n: number; color: string };
  burnEmit?: { remaining: number; color: string };
  waveEmit?: { remaining: number; radius: number; color: string };
  /** playPose timeline:'full' — wind→strike→rec phases (scheme A; no Fighter field). */
  poseEmit?: { phases: { pose: Pose; frames: number }[]; index: number; remainingInPhase: number };
}

function casterOf(g: Game, cast: AnimCast): Fighter {
  return cast.caster && !cast.caster.dead ? cast.caster : g.player;
}

function resolvePoseStrike(poseId: string): Pose | null {
  const def = getPose(poseId);
  if (def?.strike) return def.strike;
  const sk = getPose(`skel.${poseId}`);
  if (sk?.strike) return sk.strike;
  return null;
}

/** Resolve wind/strike/rec for timeline:'full'. Soft-null if any frame missing. */
function resolvePoseFull(poseId: string): { wind: Pose; strike: Pose; rec: Pose } | null {
  const def = getPose(poseId) ?? getPose(`skel.${poseId}`);
  if (!def?.wind || !def?.strike || !def?.rec) return null;
  return { wind: def.wind, strike: def.strike, rec: def.rec };
}

/** Split frames into ~1:1:1 wind/strike/rec; clamp total to 3–90. */
function splitPoseTimelineFrames(total: number): [number, number, number] {
  const n = clampAnim(total | 0, 3, 90);
  const a = Math.floor(n / 3);
  const b = Math.floor(n / 3);
  const c = n - a - b;
  return [Math.max(1, a), Math.max(1, b), Math.max(1, c)];
}

function applyPoseDirect(c: Fighter, pose: Pose, frames: number): void {
  c.animPoseOverride = pose;
  c.animPoseT = Math.max(1, frames | 0);
}

const warnedKinds = new Set<string>();
function warnAnim(kind: string, msg: string): void {
  const k = `${kind}:${msg}`;
  if (warnedKinds.has(k)) return;
  warnedKinds.add(k);
  console.warn(`[anim] ${msg}`);
}

/* ── Motion clamps (keep caster in-world) ──────────────────── */

export const ANIM_VY_MAX = 16;
export const ANIM_VX_MAX = 10;
export const ANIM_DASH_DIST_MAX = 160;
export const ANIM_DASH_FRAMES_MAX = 20;
export const ANIM_SCALE_MAX = 1.35;
export const ANIM_SCALE_MIN = 0.75;

function clampAnim(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Apply safe velocity impulse; ends hover so gravity resumes. */
function applyCasterImpulse(
  c: Fighter,
  vy: number,
  vx: number | undefined,
  faceMul: boolean,
): void {
  const b = c.body;
  c.animHoverT = 0;
  b.noGravity = false;
  b.vy = clampAnim(vy, -ANIM_VY_MAX, ANIM_VY_MAX);
  if (vx !== undefined && Number.isFinite(vx)) {
    const mag = clampAnim(vx, -ANIM_VX_MAX, ANIM_VX_MAX);
    b.vx = faceMul ? mag * c.facing : mag;
  }
  if (b.vy < 0) b.onGround = false;
}

function applyPose(c: Fighter, poseId: string, frames: number): boolean {
  const pose = resolvePoseStrike(poseId);
  if (!pose) {
    warnAnim('pose', `姿态「${poseId}」缺失，已跳过`);
    return false;
  }
  applyPoseDirect(c, pose, frames);
  return true;
}

/* ── Player ────────────────────────────────────────────────── */

export class AnimScriptPlayer {
  private casts: AnimCast[] = [];
  private ghosts: AnimGhost[] = [];
  private arcs: AnimArc[] = [];
  private glyphs: AnimGlyph[] = [];
  private papers: AnimPaper[] = [];
  private cracks: AnimCrack[] = [];
  private baguas: AnimBagua[] = [];
  private threads: AnimThreads[] = [];
  private orbits: AnimOrbit[] = [];

  /** Play ad-hoc or recipe steps (skill castAnim / talisman anim). */
  play(g: Game, steps: AnimStep[], color = '#e8d0a0', caster?: Fighter | null): void {
    if (!steps.length) return;
    void g;
    this.casts.push({
      steps: steps.slice(),
      index: 0,
      wait: 0,
      color,
      caster: caster ?? null,
      done: false,
    });
  }

  /** Resolve string | inline and play. Soft-skip missing recipe. */
  playCastAnim(
    g: Game,
    src: string | AnimStep[] | undefined | null,
    color = '#e8d0a0',
    caster?: Fighter | null,
  ): void {
    const steps = resolveAnimSteps(src);
    if (!steps?.length) {
      if (typeof src === 'string') warnAnim('recipe', `动画配方「${src}」缺失，已跳过`);
      return;
    }
    this.play(g, steps, color, caster);
  }

  update(g: Game): void {
    for (const gh of this.ghosts) gh.age++;
    this.ghosts = this.ghosts.filter((gh) => gh.age < gh.life);
    for (const a of this.arcs) a.age++;
    this.arcs = this.arcs.filter((a) => a.age < a.life);
    for (const gl of this.glyphs) {
      gl.age++;
      if (gl.vy) gl.y += gl.vy;
      if (gl.ox) gl.x += gl.ox;
    }
    this.glyphs = this.glyphs.filter((gl) => gl.age < gl.life);
    for (const p of this.papers) p.age++;
    this.papers = this.papers.filter((p) => p.age < p.life);
    for (const c of this.cracks) c.age++;
    this.cracks = this.cracks.filter((c) => c.age < c.life);
    for (const b of this.baguas) b.age++;
    this.baguas = this.baguas.filter((b) => b.age < b.life);
    for (const th of this.threads) th.age++;
    this.threads = this.threads.filter((th) => th.age < th.life);
    for (const o of this.orbits) o.age++;
    this.orbits = this.orbits.filter((o) => o.age < o.life);

    for (const cast of this.casts) {
      if (cast.done) continue;
      this.tickEmitters(g, cast);

      if (cast.wait > 0) {
        cast.wait--;
        continue;
      }
      while (cast.index < cast.steps.length && cast.wait <= 0) {
        const step = cast.steps[cast.index++];
        this.exec(g, cast, step);
        if (cast.wait > 0) break;
      }
      const emittersDone =
        !cast.poseEmit &&
        (!cast.arcEmit || cast.arcEmit.remaining <= 0) &&
        (!cast.trailEmit || cast.trailEmit.remaining <= 0) &&
        (!cast.mistEmit || cast.mistEmit.remaining <= 0) &&
        (!cast.orbitEmit || cast.orbitEmit.remaining <= 0) &&
        (!cast.pullEmit || cast.pullEmit.remaining <= 0) &&
        (!cast.burnEmit || cast.burnEmit.remaining <= 0) &&
        (!cast.waveEmit || cast.waveEmit.remaining <= 0);
      if (cast.index >= cast.steps.length && emittersDone) cast.done = true;
    }
    this.casts = this.casts.filter((c) => !c.done);

    const fighters: Fighter[] = [g.player, ...g.enemies];
    if (g.boss) fighters.push(g.boss);
    for (const f of fighters) {
      if (f.animPoseT > 0) f.animPoseT--;
      if (f.animPoseT <= 0) f.animPoseOverride = null;
      if (f.animTintT > 0) f.animTintT--;
      if (f.animTrailT > 0) f.animTrailT--;
      if (f.animHoverT > 0) {
        f.animHoverT--;
        if (f.animHoverT <= 0) f.body.noGravity = false;
      }
      if (f.animScaleT > 0) {
        f.animScaleT--;
        // Ease scale back toward 1
        f.animScale += (1 - f.animScale) * 0.28;
        if (f.animScaleT <= 0) f.animScale = 1;
      }
    }
  }

  private tickEmitters(g: Game, cast: AnimCast): void {
    if (cast.poseEmit) {
      const pe = cast.poseEmit;
      const c = casterOf(g, cast);
      pe.remainingInPhase--;
      if (pe.remainingInPhase <= 0) {
        pe.index++;
        if (pe.index >= pe.phases.length) {
          cast.poseEmit = undefined;
        } else {
          const next = pe.phases[pe.index];
          let left = next.frames;
          for (let i = pe.index + 1; i < pe.phases.length; i++) left += pe.phases[i].frames;
          applyPoseDirect(c, next.pose, left);
          pe.remainingInPhase = next.frames;
        }
      }
    }
    if (cast.arcEmit && cast.arcEmit.remaining > 0) {
      const c = casterOf(g, cast);
      const e = cast.arcEmit;
      e.remaining--;
      const t = 1 - e.remaining / Math.max(1, e.remaining + 1);
      const ang0 = c.facing > 0 ? -e.sweep * 0.5 : Math.PI - e.sweep * 0.5;
      const ang = ang0 + e.sweep * t * c.facing;
      const x1 = c.x + Math.cos(ang) * (e.radius * 0.25) * c.facing;
      const y1 = c.y - 50 + Math.sin(ang) * (e.radius * 0.15);
      const x2 = c.x + Math.cos(ang) * e.radius * c.facing;
      const y2 = c.y - 55 + Math.sin(ang) * (e.radius * 0.35);
      g.fx.slashLine(x1, y1, x2, y2, e.color, 8, 4);
    }
    if (cast.trailEmit && cast.trailEmit.remaining > 0) {
      const c = casterOf(g, cast);
      const e = cast.trailEmit;
      e.remaining--;
      const x1 = c.x + c.facing * 10;
      const y1 = c.y - 48;
      const x2 = c.x + c.facing * (40 + e.width * 4);
      const y2 = c.y - 52 - (e.remaining % 3);
      g.fx.slashLine(x1, y1, x2, y2, e.color, 6, e.width);
      c.animTrailT = Math.max(c.animTrailT, e.remaining);
      c.animTrailColor = e.color;
      c.animTrailWidth = e.width;
    }
    if (cast.mistEmit && cast.mistEmit.remaining > 0) {
      const c = casterOf(g, cast);
      const e = cast.mistEmit;
      e.remaining--;
      if (e.remaining % 2 === 0) {
        g.fx.spawn({
          kind: 'dust',
          x: c.x + (Math.random() - 0.5) * 28,
          y: c.y - 4,
          vx: (Math.random() - 0.5) * 0.8,
          vy: -1.2 - Math.random() * 0.8,
          life: 28,
          size: 8 + Math.random() * 6,
          color: e.color,
          drag: 0.96,
        });
      }
    }
    if (cast.orbitEmit && cast.orbitEmit.remaining > 0) {
      const c = casterOf(g, cast);
      const e = cast.orbitEmit;
      e.remaining--;
      if (e.remaining % 3 === 0) {
        const ang = (1 - e.remaining / 30) * Math.PI * 2;
        for (let i = 0; i < e.n; i++) {
          const a = ang + (i / e.n) * Math.PI * 2;
          g.fx.spawn({
            kind: 'qi',
            x: c.x + Math.cos(a) * e.radius,
            y: c.y - 40 + Math.sin(a) * e.radius * 0.55,
            vx: -Math.sin(a) * 1.2,
            vy: Math.cos(a) * 0.6,
            life: 10,
            size: 7,
            color: e.color,
            add: true,
            drag: 0.92,
          });
        }
      }
    }
    if (cast.pullEmit && cast.pullEmit.remaining > 0) {
      const c = casterOf(g, cast);
      const e = cast.pullEmit;
      e.remaining--;
      if (e.remaining % 2 === 0) {
        for (let i = 0; i < Math.min(3, e.n); i++) {
          const ang = Math.random() * Math.PI * 2;
          const r = 50 + Math.random() * 40;
          const px = c.x + Math.cos(ang) * r;
          const py = c.y - 40 + Math.sin(ang) * r * 0.5;
          g.fx.spawn({
            kind: 'qi',
            x: px,
            y: py,
            vx: (c.x - px) * 0.08,
            vy: (c.y - 40 - py) * 0.08,
            life: 14,
            size: 6,
            color: e.color,
            add: true,
            drag: 0.9,
          });
        }
      }
    }
    if (cast.burnEmit && cast.burnEmit.remaining > 0) {
      const c = casterOf(g, cast);
      const e = cast.burnEmit;
      e.remaining--;
      if (e.remaining % 2 === 0) {
        g.fx.fire(c.x + (Math.random() - 0.5) * 20, c.y - 55 + (Math.random() - 0.5) * 16, 2, 8);
        g.fx.spawn({
          kind: 'ember',
          x: c.x + (Math.random() - 0.5) * 24,
          y: c.y - 60,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -1.5 - Math.random(),
          life: 18,
          size: 2,
          color: e.color,
          add: true,
        });
      }
    }
    if (cast.waveEmit && cast.waveEmit.remaining > 0) {
      const c = casterOf(g, cast);
      const e = cast.waveEmit;
      e.remaining--;
      const t = 1 - e.remaining / Math.max(1, e.remaining + 1);
      const r = e.radius * (0.35 + 0.65 * t);
      g.fx.ring(c.x, c.y - 40, r, e.color, 4);
    }
  }

  /** Draw lingering paper-ink overlays. */
  draw(ctx: CanvasRenderingContext2D): void {
    for (const gh of this.ghosts) {
      const fade = 1 - gh.age / gh.life;
      ctx.save();
      ctx.globalAlpha = gh.alpha * fade;
      ctx.fillStyle = gh.color;
      ctx.beginPath();
      ctx.ellipse(gh.x, gh.y - 40, 14 * fade + 4, 28 * fade + 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    for (const a of this.arcs) {
      const fade = 1 - a.age / a.life;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55 * fade;
      ctx.strokeStyle = a.color;
      ctx.lineWidth = a.width * fade + 1;
      ctx.beginPath();
      const start = a.facing > 0 ? -a.sweep * 0.5 - 0.3 : Math.PI + a.sweep * 0.5 + 0.3;
      const end = a.facing > 0 ? a.sweep * 0.5 + 0.3 : Math.PI - a.sweep * 0.5 - 0.3;
      ctx.arc(a.x, a.y - 50, a.radius * (0.85 + 0.15 * fade), start, end, a.facing < 0);
      ctx.stroke();
      ctx.restore();
    }
    for (const p of this.papers) {
      const fade = 1 - p.age / p.life;
      const pop = p.age < 4 ? 1 + (4 - p.age) * 0.06 : 1;
      const burnShrink = p.burn ? 1 - p.age / p.life * 0.45 : 1;
      ctx.save();
      ctx.globalAlpha = Math.min(1, fade * 1.15) * (p.burn ? 0.85 : 1);
      ctx.translate(p.x, p.y - 70);
      ctx.rotate(Math.sin(p.age * 0.15) * 0.04);
      const w = p.w * pop * burnShrink;
      const h = p.h * pop * burnShrink;
      ctx.fillStyle = p.burn ? '#3a2010' : '#f0e0c0';
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      // ink lines
      ctx.strokeStyle = p.color;
      ctx.globalAlpha *= 0.7;
      ctx.beginPath();
      ctx.moveTo(-w * 0.25, -h * 0.3);
      ctx.lineTo(w * 0.2, -h * 0.25);
      ctx.moveTo(-w * 0.2, 0);
      ctx.lineTo(w * 0.25, 0.05 * h);
      ctx.moveTo(-w * 0.22, h * 0.28);
      ctx.lineTo(w * 0.18, h * 0.3);
      ctx.stroke();
      ctx.restore();
    }
    for (const gl of this.glyphs) {
      const fade = 1 - gl.age / gl.life;
      let pop = gl.age < 4 ? 1 + (4 - gl.age) * 0.08 : 1;
      if (gl.stamp) {
        // start large, press down
        const t = gl.age / Math.max(1, gl.life);
        pop = 1.55 - t * 0.55;
      }
      const rot = (gl.spin ?? 0) * gl.age;
      ctx.save();
      ctx.globalAlpha = Math.min(1, fade * 1.2);
      ctx.translate(gl.x, gl.y - 70 + (gl.oy ?? 0));
      if (rot) ctx.rotate(rot);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const size = Math.round(28 * gl.scale * pop);
      ctx.font = `900 ${size}px "Noto Serif SC", "Source Han Serif SC", "Songti SC", serif`;
      ctx.strokeStyle = 'rgba(20,0,10,0.85)';
      ctx.lineWidth = 4;
      ctx.strokeText(gl.text, 0, 0);
      ctx.fillStyle = gl.color;
      ctx.fillText(gl.text, 0, 0);
      ctx.restore();
    }
    for (const cr of this.cracks) {
      const fade = 1 - cr.age / cr.life;
      ctx.save();
      ctx.globalAlpha = 0.75 * fade;
      ctx.strokeStyle = cr.color;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(cr.x - cr.width * 0.5, cr.y);
      let x = cr.x - cr.width * 0.5;
      for (let i = 0; i < cr.seeds.length; i++) {
        x += cr.width / cr.seeds.length;
        const yOff = (cr.seeds[i] - 0.5) * 10;
        ctx.lineTo(x, cr.y + yOff);
        if (i % 2 === 0) {
          ctx.moveTo(x, cr.y + yOff);
          ctx.lineTo(x + 6, cr.y + yOff + (cr.seeds[i] > 0.5 ? 8 : -8));
          ctx.moveTo(x, cr.y + yOff);
        }
      }
      ctx.stroke();
      ctx.restore();
    }
    for (const bg of this.baguas) {
      const fade = 1 - bg.age / bg.life;
      const r = bg.radius * (0.85 + 0.15 * Math.sin(bg.age * 0.2));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55 * fade;
      ctx.strokeStyle = bg.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(bg.x, bg.y - 40, r, 0, Math.PI * 2);
      ctx.stroke();
      // octagon
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 8;
        const px = bg.x + Math.cos(a) * r * 0.72;
        const py = bg.y - 40 + Math.sin(a) * r * 0.72;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      // tick marks
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(bg.x + Math.cos(a) * r * 0.85, bg.y - 40 + Math.sin(a) * r * 0.85);
        ctx.lineTo(bg.x + Math.cos(a) * r, bg.y - 40 + Math.sin(a) * r);
        ctx.stroke();
      }
      ctx.restore();
    }
    for (const th of this.threads) {
      const fade = 1 - th.age / th.life;
      ctx.save();
      ctx.globalAlpha = 0.65 * fade;
      ctx.strokeStyle = th.color;
      ctx.lineWidth = 1.4;
      for (const tip of th.tips) {
        ctx.beginPath();
        ctx.moveTo(th.x, th.y - 40);
        ctx.lineTo(tip.x, tip.y);
        ctx.stroke();
      }
      ctx.restore();
    }
    for (const o of this.orbits) {
      const fade = 1 - o.age / o.life;
      const ang0 = o.age * 0.18;
      ctx.save();
      ctx.globalAlpha = 0.7 * fade;
      for (let i = 0; i < o.count; i++) {
        const a = ang0 + (i / o.count) * Math.PI * 2;
        const px = o.cx + Math.cos(a) * o.radius;
        const py = o.cy + Math.sin(a) * o.radius * 0.55;
        if (o.rune) {
          ctx.fillStyle = o.color;
          ctx.font = '900 12px "Noto Serif SC", "Songti SC", serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('符', px, py);
        } else {
          ctx.fillStyle = o.color;
          ctx.beginPath();
          ctx.arc(px, py, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  private exec(g: Game, cast: AnimCast, step: AnimStep): void {
    const kind = (step as { kind?: string }).kind;
    if (!kind || !(ANIM_STEP_KINDS as readonly string[]).includes(kind)) {
      warnAnim(String(kind), `未知 AnimStep kind「${kind}」，已跳过`);
      return;
    }
    const c = casterOf(g, cast);
    const color = cast.color;

    switch (step.kind) {
      case 'wait':
        cast.wait = Math.max(0, step.frames | 0);
        break;
      case 'playPose': {
        const frames = step.frames ?? 6;
        if (step.timeline === 'full') {
          const full = resolvePoseFull(step.poseId);
          if (!full) {
            warnAnim('playPose', `姿态「${step.poseId}」缺 wind/strike/rec，timeline:full 已回退 strike`);
            applyPose(c, step.poseId, frames);
            cast.poseEmit = undefined;
            break;
          }
          const [fw, fs, fr] = splitPoseTimelineFrames(frames);
          const total = fw + fs + fr;
          applyPoseDirect(c, full.wind, total);
          cast.poseEmit = {
            phases: [
              { pose: full.wind, frames: fw },
              { pose: full.strike, frames: fs },
              { pose: full.rec, frames: fr },
            ],
            index: 0,
            remainingInPhase: fw,
          };
        } else {
          // default / 'strike' — today's behavior
          cast.poseEmit = undefined;
          applyPose(c, step.poseId, frames);
        }
        break;
      }
      case 'holdPose': {
        cast.poseEmit = undefined;
        applyPose(c, step.poseId, step.frames);
        break;
      }
      case 'afterimage': {
        const count = Math.max(1, Math.min(8, step.count ?? 3));
        const life = Math.max(4, step.life ?? 10);
        const col = step.color ?? color;
        const alpha = step.alpha ?? 0.35;
        for (let i = 0; i < count; i++) {
          this.ghosts.push({
            x: c.x - c.facing * i * 14,
            y: c.y,
            facing: c.facing,
            age: i * 2,
            life: life + i,
            color: col,
            alpha,
          });
        }
        break;
      }
      case 'weaponTrail': {
        const frames = Math.max(1, step.frames ?? 8);
        cast.trailEmit = {
          remaining: frames,
          color: step.color ?? color,
          width: step.width ?? 4,
        };
        c.animTrailT = Math.max(c.animTrailT, frames);
        c.animTrailColor = step.color ?? color;
        c.animTrailWidth = step.width ?? 4;
        break;
      }
      case 'swingArc': {
        const frames = Math.max(1, step.frames ?? 8);
        const radius = step.radius ?? 70;
        const sweep = step.sweep ?? 1.2;
        const col = step.color ?? color;
        this.arcs.push({
          x: c.x, y: c.y, facing: c.facing,
          radius, sweep, color: col, age: 0, life: frames + 4, width: 5,
        });
        cast.arcEmit = { remaining: frames, radius, sweep, color: col };
        break;
      }
      case 'sealGlyph': {
        const frames = Math.max(6, step.frames ?? 18);
        this.glyphs.push({
          x: c.x, y: c.y,
          text: step.text ?? '符',
          color: step.color ?? color,
          age: 0, life: frames,
          scale: step.scale ?? 1.2,
        });
        g.fx.flare(c.x, c.y - 70, 40 * (step.scale ?? 1.2), step.color ?? color, 12);
        g.fx.ring(c.x, c.y - 70, 36, step.color ?? color, 14);
        break;
      }
      case 'inkBurst': {
        const col = step.color ?? color;
        const size = step.size ?? 50;
        const n = step.n ?? 6;
        const recipe = step.recipeId ? getFxRecipe(step.recipeId) : undefined;
        if (recipe) {
          const preset = recipe.emitter;
          const rCol = step.color ?? recipe.color ?? col;
          const rSize = step.size ?? recipe.size ?? size;
          const rn = step.n ?? recipe.n ?? n;
          if (preset === 'flare') g.fx.flare(c.x, c.y - 40, rSize, rCol, recipe.life ?? 14);
          else if (preset === 'ring') g.fx.ring(c.x, c.y - 40, rSize, rCol, recipe.life ?? 16);
          else if (preset === 'qi') this.qiFallback(g, c.x, c.y - 40, rn, rCol);
          else if (preset === 'swordQi') g.fx.swordQi(c.x, c.y - 50, c.facing, false);
          else if (preset === 'dust') g.fx.dust(c.x, c.y, rn, c.facing);
          else if (preset === 'fire') g.fx.fire(c.x, c.y - 40, rn, Math.max(4, rSize / 5));
          else if (preset === 'spark') g.fx.hitSpark(c.x, c.y - 40, c.facing, false, rCol);
          else {
            g.fx.flare(c.x, c.y - 40, rSize, rCol, 14);
            this.qiFallback(g, c.x, c.y - 40, rn, rCol);
          }
        } else {
          g.fx.flare(c.x, c.y - 40, size, col, 14);
          g.fx.ring(c.x, c.y - 40, size * 0.7, col, 12);
          this.qiFallback(g, c.x, c.y - 40, n, col);
        }
        break;
      }
      case 'tintCaster': {
        c.animTintColor = step.color;
        c.animTintAlpha = step.alpha ?? 0.25;
        c.animTintT = Math.max(1, step.frames | 0);
        c.flash = Math.max(c.flash, Math.min(12, step.frames));
        break;
      }
      case 'sfx': {
        // R4c: catalog-aware (file buffer → synth → historical raw)
        playCatalogSfx(g.audio, step.id);
        break;
      }
      case 'flash':
        g.flashScreen(step.color, step.a);
        break;
      case 'hitstop':
        g.hitstop = Math.max(g.hitstop, step.frames | 0);
        break;
      case 'shake':
        g.cam.shake(step.amp, step.frames);
        break;
      case 'hop': {
        const vy = step.vy ?? -10;
        const faceMul = step.faceMul !== false;
        applyCasterImpulse(c, vy, step.vx, faceMul);
        break;
      }
      case 'bounce': {
        const hops = clampAnim(step.hops | 0, 1, 6);
        const vy = step.vy ?? -8;
        const gap = clampAnim(step.gapFrames ?? 18, 4, 60);
        applyCasterImpulse(c, vy, step.vx, true);
        if (hops > 1) {
          const injected: AnimStep[] = [];
          for (let i = 1; i < hops; i++) {
            injected.push({ kind: 'wait', frames: gap });
            injected.push({ kind: 'hop', vy, vx: step.vx, faceMul: true });
          }
          cast.steps.splice(cast.index, 0, ...injected);
        }
        break;
      }
      case 'hover': {
        const frames = clampAnim(step.frames | 0, 1, 90);
        const vy = clampAnim(step.vy ?? -0.6, -ANIM_VY_MAX, ANIM_VY_MAX);
        const b = c.body;
        b.noGravity = true;
        b.vy = vy;
        b.onGround = false;
        c.animHoverT = Math.max(c.animHoverT, frames);
        break;
      }
      case 'fallStrike': {
        const vy = step.vy ?? 12;
        applyCasterImpulse(c, Math.abs(vy), undefined, true);
        break;
      }
      /* ── A. skill / general ─────────────────────────────── */
      case 'dash': {
        const dist = clampAnim(step.dist ?? 72, 8, ANIM_DASH_DIST_MAX);
        const frames = clampAnim(step.frames ?? 5, 1, ANIM_DASH_FRAMES_MAX);
        const faceMul = step.faceMul !== false;
        const dir = faceMul ? c.facing : 1;
        const vx = clampAnim((dist / frames) * dir, -ANIM_VX_MAX, ANIM_VX_MAX);
        c.animHoverT = 0;
        c.body.noGravity = false;
        c.body.vx = vx;
        // micro position nudge so dash reads even if friction eats vx
        c.body.x += dir * Math.min(24, dist * 0.25);
        this.ghosts.push({
          x: c.x - dir * 18, y: c.y, facing: c.facing,
          age: 0, life: 8, color: color, alpha: 0.3,
        });
        break;
      }
      case 'face': {
        const dir = step.dir ?? 1;
        if (dir === 1 || dir === -1) {
          c.facing = dir;
        } else if (dir === 'player') {
          const target = c.team === 'player'
            ? (g.targets().find((t) => !t.dead) ?? null)
            : g.player;
          if (target && !target.dead) c.faceToward(target.x);
        } else if (dir === 'away') {
          const target = c.team === 'player'
            ? (g.targets().find((t) => !t.dead) ?? null)
            : g.player;
          if (target && !target.dead) c.facing = target.x >= c.x ? -1 : 1;
        }
        break;
      }
      case 'scalePunch': {
        const sc = clampAnim(step.scale ?? 1.15, ANIM_SCALE_MIN, ANIM_SCALE_MAX);
        const frames = clampAnim(step.frames ?? 8, 2, 30);
        c.animScale = sc;
        c.animScaleT = Math.max(c.animScaleT, frames);
        // also tint flash for punch readability
        c.flash = Math.max(c.flash, Math.min(8, frames));
        break;
      }
      case 'landDust': {
        const n = clampAnim(step.n ?? 6, 1, 20);
        g.fx.dust(c.x, c.y, n, -c.facing);
        if (step.color) {
          for (let i = 0; i < Math.min(4, n); i++) {
            g.fx.spawn({
              kind: 'dust',
              x: c.x + (Math.random() - 0.5) * 20,
              y: c.y - 2,
              vx: (Math.random() - 0.5) * 2,
              vy: -0.8 - Math.random(),
              life: 24,
              size: 8,
              color: step.color,
            });
          }
        }
        break;
      }
      case 'sparkBurst': {
        const col = step.color ?? color;
        g.fx.hitSpark(c.x + c.facing * 20, c.y - 45, c.facing, false, col);
        const n = clampAnim(step.n ?? 6, 1, 16);
        for (let i = 0; i < n; i++) {
          g.fx.spawn({
            kind: 'spark',
            x: c.x + c.facing * 16,
            y: c.y - 45,
            vx: c.facing * (2 + Math.random() * 4) + (Math.random() - 0.5),
            vy: (Math.random() - 0.5) * 4,
            life: 12,
            size: 2,
            len: 3,
            color: col,
            add: true,
            drag: 0.88,
          });
        }
        break;
      }
      case 'flareBurst': {
        const size = clampAnim(step.size ?? 55, 10, 140);
        const col = step.color ?? color;
        const life = clampAnim(step.frames ?? 12, 4, 40);
        g.fx.flare(c.x, c.y - 40, size, col, life);
        break;
      }
      case 'ringPulse': {
        const size = clampAnim(step.size ?? 60, 10, 160);
        const col = step.color ?? color;
        const life = clampAnim(step.frames ?? 16, 4, 40);
        g.fx.ring(c.x, c.y - 40, size, col, life);
        g.fx.ring(c.x, c.y - 40, size * 0.55, col, Math.max(4, life - 4));
        break;
      }
      case 'swordQiFlash': {
        g.fx.swordQi(c.x, c.y - 50, c.facing, false);
        if (step.color) {
          g.fx.flare(c.x + c.facing * 24, c.y - 50, 28, step.color, 8);
        }
        break;
      }
      case 'camZoom': {
        // Camera.punch briefly raises zoom then decays; frames is advisory (punch auto-decays).
        const z = clampAnim(step.z ?? 1.06, 1.01, 1.2);
        g.cam.punch(z);
        void step.frames;
        break;
      }
      case 'slowmo': {
        const rate = clampAnim(step.rate ?? 0.45, 0.15, 0.95);
        const frames = clampAnim(step.frames ?? 24, 4, 90);
        g.slowmo(rate, frames);
        break;
      }
      case 'parryFlash': {
        const col = step.color ?? '#ffe7a0';
        g.fx.guardSpark(c.x + c.facing * 18, c.y - 48, c.facing, true);
        g.flashScreen(col, 0.16);
        g.fx.flare(c.x + c.facing * 18, c.y - 48, 70, col, 12);
        break;
      }
      case 'guardGlow': {
        const col = step.color ?? '#70c8a0';
        const frames = clampAnim(step.frames ?? 14, 4, 40);
        g.fx.guardSpark(c.x + c.facing * 14, c.y - 44, c.facing, false);
        g.fx.ring(c.x, c.y - 40, 42, col, frames);
        c.animTintColor = col;
        c.animTintAlpha = 0.22;
        c.animTintT = Math.max(c.animTintT, frames);
        break;
      }
      case 'chainPose': {
        const ids = step.poseIds?.filter((id) => typeof id === 'string' && id.length) ?? [];
        const each = clampAnim(step.frameEach ?? 5, 1, 30);
        if (!ids.length) {
          warnAnim('chainPose', 'chainPose 缺少 poseIds，已跳过');
          break;
        }
        const injected: AnimStep[] = [];
        for (let i = 0; i < ids.length; i++) {
          if (i > 0) injected.push({ kind: 'wait', frames: 0 });
          injected.push({ kind: 'playPose', poseId: ids[i], frames: each });
          if (i < ids.length - 1) injected.push({ kind: 'wait', frames: each });
        }
        // First pose now; rest injected
        applyPose(c, ids[0], each);
        if (injected.length > 1) {
          cast.steps.splice(cast.index, 0, ...injected.slice(1));
        }
        break;
      }
      case 'loopPose': {
        // Equivalent hold for duration (pose held until frames elapse).
        applyPose(c, step.poseId, clampAnim(step.frames | 0, 1, 120));
        break;
      }
      case 'pullIn': {
        const n = clampAnim(step.n ?? 8, 2, 16);
        const frames = clampAnim(step.frames ?? 16, 4, 40);
        cast.pullEmit = { remaining: frames, n, color: step.color ?? color };
        break;
      }
      case 'orbitRing': {
        const n = clampAnim(step.n ?? 6, 2, 12);
        const frames = clampAnim(step.frames ?? 20, 4, 60);
        const radius = clampAnim(step.radius ?? 42, 16, 100);
        const col = step.color ?? color;
        cast.orbitEmit = { remaining: frames, n, color: col, radius };
        this.orbits.push({
          cx: c.x, cy: c.y - 40, radius, color: col,
          age: 0, life: frames, count: n,
        });
        break;
      }
      case 'beamLine': {
        const len = clampAnim(step.length ?? 100, 30, 200);
        const col = step.color ?? color;
        const frames = clampAnim(step.frames ?? 8, 2, 24);
        const y = c.y - 50;
        g.fx.slashLine(c.x + c.facing * 8, y, c.x + c.facing * len, y - 6, col, frames + 4, 5);
        g.fx.slashLine(c.x + c.facing * 8, y + 4, c.x + c.facing * len * 0.85, y + 2, '#ffffff', frames, 2);
        g.fx.flare(c.x + c.facing * (len * 0.55), y, 28, col, 8);
        break;
      }
      case 'crescentSlash': {
        const frames = Math.max(1, step.frames ?? 10);
        const radius = step.radius ?? 85;
        const col = step.color ?? color;
        const sweep = 1.85;
        this.arcs.push({
          x: c.x, y: c.y, facing: c.facing,
          radius, sweep, color: col, age: 0, life: frames + 6, width: 7,
        });
        cast.arcEmit = { remaining: frames, radius, sweep, color: col };
        g.fx.swordQi(c.x, c.y - 50, c.facing, true);
        break;
      }
      case 'groundCrack': {
        const width = clampAnim(step.width ?? 80, 30, 180);
        const frames = clampAnim(step.frames ?? 22, 8, 60);
        const col = step.color ?? '#2a2030';
        const seeds: number[] = [];
        for (let i = 0; i < 7; i++) seeds.push(Math.random());
        this.cracks.push({
          x: c.x + c.facing * 20,
          y: GROUND_Y - 1,
          width, color: col, age: 0, life: frames, seeds,
        });
        g.fx.dust(c.x, c.y, 8, c.facing);
        break;
      }
      case 'riseMist': {
        const frames = clampAnim(step.frames ?? 24, 6, 60);
        cast.mistEmit = { remaining: frames, color: step.color ?? '#6a5a7a' };
        break;
      }
      /* ── B. talisman / seal ──────────────────────────────── */
      case 'sealPaper': {
        const frames = clampAnim(step.frames ?? 16, 4, 48);
        this.papers.push({
          x: c.x, y: c.y,
          w: clampAnim(step.w ?? 44, 16, 80),
          h: clampAnim(step.h ?? 60, 20, 100),
          color: step.color ?? color,
          age: 0, life: frames,
        });
        break;
      }
      case 'sealStamp': {
        const frames = clampAnim(step.frames ?? 16, 6, 40);
        this.glyphs.push({
          x: c.x, y: c.y,
          text: step.text ?? '印',
          color: '#c01828',
          age: 0, life: frames,
          scale: clampAnim(step.scale ?? 1.6, 0.6, 2.5),
          stamp: true,
        });
        g.fx.flare(c.x, c.y - 70, 36, '#c01828', 10);
        g.cam.shake(2, 4);
        break;
      }
      case 'sealSpin': {
        const frames = clampAnim(step.frames ?? 24, 8, 60);
        const revs = clampAnim(step.revs ?? 1.5, 0.25, 4);
        this.glyphs.push({
          x: c.x, y: c.y,
          text: step.text ?? '符',
          color: color,
          age: 0, life: frames,
          scale: 1.3,
          spin: (revs * Math.PI * 2) / frames,
        });
        g.fx.ring(c.x, c.y - 70, 40, color, frames);
        break;
      }
      case 'sealRain': {
        const count = clampAnim(step.count ?? 6, 1, 12);
        const col = step.color ?? color;
        const text = step.text ?? '符';
        for (let i = 0; i < count; i++) {
          this.glyphs.push({
            x: c.x + (i - (count - 1) / 2) * 28 + (Math.random() - 0.5) * 10,
            y: c.y - 120 - Math.random() * 40,
            text, color: col,
            age: -i * 2, life: 28 + i * 2,
            scale: 0.85 + Math.random() * 0.3,
            vy: 3.2 + Math.random() * 1.4,
          });
        }
        break;
      }
      case 'sealChain': {
        const count = clampAnim(step.count ?? 4, 1, 8);
        const gap = clampAnim(step.gap ?? 5, 1, 20);
        const text = step.text ?? '符';
        const injected: AnimStep[] = [];
        for (let i = 0; i < count; i++) {
          if (i > 0) injected.push({ kind: 'wait', frames: gap });
          injected.push({
            kind: 'sealGlyph',
            text,
            color,
            frames: 14,
            scale: 1.1,
          });
        }
        // offset glyphs along facing via afterimage-like ox — first now, rest injected
        this.glyphs.push({
          x: c.x + c.facing * 10, y: c.y,
          text, color, age: 0, life: 14, scale: 1.1,
        });
        if (injected.length > 1) {
          // rewrite remaining sealGlyphs to shift x via wait + sealGlyph; sealGlyph always at caster —
          // inject with afterimage spacing by using sealPaper mini + sealGlyph
          const rest: AnimStep[] = [];
          for (let i = 1; i < count; i++) {
            rest.push({ kind: 'wait', frames: gap });
            rest.push({ kind: 'sealGlyph', text, color, frames: 14, scale: 1.05 });
          }
          cast.steps.splice(cast.index, 0, ...rest);
        }
        void injected;
        break;
      }
      case 'talismanTrail': {
        const frames = clampAnim(step.frames ?? 12, 4, 40);
        const col = step.color ?? color;
        cast.trailEmit = { remaining: frames, color: col, width: 3 };
        // paper-like motes
        for (let i = 0; i < 5; i++) {
          g.fx.spawn({
            kind: 'mote',
            x: c.x - c.facing * i * 10,
            y: c.y - 50 - Math.random() * 10,
            vx: -c.facing * (0.5 + Math.random()),
            vy: -0.4,
            life: 14,
            size: 3,
            color: col,
            add: true,
          });
        }
        break;
      }
      case 'inkSplash': {
        const size = clampAnim(step.size ?? 36, 10, 80);
        const col = step.color ?? '#1a1018';
        g.fx.flare(c.x, c.y - 40, size, col, 10);
        for (let i = 0; i < 10; i++) {
          g.fx.spawn({
            kind: 'blood',
            x: c.x, y: c.y - 40,
            vx: (Math.random() - 0.5) * 6,
            vy: -2 - Math.random() * 4,
            life: 20 + (Math.random() * 16) | 0,
            size: 1.5 + Math.random() * 2,
            g: 0.28, drag: 0.97,
            color: col,
          });
        }
        break;
      }
      case 'baguaRing': {
        const frames = clampAnim(step.frames ?? 24, 8, 60);
        const radius = clampAnim(step.radius ?? 65, 30, 140);
        const col = step.color ?? color;
        this.baguas.push({
          x: c.x, y: c.y, radius, color: col, age: 0, life: frames,
        });
        g.fx.ring(c.x, c.y - 40, radius * 0.9, col, frames);
        break;
      }
      case 'runeOrbit': {
        const count = clampAnim(step.count ?? 5, 2, 10);
        const frames = clampAnim(step.frames ?? 24, 8, 60);
        const col = step.color ?? color;
        this.orbits.push({
          cx: c.x, cy: c.y - 40, radius: 48, color: col,
          age: 0, life: frames, count, rune: true,
        });
        break;
      }
      case 'paperBurn': {
        const frames = clampAnim(step.frames ?? 20, 8, 48);
        const col = step.color ?? '#ff6a1a';
        this.papers.push({
          x: c.x, y: c.y, w: 40, h: 56, color: col,
          age: 0, life: frames, burn: true,
        });
        cast.burnEmit = { remaining: frames, color: col };
        break;
      }
      case 'exorcismWave': {
        const radius = clampAnim(step.radius ?? 100, 40, 200);
        const frames = clampAnim(step.frames ?? 22, 8, 48);
        const col = step.color ?? color;
        cast.waveEmit = { remaining: frames, radius, color: col };
        g.fx.flare(c.x, c.y - 40, 50, col, 12);
        break;
      }
      case 'bindThreads': {
        const frames = clampAnim(step.frames ?? 18, 6, 48);
        const col = step.color ?? color;
        const tips: { x: number; y: number }[] = [];
        const foes = c.team === 'player'
          ? g.targets().filter((t) => !t.dead).slice(0, 4)
          : (!g.player.dead ? [g.player] : []);
        if (foes.length) {
          for (const t of foes) tips.push({ x: t.x, y: t.y - 40 });
        } else {
          for (let i = 0; i < 4; i++) {
            const a = -0.6 + i * 0.4;
            tips.push({
              x: c.x + c.facing * (60 + i * 18),
              y: c.y - 50 + Math.sin(a) * 30,
            });
          }
        }
        this.threads.push({
          x: c.x, y: c.y, facing: c.facing, color: col,
          age: 0, life: frames, tips,
        });
        break;
      }
      case 'soulBell': {
        const frames = clampAnim(step.frames ?? 18, 6, 40);
        g.fx.ring(c.x, c.y - 40, 70, '#e8d090', frames);
        g.fx.ring(c.x, c.y - 40, 100, '#ffe8a0', frames + 4);
        g.fx.flare(c.x, c.y - 50, 55, '#ffe8a0', 12);
        g.cam.shake(3, Math.min(10, frames));
        break;
      }
      default:
        warnAnim('fallback', `AnimStep 未处理`);
    }
  }

  private qiFallback(g: Game, x: number, y: number, n: number, color: string): void {
    for (let i = 0; i < n; i++) {
      g.fx.spawn({
        kind: 'qi',
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 24,
        vx: (Math.random() - 0.5) * 2,
        vy: -1.2 - Math.random(),
        life: 16,
        size: 8,
        color,
        add: true,
        drag: 0.94,
      });
    }
  }
}
