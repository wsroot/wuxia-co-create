/**
 * Content services — the only way catalogs enter the game.
 *
 * 门派 plugins may only use ctx.skills / ctx.neigong.
 * 内容包 plugins use the other catalogs (weapons, pills, talismans, …).
 *
 *   ctx.weapons    兵刃         ctx.weapons.add(def)
 *   ctx.pills      丹药         ctx.pills.add(def)
 *   ctx.materials  材料         ctx.materials.add(def)
 *   ctx.talismans  灵符 + 符效   ctx.talismans.script(def) / ctx.talismans.add(def)
 *   ctx.stages     幕次关卡      ctx.stages.add(def)              (slot = def.actIndex)
 *   ctx.acts       幕间配置      ctx.acts.pool(actIndex, pool) / ctx.acts.beat(fromAct, beat)
 *   ctx.skills     外功         ctx.skills.add(def)
 *   ctx.neigong    内功心法      ctx.neigong.add(def)
 *   ctx.armorSets  防具套装      ctx.armorSets.add(def)
 *   ctx.wepAffixes 兵器词缀      ctx.wepAffixes.add(def)
 *   ctx.affixes    场地词缀      ctx.affixes.add(def)
 *   ctx.enemies    敌人原型      ctx.enemies.add(def)
 *   ctx.eliteMods  精英词条      ctx.eliteMods.add(def)
 *   ctx.titles     战绩称号      ctx.titles.add(def)
 *   ctx.bossKits   Boss 招式权重  ctx.bossKits.add(def)
 *   ctx.fragments  局内残页      ctx.fragments.add(def)
 *   ctx.armorPieces 单件防具底表  ctx.armorPieces.add(def)
 *   ctx.attacks    攻击盒         ctx.attacks.add(def)
 *   ctx.combatStyles 普攻链套路   ctx.combatStyles.add(def)
 *   ctx.poses      攻击姿态       ctx.poses.add(def)
 *   ctx.projectiles 投射物配方    ctx.projectiles.add(def)
 *   ctx.fxRecipes  特效配方       ctx.fxRecipes.add(def)
 *   ctx.animRecipes 动画积木配方   ctx.animRecipes.add(def)
 *   ctx.weaponLooks 兵刃外观积木   ctx.weaponLooks.add(def)
 *   ctx.sheets     包内图集       ctx.sheets.add(def)
 *   ctx.sfx        音效           ctx.sfx.add(def)
 *   ctx.volleys    弹幕模板       ctx.volleys.add(def)
 *   ctx.silhouettes 剪影配方      ctx.silhouettes.add(def)
 *   ctx.behaviors  行为配方       ctx.behaviors.add(def)
 *   ctx.backdrops  幕氛围         ctx.backdrops.add(def)
 *   ctx.bossMoves  Boss 招式      ctx.bossMoves.add(def)
 *   ctx.colliders  碰撞体         ctx.colliders.add(def)
 *
 * Each add() is tied to the calling plugin's scope (Cordis `ctx.effect`):
 * when that plugin is unloaded the entry disappears and anything it was
 * covering (same id / same slot) comes back. Invalid definitions are rejected
 * with a warning and never reach the game.
 */
import { Context, Service, Schema } from 'cordis';
import { clearSfxBuffer } from '../audio/sfxBuffers';
import type { WeaponDef } from '../meta/weapons';
import type { PillDef } from '../meta/alchemy';
import type { MaterialDef } from '../meta/materials';
import type { TalismanDef } from '../meta/talismans';
import type { TalismanScriptDef } from '../meta/talismanScripts';
import type { StageDef } from '../level/stage';
import type { ActPool } from '../level/actPools';
import type { StageBeat } from '../level/narrative';
import type { SkillDef } from '../meta/skills';
import type { NeigongDef } from '../meta/neigong';
import type { ArmorSetDef } from '../meta/armorSets';
import type { WepAffixDef } from '../meta/weaponInstAffix';
import type { AffixDef } from '../level/affixes';
import type { EnemyDef } from '../entities/enemies/factory';
import type { EliteModDef } from '../level/eliteMods';
import type { TitleDef } from '../meta/titles';
import type { BossKitDef } from '../level/actPools';
import type { FragmentDef } from '../meta/runFragments';
import type { ArmorDef } from '../meta/gear';
import type {
  AttackBoxDef, PoseDef, ProjectileDef, FxRecipeDef, SheetDef, SfxDef,
  VolleyDef, SilhouetteDef, BehaviorDef, BackdropDef, BossMoveDef,
  ColliderProfile,
} from '../meta/bTier';
import type { AnimRecipeDef } from '../meta/animScripts';
import type { WeaponLookDef } from '../meta/weaponLooks';
import type { CombatStyleDef } from '../combat/playerMoves';
import { KeyedStack, SlotStack } from './stack';
import {
  WeaponSchema, PillSchema, MaterialSchema, TalismanSchema, TalismanScriptSchema,
  StageSchema, ActPoolSchema, BeatSchema, validateSteps,
  SkillSchema, NeigongSchema, ArmorSetSchema, WepAffixSchema,
  AffixSchema, EnemySchema, EliteModSchema, TitleSchema,
  BossKitSchema, FragmentSchema, ArmorPieceSchema,
  AttackBoxSchema, CombatStyleSchema, PoseSchema, ProjectileSchema, FxRecipeSchema,
  SheetSchema, SfxSchema, VolleySchema, SilhouetteSchema, BehaviorSchema,
  BackdropSchema, BossMoveSchema, ColliderSchema, validateBehaviorSteps,
  validateEnemyAssembly,
  AnimRecipeSchema, validateAnimSteps,
  WeaponLookSchema, validateWeaponLookParts,
} from './schemas';

/**
 * castFx policy (opened): SkillDef.castFx may use the full ScriptStep set
 * (same as talismans), including damageRadius / spawnVolley / status.
 * Still data-only — no plugin functions.
 */
declare module 'cordis' {
  interface Context {
    weapons: WeaponService;
    pills: PillService;
    materials: MaterialService;
    talismans: TalismanService;
    stages: StageService;
    acts: ActService;
    skills: SkillService;
    neigong: NeigongService;
    armorSets: ArmorSetService;
    wepAffixes: WepAffixService;
    affixes: AffixService;
    enemies: EnemyService;
    eliteMods: EliteModService;
    titles: TitleService;
    bossKits: BossKitService;
    fragments: FragmentService;
    armorPieces: ArmorPieceService;
    attacks: AttackBoxService;
    combatStyles: CombatStyleService;
    poses: PoseService;
    projectiles: ProjectileService;
    fxRecipes: FxRecipeService;
    sheets: SheetService;
    sfx: SfxCatalogService;
    volleys: VolleyService;
    silhouettes: SilhouetteService;
    behaviors: BehaviorService;
    backdrops: BackdropService;
    bossMoves: BossMoveService;
    animRecipes: AnimRecipeService;
    weaponLooks: WeaponLookService;
    colliders: ColliderService;
  }
}

/** Returned for rejected definitions so callers can always call dispose(). */
const noop = () => {};

function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * Shared plumbing. Note: inside a service method `this.ctx` is the *caller's*
 * context (Cordis tracks it), so `this.ctx.effect` binds the entry to the
 * plugin that called add().
 */
abstract class ContentService extends Service {
  protected abstract readonly label: string;

  protected check(schema: Schema, def: unknown, what: string, extra?: (d: any) => void): boolean {
    try {
      schema(def);
      extra?.(def);
      return true;
    } catch (e) {
      this.ctx.logger('content').warn(`${this.label}「${what}」定义无效，已忽略：${errText(e)}`);
      return false;
    }
  }

  protected bind(push: () => () => void): () => void {
    return this.ctx.effect(push);
  }

  protected idOf(def: unknown): string {
    const id = (def as { id?: unknown } | null)?.id;
    return typeof id === 'string' ? id : '?';
  }
}

/** Generic id-keyed catalog service. */
abstract class CatalogService<T extends { id: string }> extends ContentService {
  readonly store = new KeyedStack<T>();
  protected abstract readonly defSchema: Schema;

  /** Register (or override) a definition for the calling plugin. */
  add(def: T): () => void {
    if (!this.check(this.defSchema, def, this.idOf(def))) return noop;
    return this.bind(() => this.store.push(def.id, def));
  }

  get(id: string): T | undefined {
    return this.store.map[id];
  }

  has(id: string): boolean {
    return this.store.map[id] !== undefined;
  }

  /** Live list (registration order). Do not mutate. */
  list(): T[] {
    return this.store.list;
  }

  /** Live id map (supports `id in map`). Do not mutate. */
  map(): Record<string, T> {
    return this.store.map;
  }
}

export class WeaponService extends CatalogService<WeaponDef> {
  protected readonly label = '兵刃';
  protected readonly defSchema = WeaponSchema;
  constructor(ctx: Context) { super(ctx, 'weapons', true); }

  override add(def: WeaponDef): () => void {
    const ok = this.check(this.defSchema, def, this.idOf(def), (d: WeaponDef) => {
      if (d.sprite != null && (d.sprite.sheetId == null || d.sprite.sheetId === '')) {
        throw new TypeError('sprite.sheetId 必填（须为已登记图集 id）');
      }
      if (d.sprite?.sheetId) {
        const sid = d.sprite.sheetId;
        if (/^https?:\/\//i.test(sid) || sid.includes('://')) {
          throw new TypeError('sprite.sheetId 禁止外链 URL');
        }
        // Missing sheet id soft-skips at draw time (parametric blade); no cross-service inject.
      }
      if (d.lookId) {
        if (/^https?:\/\//i.test(d.lookId) || d.lookId.includes('://')) {
          throw new TypeError('lookId 禁止外链 URL');
        }
      }
      if (d.parts?.length) validateWeaponLookParts(d.parts, `兵刃「${d.id}」.parts`);
    });
    if (!ok) return noop;
    return this.bind(() => this.store.push(def.id, def));
  }
}

export class PillService extends CatalogService<PillDef> {
  protected readonly label = '丹药';
  protected readonly defSchema = PillSchema;
  constructor(ctx: Context) { super(ctx, 'pills', true); }
}

export class MaterialService extends CatalogService<MaterialDef> {
  protected readonly label = '材料';
  protected readonly defSchema = MaterialSchema;
  constructor(ctx: Context) { super(ctx, 'materials', true); }
}

/** 灵符 defs + their data-only effect timelines (run by the core script player). */
export class TalismanService extends CatalogService<TalismanDef> {
  protected readonly label = '灵符';
  protected readonly defSchema = TalismanSchema;
  readonly scripts = new KeyedStack<TalismanScriptDef>();
  constructor(ctx: Context) { super(ctx, 'talismans', true); }

  override add(def: TalismanDef): () => void {
    const ok = this.check(this.defSchema, def, this.idOf(def), (d: TalismanDef) => {
      if (d.icon) {
        if (/^https?:\/\//i.test(d.icon) || d.icon.includes('://')) {
          throw new TypeError('灵符 icon 禁止外链 URL');
        }
      }
      if (d.timeline && d.timeline.length) validateSteps(d.timeline, 'timeline');
      if (d.anim && Array.isArray(d.anim) && d.anim.length) validateAnimSteps(d.anim, 'anim');
    });
    if (!ok) return noop;
    const sid = def.scriptId ?? def.id;
    if (!(def.timeline && def.timeline.length) && !this.scripts.map[sid]) {
      this.ctx.logger('content').warn(`灵符「${def.id}」引用的符效 ${sid} 尚未登记（施放时会退化为只显示名字）`);
    }
    return this.bind(() => this.store.push(def.id, def));
  }

  /** Register an effect timeline (data steps only). */
  script(def: TalismanScriptDef): () => void {
    const ok = this.check(TalismanScriptSchema, def, this.idOf(def), (d: TalismanScriptDef) => {
      validateSteps(d.steps, 'steps');
      if (d.anim && Array.isArray(d.anim) && d.anim.length) validateAnimSteps(d.anim, 'anim');
    });
    if (!ok) return noop;
    return this.bind(() => this.scripts.push(def.id, def));
  }

  getScript(id: string): TalismanScriptDef | undefined {
    return this.scripts.map[id];
  }

  listScripts(): TalismanScriptDef[] {
    return this.scripts.list;
  }
}

/** Campaign stages; slot = def.actIndex (save-stable). */
export class StageService extends ContentService {
  protected readonly label = '幕次';
  readonly byId: Record<string, StageDef> = Object.create(null);
  readonly slots = new SlotStack<StageDef>(() => this.reindex());
  constructor(ctx: Context) { super(ctx, 'stages', true); }

  private reindex(): void {
    for (const k of Object.keys(this.byId)) delete this.byId[k];
    for (const s of this.slots.list) if (s) this.byId[s.id] = s;
  }

  add(def: StageDef): () => void {
    const ok = this.check(StageSchema, def, this.idOf(def), (d: StageDef) => {
      const other = this.slots.list.findIndex((s) => s && s.id === d.id);
      if (other >= 0 && other !== d.actIndex) {
        throw new Error(`id ${d.id} 已被第 ${other + 1} 幕使用`);
      }
    });
    if (!ok) return noop;
    return this.bind(() => this.slots.push(def.actIndex, def));
  }

  get(id: string): StageDef | undefined {
    return this.byId[id];
  }

  /** Live campaign list — index === actIndex (may contain holes). */
  list(): StageDef[] {
    return this.slots.list;
  }

  /** Number of campaign acts (trailing holes ignored). */
  count(): number {
    return this.slots.length();
  }

  /** Clamped lookup; throws only when nothing is registered at all. */
  at(actIndex: number): StageDef {
    const s = this.slots.clamped(actIndex);
    if (!s) throw new Error('stages: no stages registered');
    return s;
  }
}

/** Per-act loot / elite lean + between-act narrative cards. */
export class ActService extends ContentService {
  protected readonly label = '幕间';
  readonly pools = new SlotStack<ActPool>();
  readonly beats = new SlotStack<StageBeat>();
  constructor(ctx: Context) { super(ctx, 'acts', true); }

  pool(actIndex: number, pool: ActPool): () => void {
    const ok = this.check(ActPoolSchema, pool, `第 ${actIndex + 1} 幕配置`, () => {
      if (!Number.isInteger(actIndex) || actIndex < 0) throw new Error(`actIndex ${actIndex} 无效`);
    });
    if (!ok) return noop;
    return this.bind(() => this.pools.push(actIndex, pool));
  }

  beat(fromAct: number, beat: StageBeat): () => void {
    const ok = this.check(BeatSchema, beat, this.idOf(beat), () => {
      if (!Number.isInteger(fromAct) || fromAct < 0) throw new Error(`fromAct ${fromAct} 无效`);
    });
    if (!ok) return noop;
    return this.bind(() => this.beats.push(fromAct, beat));
  }

  getPool(actIndex: number): ActPool {
    const p = this.pools.clamped(actIndex);
    if (!p) throw new Error('acts: no act pools registered');
    return p;
  }

  listPools(): ActPool[] {
    return this.pools.list;
  }

  getBeat(fromAct: number): StageBeat | undefined {
    return this.beats.list[fromAct];
  }

  listBeats(): StageBeat[] {
    return this.beats.list;
  }
}

export class SkillService extends CatalogService<SkillDef> {
  protected readonly label = '外功';
  protected readonly defSchema = SkillSchema;
  constructor(ctx: Context) { super(ctx, 'skills', true); }

  override add(def: SkillDef): () => void {
    const ok = this.check(this.defSchema, def, this.idOf(def), (d: SkillDef) => {
      // castFx: full ScriptStep set (talisman parity); damage-capable allowed.
      if (d.castFx && d.castFx.length) validateSteps(d.castFx, 'castFx');
      if (d.castAnim) {
        if (typeof d.castAnim === 'string') {
          /* recipe id soft-resolved at play time */
        } else if (Array.isArray(d.castAnim) && d.castAnim.length) {
          validateAnimSteps(d.castAnim, 'castAnim');
        }
      }
    });
    if (!ok) return noop;
    return this.bind(() => this.store.push(def.id, def));
  }
}

export class NeigongService extends CatalogService<NeigongDef> {
  protected readonly label = '内功';
  protected readonly defSchema = NeigongSchema;
  constructor(ctx: Context) { super(ctx, 'neigong', true); }
}

export class ArmorSetService extends CatalogService<ArmorSetDef> {
  protected readonly label = '套装';
  protected readonly defSchema = ArmorSetSchema;
  constructor(ctx: Context) { super(ctx, 'armorSets', true); }
}

export class WepAffixService extends CatalogService<WepAffixDef> {
  protected readonly label = '兵器词缀';
  protected readonly defSchema = WepAffixSchema;
  constructor(ctx: Context) { super(ctx, 'wepAffixes', true); }
}


export class EnemyService extends CatalogService<EnemyDef> {
  protected readonly label = '敌人';
  protected readonly defSchema = EnemySchema;
  constructor(ctx: Context) { super(ctx, 'enemies', true); }

  /** P3: without body, require 碰撞+长相+怎么打; with body keep soft-alias compat. */
  override add(def: EnemyDef): () => void {
    const ok = this.check(this.defSchema, def, this.idOf(def), (d: EnemyDef) => {
      validateEnemyAssembly(d);
    });
    if (!ok) return noop;
    return this.bind(() => this.store.push(def.id, def));
  }
}

export class AffixService extends CatalogService<AffixDef> {
  protected readonly label = '场地词缀';
  protected readonly defSchema = AffixSchema;
  constructor(ctx: Context) { super(ctx, 'affixes', true); }
}

export class EliteModService extends CatalogService<EliteModDef> {
  protected readonly label = '精英词条';
  protected readonly defSchema = EliteModSchema;
  constructor(ctx: Context) { super(ctx, 'eliteMods', true); }
}

export class TitleService extends CatalogService<TitleDef> {
  protected readonly label = '称号';
  protected readonly defSchema = TitleSchema;
  constructor(ctx: Context) { super(ctx, 'titles', true); }
}

export class BossKitService extends CatalogService<BossKitDef> {
  protected readonly label = 'Boss套路';
  protected readonly defSchema = BossKitSchema;
  constructor(ctx: Context) { super(ctx, 'bossKits', true); }

  /**
   * Soft-filter move ids against ctx.bossMoves (core + loaded DLC).
   * Missing → warn + drop that weight row; kit still registers.
   * Empty close/far after filter → runtime walk fallback (bossMoveWeights).
   * Does not change AI semantics for valid kits. Register bossMoves before kits.
   */
  override add(def: BossKitDef): () => void {
    if (!this.check(this.defSchema, def, this.idOf(def))) return noop;
    const moves = this.ctx.bossMoves;
    const filterSide = (
      rows: BossKitDef['close'],
      side: 'close' | 'far',
    ): BossKitDef['close'] => {
      const kept: BossKitDef['close'] = [];
      const missing: string[] = [];
      for (const row of rows) {
        if (moves?.has(row.move)) kept.push(row);
        else missing.push(row.move);
      }
      if (missing.length) {
        this.ctx.logger('content').warn(
          `${this.label}「${def.id}」.${side} 引用未登记招式 ${[...new Set(missing)].join('、')}，已跳过（须先 bossMoves.add / 远程先灌 moves）`,
        );
      }
      return kept;
    };
    const filtered: BossKitDef = {
      id: def.id,
      close: filterSide(def.close, 'close'),
      far: filterSide(def.far, 'far'),
    };
    return this.bind(() => this.store.push(filtered.id, filtered));
  }
}

export class FragmentService extends CatalogService<FragmentDef> {
  protected readonly label = '残页';
  protected readonly defSchema = FragmentSchema;
  constructor(ctx: Context) { super(ctx, 'fragments', true); }
}

export class ArmorPieceService extends CatalogService<ArmorDef> {
  protected readonly label = '防具';
  protected readonly defSchema = ArmorPieceSchema;
  constructor(ctx: Context) { super(ctx, 'armorPieces', true); }
}


/* ── B-tier catalogs ─────────────────────────────────────── */

const ART_SRC_RE = /^\.\/art\//;
const SHEET_MAX_BYTES_DEFAULT = 512_000;

export class AttackBoxService extends CatalogService<AttackBoxDef> {
  protected readonly label = '攻击盒';
  protected readonly defSchema = AttackBoxSchema;
  constructor(ctx: Context) { super(ctx, 'attacks', true); }
}

export class CombatStyleService extends CatalogService<CombatStyleDef> {
  protected readonly label = '普攻链';
  protected readonly defSchema = CombatStyleSchema;
  constructor(ctx: Context) { super(ctx, 'combatStyles', true); }

  override add(def: CombatStyleDef): () => void {
    const ok = this.check(this.defSchema, def, this.idOf(def), (d: CombatStyleDef) => {
      if (!d.groundKeys?.length) throw new TypeError('groundKeys 不能为空');
      const air = d.branches?.airNeutral;
      if (!air || air.length !== 2) {
        throw new TypeError('branches.airNeutral 须为长度 2 的 attackKey 元组');
      }
      for (const k of d.groundKeys) {
        if (typeof k !== 'string' || !k) throw new TypeError('groundKeys 含空键');
      }
    });
    if (!ok) return noop;
    return this.bind(() => this.store.push(def.id, def));
  }
}

export class PoseService extends CatalogService<PoseDef> {
  protected readonly label = '姿态';
  protected readonly defSchema = PoseSchema;
  constructor(ctx: Context) { super(ctx, 'poses', true); }
}

export class ProjectileService extends CatalogService<ProjectileDef> {
  protected readonly label = '投射物';
  protected readonly defSchema = ProjectileSchema;
  constructor(ctx: Context) { super(ctx, 'projectiles', true); }
}

export class FxRecipeService extends CatalogService<FxRecipeDef> {
  protected readonly label = '特效配方';
  protected readonly defSchema = FxRecipeSchema;
  constructor(ctx: Context) { super(ctx, 'fxRecipes', true); }
}

export class SheetService extends CatalogService<SheetDef> {
  protected readonly label = '图集';
  protected readonly defSchema = SheetSchema;
  constructor(ctx: Context) { super(ctx, 'sheets', true); }

  override add(def: SheetDef): () => void {
    const ok = this.check(this.defSchema, def, this.idOf(def), (d: SheetDef) => {
      if (/^https?:\/\//i.test(d.src) || d.src.includes('://')) {
        throw new TypeError('图集禁止外链 URL');
      }
      if (!ART_SRC_RE.test(d.src)) {
        throw new TypeError('图集 src 须为 ./art/ 下相对路径');
      }
      if ((d.maxBytes ?? SHEET_MAX_BYTES_DEFAULT) > 2_000_000) {
        throw new TypeError('图集体素限额过大（≤2MB）');
      }
    });
    if (!ok) return noop;
    return this.bind(() => this.store.push(def.id, def));
  }
}

export class SfxCatalogService extends CatalogService<SfxDef> {
  protected readonly label = '音效';
  protected readonly defSchema = SfxSchema;
  constructor(ctx: Context) { super(ctx, 'sfx', true); }

  override add(def: SfxDef): () => void {
    const ok = this.check(this.defSchema, def, this.idOf(def), (d: SfxDef) => {
      if (!d.synth && !d.src) throw new TypeError('音效须提供 synth 或 src');
      if (d.src) {
        if (/^https?:\/\//i.test(d.src) || d.src.includes('://')) {
          throw new TypeError('音效禁止外链 URL');
        }
        if (!ART_SRC_RE.test(d.src)) {
          throw new TypeError('音效 src 须为 ./art/ 下相对路径');
        }
        if (!d.format) throw new TypeError('包内音效须声明 format（wav|ogg|mp3）');
      }
    });
    if (!ok) return noop;
    return this.bind(() => {
      const dispose = this.store.push(def.id, def);
      return () => {
        clearSfxBuffer(def.id);
        dispose();
      };
    });
  }
}

export class VolleyService extends CatalogService<VolleyDef> {
  protected readonly label = '弹幕';
  protected readonly defSchema = VolleySchema;
  constructor(ctx: Context) { super(ctx, 'volleys', true); }
}

export class SilhouetteService extends CatalogService<SilhouetteDef> {
  protected readonly label = '剪影';
  protected readonly defSchema = SilhouetteSchema;
  constructor(ctx: Context) { super(ctx, 'silhouettes', true); }

  override add(def: SilhouetteDef): () => void {
    const ok = this.check(this.defSchema, def, this.idOf(def), (d: SilhouetteDef) => {
      const parts = d.parts;
      if (!parts) return;
      const allowed = new Set([
        'headgear', 'torso', 'offhand', 'mainhand', 'palette', 'scale',
        'cloak', 'armorLayer', 'ornament', 'faceMark', 'stanceBias',
      ]);
      for (const p of parts) {
        const k = (p as { kind?: string }).kind;
        if (!k || !allowed.has(k)) {
          throw new TypeError(`未知剪影部件 kind「${k}」（白名单: ${[...allowed].join('|')}）`);
        }
        if (k === 'mainhand') {
          const mh = p as { weaponId?: string };
          if (mh.weaponId && (/^https?:\/\//i.test(mh.weaponId) || mh.weaponId.includes('://'))) {
            throw new TypeError('mainhand.weaponId 禁止外链 URL');
          }
        }
      }
    });
    if (!ok) return noop;
    return this.bind(() => this.store.push(def.id, def));
  }
}

export class BehaviorService extends CatalogService<BehaviorDef> {
  protected readonly label = '行为';
  protected readonly defSchema = BehaviorSchema;
  constructor(ctx: Context) { super(ctx, 'behaviors', true); }

  override add(def: BehaviorDef): () => void {
    const ok = this.check(this.defSchema, def, this.idOf(def), (d: BehaviorDef) => {
      if (d.steps?.length) validateBehaviorSteps(d.steps, `行为「${d.id}」.steps`);
    });
    if (!ok) return noop;
    return this.bind(() => this.store.push(def.id, def));
  }
}

export class BackdropService extends CatalogService<BackdropDef> {
  protected readonly label = '幕氛围';
  protected readonly defSchema = BackdropSchema;
  constructor(ctx: Context) { super(ctx, 'backdrops', true); }
}

export class BossMoveService extends CatalogService<BossMoveDef> {
  protected readonly label = 'Boss招式';
  protected readonly defSchema = BossMoveSchema;
  constructor(ctx: Context) { super(ctx, 'bossMoves', true); }
}

export class AnimRecipeService extends CatalogService<AnimRecipeDef> {
  protected readonly label = '动画配方';
  protected readonly defSchema = AnimRecipeSchema;
  constructor(ctx: Context) { super(ctx, 'animRecipes', true); }

  override add(def: AnimRecipeDef): () => void {
    const ok = this.check(this.defSchema, def, this.idOf(def), (d: AnimRecipeDef) => {
      if (d.steps?.length) validateAnimSteps(d.steps, `动画「${d.id}」.steps`);
    });
    if (!ok) return noop;
    return this.bind(() => this.store.push(def.id, def));
  }
}


export class WeaponLookService extends CatalogService<WeaponLookDef> {
  protected readonly label = '兵刃外观';
  protected readonly defSchema = WeaponLookSchema;
  constructor(ctx: Context) { super(ctx, 'weaponLooks', true); }

  override add(def: WeaponLookDef): () => void {
    const ok = this.check(this.defSchema, def, this.idOf(def), (d: WeaponLookDef) => {
      if (d.parts?.length) validateWeaponLookParts(d.parts, `外观「${d.id}」.parts`);
      else throw new TypeError('parts 不能为空');
    });
    if (!ok) return noop;
    return this.bind(() => this.store.push(def.id, def));
  }
}


export class ColliderService extends CatalogService<ColliderProfile> {
  protected readonly label = '碰撞体';
  protected readonly defSchema = ColliderSchema;
  constructor(ctx: Context) { super(ctx, 'colliders', true); }
}

/** Plugin that installs every content service on the root context. */
export function ContentServices(ctx: Context): void {
  ctx.plugin(WeaponService);
  ctx.plugin(PillService);
  ctx.plugin(MaterialService);
  ctx.plugin(TalismanService);
  ctx.plugin(StageService);
  ctx.plugin(ActService);
  ctx.plugin(SkillService);
  ctx.plugin(NeigongService);
  ctx.plugin(ArmorSetService);
  ctx.plugin(WepAffixService);
  ctx.plugin(AffixService);
  ctx.plugin(EnemyService);
  ctx.plugin(EliteModService);
  ctx.plugin(TitleService);
  ctx.plugin(BossKitService);
  ctx.plugin(FragmentService);
  ctx.plugin(ArmorPieceService);
  ctx.plugin(AttackBoxService);
  ctx.plugin(CombatStyleService);
  ctx.plugin(PoseService);
  ctx.plugin(ProjectileService);
  ctx.plugin(FxRecipeService);
  ctx.plugin(SheetService);
  ctx.plugin(SfxCatalogService);
  ctx.plugin(VolleyService);
  ctx.plugin(SilhouetteService);
  ctx.plugin(BehaviorService);
  ctx.plugin(BackdropService);
  ctx.plugin(BossMoveService);
  ctx.plugin(AnimRecipeService);
  ctx.plugin(WeaponLookService);
  ctx.plugin(ColliderService);
}

