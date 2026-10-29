# C 档 BossLoad1·Boss 负载装配 — 完成记录

- **日期**：2026-10-29（Asia/Shanghai）
- **范围**：`makeBoss` 接通 `EnemyDef.skills/gear/pills/talismans` 装配；gear（+ spawn pills）改 HP / atkMul / dmgTakenMul；Gargoyle 承伤读 `loadoutIncomingMul`；skills 可登记**不施放**
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **未做**：不施放（BossLoad2）；不改 `chooseMove` / kit 权重 / `resolveBossKit` / bossMoves；不 Behavior 化 Boss；不 perch；不部署；不改四幕 CORE actPool

蓝图：`C档-Boss负载蓝图-2026-10-29.md` §建议先开 BossLoad1 · §2/§3。

## 方案：LoadoutHost

| 项 | 做法 |
| --- | --- |
| 类型墙 | Gargoyle extends **Fighter**（非 Enemy）；抽最小 `LoadoutHost`（hp/maxHp/invuln/x/y/loadout/eliteMod?） |
| attach / applyGear / firePills / mul | 签名改吃 `LoadoutHost`；`Enemy` 与 `Gargoyle` 均满足 |
| tryCast / drawAura | **仍** `Enemy` 型（BossLoad2 再扩） |
| 禁止 | Gargoyle→Enemy；双轨复制 applyGear |

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `src/entities/enemies/loadout.ts` | 导出 `LoadoutHost`；attach/gear/pills(spawn·timers)/mul 泛化 |
| `src/entities/enemies/factory.ts` | `makeBoss` 在 collider/kit 之后 `attachEnemyLoadout(boss, def)`；注释更新 |
| `src/entities/boss/gargoyle.ts` | `loadout` 字段；`receiveHit` 吃 `loadoutIncomingMul`；`startAttack` 吃 `scaleLoadoutAttack`（**仅**该路径） |
| `scripts/menpai-smoke.ts` | BossLoad1：临时 isBoss+gear → HP/承伤/atkMul 相对基线可见变；核心 `gargoyle` mul=1；kit 仍 stone |
| `docs/门派插件.md` | 「Boss 负载 MVP」→ 装配已接、施放未接 |
| 债清单 #7 | 注 BossLoad1 已跟进 |

**未改**：`chooseMove` 权重/kind；`resolveBossKit`；`bossMoves`；四幕 actPool；存档；部署。

## HP 叠乘顺序

```
catalog def.hp (= params.baseHp) → × hpScale（Gargoyle 构造）→ attachEnemyLoadout → applyGear hpAdd / spawn pills
```

与杂兵（catalog → scale → elite → attach）对齐「scale 后再 gear」。

## 出伤 mul

| 路径 | 是否接 atkMul |
| --- | --- |
| `startAttack`（爪连等） | **已接** `scaleLoadoutAttack` |
| `areaHit`（dive/roar/slam/sweep/ink） | **未接** |
| `Projectile` 火球 | **未接** |

完成单结论：**出伤 mul 部分接上**（仅 startAttack）；areaHit/弹道留债，可并 BossLoad2 或另开。

## 验收

| 项 | 结果 |
| --- | --- |
| 临时 isBoss+gear → makeBoss 后 maxHp / 承伤 mul 相对无 gear 基线可见变 | ✅ smoke |
| skills 登记在 loadout、本单不施放 | ✅ |
| 核心 `makeBoss('gargoyle')` mul=1、maxHp=900、kit=stone | ✅ |
| chooseMove / kit / resolveBossKit / bossMoves 本单未改 | ✅（静态+kit 断言） |
| `npm run test:menpai` | **ALL PASS** |
| `npm run build` | **绿**（`tsc --noEmit && vite build`） |
| bump | **否** |
| 部署 | **否** |

## 已知限制

- **施放 = BossLoad2**（空档 `tryCast*`；active dive/roar 禁止打断）
- areaHit / Projectile 未吃 atkMul
- 示范包 `shixiang` 挂 gear/skill = BossLoad3
- 不 Behavior 驱动 Boss；不 perch

## 一句验收摘要（给 @项目推进）

> BossLoad1 已合：`makeBoss` 经 LoadoutHost 装配 gear/spawn；HP+承伤 mul 生效；爪连 startAttack 吃 atkMul；skills 只登记不施放；核心 gargoyle 观感不变；施放待 BossLoad2。`bump=否`。
