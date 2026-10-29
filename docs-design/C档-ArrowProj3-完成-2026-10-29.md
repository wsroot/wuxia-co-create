# C 档·ArrowProj3：Boss 火球 Def.`attackKey`→`gFire` — 完成记录

- **日期**：2026-10-29（Asia/Shanghai）
- **蓝图**：`docs-design/C档-arrow-projectiles蓝图-2026-10-29.md` §分期 ArrowProj3
- **债**：`docs-design/C档-剩余债清单-2026-10-28.md` #11 余项
- **对照**：`docs-design/C档-ArrowProj1-完成-2026-10-29.md` · `C档-ArrowProj2-完成-2026-10-29.md`
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **部署**：**否**
- **未做**：消费 `hitSfx`（可选轻债，本刀跳过——命中路径已有 hit/hitHeavy，接入易叠音）；不扩 drawKind；不删双目录；不改石兽招式权重 / AI / 壳；不 Behavior 化 Boss；不并 volleys

## 目标达成

CORE `fireball` ProjectileDef **显式** `attackKey: 'gFire'`。生成点（Boss `fbCast` + 杂兵 `rangedAttack`）经 `resolveProjectileAttackKey(def, kindHint)` 读 Def；soft 缺省：`drawKind`/`kindHint` 为 fireball → `'gFire'`，否则 → `'arrow'`。缺省路径与今日硬绑 `bossBox('gFire')` **bit-identical**（dmg12 / kbX5 / kbY-3）。火球远射伤/击退可辨于默认箭（10/3）。未挂键箭回退不变。

## ArrowProj 线收口

债 #11「arrow↔projectiles 合并建模」三期均已跟进：

| 期 | 要点 |
| --- | --- |
| Proj1 | soft `attackKey` + 斩落认 `drawKind` |
| Proj2 | 设计台 + moyu 示范挂键 |
| Proj3 | 火球对称 `gFire` |

心智：**飞行归 projectiles，伤害软挂 attacks**；双目录保留；运行仍一池。`hitSfx` 命中消费仍为轻债（本刀不强制）。

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `src/meta/bTier/coreData.ts` | CORE `fireball` 显式 `attackKey: 'gFire'` |
| `src/meta/bTier/types.ts` | `attackKey` 注释：fireball soft→gFire |
| `src/meta/contentRegistry.ts` | `resolveProjectileAttackKey(def, kindHint?)` |
| `src/entities/boss/gargoyle.ts` | `fbCast`：读 Def + helper（不再写死与 Def 脱节的 `bossBox('gFire')`） |
| `src/entities/enemies/behaviorInterp.ts` | 放箭改用 helper（fireball soft→gFire） |
| `docs/门派插件.md` | projectiles 行 + 远程段：缺省 fireball→gFire |
| `dlc-server/public/assets/designer-schema.json` | projectiles note/hint 对齐 soft 缺省 |
| `dlc-server/public/assets/designer.js` | fallback hint 对齐 |
| `scripts/menpai-smoke.ts` | ArrowProj3：显式/soft 恒等、可辨于箭、回退箭 |
| `docs-design/C档-剩余债清单-2026-10-28.md` | #11 旁注 Proj3 已跟进 / 线收口 |
| `docs-design/C档-arrow-projectiles蓝图-2026-10-29.md` | 分期行 Proj3 已跟进 |

**未改**：`actPools` / Boss kit 权重；石兽 AI 状态机壳（仅火球生成读键）；AttackBox `gFire` 数值；drawKind 闭集；`hitSfx` 消费。

## 验收

| 项 | 结果 |
| --- | --- |
| CORE fireball.`attackKey==='gFire'` | ✅ smoke |
| 显式 / soft 缺省路径恒等 → gFire；手感 12/5/-3 | ✅ |
| 火球 dmg/kb ≠ 核心箭 10/3 | ✅ |
| 未挂键箭仍回退 arrow | ✅ |
| 显式自定义 attackKey 优先于 soft gFire | ✅ |
| 双目录保留；未动招式权重 | ✅ |
| `npm run test:menpai` | **ALL PASS** |
| `npm run build` | **绿**（`tsc --noEmit && vite build`） |
| bump | **否** |
| 部署 | **否** |

## 已知限制

- **`hitSfx`**：目录字段仍在；命中路径仍未消费（叠音风险；可另刀）。
- 设计台不做飞行实时预览器；不删 attacks 页的 arrow / gFire 盒。
- Boss 火球仍走 Gargoyle 壳 `fbCast`（非 Behavior）；仅伤害键软挂 Def。

## 建议下一步

债 #11 本线可结。可选另开轻刀：命中消费 `hitSfx`（须防与 hit/hitHeavy 叠音）。其余债见清单。

## 路径

- 本文件：`/workspace/docs-design/C档-ArrowProj3-完成-2026-10-29.md`
- 蓝图：`/workspace/docs-design/C档-arrow-projectiles蓝图-2026-10-29.md`
- 债清单：`/workspace/docs-design/C档-剩余债清单-2026-10-28.md` #11
