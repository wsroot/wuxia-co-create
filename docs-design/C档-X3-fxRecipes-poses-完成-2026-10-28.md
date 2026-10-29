# C 档 X3·设计台 poses + 弱挂接 — 完成记录

- **日期**：2026-10-28（Asia/Shanghai）
- **蓝图**：`docs-design/C档-fxRecipes-poses蓝图-2026-10-28.md` §分期 X3
- **对照**：X2 `C档-X2-fxRecipes-poses-完成-2026-10-28.md`（fxRecipes 编导出）；X1 远程半边已通
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **部署**：**否**（不打包不部署不 SSH）
- **未做**：不做骨骼拖拽编辑器；不改解释器；不扩 PoseNums 字段；不改 idle 常量树；不碰示范包（X4）；不 bump

## 目标达成

设计台能新建 `poses`（三帧 PoseNums）并导出；可从核心 `CORE_POSES` 拷贝再改。招式样子 / 符效能点选本卷+核心 `poseId` / `recipeId`（datalist）。

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `dlc-server/public/assets/designer-schema.json` | 新增 `poses.defFields`（id + wind/strike/rec × PoseNums 13 键）；`corePoseIds`（21）+ `corePoseTemplates`；animRecipes `playPose`/`holdPose`/`loopPose`.poseId、`chainPose`.poseIds、`inkBurst`.recipeId 与 scriptSteps `fx.recipeId` 挂 datalist；顶 note 点名 X3 |
| `dlc-server/public/assets/designer.js` | `state.content.poses`；`buildContentExport` 含 `poses`（早于 animRecipes，与 fxRecipes 并列靠前）；`emptyGameplay('poses')`；玩法目录表单 / 人话预览 / 列表标签；「从核心拷贝再改」；`poseIdOptions` / `fxRecipeIdOptions` + attachDatalist；首访种子 `demo_slash_ink`；导入 content-only 识别 `poses` |
| `dlc-server/public/designer.html` | 玩法目录选项「攻击姿态」+ hint |
| `docs/门派插件.md` | §九 一句：设计台可编 poses + poseId/recipeId datalist |
| `docs/C档原语与设计台-2026-10-28.md` | §② 增 X3 要点 |
| `docs-design/C档-fxRecipes-poses蓝图-2026-10-28.md` | X3 行标「已跟进」 |

**未改**：`src/` 运行时 / `PoseSchema` 字段表 / 解释器 / 馆种子 / 存档 / bump。

## 核心 PoseNums（核对，未猜）

`PoseSchema`：`id` + `wind`/`strike`/`rec` 均 `PoseNums.required()`。  
`PoseNums` 键（弧度骨角）：`y lean head rot ft fk bt bk fa fe ba be w`。  
来源：`src/plugins/schemas.ts` · `src/render/rig.ts` `Pose` · `src/meta/bTier/types.ts` `PoseDef`。

## 核心 pose id（21）

| 来源 | id |
| --- | --- |
| Hunter（12） | `slash1`·`slash2`·`slash3`·`finisher`·`launcher`·`rising`·`sweep`·`dashKick`·`airA`·`airB`·`plunge`·`counter` |
| Skel（6） | `skel.axe`·`skel.bash`·`skel.charge`·`skel.whip`·`skel.thrust`·`skel.lunge` |
| Garg（3） | `garg.claw1`·`garg.claw2`·`garg.claw3` |

设计台 `corePoseIds` / `corePoseTemplates` 自 `CORE_POSES` 抽出，表单「从核心拷贝」覆盖三帧、保留本条 id。

## 弱挂接 datalist

| 字段 | datalist | 候选 |
| --- | --- | --- |
| `playPose` / `holdPose` / `loopPose`.poseId | `poseIds` | 本卷 poses + `corePoseIds` |
| `chainPose`.poseIds | `poseIds` | 同上 |
| `inkBurst`.recipeId | `fxRecipeIds` | 本卷 fxRecipes + `coreFxRecipeIds` |
| script / castFx `fx.recipeId` | `fxRecipeIds` | 同上 |

## 验收

| 项 | 结果 |
| --- | --- |
| 导出 content 含 `poses` | ✅ `buildContentExport` keys 含 `poses`（靠前）；首访种子 `demo_slash_ink` |
| 三帧 PoseNums 可编；可从核心拷贝 | ✅ schema defFields + 拷贝 UI |
| 招式样子点选本卷 poseId / recipeId | ✅ animRecipes / scriptSteps 字段 datalist |
| `npm run test:menpai` | **ALL PASS** |
| `npm run build` | **绿**（`tsc --noEmit && vite build`） |
| bump | **否** |
| 部署 | **否** |

## 缺 Schema

无。表单字段均落在既有 `PoseSchema` / `PoseNums`（未发明新键、未做骨骼拖拽）。若日后要扩骨角字段或可视化骨骼编辑器，喊 **@核心原语**。

## 是否建议热更

- **:4174（designer）**：**是**（`designer.js` / `designer.html` / `designer-schema.json`）
- **:4173（游戏）**：**否**（本单未改游戏侧 `src/` 运行时）

本单**不打包不部署不 bump**。

## 建议下一步

- **X4**：示范包自建 fxRecipe + pose + inkBurst/playPose 引用

## 文档路径

- 本文件：`/workspace/docs-design/C档-X3-fxRecipes-poses-完成-2026-10-28.md`
- 蓝图：`/workspace/docs-design/C档-fxRecipes-poses蓝图-2026-10-28.md` §4 X3
- 对照 X2：`/workspace/docs-design/C档-X2-fxRecipes-poses-完成-2026-10-28.md`
