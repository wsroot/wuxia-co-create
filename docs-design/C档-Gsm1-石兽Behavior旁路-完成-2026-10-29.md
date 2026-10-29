# C 档 Gsm1·石兽 Behavior 空档旁路 — 完成记录

- **日期**：2026-10-29（Asia/Shanghai）
- **范围**：Gargoyle **idle/walk** 在 `EnemyDef.behaviorId`→`getBehavior` 得**非空 `steps`** 时走积木走位/朝向旁路；招 CD 仍走 kit→`chooseMove`→kind 硬状态；无 steps / 核心 `gargoyle` behavior → 与今日 bit-identical
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **未做**：不迁招式 case；不扩 BehaviorStep kind；不改 kit/`chooseMove` 权重；不开 perch/#12；不含 drawKind；不部署；不动 `:4173`/`:4174`

蓝图：`C档-石兽状态机-另债蓝图-2026-10-29.md` 文首验收 · §2.1 方案 A · §2.2 优先级 · §4 Gsm1 · §6 禁区。

## 方案：BehaviorHost + tickBossBehaviorGap

| 项 | 做法 |
| --- | --- |
| 类型墙 | 抽最小 `BehaviorHost`（facing/x/body.vx/walkPhase/setState/faceToward/steps/rt…）；**不** Gargoyle→Enemy |
| Boss 空档 | `tickBossBehaviorGap`：仅 idle\|walk；只跑走位/朝向/姿态持续步（`BOSS_GAP_LOCO_KINDS`）；**不**扣 kit cooldown；**不** tick loadout；**不**挑 melee/ranged/charge 等招式步（soft-skip warn）；**不**进 retreat/aim/attack |
| 退距 | keepDistance 过近 → `walk` + 反向 vx（石兽无 `retreat` case） |
| 杂兵 | `tickBehaviorSteps(Enemy)` **未改**语义 |
| 禁止 | extends Enemy；废弃 drawGargoyle；steps 发起 dive 级招 |

## 空档同帧优先级（写死）

```
update:
  tickEnemyLoadoutTimers(g, boss)          // 1 · 始终（已有）
  case idle | walk:
    if steps → tickBossBehaviorGap(...)    // 2 · 积木旁路（仅走位/朝向）
    else → 壳 faceToward / walk vx         //    无 steps：今日路径
    if tryCastBossLoadout(...) → break     // 3 · 负载施放（已有）
    if cooldown≤0 → chooseMove             // 4 · kit 选招（主权不动）
```

active（dive/roar/charge/…）：**不**进 2/3/4。

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `src/entities/enemies/behaviorInterp.ts` | `BehaviorHost`；`BOSS_GAP_LOCO_KINDS`；`tickBossBehaviorGap` |
| `src/entities/boss/gargoyle.ts` | `behaviorSteps`/`behaviorRt`；`walkPhase` 公开；idle/walk 接旁路 + §2.2 优先级 |
| `src/entities/enemies/factory.ts` | `makeBoss` 挂非空 steps；空 stub → null |
| `scripts/menpai-smoke.ts` | Gsm1：Cordis isBoss+face/keep；chase/退距可见；melee soft-skip；dive 不打断；核心无 steps |
| `docs/门派插件.md` | Boss 空档积木（Gsm1）一句 |
| `src/content/changye/seeds/coreData.ts` | CORE `gargoyle` behavior 注释（仍无 steps） |

**未改**：`chooseMove` 招池/权重；`resolveBossKit`；`bossMoves`；四幕 actPool；存档；部署；BehaviorStep Schema 闭集。

## 验收

| 项 | 结果 |
| --- | --- |
| Cordis isBoss 挂自建 `behaviorId`（facePlayer+keepDistance）→ 空档走位/朝向可见吃积木 | ✅ smoke |
| dive 等 active 不被 steps 打断 | ✅ smoke |
| steps 内 meleeAttack soft-skip；不抢 kit | ✅ smoke |
| 无 steps 核心镇山石兽路径不变（behaviorSteps=null；kit=stone） | ✅ smoke |
| `npm run test:menpai` | **ALL PASS** |
| `npm run build` | **绿**（`tsc --noEmit && vite build`） |
| bump | **否** |
| 部署 | **否** |

## 已知限制

- Boss 空档**仅**走位/朝向子集；招式步（melee/ranged/charge/…）Gsm1 soft-skip → **Gsm2** 可文档化许可表
- 不迁 dive/fireball/roar 等 kind→状态 case（Gsm3+ / 可永留壳）
- 示范包挂非空 Boss behavior = **Gsm5**；CORE `gargoyle` 仍无 steps
- `circleStrafe`/`flank` 在 allowlist，但 flank 无动作挑子时几乎不粘；主验收靠 face+keep
- recover/flinch **未**开积木旁路（与负载同：仅 idle/walk）

## 一句验收摘要（给 @项目推进）

> Gsm1 已合：石兽 idle/walk 可选 Behavior 旁路（BehaviorHost + `tickBossBehaviorGap`）；Cordis isBoss 挂 facePlayer+keepDistance 空档可见吃积木；dive 等 active 不打断；无 steps 核心观感不变；kit/`chooseMove` 主权不动。`bump=否` · 部署=否。
