# C 档 BossLoad2·Boss 空档施放 — 完成记录

- **日期**：2026-10-29（Asia/Shanghai）
- **范围**：Gargoyle 在 **idle/walk** 且非 active 招时尝试负载 skill/talisman 施放；失败 no-op；**不**改 `chooseMove` 权重/kind、kit/`resolveBossKit`/`bossMoves`
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **未做**：不 Behavior 化 Boss；不 perch；不部署；不改四幕 CORE actPool；areaHit/Projectile atkMul 仍未接（示范包=BossLoad3 另单）

蓝图：`C档-Boss负载蓝图-2026-10-29.md` §2.2「空档施放」· §3 BossLoad2。

## 方案：LoadoutCaster + tryCastBossLoadout

| 项 | 做法 |
| --- | --- |
| 类型墙 | 扩 `LoadoutCaster extends LoadoutHost`（dead/state/cooldown/faceToward/startAttack）；**不** Gargoyle→Enemy |
| 共用核心 | `pickLoadoutAction` / `castEnemySkill` / `castEnemyTalisman` 吃 `LoadoutCaster`；`commitLoadoutCast` 共用 |
| 杂兵 | `tryCastEnemyLoadout` 仍 `Enemy` + `g.attackToken` + 原 state/cooldown 闸 |
| Boss | `tryCastBossLoadout`：仅 `idle`/`walk`；**不**查 host.cooldown（空档可放）；**不**走 `attackToken`（Boss 不在 `enemies[]`） |
| 时序 | 每帧 `tickEnemyLoadoutTimers`；idle/walk 先 `tryCastBossLoadout`，成功则 **跳过** 本帧 `chooseMove`（或 walk→idle 过渡），失败再走原壳 AI |
| 禁止 | dive/charge/roar/attack/intro/dying/down/stagger/slam/sweep/ink* 等一切非 idle/walk |

## 与 chooseMove 的时序（写清）

```
update:
  tickEnemyLoadoutTimers(g, boss)   // 始终跑 CD/buff
  case idle | walk:
    if tryCastBossLoadout(...) → break   // 成功：不进 chooseMove
    // 失败：原逻辑（idle: cooldown≤0 → chooseMove；walk: → idle）
```

- kit 权重表 / `bossMoveWeights` / `chooseMove` 函数体招池逻辑 **一字未改**。
- cast 成功靠 `startAttack` / castFx 改 state 或写 `skillCd`+`castGate`；`lastMove` 不变（smoke 盖住）。

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `src/entities/enemies/loadout.ts` | `LoadoutCaster`；`tryCastBossLoadout`；cast 核心泛化；`BOSS_LOADOUT_CAST_STATES` |
| `src/entities/boss/gargoyle.ts` | update 顶 tick timers；idle/walk 挂钩 tryCast（成功 skip chooseMove） |
| `src/entities/enemies/factory.ts` | 注释：cast 在 Gargoyle think |
| `scripts/menpai-smoke.ts` | BossLoad2：临时 isBoss+tuci；idle/walk 成功；active 拒绝；核心无 skills；kit=stone；lastMove 不变 |
| `docs/门派插件.md` | Boss 负载：施放已接 |
| 债清单 #7 / 蓝图分期 | BossLoad2 已跟进 |

**未改**：`chooseMove` 招池；`resolveBossKit`；`bossMoves`；四幕 actPool；存档；部署。

## 验收

| 项 | 结果 |
| --- | --- |
| Cordis/临时 Boss 挂 skill → idle/walk 间隙可施放（skillCd/castGate/attack） | ✅ smoke |
| dive/charge/roar/… active → tryCast 拒绝 | ✅ smoke |
| 核心 `gargoyle` 无 skills 不误放；kit=stone | ✅ |
| cast 成功不抢 kit（lastMove 不变 / chooseMove 跳过） | ✅ |
| `npm run test:menpai` | **ALL PASS** |
| `npm run build` | **绿**（`tsc --noEmit && vite build`） |
| bump | **否** |
| 部署 | **否** |

## 已知限制

- ~~示范包 `shixiang` 挂 gear/skill = BossLoad3~~ → **已跟进**（见 `C档-BossLoad3-Boss负载-完成-2026-10-29.md`）
- areaHit / Projectile **仍未**吃 atkMul（BossLoad1 遗留）
- 不 Behavior 驱动 Boss；不 perch
- recover/flinch **未**开 cast（默认只 idle/walk）

## 一句验收摘要（给 @项目推进）

> BossLoad2 已合：Gargoyle idle/walk 空档 `tryCastBossLoadout`；Cordis Boss 挂 skill 间隙可施放；招池/kit 权重不变；dive 等 active 不打断；核心 gargoyle 无误放。`bump=否`。
