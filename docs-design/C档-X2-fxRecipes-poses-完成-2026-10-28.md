# C 档 X2·设计台 fxRecipes — 完成记录

- **日期**：2026-10-28（Asia/Shanghai）
- **蓝图**：`docs-design/C档-fxRecipes-poses蓝图-2026-10-28.md` §分期 X2
- **对照**：X1 `C档-X1-fxRecipes-poses-完成-2026-10-28.md`（远程半边已通）；A3 设计台体例
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **部署**：**否**（不打包不部署不 SSH）
- **未做**：不做粒子实时预览；不扩 `FxPreset` / emitter；不改解释器；不编 poses（X3）；不碰示范包（X4）；不 bump

## 目标达成

设计台能新建 `fxRecipes` 配方并导出；导入再编辑不丢。emitter 闭集七选一与核心 `FX_PRESETS` / `FxPreset` 对齐。

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `dlc-server/public/assets/designer-schema.json` | 新增 `fxRecipes.defFields`（id + emitter enum + color/size/life/n/heavy）；`fxEmitters` / `coreFxRecipeIds` = 七枚；顶 note 点名 X2 |
| `dlc-server/public/assets/designer.js` | `state.content.fxRecipes`；`buildContentExport` 含 `fxRecipes`（**早于** animRecipes）；`emptyGameplay('fxRecipes')`；玩法目录表单 / 人话预览 / 列表标签；首访种子 `demo_ink_flare`；导入 content-only 识别 `fxRecipes` |
| `dlc-server/public/designer.html` | 玩法目录选项「特效配方」+ hint |
| `docs/门派插件.md` | §九 一句：设计台可编/导出 fxRecipes |
| `docs/C档原语与设计台-2026-10-28.md` | §② 增 X2 要点 |
| `docs-design/C档-fxRecipes-poses蓝图-2026-10-28.md` | X1/X2 行标「已跟进」 |

**未改**：`src/dlc/*`（X1 已灌）/ `FxRecipeSchema` 字段表 / 解释器 / 馆种子 / 存档 / poses 设计台（X3）。

## emitter 七选一（与核心对齐）

```
flare · ring · spark · qi · fire · dust · swordQi
```

来源：`talismanScripts.ts` `FxPreset`；`schemas.ts` `FX_PRESETS`；`CORE_FX_RECIPES` 同名别名 7 条。设计台 **未** 扩白名单。

## 对照 X1 远程字段

| 字段 | X1 | 本单 |
| --- | --- | --- |
| `DlcContentBody.fxRecipes` | ✅ | 不改 |
| `REMOTE_DLC_INJECT` 含 `'fxRecipes'`（animRecipes 前） | ✅ | 不改 |
| `applyContent` `add('fxRecipes', …)` | ✅ | 不改 |
| 设计台编/导出 | ❌（X1 未做） | ✅ 本单 |

## 验收

| 项 | 结果 |
| --- | --- |
| 新建配方并导出 content 含 `fxRecipes` | ✅ `buildContentExport` keys 含 `fxRecipes`（靠前）；首访种子 `demo_ink_flare` |
| 导入再编辑不丢 | ✅ `importPayload` 按 `state.content` 键回填；content-only 识别含 `fxRecipes` |
| emitter 七选一列表 | ✅ schema enum + `fxEmitters` = 上表七枚 |
| `npm run test:menpai` | **ALL PASS** |
| `npm run build` | **绿**（`tsc --noEmit && vite build`） |
| bump | **否** |
| 部署 | **否** |

## 缺 Schema

无。表单字段均落在既有 `FxRecipeSchema`（id / emitter lit(FX_PRESETS) / color / size / life / n / heavy）。**未**发明新键、**未**扩 emitter。若日后要新粒子原语，喊 **@核心原语**（另开 C 单扩 `FxPreset` + `g.fx`）。

## 是否建议热更

- **:4174（designer）**：**是**（`designer.js` / `designer.html` / `designer-schema.json`）
- **:4173（游戏）**：**否**（本单未改游戏侧 `src/` 运行时）

本单**不打包不部署不 bump**。

## 建议下一步

- **X3**：设计台 poses + animRecipes `poseId` / script `fx.recipeId` datalist（本卷+核心）
- **X4**：示范包自建 fxRecipe + inkBurst/fx.recipeId

## 文档路径

- 本文件：`/workspace/docs-design/C档-X2-fxRecipes-poses-完成-2026-10-28.md`
- 蓝图：`/workspace/docs-design/C档-fxRecipes-poses蓝图-2026-10-28.md` §4 X2
- 对照 X1：`/workspace/docs-design/C档-X1-fxRecipes-poses-完成-2026-10-28.md`
