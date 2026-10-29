# C 档 BossLoad3·Boss 负载示范包 — 完成记录

- **日期**：2026-10-29（Asia/Shanghai）
- **范围**：示范包 `shixiang` 给 isBoss `shixiang_yexun` 挂 `gear` / `skills`；Cordis ↔ 藏经阁种子对齐；文档/smoke；**零核心 kind / 解释器 diff**
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **未做**：不新包 id；不部署；不改 chooseMove / kit / bossMoves；不 Behavior 化；不 perch；areaHit/Projectile atkMul 仍未接

蓝图：`C档-Boss负载蓝图-2026-10-29.md` §3 BossLoad3。

## 示范数据

| 项 | id / 值 |
| --- | --- |
| 包 | `shixiang`（扩既有，version **1.1.0**） |
| content.md5 | `ca23d10abfc9b4efc0b4e64ce87ee972` |
| 防具 | `shixiang_yejia`（夜巡石甲；`hp:40` `def:8`） |
| Boss gear | `[{ id: 'shixiang_yejia' }]` |
| Boss skills | `[{ id: 'tuci', weight:1.2, minRange:0, maxRange:9999, cooldown:140 }]`（核心突刺，不新建 skill） |
| 辨 HP/承伤 | `makeBoss` 后 maxHp=940（900+40）；`dmgTakenMul = 1 - 0.08 = 0.92` |
| 辨空档施放 | idle/walk → `tryCastBossLoadout` 可放 tuci；kit=`shixiang_yexun` 不变 |

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `src/content/shixiang/index.ts` | inject `armorPieces`；登记夜巡石甲；Boss 挂 gear/skills |
| `src/content/index.ts` | 包 lore 一句 |
| `dlc-server/packages/shixiang/{pack,content}.json` | 种子对齐；tags +armor/skill；version 1.1.0 |
| `scripts/menpai-smoke.ts` | BossLoad3：HP/承伤/空档施放/种子/卸载 |
| `docs/门派插件.md` | 示范句 + 表 + 债条 |
| 债清单 #7 / 蓝图分期 | BossLoad3 已跟进 |

**未改**：`loadout.ts` / `gargoyle.ts` / `factory.ts` / Schema kind / 四幕 actPool / 存档 / 部署。

## 验收

| 项 | 结果 |
| --- | --- |
| `?pack=shixiang` isBoss 挂 gear → HP/承伤可见 | ✅ smoke（940 / mul&lt;1） |
| idle 空档可施放 tuci；kit 不变 | ✅ smoke |
| Cordis ↔ 种子对齐 | ✅ |
| `npm run test:menpai` | **ALL PASS** |
| `npm run build` | **绿** |
| bump | **否** |
| 部署 | **否** |
| 动核心？ | **否** |

## 一句验收摘要（给 @项目推进）

> BossLoad3 已合：示范包 `shixiang` 给 `shixiang_yexun` 挂夜巡石甲+突刺；`?pack=shixiang` 可见 HP/承伤与 idle 空档施放；kit 权重不变；零核心 diff。`bump=否`。
