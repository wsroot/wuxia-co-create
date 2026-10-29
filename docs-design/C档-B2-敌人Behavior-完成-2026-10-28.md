# C 档 B2·敌人 Behavior：qiangying 馆种子与 Cordis 对齐 — 完成记录

- **日期**：2026-10-28（Asia/Shanghai）
- **范围**：馆种子 `packages/qiangying/content.json` 补 `behaviors` + `silhouettes`，先锋 `behaviorId` / `silhouetteId` 对齐 Cordis；`dlc:regen --zip`；smoke 远程断言
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **未做**：不改 Cordis 手感数值；不 SSH 部署；不顺手改符种子；不扩 BehaviorStep kind；不改解释器；不碰 Boss；零核心 `src/` diff（本单仅种子 + smoke + catalog/tgz）

## 背景

B1 已打通远程 `applyContent` 灌 `behaviors` / `silhouettes`（enemies 前）。馆种子此前无这两键，先锋挂核心 `spear`——远程启用 ≠ `?pack=qiangying`。B2 只补缺口，数值从 Cordis 源抄固化（无 Config 展开项）。

对照：`C档-B1-敌人Behavior-完成-2026-10-28.md`；蓝图 §4 B2。

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `dlc-server/packages/qiangying/content.json` | 增 `silhouettes`（`qiangying_vanguard` + parts）；增 `behaviors`（`qiangying_mid_spear`，13 steps，与 Cordis 同构）；先锋 `behaviorId`→`qiangying_mid_spear`、`silhouetteId`→`qiangying_vanguard`；亡魂仍挂核心 `spear`（与 Cordis 一致） |
| `scripts/menpai-smoke.ts` | 远程 qiangying 块：种子含 mid_spear steps / vanguard sil；apply 后 `getBehavior` / `getSilhouette` / 先锋 def + `makeEnemy.behaviorSteps`；unload 清干净 |
| `npm run dlc:regen`（`--zip`） | 刷新 `catalog.json` + `dist-packages/qiangying.tgz` |

**未改**：`src/content/qiangying` · `src/dlc/*` · `behaviorInterp` · BehaviorStep 白名单 · 符种子（talismanScripts/talismans 原样）· 武器/weaponLooks 种子（本单不顺带）· 存档 · 部署。

## 对齐对照（Cordis → 种子）

| 项 | Cordis | 种子（本单后） |
| --- | --- | --- |
| `qiangying_mid_spear` | `ctx.behaviors.add`，13 steps | `behaviors[]` 同 id / body / label / steps |
| `qiangying_vanguard` sil | `ctx.silhouettes.add` + parts | `silhouettes[]` 同构 |
| 先锋 `behaviorId` | `qiangying_mid_spear` | 同 |
| 先锋 `silhouetteId` | `qiangying_vanguard` | 同（此前误为 `spear`） |
| 亡魂 behavior/sil | `spear` / `spear` | 未改（已对齐） |
| 符 / 伤害固化 | Config 默认展开 | **未动**（T2 已收） |

## 验收

| 项 | 结果 |
| --- | --- |
| 远程启用后 `getBehavior('qiangying_mid_spear')` 有 steps | ✅ smoke：`steps.length ≥ 4`（实际 13） |
| 先锋 `def.behaviorId` 同 Cordis | ✅ `qiangying_mid_spear` |
| 先锋 `silhouetteId` + `getSilhouette` | ✅ |
| `makeEnemy` 后 `behaviorSteps` 非空 | ✅ |
| `npm run test:menpai` | **ALL PASS** |
| bump | **否** |
| 部署 | **否**（勿自部署） |

## content.md5 / regen

| 产物 | md5 |
| --- | --- |
| `packages/qiangying/content.json` | `0c9b3f3a129e77ae30bd473e5bde4f5f` |
| `dist-packages/qiangying.tgz`（catalog `md5`） | `8f840965c624f74ca7ed92ead2fbf397` |

已跑：`npm --prefix dlc-server run regen -- --zip`（9 packages）。

## 部署建议（勿自部署）

主机侧用既有入藏/同步流程刷新 **qiangying** 卷即可（catalog 或 `POST /api/upload` 以主机惯例为准）。客户端须已含 B1 远程灌 `behaviors`/`silhouettes`（否则种子字段仍静默丢）。本单**不** SSH、不重启馆、不 bump。

## 是否建议进 B3

**建议**：是。colliders 设计台/远程交付面仍缺（蓝图 B3）。本单馆种子已能远程跑自定义打法示范。

## 已知限制

- 种子仍无 `weaponLooks` / `qiangying_yingqiang`（Cordis 有；远程先锋 gear 仍仅 `pijia`）——属武器外观线，非本单范围。
- 远程仍未灌 `colliders`（B3）。
- `pack.json` version 仍 `1.1.0`（不 bump）。

## 文档路径

- 本文件：`/workspace/docs-design/C档-B2-敌人Behavior-完成-2026-10-28.md`
- 蓝图：`/workspace/docs-design/C档-敌人Behavior蓝图-2026-10-28.md` §4 B2
- B1：`/workspace/docs-design/C档-B1-敌人Behavior-完成-2026-10-28.md`
