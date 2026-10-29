/**
 * BehaviorStep interpreter — data-driven enemy AI from BehaviorDef.steps.
 * Plugins only compose whitelist steps; core executes. No plugin JS.
 * Unknown kinds soft-skip at tick (register-time Schema still rejects).
 */
import type { Game } from '../../game';
import type { AttackDef } from '../../combat/types';
import { getAttackBox, getProjectile, getEnemy, resolveProjectileAttackKey } from '../../meta/contentRegistry';
import type { BehaviorStep } from '../../meta/bTier/types';
import { Projectile } from '../projectile';
import { playSfx } from '../../audio/sfx';
import { tickEnemyLoadoutTimers, tryCastEnemyLoadout } from './loadout';
import { makeEnemy } from './factory';
import type { Enemy } from './enemy';

const warned = new Set<string>();
function warnOnce(key: string, msg: string): void {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[behavior] ${msg}`);
}

export interface BehaviorRuntime {
  /** Per-step-index cooldown. */
  stepCd: Record<number, number>;
  retreatT: number;
  chargeLeft: number;
  chargeSpeed: number;
  aimLeft: number;
  aimProjId: string;
  aimCd: number;
  blockLeft: number;
  paceDir: 1 | -1;
  paceT: number;
  /** Active phase tag (phaseAtHp / phaseGate). */
  phase: string;
  dodgeLeft: number;
  dodgeVx: number;
  strafeSign: 1 | -1;
  flankT: number;
  comboI: number;
  comboKeys: string[];
  comboGap: number;
  comboWait: number;
  burstLeft: number;
  burstVx: number;
  callAllyCd: number;
  alliesSpawned: number;
}

export function createBehaviorRuntime(): BehaviorRuntime {
  return {
    stepCd: {},
    retreatT: 0,
    chargeLeft: 0,
    chargeSpeed: 6,
    aimLeft: 0,
    aimProjId: 'arrow',
    aimCd: 70,
    blockLeft: 0,
    paceDir: 1,
    paceT: 0,
    phase: '',
    dodgeLeft: 0,
    dodgeVx: 0,
    strafeSign: 1,
    flankT: 0,
    comboI: -1,
    comboKeys: [],
    comboGap: 8,
    comboWait: 0,
    burstLeft: 0,
    burstVx: 0,
    callAllyCd: 0,
    alliesSpawned: 0,
  };
}

/** Body → default catalog id when meleeAttack omits attackKey (A1). */
const DEFAULT_ATTACK_BY_BODY: Record<string, string> = {
  spear: 'thrust',
  axe: 'axeChop',
  shield: 'bash',
  archer: 'whip',
};

/** A1: only getAttackBox; missing → soft-skip (no BUILTIN_BODY_ATTACKS fallback). */
function resolveAttack(key: string | undefined, body: string): AttackDef | null {
  const id = key || DEFAULT_ATTACK_BY_BODY[body] || 'axeChop';
  const box = getAttackBox(id);
  if (box) return box;
  warnOnce(`atk:${id}`, `meleeAttack.attackKey「${id}」不在攻击盒目录，已跳过`);
  return null;
}

type ActionCand =
  | { kind: 'melee'; i: number; step: Extract<BehaviorStep, { kind: 'meleeAttack' }>; w: number }
  | { kind: 'ranged'; i: number; step: Extract<BehaviorStep, { kind: 'rangedAttack' }>; w: number }
  | { kind: 'block'; i: number; step: Extract<BehaviorStep, { kind: 'block' }>; w: number }
  | { kind: 'charge'; i: number; step: Extract<BehaviorStep, { kind: 'charge' }>; w: number }
  | { kind: 'loadout'; i: number; step: Extract<BehaviorStep, { kind: 'useLoadout' }>; w: number }
  | { kind: 'dodge'; i: number; step: Extract<BehaviorStep, { kind: 'dodge' }>; w: number }
  | { kind: 'circleStrafe'; i: number; step: Extract<BehaviorStep, { kind: 'circleStrafe' }>; w: number }
  | { kind: 'flank'; i: number; step: Extract<BehaviorStep, { kind: 'flank' }>; w: number }
  | { kind: 'callAlly'; i: number; step: Extract<BehaviorStep, { kind: 'callAlly' }>; w: number }
  | { kind: 'comboChain'; i: number; step: Extract<BehaviorStep, { kind: 'comboChain' }>; w: number }
  | { kind: 'retreatBurst'; i: number; step: Extract<BehaviorStep, { kind: 'retreatBurst' }>; w: number }
  | { kind: 'taunt'; i: number; step: Extract<BehaviorStep, { kind: 'taunt' }>; w: number }
  | { kind: 'idleEmote'; i: number; step: Extract<BehaviorStep, { kind: 'idleEmote' }>; w: number };

function effectiveSteps(steps: BehaviorStep[], phase: string): BehaviorStep[] {
  const out: BehaviorStep[] = [];
  for (const s of steps) {
    if (s.kind === 'phaseGate') {
      if (s.phase === phase && s.steps?.length) {
        for (const nested of s.steps) out.push(nested);
      }
      continue;
    }
    out.push(s);
  }
  return out;
}

/**
 * Run one AI tick for an enemy with BehaviorDef.steps.
 */
export function tickBehaviorSteps(g: Game, e: Enemy): void {
  const rawSteps = e.behaviorSteps;
  if (!rawSteps?.length) return;
  let rt = e.behaviorRt;
  if (!rt) {
    rt = createBehaviorRuntime();
    e.behaviorRt = rt;
  }

  tickEnemyLoadoutTimers(g, e);

  const b = e.body;
  const p = g.player;
  const dist = Math.abs(p.x - e.x);
  const hpRatio = e.maxHp > 0 ? e.hp / e.maxHp : 1;

  if (e.cooldown > 0) e.cooldown--;
  for (const k of Object.keys(rt.stepCd)) {
    if (rt.stepCd[+k]! > 0) rt.stepCd[+k]!--;
  }
  if (rt.retreatT > 0) rt.retreatT--;
  if (rt.callAllyCd > 0) rt.callAllyCd--;

  // phaseAtHp — continuous scanners (also scan gated nests lightly)
  for (const s of rawSteps) {
    if (s.kind === 'phaseAtHp') {
      const below = Math.max(0, Math.min(1, s.below));
      if (hpRatio <= below && rt.phase !== s.setPhase) {
        rt.phase = s.setPhase;
        g.texts.add(s.setPhase, e.x, e.y - 120, '#e8d0a0', 14);
      }
    }
  }

  const steps = effectiveSteps(rawSteps, rt.phase);

  let face = false;
  let keep: Extract<BehaviorStep, { kind: 'keepDistance' }> | null = null;
  let pace: Extract<BehaviorStep, { kind: 'idlePace' }> | null = null;
  for (const s of steps) {
    if (s.kind === 'facePlayer') face = true;
    else if (s.kind === 'keepDistance') keep = s;
    else if (s.kind === 'idlePace') pace = s;
    else if (!BEHAVIOR_KINDS.has(s.kind)) {
      warnOnce(`kind:${(s as { kind: string }).kind}`, `未知 BehaviorStep kind「${(s as { kind: string }).kind}」，已跳过`);
    }
  }
  if (face || keep || pace) e.faceToward(p.x);

  if (e.state === 'attack') return;

  // Combo chain continuation
  if (rt.comboI >= 0) {
    if (rt.comboWait > 0) {
      rt.comboWait--;
      b.vx *= 0.85;
      return;
    }
    if (rt.comboI < rt.comboKeys.length) {
      const key = rt.comboKeys[rt.comboI]!;
      const atk = resolveAttack(key, e.kind);
      rt.comboI++;
      if (atk) {
        e.faceToward(p.x);
        e.startAttack(atk);
        rt.comboWait = rt.comboGap;
        return;
      }
    }
    rt.comboI = -1;
    rt.comboKeys = [];
  }

  if (rt.dodgeLeft > 0) {
    e.setState('walk');
    b.vx = rt.dodgeVx;
    e.walkPhase += 0.22;
    rt.dodgeLeft--;
    if (rt.dodgeLeft <= 0) {
      e.setState('idle');
      e.cooldown = Math.max(e.cooldown, 18);
    }
    return;
  }

  if (rt.burstLeft > 0) {
    e.setState('retreat');
    b.vx = rt.burstVx;
    e.walkPhase += 0.2;
    rt.burstLeft--;
    if (rt.burstLeft <= 0) {
      rt.retreatT = 30;
      e.setState('idle');
    }
    return;
  }

  if (rt.chargeLeft > 0) {
    e.state = e.kind === 'shield' ? 'charge' : 'walk';
    b.vx = e.facing * rt.chargeSpeed;
    e.walkPhase += 0.18;
    if (e.t % 3 === 0) g.fx.dust(e.x - e.facing * 10, e.y, 1, -e.facing);
    rt.chargeLeft--;
    if (rt.chargeLeft <= 0) {
      e.atk = null;
      e.setState('idle');
      e.cooldown = Math.max(e.cooldown, 28);
    }
    return;
  }

  if (rt.aimLeft > 0) {
    e.state = 'aim';
    b.vx = 0;
    e.faceToward(p.x);
    if (rt.aimLeft === 18) {
      const sx = e.x + e.facing * 20;
      const sy = e.y - 58;
      const ty = p.y - 44;
      const speed = 8.5;
      const vx = e.facing * speed;
      const time = Math.max(10, Math.abs(p.x - sx) / speed);
      const vy = Math.max(-1.5, Math.min(1.5, (ty - sy) / time));
      const projId = rt.aimProjId;
      const projDef = getProjectile(projId);
      if (!projDef && projId !== 'arrow' && projId !== 'fireball') {
        warnOnce(`proj:${projId}`, `rangedAttack.projectileId「${projId}」不在目录，已用 arrow`);
      }
      const kind = projDef ? projId : (projId === 'fireball' ? 'fireball' : 'arrow');
      // ArrowProj1/3: soft attackKey — fireball→gFire, else arrow (CORE fireball 显式 gFire)
      const atkKey = resolveProjectileAttackKey(projDef, kind);
      const arrowAtk = getAttackBox(atkKey);
      if (!arrowAtk) {
        warnOnce(`atk:${atkKey}`, `rangedAttack：攻击盒「${atkKey}」不在目录，已跳过放箭`);
      } else {
        g.projectiles.push(new Projectile(kind, sx, sy, vx, vy, 'enemy', arrowAtk));
        playSfx(g.audio, kind === 'fireball' ? 'fire' : 'arrow');
      }
    }
    rt.aimLeft--;
    if (rt.aimLeft <= 0) {
      e.setState('idle');
      e.cooldown = Math.max(e.cooldown, rt.aimCd);
    }
    return;
  }

  if (rt.blockLeft > 0) {
    e.state = 'idle';
    b.vx *= 0.8;
    e.faceToward(p.x);
    rt.blockLeft--;
    if (rt.blockLeft <= 0) e.cooldown = Math.max(e.cooldown, 20);
    return;
  }

  if (e.state === 'retreat') {
    e.faceToward(p.x);
    const spd = keep?.retreatSpeed ?? 2.4;
    b.vx = -e.facing * spd;
    e.walkPhase += 0.16;
    if (e.t === 1) playSfx(g.audio, 'dash');
    const idealMin = keep?.idealMin ?? 100;
    if (e.t >= 22 || dist >= idealMin + 10) {
      rt.retreatT = 40;
      e.setState('idle');
    }
    return;
  }

  if (p.dead) {
    b.vx *= 0.85;
    e.setState('idle');
    return;
  }

  // Continuous circleStrafe / flank locomotion when selected as sticky helpers
  let strafing = false;
  for (const s of steps) {
    if (s.kind === 'circleStrafe' && dist > 40 && dist < (s.radius ?? 140) * 1.4) {
      // mild continuous bias; opportunistic action still picks weight
      if (Math.random() < 0.35) {
        if (rt.paceT <= 0) {
          rt.strafeSign = Math.random() < 0.5 ? 1 : -1;
          rt.paceT = 28;
        }
        rt.paceT--;
        e.setState('walk');
        e.faceToward(p.x);
        const spd = s.speed ?? 1.4;
        b.vx = rt.strafeSign * spd;
        // keep ring distance
        if (dist < (s.radius ?? 120) * 0.85) b.vx += -e.facing * 0.6;
        if (dist > (s.radius ?? 120) * 1.15) b.vx += e.facing * 0.6;
        e.walkPhase += 0.12;
        strafing = true;
      }
    }
  }
  if (rt.flankT > 0) {
    rt.flankT--;
    e.setState('walk');
    const behind = p.x + (p.facing > 0 ? -1 : 1) * 70;
    const dir = behind > e.x ? 1 : -1;
    b.vx = dir * 1.6;
    e.faceToward(p.x);
    e.walkPhase += 0.14;
    strafing = true;
  }

  if (!strafing) {
    if (keep) {
      const tooClose = keep.idealMin * 0.72;
      if (dist < tooClose && rt.retreatT <= 0) {
        e.setState('retreat');
        return;
      }
      if (dist > keep.idealMax && dist < keep.chase) {
        e.setState('walk');
        b.vx = e.facing * 1.25;
        e.walkPhase += 0.13;
      } else if (dist > keep.chase) {
        e.setState('walk');
        b.vx = e.facing * 1.35;
        e.walkPhase += 0.14;
      } else if (dist < keep.idealMin) {
        e.setState('idle');
        b.vx = -e.facing * 0.9;
      } else {
        e.setState('idle');
        b.vx *= 0.82;
      }
    } else if (pace) {
      if (rt.paceT <= 0) {
        rt.paceDir = Math.random() < 0.5 ? 1 : -1;
        rt.paceT = 40 + ((Math.random() * 40) | 0);
      }
      rt.paceT--;
      e.setState('walk');
      b.vx = rt.paceDir * (pace.speed ?? 0.9);
      e.walkPhase += 0.1;
    } else {
      if (e.state === 'walk' || e.state === 'idle') {
        b.vx *= 0.82;
        if (Math.abs(b.vx) < 0.2) e.setState('idle');
      } else {
        e.setState('idle');
      }
    }
  }

  if (e.cooldown > 0) return;
  if (!g.attackToken(e)) return;

  // Map raw index → step for CD; candidates use rawSteps indices when possible
  const cands: ActionCand[] = [];
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i]!;
    // Approximate CD key by kind+i (gated nests share list)
    const cdKey = i;
    if ((rt.stepCd[cdKey] ?? 0) > 0) continue;
    switch (s.kind) {
      case 'meleeAttack': {
        const minR = s.rangeMin ?? 0;
        if (dist < minR || dist > s.rangeMax) break;
        cands.push({ kind: 'melee', i: cdKey, step: s, w: Math.max(0.01, s.weight ?? 1) });
        break;
      }
      case 'rangedAttack': {
        if (dist < s.rangeMin || dist > s.rangeMax) break;
        cands.push({ kind: 'ranged', i: cdKey, step: s, w: Math.max(0.01, s.weight ?? 1) });
        break;
      }
      case 'block': {
        if (e.kind !== 'shield') {
          warnOnce('block-noshield', 'block 步骤仅 shield body 有效，其它机体已软跳过');
          break;
        }
        cands.push({ kind: 'block', i: cdKey, step: s, w: Math.max(0.01, s.weight ?? 1) });
        break;
      }
      case 'charge': {
        const minR = s.rangeMin ?? 40;
        const maxR = s.rangeMax ?? 280;
        if (dist < minR || dist > maxR) break;
        cands.push({ kind: 'charge', i: cdKey, step: s, w: Math.max(0.01, s.weight ?? 1) });
        break;
      }
      case 'useLoadout': {
        cands.push({ kind: 'loadout', i: cdKey, step: s, w: Math.max(0.01, s.weight ?? 1) });
        break;
      }
      case 'dodge': {
        const maxR = s.range ?? 120;
        if (dist > maxR) break;
        cands.push({ kind: 'dodge', i: cdKey, step: s, w: Math.max(0.01, s.weight ?? 1) });
        break;
      }
      case 'circleStrafe': {
        cands.push({ kind: 'circleStrafe', i: cdKey, step: s, w: Math.max(0.01, s.weight ?? 0.6) });
        break;
      }
      case 'flank': {
        cands.push({ kind: 'flank', i: cdKey, step: s, w: Math.max(0.01, s.weight ?? 1) });
        break;
      }
      case 'callAlly': {
        if (rt.callAllyCd > 0) break;
        const max = s.max ?? 2;
        if (rt.alliesSpawned >= max) break;
        cands.push({ kind: 'callAlly', i: cdKey, step: s, w: Math.max(0.01, s.weight ?? 0.8) });
        break;
      }
      case 'comboChain': {
        const minR = s.rangeMin ?? 0;
        const maxR = s.rangeMax ?? 160;
        if (dist < minR || dist > maxR) break;
        if (!s.attackKeys?.length) break;
        cands.push({ kind: 'comboChain', i: cdKey, step: s, w: Math.max(0.01, s.weight ?? 1.2) });
        break;
      }
      case 'retreatBurst': {
        cands.push({ kind: 'retreatBurst', i: cdKey, step: s, w: Math.max(0.01, s.weight ?? 0.7) });
        break;
      }
      case 'taunt': {
        cands.push({ kind: 'taunt', i: cdKey, step: s, w: Math.max(0.01, s.weight ?? 0.4) });
        break;
      }
      case 'idleEmote': {
        cands.push({ kind: 'idleEmote', i: cdKey, step: s, w: Math.max(0.01, s.weight ?? 0.3) });
        break;
      }
      default:
        break;
    }
  }
  if (!cands.length) return;

  let total = 0;
  for (const c of cands) total += c.w;
  let r = Math.random() * total;
  let pick = cands[cands.length - 1]!;
  for (const c of cands) {
    r -= c.w;
    if (r <= 0) { pick = c; break; }
  }

  switch (pick.kind) {
    case 'melee': {
      const atk = resolveAttack(pick.step.attackKey, e.kind);
      if (!atk) {
        rt.stepCd[pick.i] = 9999;
        return;
      }
      e.faceToward(p.x);
      e.startAttack(atk);
      const cd = pick.step.cooldown ?? 50;
      rt.stepCd[pick.i] = cd;
      e.cooldown = Math.max(e.cooldown, cd);
      return;
    }
    case 'ranged': {
      const aim = pick.step.aimFrames ?? 38;
      rt.aimLeft = aim + 18;
      rt.aimProjId = pick.step.projectileId ?? 'arrow';
      rt.aimCd = pick.step.cooldown ?? 70;
      rt.stepCd[pick.i] = pick.step.cooldown ?? 70;
      e.setState('aim');
      e.faceToward(p.x);
      b.vx = 0;
      return;
    }
    case 'block': {
      rt.blockLeft = pick.step.holdFrames ?? 40;
      rt.stepCd[pick.i] = pick.step.cooldown ?? 60;
      e.setState('idle');
      b.vx = 0;
      return;
    }
    case 'charge': {
      e.faceToward(p.x);
      rt.chargeSpeed = pick.step.speed ?? 6;
      rt.chargeLeft = pick.step.frames ?? 18;
      rt.stepCd[pick.i] = pick.step.cooldown ?? 70;
      // Attach charge hitbox when available (shield bash-charge equivalence).
      const chargeAtk = resolveAttack('charge', e.kind);
      if (chargeAtk) e.atk = { def: chargeAtk, f: 0, hit: new Set() };
      playSfx(g.audio, 'dash');
      e.setState(e.kind === 'shield' ? 'charge' : 'walk');
      return;
    }
    case 'loadout': {
      const prefer = pick.step.prefer ?? 'any';
      const cast = tryCastEnemyLoadout(g, e, prefer);
      if (cast) {
        rt.stepCd[pick.i] = 36;
      } else {
        rt.stepCd[pick.i] = 12;
      }
      return;
    }
    case 'dodge': {
      e.faceToward(p.x);
      const dir = pick.step.direction ?? 'away';
      if (dir === 'side') {
        rt.dodgeVx = (Math.random() < 0.5 ? 1 : -1) * 4.2;
      } else {
        rt.dodgeVx = -e.facing * 4.5;
      }
      rt.dodgeLeft = 12;
      rt.stepCd[pick.i] = pick.step.cooldown ?? 55;
      playSfx(g.audio, 'dash');
      e.setState('walk');
      e.invuln = Math.max(e.invuln, 8);
      return;
    }
    case 'circleStrafe': {
      rt.strafeSign = Math.random() < 0.5 ? 1 : -1;
      rt.paceT = 36;
      rt.stepCd[pick.i] = 40;
      e.cooldown = Math.max(e.cooldown, 12);
      return;
    }
    case 'flank': {
      rt.flankT = pick.step.preferBehind ? 40 : 28;
      rt.stepCd[pick.i] = 70;
      e.cooldown = Math.max(e.cooldown, 16);
      return;
    }
    case 'callAlly': {
      const eid = pick.step.enemyId;
      if (!eid || !getEnemy(eid)) {
        warnOnce(`ally:${eid}`, `callAlly.enemyId「${eid ?? ''}」不在目录，已跳过`);
        rt.stepCd[pick.i] = 9999;
        return;
      }
      const side = e.facing > 0 ? 1 : -1;
      const nx = e.x - side * 50;
      try {
        const ally = makeEnemy(eid, nx, { eliteChance: 0 });
        g.enemies.push(ally);
        rt.alliesSpawned++;
        g.texts.add('呼援', e.x, e.y - 110, '#c8b090', 12);
        playSfx(g.audio, 'roar');
      } catch {
        warnOnce(`ally-spawn:${eid}`, `callAlly 生成失败「${eid}」`);
      }
      const cd = pick.step.cooldown ?? 180;
      rt.callAllyCd = cd;
      rt.stepCd[pick.i] = cd;
      e.cooldown = Math.max(e.cooldown, 30);
      return;
    }
    case 'comboChain': {
      rt.comboKeys = [...pick.step.attackKeys];
      rt.comboGap = pick.step.gapFrames ?? 10;
      rt.comboI = 0;
      rt.comboWait = 0;
      rt.stepCd[pick.i] = 90;
      e.cooldown = Math.max(e.cooldown, 20);
      return;
    }
    case 'retreatBurst': {
      e.faceToward(p.x);
      const frames = pick.step.frames ?? 14;
      const distWant = pick.step.dist ?? 90;
      rt.burstVx = -e.facing * Math.max(3, distWant / Math.max(8, frames));
      rt.burstLeft = frames;
      rt.stepCd[pick.i] = 70;
      playSfx(g.audio, 'dash');
      return;
    }
    case 'taunt': {
      const text = pick.step.text ?? '挑衅';
      g.texts.add(text, e.x, e.y - 115, '#e8c070', 14, true);
      rt.stepCd[pick.i] = pick.step.cooldown ?? 100;
      e.cooldown = Math.max(e.cooldown, 20);
      return;
    }
    case 'idleEmote': {
      const text = pick.step.text ?? '……';
      g.texts.add(text, e.x, e.y - 100, '#a09888', 11);
      rt.stepCd[pick.i] = pick.step.cooldown ?? 120;
      e.cooldown = Math.max(e.cooldown, 16);
      return;
    }
  }
}

const BEHAVIOR_KINDS = new Set([
  'keepDistance', 'meleeAttack', 'rangedAttack', 'block', 'charge',
  'useLoadout', 'idlePace', 'facePlayer',
  'dodge', 'circleStrafe', 'flank', 'callAlly',
  'phaseAtHp', 'phaseGate', 'comboChain', 'retreatBurst',
  'taunt', 'idleEmote',
]);

/**
 * Minimal host for Boss idle/walk Behavior gap (Gsm1).
 * Gargoyle (Fighter) and Enemy both satisfy — no Gargoyle→Enemy.
 */
export interface BehaviorHost {
  x: number;
  y: number;
  facing: number;
  hp: number;
  maxHp: number;
  state: string;
  t: number;
  walkPhase: number;
  body: { vx: number };
  faceToward(x: number): void;
  setState(s: string): void;
  behaviorSteps: BehaviorStep[] | null;
  behaviorRt: BehaviorRuntime | null;
}

/** Continuous locomotion / nesting kinds Boss gap may run (Gsm1). Action kinds soft-skip. */
export const BOSS_GAP_LOCO_KINDS = new Set([
  'facePlayer', 'keepDistance', 'idlePace', 'circleStrafe', 'flank',
  'phaseAtHp', 'phaseGate',
]);

/**
 * Gsm1: Boss idle/walk Behavior bypass — locomotion / facing only.
 * Does **not** decrement cooldown, tick loadout timers, pick attack actions,
 * or leave idle|walk (no retreat/aim/charge/attack states).
 * chooseMove / tryCastBossLoadout stay caller-owned.
 */
export function tickBossBehaviorGap(g: Game, e: BehaviorHost): void {
  const rawSteps = e.behaviorSteps;
  if (!rawSteps?.length) return;
  if (e.state !== 'idle' && e.state !== 'walk') return;

  let rt = e.behaviorRt;
  if (!rt) {
    rt = createBehaviorRuntime();
    e.behaviorRt = rt;
  }

  const b = e.body;
  const p = g.player;
  const dist = Math.abs(p.x - e.x);
  const hpRatio = e.maxHp > 0 ? e.hp / e.maxHp : 1;

  if (rt.retreatT > 0) rt.retreatT--;
  if (rt.flankT > 0) rt.flankT--;
  if (rt.paceT > 0) rt.paceT--;

  for (const s of rawSteps) {
    if (s.kind === 'phaseAtHp') {
      const below = Math.max(0, Math.min(1, s.below));
      if (hpRatio <= below && rt.phase !== s.setPhase) {
        rt.phase = s.setPhase;
        g.texts.add(s.setPhase, e.x, e.y - 120, '#e8d0a0', 14);
      }
    }
  }

  const steps = effectiveSteps(rawSteps, rt.phase);

  let face = false;
  let keep: Extract<BehaviorStep, { kind: 'keepDistance' }> | null = null;
  let pace: Extract<BehaviorStep, { kind: 'idlePace' }> | null = null;
  for (const s of steps) {
    if (s.kind === 'facePlayer') face = true;
    else if (s.kind === 'keepDistance') keep = s;
    else if (s.kind === 'idlePace') pace = s;
    else if (BOSS_GAP_LOCO_KINDS.has(s.kind)) {
      /* circleStrafe / flank / phaseGate handled below or via effectiveSteps */
    } else if (BEHAVIOR_KINDS.has(s.kind)) {
      warnOnce(`boss-gap-skip:${s.kind}`, `Boss 空档旁路跳过招式步「${s.kind}」（Gsm1 仅走位/朝向；招仍走 kit）`);
    } else {
      warnOnce(`kind:${(s as { kind: string }).kind}`, `未知 BehaviorStep kind「${(s as { kind: string }).kind}」，已跳过`);
    }
  }
  if (face || keep || pace) e.faceToward(p.x);

  if (p.dead) {
    b.vx *= 0.85;
    e.setState('idle');
    return;
  }

  // Continuous circleStrafe / flank — stay in idle|walk only
  let strafing = false;
  for (const s of steps) {
    if (s.kind === 'circleStrafe' && dist > 40 && dist < (s.radius ?? 140) * 1.4) {
      if (Math.random() < 0.35) {
        if (rt.paceT <= 0) {
          rt.strafeSign = Math.random() < 0.5 ? 1 : -1;
          rt.paceT = 28;
        }
        e.setState('walk');
        e.faceToward(p.x);
        const spd = s.speed ?? 1.4;
        b.vx = rt.strafeSign * spd;
        if (dist < (s.radius ?? 120) * 0.85) b.vx += -e.facing * 0.6;
        if (dist > (s.radius ?? 120) * 1.15) b.vx += e.facing * 0.6;
        e.walkPhase += 0.12;
        strafing = true;
      }
    }
  }
  if (rt.flankT > 0) {
    e.setState('walk');
    const behind = p.x + (p.facing > 0 ? -1 : 1) * 70;
    const dir = behind > e.x ? 1 : -1;
    b.vx = dir * 1.6;
    e.faceToward(p.x);
    e.walkPhase += 0.14;
    strafing = true;
  } else {
    for (const s of steps) {
      if (s.kind === 'flank' && Math.random() < 0.08) {
        rt.flankT = s.preferBehind ? 40 : 28;
      }
    }
  }

  if (strafing) return;

  if (keep) {
    const tooClose = keep.idealMin * 0.72;
    // Never setState('retreat') — Gargoyle has no retreat case; reverse in walk.
    if (dist < tooClose) {
      e.setState('walk');
      e.faceToward(p.x);
      b.vx = -e.facing * (keep.retreatSpeed ?? 2.4);
      e.walkPhase += 0.16;
      return;
    }
    if (dist > keep.idealMax && dist < keep.chase) {
      e.setState('walk');
      b.vx = e.facing * 1.25;
      e.walkPhase += 0.13;
    } else if (dist > keep.chase) {
      e.setState('walk');
      b.vx = e.facing * 1.35;
      e.walkPhase += 0.14;
    } else if (dist < keep.idealMin) {
      e.setState('idle');
      b.vx = -e.facing * 0.9;
    } else {
      e.setState('idle');
      b.vx *= 0.82;
    }
  } else if (pace) {
    if (rt.paceT <= 0) {
      rt.paceDir = Math.random() < 0.5 ? 1 : -1;
      rt.paceT = 40 + ((Math.random() * 40) | 0);
    }
    e.setState('walk');
    b.vx = rt.paceDir * (pace.speed ?? 0.9);
    e.walkPhase += 0.1;
  } else if (face) {
    // face-only: damp like idle
    if (e.state === 'walk' || e.state === 'idle') {
      b.vx *= 0.82;
      if (Math.abs(b.vx) < 0.2) e.setState('idle');
    }
  }
}
