import type { Game } from '../game';
import type { Fighter } from '../entities/fighter';
import type { Player } from '../entities/player';
import type { HitResult } from '../entities/enemies/enemy';
import type { AttackDef } from './types';
import type { V } from '../engine/math';
import { overlap, overlapCenter } from '../physics/collision';
import { SEED_BY_NAME } from './playerMoves';
import { getAttackBox, getProjectile, resolveProjectileHitSfx } from '../meta/contentRegistry';
import { playSfx } from '../audio/sfx';
import { playCatalogSfx } from '../audio/sfxCatalog';
import { affinityLabel, affinityVs } from './weaponRuntime';
import type { Projectile } from '../entities/projectile';
import {
  clashPriority, armorDamageOf, sharpnessDamageMul, stunTierOf, SHARP,
} from './hardcore';
import { nifengPlayerDmgMul, nifengEnemyKbMul, nifengPlayerKbMul, canyueDashKickBonus } from '../level/affixes';
import { fragmentArmorPierceBonus } from '../meta/runFragments';
import type { Enemy } from '../entities/enemies/enemy';
import {
  readWindowOf, vulnDmgMul, vulnHitstunBonus, windowPoiseMul,
  counterPunishMul, counterOutgoingMul,
} from './readWindows';
import { weaponCounterElite } from './weaponCounters';
import { ELITE_MOD_BY_ID } from '../level/eliteMods';
import { weaponCategory } from '../meta/weapons';
import { skillsWithProfOn, SKILL_BY_ID } from '../meta/skills';
import { fragmentAtkMul } from '../meta/runFragments';
import { WEP_AFFIX_BY_ID } from '../meta/weaponInstAffix';

/** Anything the player can hit (skeletons and the boss). */
export interface Target extends Fighter {
  lastDamage: number;
  receiveHit(g: Game, def: AttackDef, dir: number): HitResult;
  onParried(g: Game): void;
}

export function resolveHits(g: Game): void {
  const p = g.player;
  const foes = g.targets();
  // ---- 崩刀 clash: mutual active hitboxes ----
  const phb = p.hitbox();
  if (phb && p.atk) {
    for (const e of foes) {
      if (e.dead || !e.atk) continue;
      const ehb = e.hitbox();
      if (!ehb || !overlap(phb, ehb)) continue;
      // Both attacking — clash instead of trading
      if (!p.atk.hit.has(e)) {
        p.atk.hit.add(e);
        e.atk.hit.add(p);
        resolveClash(g, p, e as Target, overlapCenter(phb, ehb));
      }
    }
  }
  // player -> enemies
  if (phb && p.atk) {
    for (const e of foes) {
      if (e.dead || p.atk.hit.has(e)) continue;
      const hu = e.hurtbox();
      if (!hu || !overlap(phb, hu)) continue;
      p.atk.hit.add(e);
      applyHit(g, p, e, p.atk.def, overlapCenter(phb, hu));
    }
    // slashing arrows out of the air (ArrowProj1: drawKind==='arrow', not only kind id)
    for (const pr of g.projectiles) {
      if (pr.dead || pr.team === 'player') continue;
      const pdef = getProjectile(pr.kind);
      const isArrowDraw = pdef ? pdef.drawKind === 'arrow' : pr.kind === 'arrow';
      if (!isArrowDraw) continue;
      if (overlap(phb, pr.rect())) {
        pr.dead = true;
        g.fx.guardSpark(pr.x, pr.y, -Math.sign(pr.vx));
        g.texts.add('斩落', pr.x, pr.y - 20, '#c8d8ff', 16);
        playSfx(g.audio, 'block');
      }
    }
  }
  // enemies -> player
  const phu = p.hurtbox();
  for (const e of foes) {
    const hb = e.hitbox();
    if (!hb || !e.atk || e.atk.hit.has(p) || !phu) continue;
    if (!overlap(hb, phu)) continue;
    e.atk.hit.add(p);
    applyHit(g, e, p, e.atk.def, overlapCenter(hb, phu));
  }
  // projectiles
  for (const pr of g.projectiles) {
    if (pr.dead) continue;
    const r = pr.rect();
    if (pr.team === 'enemy') {
      if (phu && !pr.hit.has(p) && overlap(r, phu)) { pr.hit.add(p); projectileHitPlayer(g, pr, p); }
    } else {
      for (const e of foes) {
        const hu = e.hurtbox();
        if (e.dead || pr.hit.has(e) || !hu || !overlap(r, hu)) continue;
        pr.hit.add(e);
        const hitSfx = resolveProjectileHitSfx(getProjectile(pr.kind), g.audio);
        applyHit(g, p, e, pr.def, { x: pr.x, y: pr.y }, Math.sign(pr.vx) || 1, hitSfx ? { hitSfx } : undefined);
        pr.dead = true;
        break;
      }
    }
  }
}

function projectileHitPlayer(g: Game, pr: Projectile, p: Player): void {
  const dir = Math.sign(pr.vx) || 1;
  if (p.invuln > 0) {
    if (p.state === 'dash') { g.texts.add('闪避', p.x, p.y - 100, '#b0a0ff', 16); }
    return;
  }
  const facing = p.facing === -dir;
  if (p.isGuarding() && facing) {
    if (pr.def.parryable && p.inParryWindow()) {
      pr.reflect();
      perfectParryFx(g, p, { x: pr.x, y: pr.y });
      g.texts.add('反弹!', p.x, p.y - 130, '#ffd27a', 20);
      return;
    }
    pr.explode(g);
    pr.dead = true;
    blockFx(g, p, pr.def, dir, { x: pr.x, y: pr.y });
    return;
  }
  pr.explode(g);
  pr.dead = true;
  hurtPlayer(g, p, pr.def, dir, { x: pr.x, y: pr.y }, null);
  // 今日本路径无 hit/hitHeavy；有白名单 hitSfx 则补播（不替代 hurt；不与 block/parry 叠）
  const hitSfx = resolveProjectileHitSfx(getProjectile(pr.kind), g.audio);
  if (hitSfx) playCatalogSfx(g.audio, hitSfx);
}


function resolveClash(g: Game, p: Player, e: Target, pt: V): void {
  const pd = p.atk!.def;
  const ed = e.atk!.def;
  const pp = clashPriority(pd, p.weapon.def.weight);
  const ep = clashPriority(ed, 'medium'); // enemies treated as medium weight
  const dir = e.x >= p.x ? 1 : -1;
  g.hitstop = Math.max(g.hitstop, 10);
  g.cam.shake(8, 14);
  g.fx.guardSpark(pt.x, pt.y, dir, true);
  g.fx.hitSpark(pt.x, pt.y, dir, true, '#c8e0ff');
  playSfx(g.audio, 'clang');
  g.texts.add('崩刀', pt.x, pt.y - 30, '#c0d8ff', 20, true);
  if (pp >= ep) {
    p.applyClashWin(g, dir);
    e.atk = null;
    e.flash = 8;
    e.body.vx = dir * 5;
    if ('poise' in e) {
      // Boss: soft flinch, chip poise
      const boss = e as Target & { poise: number; setState: (s: string) => void };
      boss.poise = Math.max(0, boss.poise - 12);
      if (['idle', 'walk', 'flinch', 'recover'].includes(e.state)) e.setState('flinch');
    } else {
      e.setState('hitstun');
      e.hitstun = 26;
    }
  } else {
    p.applyClashLose(g, dir);
    e.atk = null;
    e.body.vx = -dir * 3;
  }
}

/** Central damage routine. `dirOverride` = push direction for projectiles/areas. */
export type HitSfxOpts = { hitSfx?: string };

export function applyHit(
  g: Game, a: Fighter | null, t: Fighter, def: AttackDef, pt: V,
  dirOverride?: number, opts?: HitSfxOpts,
): HitResult {
  const dir = dirOverride ?? (a ? (t.x >= a.x ? 1 : -1) : 1);
  if (t.team === 'player') return hitPlayer(g, a, t as Player, def, pt, dir);
  return hitEnemy(g, t as Target, def, pt, dir, opts);
}

function hitPlayer(g: Game, a: Fighter | null, p: Player, def: AttackDef, pt: V, dir: number): HitResult {
  if (p.invuln > 0) {
    if (p.state === 'dash' && a) {
      g.texts.add('闪避', p.x, p.y - 100, '#b0a0ff', 16);
      g.stats.dodges++;
    }
    return 'miss';
  }
  // Affix / elite outgoing adjustments on a copy
  let atkDef = def;
  {
    const kbMul = nifengEnemyKbMul(g.stageAffix);
    if (kbMul !== 1) atkDef = { ...atkDef, kbX: atkDef.kbX * kbMul };
  }
  if (g.affixBellWeak && a && a.team === 'enemy' && !('poise' in a)) {
    const elite = 'eliteMod' in a && !!(a as Enemy).eliteMod;
    if (!elite) atkDef = { ...atkDef, damage: Math.max(1, Math.round(atkDef.damage * 0.7)) };
  }
  def = atkDef;
  const facingAttacker = a ? (Math.sign(a.x - p.x) || p.facing) === p.facing : true;
  if (p.isGuarding() && facingAttacker && !def.unblockable) {
    if (def.parryable && p.inParryWindow() && a) {
      perfectParryFx(g, p, pt);
      (a as Target).onParried(g);
      p.faceToward(a.x);
      {
        const counter = getAttackBox('counter') ?? SEED_BY_NAME.counter;
        if (counter) p.startAttack(counter);
      }
      return 'blocked';
    }
    // 完美格挡失败：格挡中但错过弹反窗 → 崩刀硬直
    if (def.parryable && def.heavy && a && !p.inParryWindow()) {
      p.applyClashLose(g, dir);
      g.texts.add('崩刀', p.x, p.y - 120, '#c0d0ff', 20, true);
      blockFx(g, p, def, dir, pt);
      return 'hit';
    }
    if (def.guardBreak) {
      p.onHurt(g, { ...def, knockdown: false, launch: false }, dir, p.mitigateFull(g, Math.ceil(def.damage * 0.5)));
      p.guardBreak(g, dir);
      g.hitstop = Math.max(g.hitstop, 6);
      g.cam.shake(7, 12);
      g.fx.guardSpark(pt.x, pt.y, dir);
      playSfx(g.audio, 'clang');
      return 'hit';
    }
    blockFx(g, p, def, dir, pt);
    return 'blocked';
  }
  hurtPlayer(g, p, def, dir, pt, a);
  return 'hit';
}

function hurtPlayer(g: Game, p: Player, def: AttackDef, dir: number, pt: V, a: Fighter | null = null): void {
  let raw = def.damage;
  // Throw / unblockable grab: ignore armor plate briefly
  if (!def.throw && !def.unblockable) {
    const ad = armorDamageOf(def);
    raw = p.absorbArmor(ad, g);
  } else {
    // Throw cracks armor a bit anyway
    p.absorbArmor(armorDamageOf(def) * 0.5, g);
  }
  const dmg = p.mitigateFull(g, raw);
  p.onHurt(g, def, dir, dmg);
  // 嗜血: elite heals on hit
  if (a && a.team === 'enemy' && 'eliteLifesteal' in a) {
    const en = a as Enemy;
    const modsLive = !!en.eliteMod && !en.eliteSuppressed && g.eliteSuppressT <= 0;
    if (modsLive && en.eliteLifesteal > 0 && !en.dead) {
      const heal = Math.max(1, Math.round(dmg * en.eliteLifesteal));
      en.hp = Math.min(en.maxHp, en.hp + heal);
      g.texts.add(`嗜血+${heal}`, en.x, en.y - 100, '#ff4060', 12);
    }
  }
  g.hitstop = Math.max(g.hitstop, Math.min(8, def.hitstop));
  g.cam.shake(def.shake + 2, 12);
  g.fx.hitSpark(pt.x, pt.y, dir, dmg >= 15, '#ff1a30');
  g.flashScreen('#a00010', 0.22);
  g.texts.add(String(dmg), p.x, p.y - 95, '#ff5a5a', 18);
}

function blockFx(g: Game, p: Player, def: AttackDef, dir: number, pt: V): void {
  let chipMul = p.mods.chip;
  if (p.armorBreakT > 0) chipMul *= 1.55;
  const chip = Math.max(1, Math.ceil(def.damage * 0.12 * chipMul));
  if (!p.god) p.hp = Math.max(1, p.hp - chip);
  if (g.meta) {
    for (const s of skillsWithProfOn('block')) {
      if (!g.meta.hasSkill(s.id)) continue;
      if (g.meta.addProf(s.id, 4)) g.showBanner('熟练度提升', s.name, 90);
    }
  }
  p.body.vx = dir * (def.kbX * 0.5 + 3);
  p.guardFlash = 6;
  p.addRage(2);
  p.sinceCombat = 0;
  // 弹刀反震 — heavy non-parryable chips stamina hard
  if (def.heavy || def.guardBreak) {
    p.spendStamina(14);
    p.sharpness = Math.max(0, p.sharpness - SHARP.blockHeavy);
    g.texts.add('弹刀', p.x, p.y - 100, '#a0b0d0', 14);
  } else {
    p.spendStamina(4);
  }
  g.hitstop = Math.max(g.hitstop, 4);
  g.cam.shake(3, 6);
  g.fx.guardSpark(pt.x, pt.y, dir);
  playSfx(g.audio, 'block');
}

function perfectParryFx(g: Game, p: Player, pt: V): void {
  g.stats.parries++;
  p.addRage(15);
  // 弹反回气：额外返还气势
  p.rage = Math.min(100, p.rage + 8 + (p.mods.neigongParryRage ?? 0));
  p.neili = Math.min(p.maxNeili, p.neili + 6);
  p.guardFlash = 10;
  p.invuln = Math.max(p.invuln, 20);
  g.hitstop = Math.max(g.hitstop, 9);
  g.slowmo(0.3, 42);
  g.flashScreen('#ffffff', 0.55);
  g.cam.punch(1.09);
  g.cam.shake(6, 10);
  g.fx.guardSpark(pt.x, pt.y, p.facing === 1 ? -1 : 1, true);
  g.texts.add('完美格挡!', p.x, p.y - 120, '#ffd27a', 26, true);
  playSfx(g.audio, 'parry');
  if (g.meta) {
    const r = g.meta.onParry();
    if (r.crystals > 0) g.texts.add(`+${r.crystals} 血晶`, p.x + 40, p.y - 140, '#ff90b0', 14);
  }
}

function hitEnemy(g: Game, e: Target, def: AttackDef, pt: V, dir: number, opts?: HitSfxOpts): HitResult {
  const p0 = g.player;
  p0.sinceCombat = 0;
  // Weapon already scaled the AttackDef in startAttack; meta 攻击 still applies.
  let dmg = Math.max(1, Math.round(def.damage * p0.mods.atk * (1 + (p0.mods.wugongBonus || 0) + p0.qiBonus())));
  dmg = Math.max(1, Math.round(dmg * sharpnessDamageMul(p0.sharpness)));
  dmg = Math.max(1, Math.round(dmg * fragmentAtkMul(g.fragments)));
  // 兵器词缀 / 心法门派
  const wa = p0.mods.wepAffix ? WEP_AFFIX_BY_ID[p0.mods.wepAffix] : null;
  if (wa?.heavyDmgMul && def.heavy) dmg = Math.max(1, Math.round(dmg * wa.heavyDmgMul));
  const poiseNg = p0.mods.neigongPoiseMul ?? 1;
  if (def.name === 'execute') {
    dmg = Math.max(1, Math.round(dmg * (p0.mods.neigongExecuteMul ?? 1) * (p0.mods.setExecuteMul ?? 1)));
  }

  // 连招分支 finishers
  if (def.name === 'finisherPoise') {
    dmg = Math.max(1, Math.round(dmg * 0.92));
  } else if (def.name === 'finisherDrain') {
    dmg = Math.max(1, Math.round(dmg * 0.95));
  }
  // 武器克制环
  let counterHit = null as ReturnType<typeof weaponCounterElite>;
  if ('eliteMod' in e) {
    const en = e as Enemy;
    const cat = weaponCategory(p0.weapon.id);
    counterHit = weaponCounterElite(cat, en.eliteMod);
    if (counterHit) {
      dmg = Math.max(1, Math.round(dmg * counterHit.dmgMul));
      // cancelShanbu vs elite dashAway (EliteModDef flag, not content id)
      if (counterHit.cancelShanbu && ELITE_MOD_BY_ID[en.eliteMod ?? '']?.dashAway) {
        en.eliteDashCd = Math.max(en.eliteDashCd, 100);
      }
      g.texts.add(counterHit.label, pt.x, pt.y - 52, '#ffe08a', 14);
    }
  }
  {
    const wideMul = nifengPlayerDmgMul(def, g.stageAffix);
    if (wideMul !== 1) dmg = Math.max(1, Math.round(dmg * wideMul));
  }
  // Counter-hit: strike during enemy startup
  let counter = false;
  if (e.atk && e.atk.f < e.atk.def.startup) {
    counter = true;
    dmg = Math.max(1, Math.round(dmg * 1.22));
  }
  let kickBonus = p0.mods.dashKickBonus;
  kickBonus += canyueDashKickBonus(g.stageAffix);
  if (def.name === 'dashKick' && kickBonus > 0) {
    dmg = Math.max(1, Math.round(dmg * (1 + kickBonus)));
  }
  const rw = readWindowOf(e);
  // 反击窗：强行挨打反噬，且几乎削不了架势
  if (rw === 'counter') {
    const punish = Math.max(2, Math.round(dmg * counterPunishMul()));
    if (!p0.god && p0.invuln <= 0) {
      p0.hp = Math.max(1, p0.hp - punish);
      g.stats.damageTaken += punish;
      g.texts.add('反击!', p0.x, p0.y - 115, '#ff6060', 18, true);
      g.fx.hitSpark(pt.x, pt.y, -dir, false, '#ff6060');
      playSfx(g.audio, 'clang');
    }
    dmg = Math.max(1, Math.round(dmg * counterOutgoingMul()));
  } else if (rw === 'vuln') {
    dmg = Math.max(1, Math.round(dmg * vulnDmgMul(rw)));
    g.texts.add('破绽!', pt.x, pt.y - 36, '#ffd27a', 16);
  }
  if (p0.skillBuffPoiseT > 0) {
    dmg = Math.max(1, Math.round(dmg * 1.15));
  }
  // note: poiseScale uses pojunMult below
  if (p0.atkBuffT > 0) {
    dmg = Math.max(1, Math.round(dmg * 1.18));
  }
  const kind = 'kind' in e ? (e as { kind?: string }).kind : undefined;
  const isBoss = e.team === 'enemy' && 'poise' in e;
  const aff = affinityVs(p0.weapon, {
    kind,
    isBoss,
    name: 'name' in e ? (e as { name?: string }).name : undefined,
    superArmor: !!(e as { superArmor?: boolean }).superArmor,
  });
  // Juggle affinity: small bonus on air targets
  const airborne = !e.body.onGround;
  let affNow = aff;
  if (!affNow && p0.weapon.def.affinities.includes('juggle') && airborne) affNow = 'juggle';
  if (!affNow && p0.weapon.def.affinities.includes('dashFocus') && def.name === 'dashKick') affNow = 'dashFocus';
  if (affNow) {
    dmg = Math.max(1, Math.round(dmg * (1 + p0.weapon.def.affinityBonus)));
    p0.affinityFlash = 40;
    g.texts.add(affinityLabel(affNow), pt.x, pt.y - 40, '#ffd27a', 14);
  }
  const poj = p0.skillBuffPoiseT > 0 ? (p0.mods.pojunMult || 1.55) : 1;
  const anti = p0.weapon.def.affinities.includes('antiArmor');
  let armDmg = armorDamageOf(def, { antiArmor: anti, pojun: p0.skillBuffPoiseT > 0 });
  armDmg = Math.round(armDmg * (1 + fragmentArmorPierceBonus(g.fragments)));
  if (p0.pojiaBuffT > 0) armDmg = Math.round(armDmg * 1.35);
  let kbX = def.kbX;
  {
    const outKb = nifengPlayerKbMul(g.stageAffix);
    if (outKb !== 1) kbX *= outKb;
  }
  let basePoise = (def.poiseScale ?? (def.heavy ? 1.6 : 1)) * poj * (1 + armDmg * 0.01);
  if (def.name === 'finisherPoise') basePoise *= 1.55;
  if (counterHit) basePoise *= counterHit.poiseMul;
  basePoise *= poiseNg * (p0.mods.setPoiseMul ?? 1);
  if (wa?.poiseMul) basePoise *= wa.poiseMul;
  if (p0.porenBuffT > 0) basePoise *= 1.35;
  if (p0.pojiaBuffT > 0) basePoise *= 1.12;
  // pierceTongpi vs elite damage-taken mul (铜皮-style); flag-driven, no id check
  if (counterHit?.pierceTongpi && 'eliteMod' in e) {
    const en = e as Enemy;
    if (en.eliteDmgTakenMul > 0 && en.eliteDmgTakenMul < 1) {
      const saved = en.eliteDmgTakenMul;
      en.eliteDmgTakenMul = Math.min(1, saved + 0.35);
      (e as Enemy & { _tongpiTmp?: number })._tongpiTmp = saved;
    }
  }
  const scaled: AttackDef = {
    ...def,
    damage: dmg,
    kbX,
    hitstun: def.hitstun + (counter ? 8 : 0) + vulnHitstunBonus(rw),
    poiseScale: basePoise * windowPoiseMul(rw),
  };
  const res = e.receiveHit(g, scaled, dir);
  // 反伤: elite reflects portion of melee damage
  if (res === 'hit' && 'eliteReflect' in e) {
    const en = e as Enemy;
    const modsLive = !!en.eliteMod && !en.eliteSuppressed && g.eliteSuppressT <= 0;
    const ignoreRefl = counterHit?.ignoreReflect;
    if (modsLive && en.eliteReflect > 0 && !def.air && !ignoreRefl) {
      const refl = Math.max(1, Math.round(en.lastDamage * en.eliteReflect));
      if (!p0.god && p0.invuln <= 0) {
        p0.hp = Math.max(1, p0.hp - refl);
        g.stats.damageTaken += refl;
        g.texts.add(`反伤 ${refl}`, p0.x, p0.y - 100, '#ff9060', 14);
      }
    }
  }
  if (res === 'hit' && counter) {
    g.texts.add('反击', pt.x, pt.y - 48, '#ff90b0', 16);
  }
  // Light boss plate crack via optional plateArmor field
  if (res === 'hit' && 'plateArmor' in e && typeof (e as { plateArmor?: number }).plateArmor === 'number') {
    const boss = e as Target & { plateArmor: number; plateMax?: number };
    boss.plateArmor = Math.max(0, boss.plateArmor - armDmg);
    if (boss.plateArmor <= 0 && (boss as { _plateCracked?: boolean })._plateCracked !== true) {
      (boss as { _plateCracked?: boolean })._plateCracked = true;
      g.texts.add('破甲', pt.x, pt.y - 56, '#ffb060', 20, true);
    }
  }
  const p = p0;
  if (res === 'miss') return res;
  if (res === 'immune') {
    g.fx.guardSpark(pt.x, pt.y, -dir);
    g.texts.add('无效', pt.x, pt.y - 20, '#9a90b0', 15);
    playSfx(g.audio, 'block');
    return res;
  }
  if (res === 'blocked') {
    g.fx.guardSpark(pt.x, pt.y, -dir);
    g.texts.add('格挡', pt.x, pt.y - 20, '#c8d8ff', 15);
    g.hitstop = Math.max(g.hitstop, 4);
    playSfx(g.audio, 'clang');
    if (p.body.onGround) p.body.vx = -dir * 4;
    return res;
  }
  // Combat proficiency on confirmed hit
  if (g.meta) {
    if (def.name === 'dashKick' && g.meta) {
      for (const s of skillsWithProfOn('dashKickHit')) {
        if (!g.meta.hasSkill(s.id)) continue;
        if (g.meta.addProf(s.id, 8)) g.showBanner('熟练度提升', s.name, 90);
      }
    }
    if (p0.skillBuffPoiseT > 0) {
      for (const s of skillsWithProfOn('poiseBuffHit')) {
        if (!g.meta.hasSkill(s.id)) continue;
        if (g.meta.addProf(s.id, 2)) g.showBanner('熟练度提升', s.name, 90);
      }
    }
  }
  if (res === 'hit' && def.name === 'finisherDrain') {
    const heal = Math.max(1, Math.round(e.lastDamage * 0.28));
    p.hp = Math.min(p.maxHp, p.hp + heal);
    g.texts.add(`吸血+${heal}`, p.x, p.y - 125, '#ff6a8a', 14);
  }
  if (res === 'hit') {
    const ls = (p0.mods.neigongLifesteal ?? 0) + (wa?.lifesteal ?? 0) + (p0.mods.setLifesteal ?? 0);
    if (ls > 0) {
      const heal = Math.max(1, Math.round(e.lastDamage * ls));
      p.hp = Math.min(p.maxHp, p.hp + heal);
    }
    if (wa?.neiliOnHit) p.neili = Math.min(p.maxNeili, p.neili + wa.neiliOnHit);
  }
  if (res === 'hit' && '_tongpiTmp' in e) {
    const en = e as Enemy & { _tongpiTmp?: number };
    if (en._tongpiTmp != null) { en.eliteDmgTakenMul = en._tongpiTmp; delete en._tongpiTmp; }
  }
  g.combo.add();
  g.stats.maxCombo = Math.max(g.stats.maxCombo, g.combo.count);
  g.stats.hits++;
  p.addRage(def.rage ?? 4);
  if (def.air) p.lastAirHit = true;
  g.hitstop = Math.max(g.hitstop, def.hitstop);
  g.cam.shake(def.shake, 8 + def.hitstop);
  const heavy = !!def.heavy || scaled.damage >= 15;
  g.fx.hitSpark(pt.x, pt.y, dir, heavy);
  if (heavy) g.cam.punch(1.025);
  g.texts.damage(e.lastDamage, pt.x, pt.y - 24, heavy);
  // 叠音策略：有投射物白名单 hitSfx（synth 或已缓存文件）→ 只播；否则今日 hit/hitHeavy
  if (opts?.hitSfx) playCatalogSfx(g.audio, opts.hitSfx);
  else playSfx(g.audio, heavy ? 'hitHeavy' : 'hit');
  return res;
}
