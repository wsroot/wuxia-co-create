import { Fighter } from './fighter';
import type { Game } from '../game';
import { GROUND_Y } from '../engine/constants';
import { clamp } from '../engine/math';
import {
  hasCombatCue, SEED_BY_NAME, type AttackChainStyle,
} from '../combat/playerMoves';
import type { AttackDef } from '../combat/types';
import { HP, HUNTER_ATTACKS } from '../render/poses';
import { getAttackBox, getAttackPose, resolveCombatStyle, locoPose } from '../meta/contentRegistry';
import { attackPose, cycle, lerpPose, type Pose } from '../render/rig';
import { drawHunter } from '../render/drawHunter';
import { playSfx } from '../audio/sfx';
import type { RunMods } from '../meta/types';
import { loadout, unarmedLoadout, scaleAttack, chainCancelFrame, chainOpenFrames, type WeaponLoadout } from '../combat/weaponRuntime';
import { matchCommand, pruneMotions, SKILL_COMMANDS, type MotionStep } from '../combat/commands';
import type { SkillId } from '../meta/skills';
import {
  STAMINA_MAX, SHARPNESS_MAX, STA, STA_REGEN, EXHAUST_LOCK, ARMOR_BREAK_T,
  ARMOR_COMBAT_CD, ARMOR_REGEN, SHARP, staminaCostFor, stunTierOf,
  sharpnessDamageMul, armorDamageOf, maxNeiliFor, neiliRegenFor,
} from '../combat/hardcore';
import { weaponCategory, CATEGORY_NAME } from '../meta/weapons';
import { failAnhun } from '../level/objectives';
import { SKILL_BY_ID, skillUsableWith, effectsAtRank, gateLabel, skillsWithProfOn } from '../meta/skills';
import {
  canyueDashCdMul, canyueDashIframeBonus, canyueJumpBoost,
  huashiDashLenMul, huashiSlideVx, huashiDashSpeed, hasDashMorph,
} from '../level/affixes';
import {
  fragmentDashCdMul, fragmentNeiliRegenMul, fragmentPillHealMul, fragmentPillRageBonus, fragmentDmgTakenMul,
  fragmentSkillDmgMul, hasFragment,
} from '../meta/runFragments';
import { PILL_BY_ID, type PillWhileActive } from '../meta/alchemy';
import {
  TALISMAN_BY_ID, TALISMAN_SLOT_COUNT, emptyTalismanSlots, cloneTalismanSlots,
  type TalismanId, type TalismanSlot,
} from '../meta/talismans';

const RUN = 4.8;
const ACC = 0.9;
const AIR_ACC = 0.5;
const JUMP_V = -12.8;
const DASH_LEN = 16;
/** 闪身消耗气势；耗尽则无法连闪。 */
/** 闪身消耗气势；战斗中有缓慢回复，避免永久闪身软锁。 */
const DASH_RAGE_COST = 11;
/** Passive 气势 regen per frame while not dashing (combat-fair). */
const RAGE_PASSIVE = 0.045;


const DEFAULT_MODS: RunMods = {
  maxHp: 100, atk: 1, def: 0, chip: 1, rage: 1,
  parryWindow: 10, dashIframes: 13, enemyScale: 1, startPotions: 0,
  weaponId: '', weaponLevel: 1, weaponQuality: 'fan',
  doubleJump: false, canDash: false, jumpBoost: 1, dashKickBonus: 0,
  pojunMult: 1.55, pojunDuration: 360, pojunCd: 1080, healAmt: 28, healCd: 1320,
  activeSkills: [], startPillSlots: [null, null, null, null], startTalismanSlots: [null, null], skillRanks: {},
  wugongBonus: 0, equippedNeigong: null, neigongRank: 0,
  maxArmor: 18,
  maxNeili: 60, neiliRegen: 0.12,
};

interface TrailPt { hx: number; hy: number; ang: number; len: number; age: number }
interface Ghost { x: number; y: number; facing: number; pose: Pose; age: number }

export class Player extends Fighter {
  readonly team = 'player' as const;
  rage = 0;
  comboStep = 0;
  /** 'poise' light chain / 'drain' after dashKick / null. */
  comboBranch: 'poise' | 'drain' | null = null;
  porenBuffT = 0;
  /** 破甲散 */
  pojiaBuffT = 0;
  /** 净咒散 — affix/curse resist */
  jingzhouT = 0;
  /** 影步散 — dash faster */
  yingbuT = 0;
  /** 护身符短减伤 */
  hushenT = 0;
  /** 暴气丸 rage regen boost */
  baoqiT = 0;
  xuhangT = 0;
  xuhangTicks = 0;
  chainOpen = 0;
  airChain = 0;
  airAttacks = 0;
  lastAirHit = true;
  airTime = 0;
  dashCd = 0;
  airDashUsed = false;
  dashDir: 1 | -1 = 1;
  sinceDash = 999;
  guardT = 0;
  guardFlash = 0;
  hpLag = 100;
  runPhase = 0;
  landT = 0;
  trail: TrailPt[] = [];
  ghosts: Ghost[] = [];
  /** 滑湿: elongated dash this dash instance. */
  huashiDash = false;
  huashiLenMul = 1;
  huashiSlide = 0;
  huashiSpeed = 13;
  pose: Pose = HP.idle;
  god = false;
  mods: RunMods = { ...DEFAULT_MODS };
  weapon: WeaponLoadout = unarmedLoadout();
  affinityFlash = 0;
  /** Run sortie pill slots (mutable copy of hub assignment). */
  pillSlots: import('../meta/alchemy').PillSlot[] = [null, null, null, null];
  /** Prepared combat 灵符 slots (len 2). */
  talismanSlots: TalismanSlot[] = emptyTalismanSlots();
  /** Active slot index for U/5 use. */
  talismanIndex = 0;
  talismanCd = 0;
  airJumpsUsed = 0;
  skillCd = 0;
  skillBuffPoiseT = 0;
  atkBuffT = 0;
  defBuffT = 0;
  pillMsgT = 0;
  /** Active pill whileActive aura (from last pill that declared one). */
  pillAura: PillWhileActive | null = null;
  pillAuraT = 0;
  /** Command-move buffer (↓→ / ↓↓). */
  private motionBuf: MotionStep[] = [];
  private motionClock = 0;

  // ---- hardcore layers ----
  stamina = STAMINA_MAX;
  maxStamina = STAMINA_MAX;
  neili = 60;
  maxNeili = 60;
  /** Active skill multi-hit chain (attackChain on SkillDef). */
  private skillChainId: SkillId | null = null;
  private skillChainStep = 0;
  exhaustT = 0;
  armor = 18;
  maxArmor = 18;
  armorBreakT = 0;
  sinceCombat = 999;
  sharpness = SHARPNESS_MAX;
  hyperArmorT = 0;
  clashStunT = 0;
  /** Current hurt stun tier (for hierarchy). */
  hurtTier: 1 | 2 | 3 = 1;
  statusFlash = 0;

  constructor(x: number, mods?: RunMods) {
    const m = mods ?? DEFAULT_MODS;
    super(x, GROUND_Y, 26, 80, m.maxHp);
    this.mods = { ...m };
    this.hpLag = m.maxHp;
    this.weapon = loadout(m.weaponId, m.weaponLevel, { dmg: m.weaponRollDmg, poise: m.weaponRollPoise });
    this.pillSlots = (m.startPillSlots ?? [null, null, null, null]).map((s) => (s ? { ...s } : null));
    this.talismanSlots = cloneTalismanSlots(m.startTalismanSlots);
    this.talismanIndex = 0;
    this.maxArmor = m.maxArmor ?? 18;
    this.armor = this.maxArmor;
    this.stamina = STAMINA_MAX;
    this.sharpness = SHARPNESS_MAX;
    this.maxNeili = m.maxNeili ?? 60;
    this.neili = this.maxNeili;
  }

  isExhausted(): boolean { return this.exhaustT > 0; }
  isArmorBroken(): boolean { return this.armorBreakT > 0 || this.armor <= 0; }
  hasHyperArmor(): boolean { return this.hyperArmorT > 0; }

  spendNeili(n: number): boolean {
    if (n <= 0) return true;
    if (this.neili < n) return false;
    this.neili -= n;
    return true;
  }

  spendStamina(n: number): boolean {
    if (n <= 0) return true;
    if (this.stamina < n * 0.35 && this.exhaustT > 0) return false;
    this.stamina = Math.max(0, this.stamina - n);
    if (this.stamina <= 0.01) {
      this.stamina = 0;
      if (this.exhaustT <= 0) this.exhaustT = EXHAUST_LOCK;
    }
    return this.stamina > 0 || n < STA.dash; // allow last-gasp action that zeroed it
  }

  /** Apply armor absorption; returns HP damage after plate. Sets 破甲 when cracked. */
  absorbArmor(armorDmg: number, g: Game): number {
    if (armorDmg <= 0 || this.armor <= 0) return armorDmg;
    const absorbed = Math.min(this.armor, armorDmg);
    this.armor -= absorbed;
    this.sinceCombat = 0;
    // Parallel split: ~55% of hit goes to armor pool, rest to HP conceptually —
    // here we convert absorbed into reduced HP damage.
    const hpShare = Math.max(0, armorDmg - absorbed) + absorbed * 0.35;
    if (this.armor <= 0 && this.armorBreakT <= 0) {
      this.armor = 0;
      this.armorBreakT = ARMOR_BREAK_T;
      this.statusFlash = 24;
      g.texts.add('破甲', this.x, this.y - 125, '#ffb060', 22, true);
      g.fx.guardSpark(this.x, this.y - 60, this.facing);
    }
    return hpShare;
  }

  tickHardcore(g: Game, attacking: boolean, guarding: boolean): void {
    if (this.exhaustT > 0) this.exhaustT--;
    if (this.armorBreakT > 0) this.armorBreakT--;
    if (this.hyperArmorT > 0) this.hyperArmorT--;
    if (this.clashStunT > 0) this.clashStunT--;
    if (this.statusFlash > 0) this.statusFlash--;
    this.sinceCombat++;

    // Stamina regen
    if (this.exhaustT > 0) {
      this.stamina = Math.min(this.maxStamina, this.stamina + STA_REGEN.afterExhaust);
    } else if (!attacking && !guarding && this.state !== 'dash' && this.state !== 'hurt' && this.state !== 'down') {
      const grounded = this.body.onGround;
      const moving = Math.abs(this.body.vx) > 0.6;
      let r = grounded ? (moving ? STA_REGEN.moveGround : STA_REGEN.idleGround) : STA_REGEN.air;
      this.stamina = Math.min(this.maxStamina, this.stamina + r);
    }
    if (guarding) this.spendStamina(this.guardT < 4 ? STA.guardPerFrame : STA.guardHold);

    // Armor regen out of combat
    if (this.sinceCombat > ARMOR_COMBAT_CD && this.armorBreakT <= 0 && this.armor < this.maxArmor) {
      this.armor = Math.min(this.maxArmor, this.armor + ARMOR_REGEN);
    }
    if (this.porenBuffT > 0) this.porenBuffT--;
    if (this.pojiaBuffT > 0) this.pojiaBuffT--;
    if (this.jingzhouT > 0) this.jingzhouT--;
    if (this.yingbuT > 0) this.yingbuT--;
    if (this.hushenT > 0) this.hushenT--;
    if (this.baoqiT > 0) this.baoqiT--;
    if (this.xuhangT > 0) {
      this.xuhangT--;
      if (this.xuhangTicks > 0 && this.xuhangT % 90 === 0) {
        this.xuhangTicks--;
        this.hp = Math.min(this.maxHp, this.hp + 4);
      }
    }
    // 内力 regen (slower while attacking)
    let nr = this.mods.neiliRegen ?? 0.12;
    nr *= fragmentNeiliRegenMul(g.fragments);
    if (this.mods.setNeiliRegenMul) nr *= this.mods.setNeiliRegenMul;
    if (!attacking) this.neili = Math.min(this.maxNeili, this.neili + nr);
    else this.neili = Math.min(this.maxNeili, this.neili + nr * 0.25);

    // 气势缓慢回复（闪身不永久软锁）
    if (this.state !== 'dash' && this.state !== 'dead' && this.state !== 'super') {
      const mul = attacking ? 0.35 : (guarding ? 0.55 : 1);
      const rageMul = (this.mods.rage || 1) * (this.baoqiT > 0 ? 1.6 : 1);
      this.rage = Math.min(100, this.rage + RAGE_PASSIVE * mul * rageMul);
    }
  }

  applyClashLose(g: Game, dir: number): void {
    g.runBengdao++;
    failAnhun(g, 'noBengdao');
    this.atk = null;
    this.clashStunT = 28;
    this.sharpness = Math.max(0, this.sharpness - SHARP.clashLose);
    this.setState('hurt');
    this.hitstun = 28;
    this.hurtTier = 3;
    this.body.vx = dir * 6;
    this.statusFlash = 18;
    g.texts.add('崩刀', this.x, this.y - 120, '#c0d0ff', 22, true);
    playSfx(g.audio, 'clang');
  }

  applyClashWin(g: Game, dir: number): void {
    this.sharpness = Math.max(0, this.sharpness - SHARP.clashWin);
    this.body.vx = -dir * 3;
    g.texts.add('弹开', this.x, this.y - 110, '#ffe0a0', 16);
  }

  isGuarding(): boolean { return this.state === 'guard'; }
  inParryWindow(): boolean { return this.state === 'guard' && this.guardT <= this.mods.parryWindow; }

  /** 气势 gain (passive meter; no U-super). */
  addRage(base: number): void {
    this.rage = Math.min(100, this.rage + base * this.mods.rage * this.weapon.def.rage);
    // 气势微补内力
    this.neili = Math.min(this.maxNeili, this.neili + base * 0.15);
  }

  /** 气势 → 微弱武功加成 (满气势约 +6%). */
  qiBonus(): number {
    return (this.rage / 100) * 0.06;
  }

  private recordMotions(inp: import('../engine/input').Input): void {
    const now = this.motionClock;
    if (inp.pressed('down')) this.motionBuf.push({ m: 'D', at: now });
    if (inp.pressed('up')) this.motionBuf.push({ m: 'U', at: now });
    if (inp.pressed('right') || inp.pressed('left')) {
      const dir = inp.pressed('right') ? 1 : -1;
      this.motionBuf.push({ m: dir === this.facing ? 'F' : 'B', at: now });
    }
  }

  /** null = no command; 'blocked' = motion matched but wrong weapon (skip attack). */
  private tryCommandSkill(g: Game): SkillId | 'blocked' | null {
    if (this.skillCd > 0) return null;
    const now = this.motionClock;
    const cat = weaponCategory(this.weapon.id);
    // Prefer skills usable with current weapon; then longer sequences
    const order = [...this.mods.activeSkills].sort((a, b) => {
      const ua = skillUsableWith(a, cat) ? 1 : 0;
      const ub = skillUsableWith(b, cat) ? 1 : 0;
      if (ub !== ua) return ub - ua;
      return (SKILL_COMMANDS[b]?.seq.length ?? 0) - (SKILL_COMMANDS[a]?.seq.length ?? 0);
    });
    let blockedNeed: string | null = null;
    for (const id of order) {
      const cmd = SKILL_COMMANDS[id];
      if (!cmd) continue;
      if (!matchCommand(this.motionBuf, cmd.seq, now)) continue;
      if (!skillUsableWith(id, cat)) {
        blockedNeed = gateLabel(SKILL_BY_ID[id].weaponGate);
        continue; // try other matching usable skill first
      }
      return id;
    }
    if (blockedNeed) {
      g.texts.add(`需持${blockedNeed}`, this.x, this.y - 100, '#c8a0a8', 14);
      return 'blocked';
    }
    return null;
  }

  /** Cast an equipped active by id (command move or shortcut). */
  castSkill(g: Game, prefer?: SkillId): void {
    if (this.skillCd > 0) return;
    const cat = weaponCategory(this.weapon.id);
    const actives = this.mods.activeSkills.filter((id) => skillUsableWith(id, cat));
    let id = prefer && this.mods.activeSkills.includes(prefer) ? prefer : undefined;
    if (id && !skillUsableWith(id, cat)) {
      g.texts.add(`需持${gateLabel(SKILL_BY_ID[id].weaponGate)}`, this.x, this.y - 100, '#c8a0a8', 14);
      return;
    }
    if (!id) {
      // Prefer highest SkillDef.touchPriority (plugin data); tie → first equipped usable.
      id = actives.slice().sort((a, b) =>
        (SKILL_BY_ID[b]?.touchPriority ?? 0) - (SKILL_BY_ID[a]?.touchPriority ?? 0)
      )[0];
    }
    if (!id) {
      g.texts.add('无可用外功', this.x, this.y - 100, '#9a90b0', 14);
      return;
    }
    const def = SKILL_BY_ID[id];
    const cost = def.neiliCost ?? 20;
    if (this.neili < cost) {
      g.texts.add('内力不足', this.x, this.y - 100, '#80c0ff', 14);
      return;
    }

    const kind = def.castKind;
    if (kind === 'heal') {
      this.spendNeili(cost);
      const low = this.hp / this.maxHp < 0.35;
      const amt = Math.min(this.mods.healAmt, this.maxHp - this.hp);
      this.hp += amt;
      this.skillCd = this.mods.healCd;
      g.texts.add(`${def.name} +${amt}`, this.x, this.y - 110, '#90ffb0', 18);
      if (def.castFx?.length) g.talismanScripts.playSteps(g, def.castFx, '#90ffb0');
      else {
        g.fx.flare(this.x, this.y - 40, 70, '#60ff90', 16);
        playSfx(g.audio, 'potion');
      }
      this.playSkillAnim(g, def, '#90ffb0');
      if (g.meta) {
        const up = g.meta.addProf(id, low ? 20 : 12);
        if (up) g.showBanner('熟练度提升', def.name, 90);
      }
      return;
    }
    if (kind === 'pojun') {
      this.spendNeili(cost);
      this.skillBuffPoiseT = this.mods.pojunDuration;
      this.hyperArmorT = Math.max(this.hyperArmorT, 48);
      this.skillCd = this.mods.pojunCd;
      g.texts.add(def.name, this.x, this.y - 110, '#ffd27a', 20, true);
      if (def.castFx?.length) g.talismanScripts.playSteps(g, def.castFx, '#ffd27a');
      else {
        g.fx.ring(this.x, this.y - 40, 80, '#ffd27a', 18);
        playSfx(g.audio, 'ui');
      }
      this.playSkillAnim(g, def, '#ffd27a');
      if (g.meta) {
        const up = g.meta.addProf(id, 10);
        if (up) g.showBanner('熟练度提升', def.name, 90);
      }
      return;
    }
    if (kind === 'ningqi') {
      this.spendNeili(cost);
      const effN = effectsAtRank(id, this.mods.skillRanks[id] ?? 1);
      this.skillCd = effN.skillCd;
      this.atkBuffT = Math.max(this.atkBuffT, Math.round(8 * 60));
      this.neili = Math.min(this.maxNeili, this.neili + 12);
      g.texts.add(def.name, this.x, this.y - 110, '#80d0ff', 18, true);
      if (def.castFx?.length) g.talismanScripts.playSteps(g, def.castFx, '#80d0ff');
      else {
        g.fx.flare(this.x, this.y - 40, 60, '#60c0ff', 14);
        playSfx(g.audio, 'ui');
      }
      this.playSkillAnim(g, def, '#80d0ff');
      if (g.meta && g.meta.addProf(id, 10)) g.showBanner('熟练度提升', def.name, 90);
      return;
    }
    if (kind === 'attack') {
      // W1: attackKey → ctx.attacks only (no bare BARE[] bypass)
      const key = def.attackKey ?? id;
      const src = getAttackBox(key);
      if (!src) {
        g.texts.add('招式未备', this.x, this.y - 100, '#c8a0a8', 14);
        return;
      }
      this.spendNeili(cost);
      const eff = effectsAtRank(id, this.mods.skillRanks[id] ?? 1);
      this.skillCd = eff.skillCd;
      const mul = eff.skillDmgMult * fragmentSkillDmgMul(g.fragments);
      if (def.attackChain?.length) {
        this.skillChainId = id;
        this.skillChainStep = 0;
      } else {
        this.skillChainId = null;
        this.skillChainStep = 0;
      }
      this.doAttack(g, { ...src, damage: Math.round(src.damage * mul) });
      g.texts.add(def.name, this.x, this.y - 110, '#e8d0a0', 18, true);
      if (def.castFx?.length) g.talismanScripts.playSteps(g, def.castFx, '#e8d0a0');
      this.playSkillAnim(g, def, '#e8d0a0');
      if (g.meta && g.meta.hasSkill(id)) {
        if (g.meta.addProf(id, 10)) g.showBanner('熟练度提升', def.name, 90);
      }
      return;
    }
    g.texts.add('此功无法施展', this.x, this.y - 100, '#c8a0a8', 14);
  }

  /** Use sortie slot 0–3 (keys 1–4). Effects come from PillDef.effect. */
  usePillSlot(g: Game, slot: number): void {
    if (slot < 0 || slot > 3) return;
    const s = this.pillSlots[slot];
    if (!s || s.n <= 0) {
      g.texts.add('无丹', this.x, this.y - 100, '#c8a0a8', 14);
      return;
    }
    const id = s.id;
    const effect = PILL_BY_ID[id]?.effect;
    s.n -= 1;
    if (s.n <= 0) this.pillSlots[slot] = null;
    if (!effect) {
      g.texts.add('无效丹药', this.x, this.y - 100, '#c8a0a8', 14);
      return;
    }
    const pillMul = fragmentPillHealMul(g.fragments);
    const durMul = effect.durScaleWithPillMul && pillMul > 1 ? 1.2 : 1;
    const sec = (n: number) => Math.round(n * 60 * durMul);
    let floatExtra = '';

    if (effect.heal != null) {
      const base = Math.round(effect.heal * (effect.healWithFrag ? pillMul : 1));
      const amt = Math.min(base, this.maxHp - this.hp);
      this.hp += amt;
      floatExtra = ` +${amt}`;
    }
    if (effect.rage != null) {
      const bonus = effect.rageWithFrag ? fragmentPillRageBonus(g.fragments) : 0;
      this.rage = Math.min(100, this.rage + effect.rage + bonus);
    }
    if (effect.neili != null) {
      const amt = Math.round(effect.neili * (effect.neiliWithFrag ? pillMul : 1));
      this.neili = Math.min(this.maxNeili, this.neili + amt);
    }
    if (effect.stamina != null) this.stamina = Math.min(this.maxStamina, this.stamina + effect.stamina);
    if (effect.armor != null) this.armor = Math.min(this.maxArmor, this.armor + effect.armor);
    if (effect.invuln != null) this.invuln = Math.max(this.invuln, effect.invuln);
    if (effect.clearControl) {
      this.exhaustT = 0;
      this.armorBreakT = 0;
      this.clashStunT = 0;
      this.hitstun = 0;
      if (this.state === 'hurt' || this.state === 'down') this.setState(this.body.onGround ? 'idle' : 'air');
    }
    if (effect.atkBuffSec != null) this.atkBuffT = sec(effect.atkBuffSec);
    if (effect.defBuffSec != null) {
      const t = sec(effect.defBuffSec);
      this.defBuffT = effect.defBuffMax ? Math.max(this.defBuffT, t) : t;
    }
    if (effect.porenBuffSec != null) this.porenBuffT = sec(effect.porenBuffSec);
    if (effect.pojiaBuffSec != null) this.pojiaBuffT = sec(effect.pojiaBuffSec);
    if (effect.jingzhouSec != null) this.jingzhouT = sec(effect.jingzhouSec);
    if (effect.affixSuppressSec != null) g.affixSuppressT = Math.max(g.affixSuppressT, sec(effect.affixSuppressSec));
    if (effect.baoqiSec != null) this.baoqiT = sec(effect.baoqiSec);
    if (effect.yingbuSec != null) this.yingbuT = sec(effect.yingbuSec);
    if (effect.xuhangSec != null) {
      this.xuhangT = sec(effect.xuhangSec);
      this.xuhangTicks = effect.xuhangTicks ?? 8;
    }

    const feel = effect.castFeel;
    if (feel) {
      if (feel.hitstop) g.hitstop = Math.max(g.hitstop, feel.hitstop | 0);
      if (feel.shake) g.cam.shake(feel.shake.amp, feel.shake.frames);
      if (feel.flash) g.flashScreen(feel.flash.color, feel.flash.a);
    }
    if (effect.whileActive) {
      const dur = Math.max(
        effect.atkBuffSec != null ? sec(effect.atkBuffSec) : 0,
        effect.defBuffSec != null ? sec(effect.defBuffSec) : 0,
        effect.porenBuffSec != null ? sec(effect.porenBuffSec) : 0,
        effect.pojiaBuffSec != null ? sec(effect.pojiaBuffSec) : 0,
        effect.jingzhouSec != null ? sec(effect.jingzhouSec) : 0,
        effect.baoqiSec != null ? sec(effect.baoqiSec) : 0,
        effect.yingbuSec != null ? sec(effect.yingbuSec) : 0,
        effect.xuhangSec != null ? sec(effect.xuhangSec) : 0,
        effect.affixSuppressSec != null ? sec(effect.affixSuppressSec) : 0,
      );
      if (dur > 0) {
        this.pillAura = effect.whileActive;
        this.pillAuraT = Math.max(this.pillAuraT, dur);
      }
    }

    const label = (effect.floatText ?? PILL_BY_ID[id]?.name ?? id) + floatExtra;
    g.texts.add(label, this.x, this.y - 110, effect.floatColor ?? '#ff6a7a', 18);
    playSfx(g.audio, effect.sfx ?? 'potion');
  }

  /** Apply weapon scaling before committing the attack instance. */
  startAttack(def: AttackDef): void {
    const scaled = scaleAttack(def, this.weapon);
    this.atk = { def: scaled, f: 0, hit: new Set() };
    this.setState('attack');
    if (scaled.hyperArmor || scaled.name === 'finisher' || this.skillBuffPoiseT > 0) {
      // Brief 霸体 covering startup→early active
      this.hyperArmorT = Math.max(this.hyperArmorT, scaled.startup + Math.min(4, scaled.active) + 2);
    }
  }

  /** Incoming damage after meta 防御. */
  mitigate(raw: number): number {
    const defExtra = (this.defBuffT > 0 ? 0.12 : 0) + (this.hushenT > 0 ? 0.22 : 0);
    const def = Math.min(0.65, this.mods.def + defExtra);
    let m = raw * (1 - def);
    if (this.armorBreakT > 0) m *= 1.28;
    if (this.exhaustT > 0) m *= 1.18;
    return Math.max(1, Math.round(m));
  }

  /** Apply run-fragment + affix mitigation after meta def. */
  mitigateFull(g: Game, raw: number): number {
    let m = this.mitigate(raw);
    m = Math.max(1, Math.round(m * fragmentDmgTakenMul(g.fragments)));
    if (this.mods.setDmgTakenMul) m = Math.max(1, Math.round(m * this.mods.setDmgTakenMul));
    if (this.mods.setCurseTakenMul && hasFragment(g.fragments, 'heican')) {
      m = Math.max(1, Math.round(m * this.mods.setCurseTakenMul));
    }
    if (this.jingzhouT > 0 && hasFragment(g.fragments, 'heican')) {
      m = Math.max(1, Math.round(m * 0.82));
    }
    return m;
  }
  private free(): boolean { return this.state === 'idle' || this.state === 'run' || this.state === 'air'; }
  private inRecovery(): boolean {
    const a = this.atk;
    return this.state === 'attack' && !!a && a.f >= a.def.startup + a.def.active;
  }
  private canChain(): boolean {
    const a = this.atk;
    if (!(this.state === 'attack' && a) || hasCombatCue(a.def, 'plunge')) return false;
    return a.f >= chainCancelFrame(a.def, this.weapon);
  }

  update(g: Game): void {
    const inp = g.input;
    const b = this.body;
    this.t++;
    if (this.invuln > 0) this.invuln--;
    if (this.flash > 0) this.flash--;
    if (this.guardFlash > 0) this.guardFlash--;
    if (this.affinityFlash > 0) this.affinityFlash--;
    this.dashCd--;
    this.sinceDash++;
    if (this.chainOpen > 0) this.chainOpen--;
    if (this.airChain > 0) this.airChain--;
    if (this.landT > 0) this.landT--;
    this.hpLag += (this.hp - this.hpLag) * 0.05;
    if (b.onGround) { this.airDashUsed = false; this.airTime = 0; this.airAttacks = 0; } else this.airTime++;
    b.gravityScale = 1;
    b.noGravity = false;

    if (this.skillCd > 0) this.skillCd--;
    if (this.talismanCd > 0) this.talismanCd--;
    if (this.skillBuffPoiseT > 0) this.skillBuffPoiseT--;
    if (this.atkBuffT > 0) this.atkBuffT--;
    if (this.defBuffT > 0) this.defBuffT--;
    if (this.pillAuraT > 0) {
      this.pillAuraT--;
      if (this.pillAuraT <= 0) this.pillAura = null;
    }
    if (b.onGround) this.airJumpsUsed = 0;

    const busy = this.state === 'hurt' || this.state === 'down' || this.state === 'getup' || this.state === 'dead' || this.state === 'super'
      || this.clashStunT > 0;
    const exhausted = this.exhaustT > 0;

    // ---- actions ----
    if (!busy) {
      const grounded = b.onGround;
      // Record motion edges for command moves
      this.motionClock++;
      this.recordMotions(inp);
      this.motionBuf = pruneMotions(this.motionBuf, this.motionClock);

      // Accessibility shortcut (I / 技) — same as command cast
      if (inp.pressed('skill') && this.mods.activeSkills.length) {
        inp.consume('skill');
        this.castSkill(g);
      } else if (inp.pressed('pill0') || inp.pressed('pill1') || inp.pressed('pill2') || inp.pressed('pill3')) {
        const slot = (['pill0', 'pill1', 'pill2', 'pill3'] as const).findIndex((a) => inp.pressed(a));
        for (const a of ['pill0', 'pill1', 'pill2', 'pill3'] as const) inp.consume(a);
        if (slot >= 0) this.usePillSlot(g, slot);
      } else if (inp.pressed('talismanCycle')) {
        inp.consume('talismanCycle');
        this.cycleTalisman(g);
      } else if (inp.pressed('talisman')) {
        inp.consume('talisman');
        this.useTalisman(g);
      } else if (inp.pressed('super')) {
        // 绝学大招已移除；气势仅作被动资源
        inp.consume('super');
      } else if (!exhausted && inp.pressed('dash') && this.dashCd <= 0 && (this.free() || this.inRecovery() || this.state === 'guard') && (grounded || !this.airDashUsed)) {
        if (!this.mods.canDash) {
          inp.consume('dash');
          g.texts.add('未习闪身步', this.x, this.y - 100, '#9a90b0', 14);
        } else if (this.stamina < STA.dash * 0.5) {
          if (this.t % 20 === 0) g.texts.add('体力不足', this.x, this.y - 100, '#9a90b0', 14);
        } else {
          inp.consume('dash');
          const ax = inp.axisX();
          this.startDash(g, ax !== 0 ? (ax > 0 ? 1 : -1) : this.facing);
        }
      } else if (!exhausted && inp.pressed('attack') && (this.free() || this.canChain() || (this.state === 'dash' && this.t >= 3) || this.state === 'guard')) {
        inp.consume('attack');
        // Throw: →↓+攻  or  proximity grab vs turtling guard
        if (this.tryThrow(g)) {
          this.motionBuf = [];
        } else {
          const cmd = this.tryCommandSkill(g);
          if (cmd === 'blocked') {
            this.motionBuf = [];
          } else if (cmd) {
            this.motionBuf = [];
            this.castSkill(g, cmd);
          } else {
            this.doAttack(g, this.chooseAttack(g));
          }
        }
      } else if (inp.pressed('jump') && (this.free() || this.inRecovery() || this.state === 'guard')) {
        const canGround = grounded;
        const canDouble = !grounded && this.mods.doubleJump && this.airJumpsUsed < 1 && this.state === 'air';
        if (!grounded && inp.pressed('jump') && !this.mods.doubleJump && this.state === 'air') {
          inp.consume('jump');
          g.texts.add('未习轻功', this.x, this.y - 100, '#9a90b0', 14);
        } else if (canGround || canDouble) {
          inp.consume('jump');
          this.atk = null;
          // ↓+跳：从屋顶掉落（one-way）
          if (canGround && inp.down('down') && b.onPlatform >= 0) {
            b.y += 4;
            b.vy = 1.5;
            b.onGround = false;
            b.onPlatform = -1;
            this.setState('air');
          } else {
            let boost = this.mods.jumpBoost || 1;
            boost *= canyueJumpBoost(g.stageAffix);
            this.spendStamina(canDouble ? STA.airJump : STA.jump);
            b.vy = JUMP_V * boost * (canDouble ? 0.92 : 1);
            b.onGround = false;
            if (canDouble) this.airJumpsUsed++;
            this.setState('air');
            playSfx(g.audio, 'jump');
            g.fx.dust(b.x, b.y, canDouble ? 8 : 5);
            if (g.meta) {
              for (const s of skillsWithProfOn('jump')) {
                if (!g.meta.hasSkill(s.id)) continue;
                if (g.meta.addProf(s.id, canDouble ? 5 : 3)) g.showBanner('熟练度提升', s.name, 90);
              }
            }
          }
        }
      } else if (!exhausted && inp.down('guard') && grounded && (this.free() || this.inRecovery())) {
        this.atk = null;
        this.setState('guard');
        this.guardT = 0;
      }
    }

    const attacking = this.state === 'attack' && !!this.atk;
    const guarding = this.state === 'guard';
    this.tickHardcore(g, attacking, guarding);
    if (this.exhaustT === EXHAUST_LOCK - 1) {
      g.texts.add('力竭', this.x, this.y - 115, '#b0a0c0', 20, true);
      this.statusFlash = 20;
      if (this.state === 'guard') this.setState('idle');
      this.atk = null;
    }

    // ---- state behaviour ----
    switch (this.state) {
      case 'idle':
      case 'run':
      case 'air': {
        const ax = inp.axisX();
        if (b.onGround) {
          if (ax !== 0) {
            b.vx = clamp(b.vx + ax * ACC, -RUN, RUN);
            this.facing = ax > 0 ? 1 : -1;
            if (this.state !== 'run') this.setState('run');
            this.runPhase += 0.28;
            if (this.t % 16 === 0) g.fx.dust(b.x - this.facing * 6, b.y, 1, -this.facing);
          } else {
            b.vx *= 0.7;
            if (this.state !== 'idle') this.setState('idle');
          }
        } else {
          if (ax !== 0) { b.vx = clamp(b.vx + ax * AIR_ACC, -RUN, RUN); this.facing = ax > 0 ? 1 : -1; }
          else b.vx *= 0.97;
          if (this.state !== 'air') this.setState('air');
          if (!inp.down('jump') && b.vy < -4) b.vy *= 0.85; // variable jump height
        }
        break;
      }
      case 'guard':
        this.guardT++;
        b.vx *= 0.75;
        { const ax = inp.axisX(); if (ax !== 0 && this.guardT < 4) this.facing = ax > 0 ? 1 : -1; }
        if (!inp.down('guard')) this.setState('idle');
        break;
      case 'dash': {
        const lenMul = this.huashiDash ? this.huashiLenMul : 1;
        const len = Math.round(DASH_LEN * lenMul);
        const k = this.t / len;
        const speed = this.huashiDash ? this.huashiSpeed : 13;
        b.vx = this.dashDir * (k < 0.5 ? speed : speed - (k - 0.5) * 2 * 9);
        if (!b.onGround) { b.noGravity = true; b.vy = 0; }
        if (this.t % 2 === 0) this.ghosts.push({ x: b.x, y: b.y, facing: this.facing, pose: this.pose, age: 0 });
        if (this.t >= len) {
          this.sinceDash = 0;
          if (this.huashiDash && b.onGround && this.huashiSlide) b.vx = this.dashDir * this.huashiSlide;
          this.huashiDash = false;
          this.setState(b.onGround ? 'idle' : 'air');
        }
        break;
      }
      case 'attack':
        this.updateAttack(g);
        break;
      case 'hurt':
        b.vx *= 0.86;
        if (--this.hitstun <= 0) this.setState(b.onGround ? 'idle' : 'air');
        break;
      case 'down':
        if (b.onGround && this.t > 4) {
          b.vx *= 0.8;
          if (this.hp <= 0) {
            if (this.t > 30) { this.setState('dead'); g.onPlayerDeath(); }
          } else if (this.t > 38) { this.setState('getup'); }
        }
        b.gravityScale = 0.9;
        break;
      case 'getup':
        b.vx *= 0.8;
        if (this.t > 14) { this.setState('idle'); this.invuln = Math.max(this.invuln, 30); }
        break;
      case 'super':
        this.updateSuper(g);
        break;
      case 'dead':
        b.vx *= 0.9;
        break;
    }

    const wasAir = !b.onGround;
    // Hold ↓ while leaving a roof so we don't immediately re-land
    b.step(g.bounds.min, g.bounds.max, g.platforms, inp.down('down'));
    if (b.landed && wasAir) this.onLand(g);
    this.updateFx();
  }

  private onLand(g: Game): void {
    const b = this.body;
    if (this.state === 'attack' && this.atk) {
      if (hasCombatCue(this.atk.def, 'plunge')) {
        const d = this.atk.def;
        this.atk.f = d.startup + d.active;
        const waveKey = this.activeChainStyle().plungeWaveKey ?? 'plungeWave';
        const wave = this.resolveAttack(waveKey);
        if (wave) g.areaHit(this, b.x, b.y - 20, 110, 60, wave);
        g.cam.shake(9, 14);
        g.fx.ring(b.x, b.y - 4, 90, '#ff4060', 20);
        g.fx.dust(b.x, b.y, 14);
        g.fx.flare(b.x, b.y - 10, 90, '#ff2040', 14);
        playSfx(g.audio, 'hitHeavy');
        return;
      }
      if (this.atk.def.air || hasCombatCue(this.atk.def, 'rising') || hasCombatCue(this.atk.def, 'launcher')) {
        this.atk = null;
        this.setState('idle');
      }
    }
    if (this.state === 'air') { this.setState('idle'); this.landT = 8; }
    g.fx.dust(b.x, b.y, 4);
    playSfx(g.audio, 'land');
  }

  /** →↓+攻, or grab a nearby foe while holding forward+down. */
  private tryThrow(g: Game): boolean {
    const now = this.motionClock;
    const cmd = matchCommand(this.motionBuf, ['F', 'D'], now);
    let proximity = false;
    if (!cmd) {
      const inp = g.input;
      const ax = inp.axisX();
      const pressingIn = (ax > 0 && this.facing > 0) || (ax < 0 && this.facing < 0);
      if (pressingIn && inp.down('down')) {
        for (const e of g.targets()) {
          if (e.dead) continue;
          const dx = (e.x - this.x) * this.facing;
          if (dx > 0 && dx < 58 && Math.abs(e.y - this.y) < 40) {
            proximity = true;
            break;
          }
        }
      }
    }
    if (!cmd && !proximity) return false;
    if (this.stamina < STA.throw * 0.5) return false;
    this.sharpness = Math.max(0, this.sharpness - SHARP.throw);
    const throwKey = this.activeChainStyle().branches.throw;
    const throwDef = this.resolveAttack(throwKey);
    if (!throwDef) return false;
    this.doAttack(g, throwDef);
    g.texts.add('抓投', this.x, this.y - 105, '#ffd0a0', 16);
    return true;
  }

  private isBare(): boolean { return weaponCategory(this.weapon.id) === 'bare'; }

  /** Resolve attackKey → AttackDef (catalog first, core seed fallback). */
  private resolveAttack(key: string): AttackDef | undefined {
    return getAttackBox(key) ?? SEED_BY_NAME[key];
  }

  private mustAttack(key: string): AttackDef {
    const d = this.resolveAttack(key);
    if (d) return d;
    // Soft: should not happen for core style keys; fall back to slash1 seed.
    return SEED_BY_NAME.slash1;
  }

  /** Catalog-first Style (WeaponDef.combatStyleId → category → CORE). */
  private activeChainStyle(): AttackChainStyle {
    return resolveCombatStyle(this.weapon.def);
  }

  private chooseAttack(g: Game): AttackDef {
    const inp = g.input;
    const ax = inp.axisX();
    if (ax !== 0) this.facing = ax > 0 ? 1 : -1;
    const b = this.body;
    const up = inp.down('up');
    const down = inp.down('down');
    const style = this.activeChainStyle();
    const bare = style.id === 'bare';
    const chainKeys = style.groundKeys;
    const br = style.branches;
    if (b.onGround) {
      if (this.mods.canDash && (this.state === 'dash' || this.sinceDash < 10)) {
        this.comboBranch = 'drain';
        return this.mustAttack(br.dash);
      }
      if (up) { inp.consume('jump'); return this.mustAttack(br.groundUp); }
      if (down) return this.mustAttack(br.groundDown);
      const finisherNames = [br.finisherPoise, br.finisherDrain, 'finisher', br.dash].filter(Boolean) as string[];
      const prevGround = this.atk && (
        chainKeys.includes(this.atk.def.name)
        || finisherNames.includes(this.atk.def.name)
      );
      const chained = (this.state === 'attack' && prevGround) || this.chainOpen > 0;
      if (!chained) { this.comboStep = 0; this.comboBranch = 'poise'; }
      else this.comboStep = (this.comboStep + 1) % chainKeys.length;
      // 连招分支：轻轻→重 = 破韧；闪踢后接下段 = 吸血控距
      const afterDash = this.comboBranch === 'drain' && this.atk && this.atk.def.name === br.dash;
      if (!bare && (this.comboStep === chainKeys.length - 1 || afterDash)) {
        const sr = this.mods.skillRanks ?? {};
        const mastery = (sr.pojun ?? 0) >= 3 || (sr.daomang ?? 0) >= 3 || (sr.qiangjue ?? 0) >= 3
          || (sr.bengquan ?? 0) >= 3 || (sr.kaitian ?? 0) >= 3 || (sr.chuanxin ?? 0) >= 3
          || (sr.zhanma ?? 0) >= 3 || (sr.huixuan ?? 0) >= 3;
        if (this.comboBranch === 'drain' && br.finisherDrain) {
          this.comboBranch = null;
          const d = { ...this.mustAttack(br.finisherDrain) };
          if (mastery) { d.damage = Math.round(d.damage * 1.12); d.kbX = (d.kbX ?? 10) * 1.1; }
          return d;
        }
        if (br.finisherPoise) {
          const d = { ...this.mustAttack(br.finisherPoise) };
          if (mastery) { d.damage = Math.round(d.damage * 1.1); d.poiseScale = (d.poiseScale ?? 2.4) * 1.15; }
          return d;
        }
      }
      return this.mustAttack(chainKeys[this.comboStep]);
    }
    if (down) return this.mustAttack(br.airDown);
    if (up && this.airTime < 12 && this.airAttacks === 0) return this.mustAttack(br.airUp);
    this.comboStep = (this.comboStep + 1) % 2;
    return this.mustAttack(br.airNeutral[this.comboStep]);
  }

  private doAttack(g: Game, def: AttackDef): void {
    const b = this.body;
    const cost = staminaCostFor(def);
    if (this.stamina < cost * 0.4) {
      g.texts.add('体力不足', this.x, this.y - 100, '#9a90b0', 14);
      return;
    }
    this.spendStamina(cost);
    this.startAttack(def);
    this.trail.length = 0;
    if (def.air) {
      // Air juggling: keep hovering as long as attacks keep coming within 1s and connecting.
      const keep = this.airAttacks === 0 || (this.airChain > 0 && this.lastAirHit);
      if (keep) b.vy = Math.min(b.vy, -2.6 * this.weapon.def.airHover);
      this.airAttacks++;
      this.airChain = 60;
      this.lastAirHit = false;
    }
    if (hasCombatCue(def, 'rising')) { b.vy = -11.5; this.airAttacks++; }
    if (hasCombatCue(def, 'plunge')) { b.vy = -3; }
  }

  private updateAttack(g: Game): void {
    const a = this.atk;
    const b = this.body;
    if (!a) { this.setState('idle'); return; }
    const d = a.def;
    a.f++;
    const mf = d.moveFrames ?? d.startup + d.active;
    if (d.moveX && a.f <= mf) b.vx = this.facing * d.moveX;
    else b.vx *= b.onGround ? 0.72 : 0.94;
    if (a.f === d.startup) {
      if (d.swing && d.swing !== 'none') {
        const sfx = d.swing === 'kick' || d.swing === 'claw' ? 'kick'
          : d.swing === 'heavy' || d.swing === 'bash' ? 'heavy' : 'slash';
        playSfx(g.audio, sfx);
      }
    }
    // 剑气 VFX — data flag swordQi (W3; was PM.finisher|launcher|counter identity)
    if (a.f === d.startup + 1 && d.swordQi) {
      const tipY = b.y - 70;
      g.fx.swordQi(b.x + this.facing * 20, tipY, this.facing, !!d.heavy);
    }
    if (hasCombatCue(d, 'launcher') && a.f === d.startup && (g.input.down('up') || g.input.down('jump'))) {
      b.vy = -12.5;
      b.onGround = false;
    }
    if (d.air) b.gravityScale = this.airAttacks > 0 && a.f < d.startup + d.active + 6 ? 0.28 : 0.7;
    if (hasCombatCue(d, 'rising')) b.gravityScale = 0.8;
    if (hasCombatCue(d, 'plunge')) {
      if (a.f < d.startup) { b.noGravity = true; b.vy = 0; b.vx *= 0.5; }
      else if (!b.onGround) { b.vy = 15; b.vx = this.facing * 1.5; a.f = d.startup; }
    }
    if (a.f >= d.startup + d.active + d.recovery) {
      if (a.hit.size === 0) this.spendStamina(STA.whiff);
      // SkillDef.attackChain auto-follow (e.g. 虎爪 多段)
      if (this.skillChainId) {
        const sdef = SKILL_BY_ID[this.skillChainId];
        const chain = sdef?.attackChain ?? [];
        const nextKey = chain[this.skillChainStep];
        if (nextKey) {
          // W1: attackChain ids resolve via ctx.attacks only
          const next = getAttackBox(nextKey);
          if (next) {
            this.skillChainStep += 1;
            const eff = effectsAtRank(this.skillChainId, this.mods.skillRanks[this.skillChainId] ?? 1);
            this.startAttack({ ...next, damage: Math.round(next.damage * eff.skillDmgMult * fragmentSkillDmgMul(g.fragments)) });
            return;
          }
          g.texts.add('招式未备', this.x, this.y - 100, '#c8a0a8', 14);
        }
        this.skillChainId = null;
        this.skillChainStep = 0;
      }
      this.atk = null;
      const style = this.activeChainStyle();
      const inChain = style.groundKeys.includes(d.name);
      const noOpen = style.noChainOpen.includes(d.name);
      this.chainOpen = inChain && !noOpen ? chainOpenFrames(this.weapon) : 0;
      this.setState(b.onGround ? 'idle' : 'air');
    }
  }

  private startDash(g: Game, dir: 1 | -1): void {
    const b = this.body;
    // 气势 cost — empty blocks spam dodge (stamina/guard still available)
    if (this.rage < 3) {
      g.texts.add('气势不足', this.x, this.y - 100, '#c8a0b0', 14);
      this.dashCd = Math.max(this.dashCd, 10);
      return;
    }
    const spent = Math.min(this.rage, DASH_RAGE_COST);
    this.rage = Math.max(0, this.rage - spent);
    const lowQi = spent < DASH_RAGE_COST;
    this.spendStamina(STA.dash * (lowQi ? 1.35 : 1));
    this.atk = null;
    this.setState('dash');
    this.dashDir = dir;
    this.facing = dir;
    let ifr = this.mods.dashIframes;
    ifr += canyueDashIframeBonus(g.stageAffix);
    if (lowQi) ifr = Math.max(4, Math.floor(ifr * 0.55));
    this.invuln = Math.max(this.invuln, ifr);
    let cd = 26 * fragmentDashCdMul(g.fragments);
    cd *= canyueDashCdMul(g.stageAffix);
    if (this.mods.setDashCdMul) cd *= this.mods.setDashCdMul;
    if (this.yingbuT > 0) { cd *= 0.72; ifr = Math.max(ifr, ifr + 2); }
    if (lowQi) cd *= 1.25;
    this.dashCd = Math.round(cd);
    this.huashiDash = hasDashMorph(g.stageAffix);
    if (this.huashiDash) {
      this.huashiLenMul = huashiDashLenMul(g.stageAffix);
      this.huashiSlide = huashiSlideVx(g.stageAffix);
      this.huashiSpeed = huashiDashSpeed(g.stageAffix);
    }
    if (!b.onGround) this.airDashUsed = true;
    b.vy = 0;
    playSfx(g.audio, 'dash');
    g.fx.dust(b.x, b.y, 6, -dir);
    if (lowQi) g.texts.add('残势闪身', this.x, this.y - 95, '#b090a0', 12);
    if (g.meta) {
      for (const s of skillsWithProfOn('dash')) {
        if (!g.meta.hasSkill(s.id)) continue;
        if (g.meta.addProf(s.id, 3)) g.showBanner('熟练度提升', s.name, 90);
      }
    }
  }

  currentTalisman(): TalismanSlot {
    const s = this.talismanSlots[this.talismanIndex];
    if (s && s.n > 0) return s;
    // fall through to first non-empty
    for (let i = 0; i < TALISMAN_SLOT_COUNT; i++) {
      const t = this.talismanSlots[i];
      if (t && t.n > 0) {
        this.talismanIndex = i;
        return t;
      }
    }
    return null;
  }

  cycleTalisman(g: Game): void {
    const start = this.talismanIndex;
    for (let step = 1; step <= TALISMAN_SLOT_COUNT; step++) {
      const i = (start + step) % TALISMAN_SLOT_COUNT;
      const s = this.talismanSlots[i];
      if (s && s.n > 0) {
        this.talismanIndex = i;
        const def = TALISMAN_BY_ID[s.id];
        if (!def) { this.talismanIndex = i; return; }
        g.texts.add(`切换·${def.name}`, this.x, this.y - 110, def.color, 14);
        playSfx(g.audio, 'ui');
        return;
      }
    }
    g.texts.add('无其他灵符', this.x, this.y - 100, '#9a90b0', 12);
  }

  useTalisman(g: Game): void {
    if (this.talismanCd > 0) {
      g.texts.add('符箓冷却', this.x, this.y - 100, '#9a90b0', 14);
      return;
    }
    const s = this.currentTalisman();
    if (!s || s.n <= 0) {
      g.texts.add('无灵符', this.x, this.y - 100, '#c8a0a8', 14);
      return;
    }
    const id = s.id as TalismanId;
    const def = TALISMAN_BY_ID[id];
    if (!def) {
      g.texts.add('符咒失效', this.x, this.y - 100, '#c8a0a8', 14);
      return;
    }
    s.n -= 1;
    if (s.n <= 0) {
      this.talismanSlots[this.talismanIndex] = null;
      // auto-advance to next charged slot
      for (let i = 0; i < TALISMAN_SLOT_COUNT; i++) {
        const t = this.talismanSlots[i];
        if (t && t.n > 0) { this.talismanIndex = i; break; }
      }
    }
    this.talismanCd = 90;
    g.applyTalisman(id);
    g.texts.add(def.name, this.x, this.y - 115, def.color, 18, true);
    g.fx.flare(this.x, this.y - 40, 70, def.color, 20);
    playSfx(g.audio, 'ui');
  }

  private startSuper(g: Game): void {
    this.rage = 0;
    this.atk = null;
    this.setState('super');
    this.invuln = 999;
    this.body.vx = 0;
    g.beginSuper();
  }

  private updateSuper(g: Game): void {
    const b = this.body;
    b.vx = 0;
    if (this.t < 22) { b.noGravity = true; b.vy = -0.8; }
    else if (this.t < 70) { b.noGravity = true; b.vy = 0; }
    if (this.t < 22 && this.t % 2 === 0) g.fx.spawn({ kind: 'ember', x: b.x + (Math.random() - 0.5) * 160, y: b.y - Math.random() * 140, vx: 0, vy: -1, life: 30, size: 2.5, color: '#c0d8ff', add: true });
    if (this.t === 20) g.fx.swordQi(b.x, b.y - 80, this.facing, true);
    const slashes = [24, 30, 36, 42, 48, 54];
    const idx = slashes.indexOf(this.t);
    if (idx >= 0) g.superSlash(idx);
    if (this.t === 66) g.superFinal();
    if (this.t >= 84) {
      this.invuln = 24;
      this.setState(b.onGround ? 'idle' : 'air');
      g.endSuper();
    }
  }

  /** Called by the combat resolver when an enemy hit lands on the player. */
  onHurt(g: Game, def: AttackDef, dir: number, dmg: number): void {
    if (this.god) dmg = 0;
    const b = this.body;
    this.sinceCombat = 0;
    // Hyper armor: still take damage, but no interrupt from non-heavy
    const tier = stunTierOf(def);
    const hyper = this.hasHyperArmor() && tier < 3 && !def.ultimate && !def.throw;
    if (!hyper) {
      this.atk = null;
      this.skillChainId = null;
      this.skillChainStep = 0;
    }
    this.hp = Math.max(0, this.hp - dmg);
    this.flash = 8;
    this.addRage(3);
    g.stats.damageTaken += dmg;
    if (g.meta && this.hp > 0) {
      for (const s of skillsWithProfOn('hitTaken')) {
        if (!g.meta.hasSkill(s.id)) continue;
        if (g.meta.addProf(s.id, 2)) g.showBanner('熟练度提升', s.name, 90);
      }
    }
    g.combo.break();
    playSfx(g.audio, 'hurt');
    this.facing = dir > 0 ? -1 : 1;
    if (hyper) {
      this.flash = 6;
      if (this.hyperArmorT > 0) g.texts.add('霸体', this.x, this.y - 100, '#ffd27a', 14);
      return;
    }
    if (this.hp <= 0 || def.launch || def.knockdown || dmg >= 18) {
      this.setState('down');
      b.vx = dir * Math.max(4, def.kbX);
      b.vy = Math.min(-6, def.kbY);
      b.onGround = false;
      this.invuln = 90;
      this.hurtTier = 3;
    } else {
      this.setState('hurt');
      const incoming = Math.max(14, Math.round(def.hitstun * 0.6));
      // Hitstun hierarchy: lighter hits cannot mash down a heavier stun
      if (this.hitstun > 0 && tier < this.hurtTier) {
        this.hitstun = Math.max(this.hitstun, Math.floor(incoming * 0.5));
      } else {
        this.hitstun = Math.max(this.hitstun, incoming);
        this.hurtTier = tier;
      }
      b.vx = dir * def.kbX;
      this.invuln = this.hitstun + 18;
    }
  }

  guardBreak(g: Game, dir: number): void {
    this.setState('hurt');
    this.hitstun = 42;
    this.body.vx = dir * 7;
    this.invuln = 30;
    g.texts.add('破防!', this.x, this.y - 110, '#ff8060', 22);
  }


  /** Play SkillDef.castAnim (look) alongside castFx (VFX/settlement). Both may fire. */
  private playSkillAnim(g: Game, def: import('../meta/skills').SkillDef, color: string): void {
    if (def.castAnim) g.animScripts.playCastAnim(g, def.castAnim, color, this);
  }

  // ---------------- visuals ----------------
  /** Soft single-frame HP loco: catalog `hp.<slot>` strike if registered, else hard HP. */
  private softHp(slot: 'idle' | 'idle2' | 'run1' | 'run2' | 'hurt'): Pose {
    return locoPose(`hp.${slot}`, HP[slot]);
  }

  /** Public for smoke / draw; Anim override still wins. */
  computePose(): Pose {
    if (this.animPoseOverride && this.animPoseT > 0) return this.animPoseOverride;
    const b = this.body;
    switch (this.state) {
      case 'run': return cycle(this.softHp('run1'), this.softHp('run2'), this.runPhase);
      case 'air': return lerpPose(HP.jump, HP.fall, clamp((b.vy + 6) / 12, 0, 1));
      case 'guard': return HP.guard;
      case 'dash': return HP.dash;
      case 'hurt': return this.softHp('hurt');
      case 'down': return b.onGround ? HP.down : lerpPose(HP.hurt, HP.down, clamp(this.t / 20, 0, 1));
      case 'dead': return HP.down;
      case 'getup': return lerpPose(HP.getup, HP.idle, this.t / 14);
      case 'super': {
        const set = getAttackPose('slash3') ?? HUNTER_ATTACKS.slash3;
        if (this.t < 22) return lerpPose(HP.idle, HP.charge, this.t / 22);
        if (this.t < 66) return (this.t >> 2) % 2 ? set.strike : set.wind;
        return (getAttackPose('finisher') ?? HUNTER_ATTACKS.finisher).strike;
      }
      case 'attack': {
        if (!this.atk) return HP.idle;
        const set = getAttackPose(this.atk.def.name) ?? HUNTER_ATTACKS[this.atk.def.name] ?? HUNTER_ATTACKS.slash1;
        const rest = b.onGround ? HP.idle : HP.fall;
        return attackPose(this.atk, set, rest);
      }
      default: {
        const base = cycle(this.softHp('idle'), this.softHp('idle2'), this.t * 0.06);
        return this.landT > 0 ? lerpPose(base, HP.land, this.landT / 8) : base;
      }
    }
  }

  private updateFx(): void {
    for (const gh of this.ghosts) gh.age++;
    this.ghosts = this.ghosts.filter((g) => g.age < 12);
    for (const t of this.trail) t.age++;
    this.trail = this.trail.filter((t) => t.age < 7);
  }

  draw(ctx: CanvasRenderingContext2D, g: Game): void {
    const b = this.body;
    this.pose = this.computePose();
    // shadow (under feet — works on roofs too)
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    const hgt = Math.max(0, GROUND_Y - b.y);
    const shadowY = b.onGround ? b.y + 2 : GROUND_Y + 2;
    const sw = b.onGround ? 22 : Math.max(8, 22 - hgt * 0.05);
    ctx.beginPath();
    ctx.ellipse(b.x, shadowY, sw, b.onGround ? 5 : Math.max(3, 5 - hgt * 0.01), 0, 0, Math.PI * 2);
    ctx.fill();
    // afterimages
    for (const gh of this.ghosts) {
      ctx.save();
      ctx.globalAlpha = (1 - gh.age / 12) * 0.45;
      ctx.translate(gh.x, gh.y);
      ctx.scale(gh.facing, 1);
      drawHunter(ctx, gh.pose, { time: g.tick, speed: 8, ghost: true });
      ctx.restore();
    }
    // blink while invulnerable after being hurt
    if (this.exhaustT > 0) ctx.globalAlpha = 0.55 + 0.2 * Math.sin(g.tick * 0.4);
    else if (this.invuln > 0 && this.state !== 'dash' && this.state !== 'super' && this.state !== 'down' && (g.tick >> 2) % 2 === 0) ctx.globalAlpha = 0.55;
    const jx = this.shakeT > 0 ? (Math.random() - 0.5) * 4 : 0;
    ctx.save();
    ctx.translate(b.x + jx, b.y);
    const sc = this.animScaleT > 0 ? this.animScale : 1;
    ctx.scale(this.facing * sc, sc);
    const glow = this.state === 'super' ? 1 : this.rage >= 80 ? 0.25 + Math.sin(g.tick * 0.15) * 0.1 : 0;
    const j = drawHunter(ctx, this.pose, { time: g.tick, speed: b.vx, flash: this.flash > 4 || this.guardFlash > 3, glow, guard: this.state === 'guard', weapon: this.weapon.def, rim: true });
    ctx.restore();
    ctx.globalAlpha = 1;
    if (this.animTintT > 0) {
      ctx.save();
      ctx.globalAlpha = this.animTintAlpha * Math.min(1, this.animTintT / 6);
      ctx.fillStyle = this.animTintColor;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y - 36, 22, 38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (this.pillAura && this.pillAuraT > 0) this.drawPillAura(ctx, g);
    // record sword trail in world space while swinging
    const a = this.atk;
    if (this.state === 'attack' && a && a.f >= a.def.startup - 1 && a.f <= a.def.startup + a.def.active + 2) {
      const hx = b.x + j.fHand.x * this.facing, hy = b.y + j.fHand.y;
      const tx = b.x + j.tip.x * this.facing, ty = b.y + j.tip.y;
      const last = this.trail[this.trail.length - 1];
      const pt = { hx, hy, ang: Math.atan2(ty - hy, tx - hx), len: Math.hypot(tx - hx, ty - hy), age: 0 };
      if (!last || last.age > 0) this.trail.push(pt);
      else this.trail[this.trail.length - 1] = pt;
    }
    this.drawTrail(ctx);
  }

  /** Continuous whileActive aura while pillAuraT > 0. */
  private drawPillAura(ctx: CanvasRenderingContext2D, g: Game): void {
    const aura = this.pillAura;
    if (!aura) return;
    const color = aura.color ?? '#ffd27a';
    const period = Math.max(8, aura.period ?? 18);
    const pulse = 0.55 + 0.45 * Math.sin((g.tick / period) * Math.PI * 2);
    const x = this.x;
    const y = this.y - 40;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    switch (aura.auraPreset) {
      case 'ring':
        g.fx.ring(x, y, 28 + pulse * 18, color, 2);
        break;
      case 'qi':
        if (g.tick % period === 0) {
          g.fx.spawn({
            kind: 'qi', x: x + (Math.random() - 0.5) * 24, y: y + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 1.2, vy: -1.5 - Math.random(),
            life: 16, size: 8, color, add: true, drag: 0.94,
          });
        }
        break;
      case 'ember':
        if (g.tick % Math.max(4, period >> 1) === 0) {
          g.fx.spawn({
            kind: 'spark', x: x + (Math.random() - 0.5) * 20, y: y + 10,
            vx: (Math.random() - 0.5) * 1.5, vy: -2 - Math.random() * 1.5,
            life: 12, size: 3, color, add: true, drag: 0.9,
          });
        }
        break;
      case 'tint':
      default:
        ctx.globalAlpha = 0.15 + pulse * 0.12;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(x, this.y - 36, 22, 36, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
    ctx.restore();
  }

  private trailFill(a: number): string {
    const hex = this.weapon.def.trail.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  private drawTrail(ctx: CanvasRenderingContext2D): void {
    const T = this.trail;
    if (T.length < 2) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const SUB = 5;
    for (let i = 0; i < T.length - 1; i++) {
      const p = T[i], q = T[i + 1];
      let da = q.ang - p.ang;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      for (let s = 0; s < SUB; s++) {
        const k0 = s / SUB, k1 = (s + 1) / SUB;
        const fade = 1 - (p.age + (q.age - p.age) * k0) / 7;
        if (fade <= 0) continue;
        const pts = [k0, k1].map((k) => {
          const hx = p.hx + (q.hx - p.hx) * k, hy = p.hy + (q.hy - p.hy) * k;
          const a = p.ang + da * k, l = p.len + (q.len - p.len) * k;
          return { ix: hx + Math.cos(a) * l * 0.35, iy: hy + Math.sin(a) * l * 0.35, ox: hx + Math.cos(a) * l * 1.05, oy: hy + Math.sin(a) * l * 1.05 };
        });
        ctx.fillStyle = this.trailFill(0.5 * fade);
        ctx.beginPath();
        ctx.moveTo(pts[0].ix, pts[0].iy);
        ctx.lineTo(pts[0].ox, pts[0].oy);
        ctx.lineTo(pts[1].ox, pts[1].oy);
        ctx.lineTo(pts[1].ix, pts[1].iy);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = `rgba(255,225,232,${0.85 * fade})`;
        ctx.lineWidth = 2.5 * fade + 0.5;
        ctx.beginPath();
        ctx.moveTo(pts[0].ox, pts[0].oy);
        ctx.lineTo(pts[1].ox, pts[1].oy);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

}
