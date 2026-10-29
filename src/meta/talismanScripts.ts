/**
 * Talisman effect scripts — data timelines only (内容包 plugins ship data, never JS that runs here).
 * Core player executes steps via engine primitives (fx / damage / status / volleys).
 */
import type { Game } from '../game';
import type { AttackDef } from '../combat/types';
import type { Fighter } from '../entities/fighter';
import { GROUND_Y } from '../engine/constants';
import { rand } from '../engine/math';
import { playSfx } from '../audio/sfx';
import { playCatalogSfx } from '../audio/sfxCatalog';
import {
  getTalismanScript, listTalismanScripts,
  getFxRecipe, getVolley,
} from './contentRegistry';
import type { AnimStep } from './animScripts';

/* ── step schema (data-only) ───────────────────────────────── */

export type FxPreset = 'flare' | 'ring' | 'spark' | 'qi' | 'fire' | 'dust' | 'swordQi';

export type ScriptStep =
  | { kind: 'wait'; frames: number }
  | { kind: 'banner'; text: string; sub?: string; dur?: number }
  | {
      kind: 'float';
      text: string;
      color?: string;
      size?: number;
      bold?: boolean;
      where?: 'caster' | 'eachElite' | 'boss';
    }
  | {
      kind: 'fx';
      /** Legacy preset name (also registered as FxRecipeDef alias). */
      preset?: FxPreset;
      /** Catalog recipe id; soft-skip if missing. */
      recipeId?: string;
      at?: 'caster' | 'ground' | 'boss';
      ox?: number;
      oy?: number;
      size?: number;
      color?: string;
      life?: number;
      n?: number;
      heavy?: boolean;
    }
  | { kind: 'shake'; amp: number; frames: number }
  | { kind: 'hitstop'; frames: number }
  | { kind: 'flash'; color: string; a: number }
  | { kind: 'sfx'; id: string }
  | {
      kind: 'damageRadius';
      rx: number;
      ry?: number;
      damage: number;
      kbX?: number;
      kbY?: number;
      hitstun?: number;
      hitstop?: number;
      shake?: number;
      heavy?: boolean;
      ox?: number;
      oy?: number;
    }
  | {
      kind: 'damageCone';
      reach: number;
      halfH: number;
      damage: number;
      kbX?: number;
      kbY?: number;
      hitstun?: number;
      heavy?: boolean;
    }
  | {
      kind: 'spawnVolley';
      /** Legacy style (also VolleyDef id aliases). */
      style?: 'skySword' | 'thunder' | 'waterPulse';
      /** Catalog VolleyDef id; soft-skip if missing and no style. */
      volleyId?: string;
      count: number;
      interval: number;
      damage: number;
      spread?: number;
      radius?: number;
    }
  | {
      kind: 'knockback';
      r: number;
      kbX: number;
      kbY: number;
    }
  | {
      kind: 'status';
      affixSuppress?: number;
      clearHazards?: boolean;
      eliteSuppress?: number;
      clearControl?: boolean;
      invuln?: number;
      heal?: number;
      stamina?: number;
      hushen?: number;
      poshi?: boolean;
      dingshen?: number;
      anhun?: number;
      floatEachElite?: string;
      /** Root / immobilize duration frames (targets in radius). */
      root?: number;
      rootRadius?: number;
    }
  | {
      kind: 'damageBox';
      w: number;
      h: number;
      ox?: number;
      oy?: number;
      damage: number;
      kbX?: number;
      kbY?: number;
      hitstun?: number;
      hitstop?: number;
      shake?: number;
      heavy?: boolean;
    }
  | {
      kind: 'damageDonut';
      rInner: number;
      rOuter: number;
      damage: number;
      kbX?: number;
      kbY?: number;
      hitstun?: number;
      heavy?: boolean;
    }
  | {
      kind: 'zone';
      shape: 'circle' | 'box';
      duration: number;
      tickDamage?: number;
      status?: 'root' | 'slow' | 'burn';
      radius?: number;
      w?: number;
      h?: number;
      ox?: number;
      oy?: number;
      color?: string;
    }
  | {
      kind: 'pull';
      radius: number;
      strength: number;
      frames?: number;
    }
  | {
      kind: 'root';
      duration: number;
      radius?: number;
    }
  | {
      kind: 'multihit';
      times: number;
      gapFrames: number;
      /** Nested damage* step (damageRadius | damageCone | damageBox | damageDonut). */
      step: ScriptStep;
    };

export interface TalismanScriptDef {
  id: string;
  steps: ScriptStep[];
  /**
   * Look-only AnimStep recipe (id or inline). Played alongside damage timeline.
   * Prefer this over stuffing pose/trail into ScriptStep.
   */
  anim?: string | AnimStep[];
}

/* ── registry re-exports ───────────────────────────────────── */

export { getTalismanScript, listTalismanScripts };

/* ── volley / cast runtime ─────────────────────────────────── */

interface Bolt {
  style: 'skySword' | 'thunder';
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  damage: number;
  hit: boolean;
  /** thunder telegraph frames before strike */
  telegraph: number;
  color: string;
}

interface ActiveVolley {
  style: 'skySword' | 'thunder' | 'waterPulse';
  remaining: number;
  interval: number;
  timer: number;
  damage: number;
  spread: number;
  radius: number;
  bolts: Bolt[];
  /** waterPulse expanding wave index */
  pulseI: number;
}

interface CastState {
  talismanId: string;
  color: string;
  steps: ScriptStep[];
  index: number;
  wait: number;
  volleys: ActiveVolley[];
  done: boolean;
  params: Record<string, number>;
  /** Optional caster (enemy loadout). Default = player. */
  caster: Fighter | null;
  /** Active pull fields. */
  pulls: Array<{ radius: number; strength: number; left: number }>;
}

function pulseDef(damage: number, opts: Partial<AttackDef> = {}): AttackDef {
  return {
    name: 'talisman',
    startup: 0,
    active: 1,
    recovery: 0,
    box: { x: 0, y: 0, w: 0, h: 0 },
    damage,
    kbX: opts.kbX ?? 4,
    kbY: opts.kbY ?? -3,
    hitstun: opts.hitstun ?? 18,
    hitstop: opts.hitstop ?? 4,
    shake: opts.shake ?? 3,
    heavy: opts.heavy,
    knockdown: opts.knockdown,
  };
}

function casterOf(g: Game, cast: CastState): Fighter {
  return cast.caster && !cast.caster.dead ? cast.caster : g.player;
}

function resolveAt(
  g: Game,
  cast: CastState,
  at: 'caster' | 'ground' | 'boss' | undefined,
  ox = 0,
  oy = 0,
): { x: number; y: number } {
  const c = casterOf(g, cast);
  if (at === 'boss' && g.boss && !g.boss.dead) {
    return { x: g.boss.x + ox, y: g.boss.y - 80 + oy };
  }
  if (at === 'ground') {
    return { x: c.x + ox, y: GROUND_Y + oy };
  }
  return { x: c.x + ox, y: c.y - 40 + oy };
}

function pickVolleyX(g: Game, cast: CastState, spread: number): number {
  const c = casterOf(g, cast);
  // Enemy caster aims at the player; player caster aims at foes.
  if (c.team === 'enemy') {
    const p = g.player;
    if (!p.dead && Math.random() < 0.85) {
      return p.x + rand(-spread * 0.25, spread * 0.25);
    }
    return c.x + c.facing * rand(20, spread * 0.6);
  }
  const foes = g.targets().filter((t) => !t.dead);
  if (foes.length && Math.random() < 0.7) {
    const t = foes[(Math.random() * foes.length) | 0];
    return t.x + rand(-spread * 0.35, spread * 0.35);
  }
  return g.player.x + g.player.facing * rand(20, spread) + rand(-spread * 0.4, spread * 0.4);
}

/* ── player ────────────────────────────────────────────────── */

export class TalismanScriptPlayer {
  private casts: CastState[] = [];

  start(
    g: Game,
    talismanId: string,
    def: {
      name: string;
      color: string;
      scriptId?: string;
      scriptParams?: Record<string, number | string | boolean>;
      timeline?: ScriptStep[];
      anim?: string | AnimStep[];
    },
    caster?: Fighter | null,
  ): void {
    const sid = def.scriptId ?? talismanId;
    const script = getTalismanScript(sid);
    let steps: ScriptStep[] | undefined = def.timeline;
    if (!steps || !steps.length) {
      if (script) steps = script.steps;
    }
    // Look-only anim: TalismanDef.anim overrides script.anim (plays even if timeline empty)
    const animSrc = def.anim ?? script?.anim;
    if (animSrc) {
      g.animScripts.playCastAnim(g, animSrc, def.color, caster ?? null);
    }
    if (!steps || !steps.length) {
      g.showBanner('灵符', def.name, 80);
      const c = caster && !caster.dead ? caster : g.player;
      g.texts.add(def.name, c.x, c.y - 125, def.color, 16);
      return;
    }
    const params: Record<string, number> = {};
    if (def.scriptParams) {
      for (const [k, v] of Object.entries(def.scriptParams)) {
        if (typeof v === 'number') params[k] = v;
      }
    }
    this.casts.push({
      talismanId,
      color: def.color,
      steps: steps.slice(),
      index: 0,
      wait: 0,
      volleys: [],
      done: false,
      params,
      pulls: [],
      caster: caster ?? null,
    });
  }

  /** Play an ad-hoc ScriptStep timeline (skill castFx / one-shots). Optional enemy caster. */
  playSteps(g: Game, steps: ScriptStep[], color = '#e8d0a0', caster?: Fighter | null): void {
    if (!steps.length) return;
    void g;
    this.casts.push({
      talismanId: '_castFx',
      color,
      steps: steps.slice(),
      index: 0,
      wait: 0,
      volleys: [],
      done: false,
      params: {},
      pulls: [],
      caster: caster ?? null,
    });
  }

  update(g: Game): void {
    for (const cast of this.casts) {
      if (cast.done) continue;
      this.tickVolleys(g, cast);
      this.tickPulls(g, cast);
      if (cast.wait > 0) {
        cast.wait--;
        continue;
      }
      while (cast.index < cast.steps.length && cast.wait <= 0) {
        const step = cast.steps[cast.index++];
        this.exec(g, cast, step);
        if (cast.wait > 0) break;
      }
      if (cast.index >= cast.steps.length && cast.volleys.every((v) => v.remaining <= 0 && v.bolts.length === 0 && (v.style !== 'waterPulse' || v.pulseI >= 3))) {
        cast.done = true;
      }
    }
    this.casts = this.casts.filter((c) => !c.done);
  }

  private num(cast: CastState, base: number, key?: string): number {
    if (key && cast.params[key] !== undefined) return cast.params[key];
    const mul = cast.params.damageMul;
    if (key === 'damage' && mul !== undefined) return Math.round(base * mul);
    return base;
  }

  private exec(g: Game, cast: CastState, step: ScriptStep): void {
    const color = cast.color;
    switch (step.kind) {
      case 'wait':
        cast.wait = Math.max(0, step.frames | 0);
        break;
      case 'banner':
        g.showBanner(step.text, step.sub ?? '', step.dur ?? 80);
        break;
      case 'float': {
        if (step.where === 'eachElite') {
          for (const e of g.enemies) {
            if (e.dead || !e.eliteMod) continue;
            g.texts.add(step.text, e.x, e.y - 110, step.color ?? color, step.size ?? 14, step.bold);
          }
        } else if (step.where === 'boss' && g.boss && !g.boss.dead) {
          g.texts.add(step.text, g.boss.x, g.boss.y - 170, step.color ?? color, step.size ?? 18, step.bold);
        } else {
          const c = casterOf(g, cast);
          g.texts.add(step.text, c.x, c.y - 125, step.color ?? color, step.size ?? 16, step.bold);
        }
        break;
      }
      case 'fx': {
        const pt = resolveAt(g, cast, step.at, step.ox, step.oy);
        const cFace = casterOf(g, cast).facing;
        const recipe = step.recipeId ? getFxRecipe(step.recipeId) : undefined;
        const preset = (recipe?.emitter ?? step.preset) as FxPreset | undefined;
        if (!preset) break; // soft-skip missing recipe/preset
        const c = step.color ?? recipe?.color ?? color;
        const size = step.size ?? recipe?.size;
        const life = step.life ?? recipe?.life;
        const n = step.n ?? recipe?.n;
        const heavy = step.heavy ?? recipe?.heavy;
        switch (preset) {
          case 'flare':
            g.fx.flare(pt.x, pt.y, size ?? 70, c, life ?? 16);
            break;
          case 'ring':
            g.fx.ring(pt.x, pt.y, size ?? 50, c, life ?? 18);
            break;
          case 'spark':
            g.fx.hitSpark(pt.x, pt.y, cFace, !!heavy, c);
            break;
          case 'qi':
            for (let i = 0; i < (n ?? 6); i++) {
              g.fx.spawn({
                kind: 'qi',
                x: pt.x + rand(-20, 20),
                y: pt.y + rand(-20, 20),
                vx: rand(-2, 2),
                vy: rand(-3, -0.5),
                life: life ?? 20,
                size: size ?? 10,
                color: c,
                add: true,
                drag: 0.94,
              });
            }
            break;
          case 'fire':
            g.fx.fire(pt.x, pt.y, n ?? 8, size ?? 10);
            break;
          case 'dust':
            g.fx.dust(pt.x, GROUND_Y, n ?? 10, cFace);
            break;
          case 'swordQi':
            g.fx.swordQi(pt.x, pt.y, cFace, !!heavy);
            break;
        }
        break;
      }
      case 'shake':
        g.cam.shake(step.amp, step.frames);
        break;
      case 'hitstop':
        g.hitstop = Math.max(g.hitstop, step.frames | 0);
        break;
      case 'flash':
        g.flashScreen(step.color, step.a);
        break;
      case 'sfx': {
        // R4a: file buffer → synth → historical raw → soft-skip
        playCatalogSfx(g.audio, step.id);
        break;
      }
      case 'damageRadius': {
        const dmg = this.num(cast, step.damage, 'damage');
        const ox = step.ox ?? 0;
        const oy = step.oy ?? -30;
        const src = casterOf(g, cast);
        g.areaHit(
          src,
          src.x + ox,
          src.y + oy,
          step.rx,
          step.ry ?? step.rx * 0.65,
          pulseDef(dmg, {
            kbX: step.kbX,
            kbY: step.kbY,
            hitstun: step.hitstun,
            hitstop: step.hitstop,
            shake: step.shake,
            heavy: step.heavy,
          }),
        );
        break;
      }
      case 'damageCone': {
        const dmg = this.num(cast, step.damage, 'damage');
        const src = casterOf(g, cast);
        const dir = src.facing;
        const reach = step.reach;
        g.areaHit(
          src,
          src.x + dir * (reach * 0.45),
          src.y - 40,
          reach * 0.55,
          step.halfH,
          pulseDef(dmg, {
            kbX: step.kbX ?? 5,
            kbY: step.kbY ?? -3,
            hitstun: step.hitstun ?? 20,
            heavy: step.heavy,
          }),
        );
        break;
      }
      case 'spawnVolley': {
        const dmg = this.num(cast, step.damage, 'damage');
        const vdef = step.volleyId ? getVolley(step.volleyId) : (step.style ? getVolley(step.style) : undefined);
        const style = (vdef?.style ?? step.style) as 'skySword' | 'thunder' | 'waterPulse' | undefined;
        if (!style) break; // soft-skip
        cast.volleys.push({
          style,
          remaining: step.count || vdef?.defaultCount || 1,
          interval: Math.max(1, (step.interval | 0) || vdef?.defaultInterval || 8),
          timer: 0,
          damage: dmg,
          spread: step.spread ?? vdef?.defaultSpread ?? 220,
          radius: step.radius ?? vdef?.defaultRadius ?? 70,
          bolts: [],
          pulseI: 0,
        });
        break;
      }
      case 'knockback': {
        const src = casterOf(g, cast);
        const list = src.team === 'player' ? g.targets() : [g.player];
        for (const t of list) {
          if (t.dead) continue;
          const dx = t.x - src.x;
          if (Math.abs(dx) > step.r) continue;
          const dir = dx >= 0 ? 1 : -1;
          t.body.vx += dir * step.kbX;
          t.body.vy += step.kbY;
        }
        break;
      }
      case 'status':
        this.applyStatus(g, cast, step);
        break;
      case 'damageBox': {
        const dmg = this.num(cast, step.damage, 'damage');
        const src = casterOf(g, cast);
        const dir = src.facing;
        const ox = (step.ox ?? 40) * dir;
        const oy = step.oy ?? -40;
        const hw = Math.max(4, Math.min(400, step.w)) / 2;
        const hh = Math.max(4, Math.min(400, step.h)) / 2;
        g.areaHit(
          src,
          src.x + ox,
          src.y + oy,
          hw,
          hh,
          pulseDef(dmg, {
            kbX: step.kbX, kbY: step.kbY, hitstun: step.hitstun,
            hitstop: step.hitstop, shake: step.shake, heavy: step.heavy,
          }),
        );
        break;
      }
      case 'damageDonut': {
        const dmg = this.num(cast, step.damage, 'damage');
        const src = casterOf(g, cast);
        const rIn = Math.max(0, Math.min(600, step.rInner));
        const rOut = Math.max(rIn + 1, Math.min(800, step.rOuter));
        const list = src.team === 'player' ? g.targets() : [g.player];
        for (const t of list) {
          if (t.dead) continue;
          const dx = t.x - src.x;
          const dy = (t.y - 40) - (src.y - 40);
          const d = Math.hypot(dx, dy);
          if (d < rIn || d > rOut) continue;
          const hb = t.hurtbox();
          const pt = hb ? { x: hb.x + hb.w / 2, y: hb.y + hb.h / 2 } : { x: t.x, y: t.y - 40 };
          g.applyHitTo(src, t, pulseDef(dmg, {
            kbX: step.kbX ?? 4, kbY: step.kbY ?? -2, hitstun: step.hitstun ?? 16, heavy: step.heavy,
          }), pt);
        }
        break;
      }
      case 'zone': {
        const src = casterOf(g, cast);
        const ox = step.ox ?? 0;
        const oy = step.oy ?? 0;
        const r = step.shape === 'circle'
          ? Math.max(8, Math.min(300, step.radius ?? 60))
          : Math.max(8, Math.min(300, ((step.w ?? 80) + (step.h ?? 50)) / 2));
        g.hazards.push({
          x: src.x + ox,
          y: GROUND_Y + oy,
          r,
          ttl: Math.max(1, Math.min(60 * 20, step.duration | 0)),
          tick: 0,
          color: step.color ?? cast.color,
          label: step.status === 'root' ? '定身' : step.status === 'slow' ? '迟滞' : step.status === 'burn' ? '灼域' : '符域',
          dmg: Math.max(0, step.tickDamage ?? 0),
          period: 24,
        });
        break;
      }
      case 'pull': {
        cast.pulls.push({
          radius: Math.max(10, Math.min(500, step.radius)),
          strength: Math.max(0.1, Math.min(12, step.strength)),
          left: Math.max(1, Math.min(180, step.frames ?? 20)),
        });
        break;
      }
      case 'root': {
        const src = casterOf(g, cast);
        const r = Math.max(10, Math.min(400, step.radius ?? 120));
        const dur = Math.max(1, Math.min(300, step.duration | 0));
        const list = src.team === 'player' ? g.targets() : [g.player];
        for (const t of list) {
          if (t.dead) continue;
          if (Math.abs(t.x - src.x) > r) continue;
          t.hitstun = Math.max(t.hitstun, dur);
          t.body.vx = 0;
          g.texts.add('定身', t.x, t.y - 100, cast.color, 12);
        }
        break;
      }
      case 'multihit': {
        const times = Math.max(1, Math.min(12, step.times | 0));
        const gap = Math.max(0, Math.min(60, step.gapFrames | 0));
        const nested = step.step;
        const insert: ScriptStep[] = [];
        for (let i = 0; i < times; i++) {
          insert.push(nested);
          if (i < times - 1 && gap > 0) insert.push({ kind: 'wait', frames: gap });
        }
        cast.steps.splice(cast.index, 0, ...insert);
        break;
      }
    }
  }

  private tickPulls(g: Game, cast: CastState): void {
    if (!cast.pulls.length) return;
    const src = casterOf(g, cast);
    for (const pull of cast.pulls) {
      if (pull.left <= 0) continue;
      pull.left--;
      const list = src.team === 'player' ? g.targets() : [g.player];
      for (const t of list) {
        if (t.dead) continue;
        const dx = src.x - t.x;
        if (Math.abs(dx) > pull.radius) continue;
        const dir = dx === 0 ? 0 : (dx > 0 ? 1 : -1);
        t.body.vx += dir * pull.strength * 0.35;
      }
    }
    cast.pulls = cast.pulls.filter((p) => p.left > 0);
  }

  private applyStatus(
    g: Game,
    cast: CastState,
    step: Extract<ScriptStep, { kind: 'status' }>,
  ): void {
    const color = cast.color;
    const src = casterOf(g, cast);
    // Enemy caster: only self heal/invuln; skip player-buff / elite-punish status.
    if (src.team === 'enemy') {
      if (step.heal) {
        const heal = Math.min(step.heal, src.maxHp - src.hp);
        src.hp += heal;
        if (heal > 0) g.texts.add(`+${heal}`, src.x, src.y - 110, color, 14);
      }
      if (step.invuln) src.invuln = Math.max(src.invuln, step.invuln);
      return;
    }
    const p = g.player;
    if (step.clearHazards) g.hazards = [];
    if (step.affixSuppress) {
      g.affixSuppressT = Math.max(g.affixSuppressT, step.affixSuppress);
    }
    if (step.eliteSuppress) {
      g.eliteSuppressT = Math.max(g.eliteSuppressT, step.eliteSuppress);
    }
    if (step.clearControl) {
      p.exhaustT = 0;
      p.armorBreakT = 0;
      p.clashStunT = 0;
      if (p.state === 'hurt' || p.state === 'down') {
        p.setState(p.body.onGround ? 'idle' : 'air');
        p.hitstun = 0;
      }
    }
    if (step.invuln) p.invuln = Math.max(p.invuln, step.invuln);
    if (step.stamina) p.stamina = Math.min(p.maxStamina, p.stamina + step.stamina);
    if (step.heal) {
      const heal = Math.min(step.heal, p.maxHp - p.hp);
      p.hp += heal;
    }
    if (step.hushen) p.hushenT = Math.max(p.hushenT, step.hushen);
    if (step.floatEachElite) {
      for (const e of g.enemies) {
        if (e.dead || !e.eliteMod) continue;
        g.texts.add(step.floatEachElite, e.x, e.y - 110, color, 14);
      }
    }
    if (step.poshi) {
      if (g.boss && !g.boss.dead) {
        const b = g.boss;
        b.poise = Math.max(0, b.poise - b.poiseMax * 0.45);
        g.texts.add('破势', b.x, b.y - 170, color, 22, true);
        if (b.poise <= 0 && b.state !== 'dying' && b.state !== 'stagger') {
          b.atk = null;
          b.setState('stagger');
          b.poise = b.poiseMax;
          g.texts.add('架势崩裂!', b.x, b.y - 200, '#ffd27a', 28, true);
          g.slowmo(0.35, 28);
        }
      }
      for (const e of g.enemies) {
        if (e.dead || !e.eliteMod) continue;
        e.atk = null;
        if (e.hasElitePoise) {
          e.poise = 0;
          e.setState('stagger');
          e.poise = e.poiseMax * 0.35;
        } else {
          e.setState('hitstun');
          e.hitstun = 36;
        }
        g.texts.add('破势', e.x, e.y - 110, color, 14);
      }
    }
    if (step.root) {
      const r = step.rootRadius ?? 140;
      const dur = step.root | 0;
      for (const e of g.enemies) {
        if (e.dead) continue;
        if (Math.abs(e.x - p.x) > r) continue;
        e.hitstun = Math.max(e.hitstun, dur);
        e.body.vx = 0;
      }
      if (g.boss && !g.boss.dead && Math.abs(g.boss.x - p.x) <= r) {
        g.boss.hitstun = Math.max(g.boss.hitstun, Math.floor(dur * 0.5));
      }
    }
    if (step.dingshen) {
      g.eliteSuppressT = Math.max(g.eliteSuppressT, step.dingshen);
      for (const e of g.enemies) {
        if (e.dead || !e.eliteMod) continue;
        e.atk = null;
        e.setState('hitstun');
        e.hitstun = Math.max(e.hitstun, 70);
        g.texts.add('定身', e.x, e.y - 110, color, 14);
      }
      if (g.boss && !g.boss.dead) {
        const b = g.boss;
        if (b.state !== 'dying' && b.state !== 'stagger') {
          b.atk = null;
          g.texts.add('定身', b.x, b.y - 170, color, 18);
        }
      }
    }
    if (step.anhun) {
      g.affixBellWeak = true;
      g.bellStrikeT = Math.max(g.bellStrikeT, step.anhun);
      g.eliteSuppressT = Math.max(g.eliteSuppressT, 60 * 5);
    }
  }

  private tickVolleys(g: Game, cast: CastState): void {
    for (const v of cast.volleys) {
      if (v.timer > 0) v.timer--;
      if (v.style === 'waterPulse') {
        if (v.remaining > 0 && v.timer <= 0) {
          const i = v.pulseI;
          const r = v.radius * (0.55 + i * 0.45);
          const src = casterOf(g, cast);
          const cx = src.x;
          const cy = GROUND_Y - 20;
          g.fx.ring(cx, cy, r, cast.color, 22);
          g.fx.ring(cx, cy, r * 0.7, '#a0d8ff', 16);
          g.fx.flare(cx, cy - 10, 40 + i * 20, '#70c8ff', 12);
          g.fx.dust(cx, GROUND_Y, 8 + i * 3, src.facing);
          g.areaHit(
            src,
            cx,
            cy,
            r,
            r * 0.45,
            pulseDef(Math.round(v.damage * (1 - i * 0.12)), {
              kbX: 6 + i * 2,
              kbY: -4 - i,
              hitstun: 22,
              hitstop: 5,
              shake: 4,
              heavy: i === 0,
              knockdown: i >= 2,
            }),
          );
          g.cam.shake(3 + i, 8);
          playSfx(g.audio, i === 0 ? 'wave' : 'boom');
          v.pulseI++;
          v.remaining--;
          v.timer = v.interval;
        }
        continue;
      }
      // skySword / thunder spawn
      if (v.remaining > 0 && v.timer <= 0) {
        const x = pickVolleyX(g, cast, v.spread);
        if (v.style === 'skySword') {
          v.bolts.push({
            style: 'skySword',
            x,
            y: GROUND_Y - 320 - rand(0, 40),
            vx: rand(-0.6, 0.6),
            vy: 14 + rand(0, 4),
            life: 40,
            damage: v.damage,
            hit: false,
            telegraph: 0,
            color: cast.color,
          });
          playSfx(g.audio, 'slash');
        } else {
          v.bolts.push({
            style: 'thunder',
            x,
            y: GROUND_Y - 40,
            vx: 0,
            vy: 0,
            life: 28,
            damage: v.damage,
            hit: false,
            telegraph: 8,
            color: cast.color,
          });
          g.fx.flare(x, GROUND_Y - 40, 30, '#ffe080', 10);
          playSfx(g.audio, 'telegraph');
        }
        v.remaining--;
        v.timer = v.interval;
      }
      for (let i = v.bolts.length - 1; i >= 0; i--) {
        const b = v.bolts[i];
        if (b.style === 'skySword') {
          b.x += b.vx;
          b.y += b.vy;
          b.life--;
          if (b.life % 2 === 0) {
            g.fx.spawn({
              kind: 'spark',
              x: b.x,
              y: b.y,
              vx: rand(-1, 1),
              vy: rand(-1, 1),
              life: 8,
              size: 2,
              color: b.color,
              add: true,
              drag: 0.9,
            });
          }
          g.fx.slashLine(b.x - 2, b.y - 18, b.x + 2, b.y + 10, '#e8f0ff', 4, 2);
          if (!b.hit && b.y >= GROUND_Y - 50) {
            b.hit = true;
            g.fx.flare(b.x, GROUND_Y - 30, 50, b.color, 12);
            g.fx.ring(b.x, GROUND_Y - 20, 36, '#c8e0ff', 12);
            g.fx.swordQi(b.x, GROUND_Y - 50, casterOf(g, cast).facing, false);
            g.areaHit(
              casterOf(g, cast),
              b.x,
              GROUND_Y - 40,
              42,
              50,
              pulseDef(b.damage, { kbX: 3, kbY: -5, hitstun: 16, hitstop: 3, shake: 2 }),
            );
            playSfx(g.audio, 'hit');
            g.cam.shake(2, 4);
            b.life = Math.min(b.life, 4);
          }
        } else {
          // thunder
          if (b.telegraph > 0) {
            b.telegraph--;
            g.fx.flare(b.x, GROUND_Y - 30, 18 + (8 - b.telegraph) * 3, '#fff0a0', 4);
            continue;
          }
          if (!b.hit) {
            b.hit = true;
            g.fx.slashLine(b.x, GROUND_Y - 280, b.x, GROUND_Y - 10, '#fff8c0', 10, 5);
            g.fx.slashLine(b.x - 6, GROUND_Y - 260, b.x + 4, GROUND_Y - 20, '#80c0ff', 8, 3);
            g.fx.flare(b.x, GROUND_Y - 40, 90, '#ffe060', 16);
            g.fx.ring(b.x, GROUND_Y - 20, 55, '#a0d0ff', 14);
            g.fx.fire(b.x, GROUND_Y - 40, 6, 8);
            g.flashScreen('#e8f0ff', 0.25);
            g.areaHit(
              casterOf(g, cast),
              b.x,
              GROUND_Y - 50,
              55,
              70,
              pulseDef(b.damage, {
                kbX: 2,
                kbY: -6,
                hitstun: 28,
                hitstop: 6,
                shake: 5,
                heavy: true,
              }),
            );
            g.hitstop = Math.max(g.hitstop, 5);
            g.cam.shake(5, 10);
            playSfx(g.audio, 'boom');
            b.life = 6;
          } else {
            b.life--;
          }
        }
        if (b.life <= 0) v.bolts.splice(i, 1);
      }
    }
    cast.volleys = cast.volleys.filter(
      (v) => v.remaining > 0 || v.bolts.length > 0 || (v.style === 'waterPulse' && v.pulseI < 3 && v.remaining > 0),
    );
  }
}

/* ── built-in scripts ──────────────────────────────────────── */
/* Oc5: CORE_SCRIPTS 字面量仅在 content/changye/seeds；本文件不再 re-export。 */

/** Live catalog (ctx.talismans scripts). */
export const TALISMAN_SCRIPTS: TalismanScriptDef[] = listTalismanScripts();
