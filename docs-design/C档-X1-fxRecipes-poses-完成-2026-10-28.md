# C 档 X1·远程灌 `poses` + `fxRecipes` — 完成记录

- **日期**：2026-10-28（Asia/Shanghai）
- **范围**：远程 `content.json` → `applyContent` 能 `ctx.poses.add` / `ctx.fxRecipes.add`（须在 animRecipes / talismanScripts / skills 之前）
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **未做**：不部署；不扩 `FxPreset` / emitter；不改解释器；不改设计台（X2）；不碰敌人 `SKEL_ATTACKS`

## 背景

Cordis Service / Schema / 核心种子（poses 21 · fxRecipes 7）已齐；F1 已通远程 `animRecipes`。卡点在 `DlcContentBody` / `REMOTE_DLC_INJECT` / `applyContent` 不灌 `poses` / `fxRecipes`——馆包自建姿态/粒子配方远程启用后静默丢，只能蹭核心 id。蓝图 X1：先打通远程注入，且 **poses + fxRecipes 宜在 animRecipes / talismanScripts / skills 之前**（`poseId` / `recipeId` 可解析）。

对照：`C档-F1-DLC-animRecipes注入-完成-2026-10-28.md`；蓝图 `C档-fxRecipes-poses蓝图-2026-10-28.md` §X1。

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `src/dlc/types.ts` | `DlcContentBody` 增可选 `poses?: unknown[]` · `fxRecipes?: unknown[]` |
| `src/dlc/remote.ts` | `REMOTE_DLC_INJECT` 加入 `'poses'` · `'fxRecipes'`（**animRecipes / skills 之前**）；`applyContent` 在 talismanScripts / animRecipes / skills **之前** `add('poses'…)` / `add('fxRecipes'…)` |
| `scripts/menpai-smoke.ts` | 合成 body：自建 pose + fxRecipe + anim（`playPose`/`inkBurst`）+ 符 `fx.recipeId`；断言 INJECT 顺序 + apply + unload |
| `docs/门派插件.md` | 远程灌一句补 `poses` / `fxRecipes` 序 |
| `src/dlc/index.ts` | **未改**（已再导出 `applyContent` / `REMOTE_DLC_INJECT` / `DlcContentBody`） |

**未改**：解释器 / `FxPreset` / 设计台 / 种子 content.json / 存档 / 部署 / `enemy.ts` `SKEL_ATTACKS`。

## INJECT / apply 顺序

### `REMOTE_DLC_INJECT`

```
pills, materials, talismans, stages, acts,
attacks,
poses, fxRecipes,     // ← X1 新增；位于 animRecipes / skills 之前
animRecipes,
skills, neigong,
combatStyles, weaponLooks,
weapons,
armorSets, wepAffixes, affixes,
silhouettes, behaviors, colliders,
enemies, eliteMods, titles, bossKits, fragments, armorPieces
```

### `applyContent` 关键序

1. **`poses`** · **`fxRecipes`**（`poseId` / `recipeId` 依赖）
2. `talismanScripts` → `talismans` → `pills` → `attacks`
3. `animRecipes` → `skills` → …
（其余与既有一致）

## 验收

| 项 | 结果 |
| --- | --- |
| 远程 content 含自建 `fxRecipes` / `poses` → enable 后目录可查 | ✅ smoke：`getPose('remote_rain_stance')` · `getFxRecipe('remote_ink_flare')` |
| 同包 anim `playPose`/`inkBurst.recipeId`、符 `fx.recipeId` 引用可解析（不因缺目录） | ✅ |
| `REMOTE_DLC_INJECT`：poses/fxRecipes 在 animRecipes/skills 之前 | ✅ |
| `npm run test:menpai` | **ALL PASS** |
| `npm run build` | **绿**（`tsc --noEmit && vite build`） |
| bump | **否** |
| 部署 | **否** |

## 是否建议进 X2

**建议**：是。X1 远程半边已通；设计台无 poses/fxRecipes 页签/schema/导出（蓝图 §1.7）。按蓝图 **X2** 优先设计台 `fxRecipes`（闭集 emitter + 参数）+ 导出；X3 再 poses + datalist 挂接；X4 示范包。本单不部署、不 bump。

## 已知限制

- 馆种子 `content.json` 仍无一含 `poses` / `fxRecipes`（示范包属 X4）；本单只打通注入管。
- 设计台仍不能编/导出自建 pose / fxRecipe（X2/X3）。
- 敌人普攻姿仍硬读 `SKEL_ATTACKS`（X5）；本单未碰。
- Anim `playPose` 仍只用 strike（既有语义；本单未改解释器）。

## 文档路径

- 本文件：`/workspace/docs-design/C档-X1-fxRecipes-poses-完成-2026-10-28.md`
- 蓝图：`/workspace/docs-design/C档-fxRecipes-poses蓝图-2026-10-28.md`
