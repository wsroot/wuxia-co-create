/**
 * 内容包「残锋」— W4/C + F3 + X4 + Loco4 示范（NOT a 门派）.
 *
 * 只登记：外观积木 + 挂 lookId/feel/combatStyleId 的刀 + 一招外功（attackKey 指向长夜既有盒）
 * + 自有普攻链 Style（复用长夜既有 attack id，终式挂 daomang）
 * + 自制 animRecipes 一条，外功 castAnim 引用该 id（F3）
 * + 自制 fxRecipes / poses，anim inkBurst + castFx 软引用（X4）
 * + Pose3：playPose timeline:'full' 示范全时间轴 wind→strike→rec
 * + Loco4：覆盖玩家闲姿 `hp.idle`（三帧同填；locoPose 只读 strike；观感可辨）
 * Load: `?pack=bingren` / `__pack.load('bingren')`.
 * 不扩 shape / kind / emitter；不自造招式盒；零核心 diff.
 */
import { Context, Schema } from 'cordis';
import { P } from '../../render/rig';

export interface BingrenConfig {
  /** 残锋诀伤害倍率表末档（化境）. */
  dmgAtMax: number;
}

export const PackBingren = {
  name: 'pack-bingren',
  inject: ['weaponLooks', 'weapons', 'skills', 'combatStyles', 'animRecipes', 'fxRecipes', 'poses'],
  Config: Schema.object({
    dmgAtMax: Schema.number().min(1).max(1.5).default(1.28).description('残锋诀化境伤害倍率'),
  }) as Schema<BingrenConfig>,
  apply(ctx: Context, config: BingrenConfig) {
    const d = config.dmgAtMax;
    const dmg = [1.0, 1.07, 1.14, 1.21, d].map((x) => Math.round(x * 1000) / 1000);

    // 残锋普攻链：地面三连 + 刀芒终式（复用长夜既有盒，勿撞 blade/bare）
    ctx.combatStyles.add({
      id: 'bingren_canfeng_chain',
      groundKeys: ['slash1', 'slash2', 'slash3', 'daomang'],
      branches: {
        dash: 'dashKick',
        groundUp: 'launcher',
        groundDown: 'sweep',
        airDown: 'plunge',
        airUp: 'rising',
        airNeutral: ['airA', 'airB'],
        throw: 'throw',
      },
      noChainOpen: ['daomang', 'throw', 'plunge'],
      plungeWaveKey: 'plungeWave',
    });

    // 兵刃外观积木：弯刃残锋（parts 白名单同枪影）
    ctx.weaponLooks.add({
      id: 'lookBingrenCanfeng',
      label: '残锋弯刃',
      baseShape: 'sword',
      parts: [
        { kind: 'palette', blade: '#c8d0e8', trail: '#7090c0', edge: '#e8f0ff', grip: '#2a2430', metal: '#8090a8' },
        { kind: 'grip', length: 9, width: 3.0, color: '#3a3040', wrapStyle: 'cord' },
        { kind: 'pommel', size: 3.0, color: '#8090a8' },
        { kind: 'guard', style: 'wing', width: 10, color: '#8090a8' },
        { kind: 'blade', profile: 'curved', lengthFrac: 1, width: 2.2 },
        { kind: 'tip', style: 'point', size: 6 },
        { kind: 'runeInlay', text: '残', color: '#7090c0', along: 0.42 },
        { kind: 'inkEdge', width: 0.75 },
        { kind: 'glow', color: '#7090c0', radius: 8, alpha: 0.22 },
        { kind: 'swingHint', color: '#7090c0', width: 2.2 },
      ],
    });

    ctx.weapons.add({
      id: 'bingren_canfeng',
      name: '残锋',
      lore: '刃缺一角仍可斩夜。残锋一脉所执弯刀，锋上凝一缕冷芒。',
      tip: '刀剑 · 外观积木 lookBingrenCanfeng · 残锋链',
      unlock: { type: 'blueprint', hint: '残锋夜谈偶得' },
      damage: 0.96, speed: 1.04, reach: 1.02, poise: 0.95, rage: 1.0, airHover: 1.0,
      weight: 'medium', category: 'blade',
      affinities: ['juggle'], affinityBonus: 0.12,
      blade: '#c8d0e8', trail: '#7090c0', edge: '#e8f0ff', length: 62, shape: 'sword',
      quality: 'huang', tier: 2,
      lookId: 'lookBingrenCanfeng',
      combatStyleId: 'bingren_canfeng_chain',
      feel: { boxTune: { tipXPush: 6, tipWFloorMul: 0.95 } },
      craft: { materials: { iron: 2, silk: 1 }, fee: 22 },
    });

    // X4: 自建姿态（slash1 冷抄再略倾；三帧可辨）
    ctx.poses.add({
      id: 'bingren_canmang_pose',
      wind: P({ y: 4, lean: -0.1, ft: 0.5, fk: -0.5, bt: -0.35, bk: -0.3, fa: 2.8, fe: 0.5, ba: -0.65, be: 0.6, w: 0.35 }),
      strike: P({ y: 8, lean: 0.42, head: -0.12, ft: 0.85, fk: -0.8, bt: -0.62, bk: -0.2, fa: 0.95, fe: 0.1, ba: -1.05, be: 0.35, w: 0.12 }),
      rec: P({ y: 6, lean: 0.34, ft: 0.75, fk: -0.7, bt: -0.55, bk: -0.2, fa: 0.35, fe: 0.2, ba: -0.85, be: 0.5, w: 0.18 }),
    });

    // Loco4: 残锋闲姿 — 覆盖玩家 hp.idle（三帧同填；运行时 locoPose 只读 strike；lean 可辨于硬 HP.idle）
    const canfengIdle = P({
      y: 4, lean: 0.38, head: -0.18, ft: 0.5, fk: -0.55, bt: -0.38, bk: -0.32,
      fa: 0.65, fe: 0.85, ba: -0.45, be: 0.55, w: 0.4,
    });
    ctx.poses.add({
      id: 'hp.idle',
      wind: canfengIdle,
      strike: canfengIdle,
      rec: canfengIdle,
    });

    // X4: 自建特效配方（闭集 emitter flare；冷芒色对齐残锋）
    ctx.fxRecipes.add({
      id: 'bingren_cold_flare',
      emitter: 'flare',
      color: '#7090c0',
      size: 52,
      life: 15,
      n: 7,
      heavy: true,
    });

    // F3+X4+Pose3: 本包自制招式样子；playPose+timeline:full 播三帧（零核心 diff）
    ctx.animRecipes.add({
      id: 'bingren_canmang_anim',
      label: '残锋斩芒',
      steps: [
        { kind: 'playPose', poseId: 'bingren_canmang_pose', frames: 12, timeline: 'full' },
        { kind: 'crescentSlash', radius: 80, color: '#7090c0', frames: 10 },
        { kind: 'swordQiFlash', color: '#a0b8e0' },
        { kind: 'inkBurst', recipeId: 'bingren_cold_flare', size: 44 },
        { kind: 'weaponTrail', frames: 12, color: '#7090c0', width: 5 },
        { kind: 'afterimage', count: 3, life: 10, color: '#8090a8', alpha: 0.35 },
        { kind: 'sparkBurst', color: '#c8d0e8', n: 6 },
        { kind: 'sfx', id: 'slash' },
      ],
    });

    // 外功：挂长夜既有招式盒 daomang；castAnim → 本包配方；castFx 挂本包 fxRecipe
    ctx.skills.add({
      id: 'bingren_canmang',
      name: '残锋诀',
      fogName: '武学·锋??',
      kind: 'active',
      track: 'combat',
      lore: '缺刃亦能成芒。持刀剑凝残锋一斩，须识刀剑门径。',
      tip: '刀剑：残锋斩芒 · 耗内力',
      profHint: '持刀剑施放残锋诀',
      meditateCost: {},
      fee: 0,
      quality: 'huang',
      weaponGate: 'blade',
      neiliCost: 28,
      effects: {
        skillDmgMult: dmg,
        skillCdSec: [15, 14, 13, 12, 11],
      },
      castKind: 'attack',
      attackKey: 'daomang',
      commandSeq: ['D', 'F'],
      commandLabel: '↓→攻',
      hudHint: '残锋↓→J',
      touchPriority: 55,
      castFx: [
        { kind: 'fx', recipeId: 'bingren_cold_flare', at: 'caster' },
        { kind: 'fx', preset: 'swordQi', heavy: true, color: '#7090c0' },
        { kind: 'hitstop', frames: 3 },
        { kind: 'shake', amp: 2, frames: 5 },
        { kind: 'sfx', id: 'slash' },
      ],
      castAnim: 'bingren_canmang_anim',
    });
  },
};
