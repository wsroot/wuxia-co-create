# C 档 B3·敌人 Behavior：colliders 交付面 — 完成记录

- **日期**：2026-10-28（Asia/Shanghai）
- **范围**：远程 `content.json` → `applyContent` 能 `ctx.colliders.add`（须在 `enemies` 之前）；设计台 `state`/export 接线 `colliders`；smoke 断言自建 collider + `enemy.colliderId` → 组装盒尺寸生效
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **未做**：不部署；不扩碰撞字段；不改物理；不抢 Boss；不扩 BehaviorStep；不改解释器 AI；不碰武器/符咒

## 背景

B1 已灌 `silhouettes` / `behaviors`；设计台 schema 已有 `colliders` 段，但 `DlcContentBody` / `REMOTE_DLC_INJECT` / `applyContent` 不灌 `colliders`，设计台 `state`/`buildContentExport` 亦无该键——无 body 远程包难自带碰撞盒（只能蹭核心 `colliderId` 或依赖 body 软别名）。蓝图 B3 要求打通交付面，**不扩碰撞字段、不改物理**。

对照：`C档-B1-敌人Behavior-完成-2026-10-28.md`。

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `src/dlc/types.ts` | `DlcContentBody` 增可选 `colliders?` |
| `src/dlc/remote.ts` | `REMOTE_DLC_INJECT` 加入 `'colliders'`（**enemies 之前**，紧挨 silhouettes/behaviors）；`applyContent` 在 `enemies` 前 `add('colliders', …)` |
| `dlc-server/public/assets/designer.js` | `state.content.colliders`；`emptyDef`/`emptyGameplay`；`buildContentExport` 含 `colliders`（enemies 前）；玩法目录可编碰撞盒；敌寇表单补 `colliderId`；向导备碰撞草稿 |
| `dlc-server/public/designer.html` | 玩法目录下拉加「碰撞盒」 |
| `scripts/menpai-smoke.ts` | 合成 body：自建 collider + enemy.`colliderId`；断言 INJECT 顺序 + `getCollider` + `makeEnemy` 盒尺寸 + unload |
| `docs/门派插件.md` | §九 一句：远程亦灌 colliders（enemies 前） |
| `src/dlc/index.ts` | **未改**（已再导出相关符号） |

**未改**：`ColliderSchema` 字段表 / 物理 / `behaviorInterp` / BehaviorStep / 馆种子 / 存档 / 部署。

## INJECT / apply 顺序

### `REMOTE_DLC_INJECT`

```
pills, materials, talismans, stages, acts,
animRecipes,          // skills 之前
skills, neigong,
combatStyles, weaponLooks,
weapons,
armorSets, wepAffixes, affixes,
silhouettes, behaviors, colliders,  // ← colliders 新增；位于 enemies 之前
enemies, eliteMods, titles, bossKits, fragments, armorPieces
```

### `applyContent` 关键序（本单相关）

1. …（既有 talismans / pills / animRecipes / skills / … / affixes）
2. **`silhouettes`**（`EnemyDef.silhouetteId`）
3. **`behaviors`**（`EnemyDef.behaviorId` → steps）
4. **`colliders`**（`EnemyDef.colliderId` → Body w/h）← 本单
5. **`enemies`**
6. …（eliteMods / titles / …）

## 设计台

- Schema 已有 `colliders.defFields` → **只接线**，未扩字段。
- 玩法目录新增「碰撞盒」类（用 schema `defFields` 渲染）；敌寇表单可见/可改 `colliderId`。
- 导出键含 `colliders`（在 `enemies` 前），与远程 `applyContent` 同构。
- **无需**再喊 @游戏创作：面板已能改碰撞盒并导出。

## 验收

| 项 | 结果 |
| --- | --- |
| 远程 content 含自建 collider → `applyContent` → `ctx.colliders.add` | ✅ smoke：`remote_wide_box` 可 `getCollider` 且 `48×96` |
| `enemies.colliderId` 指向本卷 collider | ✅ |
| `makeEnemy` 后组装盒尺寸生效 | ✅ `body.w===48 && body.h===96` |
| `REMOTE_DLC_INJECT`：colliders **在** enemies 前 | ✅ |
| 设计台 state/export 含 colliders | ✅ |
| `npm run test:menpai` | **ALL PASS** |
| `npm run build` | **绿**（`tsc --noEmit && vite build`） |
| bump | **否** |
| 部署 | **否** |

## 是否还需喊 @游戏创作

**否**。设计台已接线（玩法目录「碰撞盒」+ 敌寇 `colliderId` + 导出）。若后续要独立页签/托盘积木级 UX，可另开弱 UX 单（蓝图 B4 旁系）。

## 是否建议进 B4

可选。B1–B3 远程交付面（behaviors / silhouettes / colliders）已通；B4 为文档注释纠偏 / smoke 弱 UX / `behaviorId` datalist。B2（qiangying 种子对齐）若尚未做可并行。本单不部署、不 bump。

## 已知限制

- 碰撞字段表未扩（仍仅 `w`/`h`/`hurtInset`/`gravityScale`/`label`）。
- 物理与 Body 写入路径未改（仍走既有 `resolveColliderProfile` / `applyColliderProfile`）。
- Boss 组装旁路 / bossMoves 未碰。

## 文档路径

- 本文件：`/workspace/docs-design/C档-B3-敌人Behavior-完成-2026-10-28.md`
- 蓝图：`/workspace/docs-design/C档-敌人Behavior蓝图-2026-10-28.md` §4 B3
- 对照 B1：`/workspace/docs-design/C档-B1-敌人Behavior-完成-2026-10-28.md`
