# C 档 B4·敌人 Behavior：官方/文档/弱 UX 清理 — 完成记录

- **日期**：2026-10-28（Asia/Shanghai）
- **蓝图**：`docs-design/C档-敌人Behavior蓝图-2026-10-28.md` §4 B4
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **未做**：不为好看新建 BehaviorStep kind；不改解释器 / AI 权重数值；不抢 Boss/武器/符咒；不 SSH / 不部署 / 不 bump；不扩 Schema 字段表

## 背景

B1–B3 已打通远程 `silhouettes → behaviors → colliders → enemies` 与馆种子/设计台 colliders 接线。B4 收口弱 UX：纠正设计台导出「与 applyContent 一致」类过时注释、敌寇 `behaviorId`（及 silhouette/collider）datalist、人话预览「打法 N 步」（对齐 T4「符效 N 步」）、smoke 核对注入相对序。

对照：`C档-T4-符咒-完成-2026-10-28.md`；`C档-B1/B2/B3-敌人Behavior-完成-2026-10-28.md`。

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `dlc-server/public/assets/designer.js` | `buildContentExport` 注释改为真实序：`silhouettes → behaviors → colliders → enemies`；`behaviorIdOptions` / `silhouetteIdOptions` / `colliderIdOptions`（核心来自 schema，本卷合并）；`attachDatalist` 接三类；敌寇表单优先 schema `defFields` + datalist；人话预览本卷有 behavior 时显示「打法 N 步」+ kind 摘要，无则不写假步数 |
| `dlc-server/public/assets/designer-schema.json` | 增 `coreBehaviorIds` / `coreSilhouetteIds` / `coreColliderIds`（对齐 `CORE_*`：axe/shield/archer/spear/gargoyle）；`enemies.defFields` 三键挂 datalist |
| `dlc-server/public/designer.html` | 玩法 hint 补敌寇 datalist +「预览可见打法 N 步」 |
| `scripts/menpai-smoke.ts` | 补强断言：`REMOTE_DLC_INJECT` 相对序 silhouettes → behaviors → colliders → enemies（B1/B2 远程形状/种子含 behaviors 已有，本单只核对+相对序） |
| `docs/门派插件.md` | §九 注入句改为显式箭头序；点明设计台导出同序、预览「打法 N 步」 |
| `docs/C档原语与设计台-2026-10-28.md` | §② 增 B4 弱 UX 要点 |
| `docs-design/C档-敌人Behavior蓝图-2026-10-28.md` | 专线 / B4 行标「已跟进」 |

**未改**：`behaviorInterp` · BehaviorStep 白名单 · 伤害/AI 数值 · `src/dlc/remote.ts`（B1/B3 已齐）· 馆种子 · Boss/武器/符咒。

## 验收

| 项 | 结果 |
| --- | --- |
| 文档/注释 ↔ 真实注入表 `silhouettes → behaviors → colliders → enemies` | ✅ designer 导出注释 + 门派插件 + C档 |
| 设计台敌寇 `behaviorId` datalist = 本卷 + 核心 | ✅（顺手 silhouetteId / colliderId 同理；核心 id 来自 schema，对齐 `CORE_BEHAVIORS` 等） |
| 人话预览「打法 N 步」（本卷有 behavior 且有 steps；无则不假造） | ✅ 镜像 T4 符效预览 |
| smoke 远程形状/种子含 behaviors | ✅ B1/B2 既有；本单补相对序断言 |
| `npm run test:menpai` | **ALL PASS** |
| `npm run build` | **绿**（`tsc --noEmit && vite build`） |
| bump | **否** |
| 部署 | **否** |

## 缺 Schema 边界

无。未扩 BehaviorStep kind / Collider 字段 / EnemyDef 新键；datalist 仅挂既有 id 引用。

## 是否建议热更

- **:4174（designer）**：**是**（`designer.js` / `designer.html` / `designer-schema.json` 静态变了；馆服若挂本树 `dlc-server/public` 热更即可）
- **:4173（游戏）**：**否**（本单未改游戏侧 `src/` 运行时；勿因本单重部署游戏）

本单**不打包不部署不 bump**。

## 文档路径

- 本文件：`/workspace/docs-design/C档-B4-敌人Behavior-完成-2026-10-28.md`
- 蓝图：`/workspace/docs-design/C档-敌人Behavior蓝图-2026-10-28.md` §4 B4
- 对照 B3：`/workspace/docs-design/C档-B3-敌人Behavior-完成-2026-10-28.md`
- 对照 T4：`/workspace/docs-design/C档-T4-符咒-完成-2026-10-28.md`
