# C 档蓝图：fxRecipes + poses 交付面全链路

仓库：`requiem-web`（`/workspace/requiem-web`）。  
日期：2026-10-28 Asia/Shanghai。  
本文件为分期蓝图（**X0** 调研）；**默认不 bump** 玩家存档。本蓝图阶段**不部署、不改代码**。

可读对照：`docs-design/C档-功法castAnim特效蓝图-2026-10-28.md`（F0 体例；观感上游）；`docs-design/C档-敌人Behavior蓝图-2026-10-28.md`（交付面债型）；`docs-design/C档-F1-DLC-animRecipes注入-完成-2026-10-28.md`（**已注明**远程仍缺 `poses` / `fxRecipes`）；`requiem-web/docs/门派插件.md`。

---

## 终点（用户）

新「姿态关键帧 / 粒子配方」= 内容包只登记数据：`poses.add`（`PoseDef`）+ `fxRecipes.add`（`FxRecipeDef`），再由 `animRecipes` / 符箓 `ScriptStep.fx` 软引用（`poseId` / `recipeId`）。  
远程 `content.json` / 设计台导出同构可灌。  
**不改粒子发射器实现 / 不扩 `FxEmitter` kind（默认）**。禁止任意 JS / Canvas / 外链。

对照：**F1 已通** `animRecipes` 远程注入；本线是同型更底层的 B 档目录债。

---

## 边界（与 F / T / W / B / A / Boss）

| 线 | 管什么 | 本蓝图 |
| --- | --- | --- |
| **fxRecipes + poses 专线（本单 X）** | 目录 Schema / 远程灌 / 设计台编导出 / 示范引用 | 分期 X1–Xn |
| **功法观感线（F1–F4 已收口多项）** | `animRecipes` / `castAnim` / `castFx` | **不顺手改**；本线只补其依赖目录交付面 |
| **符咒专线（T 已跟进）** | ScriptStep / talismanScripts；`fx.preset`/`recipeId` | **不顺手改** ScriptStep 语义；可挂 `recipeId` |
| **武器 / Behavior / bodyAttacks（W/B/A 已收口）** | Style / looks / behaviors / attacks | **不顺手改** |
| **Boss** | `bossMoves` / Gargoyle / `garg.*` 姿态 | **勿混主线**；可点名边界债 |

共用但本线只打通交付 / 软引用：

- AnimStep：`playPose` / `holdPose` / `chainPose` / `loopPose` → `getPose`；`inkBurst.recipeId` → `getFxRecipe`。
- ScriptStep：`fx.recipeId` → `getFxRecipe`（`preset` 仍是闭集别名）。
- 玩家普攻绘制：`getAttackPose(atk.def.name)`（已读目录，缺回退 `HUNTER_ATTACKS` / `slash1`）。

---

## 1. 现状（文件 + 符号举证）

### 1.1 链路图

| 层 | 数据入口 | 目录 / 类型 | 解释器 / 调用方 | 证据路径 |
| --- | --- | --- | --- | --- |
| **Pose 目录** | `ctx.poses.add` | `PoseDef{ id, wind, strike, rec }`（各帧 = `Pose` 数值骨角） | `PoseService`；`getPose` / `getAttackPose`（缺 → `slash1`） | `services.ts`；`contentRegistry.ts`；`bTier/types.ts` |
| **FxRecipe 目录** | `ctx.fxRecipes.add` | `FxRecipeDef{ id, emitter, color?, size?, life?, n?, heavy? }` | `FxRecipeService`；`getFxRecipe` | 同上；`FxRecipeSchema` |
| **Emitter 闭集** | `FxPreset` / `FX_PRESETS` | **7**：`flare`·`ring`·`spark`·`qi`·`fire`·`dust`·`swordQi` | 粒子实现在 `g.fx.*`；配方只选 preset + 参数 | `talismanScripts.ts`；`schemas.ts` |
| **Anim 挂点** | `playPose` / `inkBurst.recipeId` 等 | 读目录 soft-skip | `AnimScriptPlayer.exec` | `animScripts.ts` |
| **符效挂点** | `ScriptStep.fx` | `preset` 或 `recipeId` | `TalismanScriptPlayer` case `fx` | `talismanScripts.ts` |
| **官方种子** | `CORE_POSES` · `CORE_FX_RECIPES` | poses **21**；fxRecipes **7**（与 preset 同名别名） | `MenpaiCore` inject + `add` | `coreData.ts`；`menpai/core/index.ts` |
| **设计台** | — | **无** poses / fxRecipes 页签、schema 段、`state.content` 键、导出键 | `designer.html` / `designer.js` / `designer-schema.json` | 见 1.7 |
| **远程 DLC** | `applyContent` / `DlcContentBody` / `REMOTE_DLC_INJECT` | **不灌** `poses` / `fxRecipes`（F1 已灌 `animRecipes`） | 远程只能蹭核心 id | `src/dlc/remote.ts`；`types.ts` |

### 1.2 `PoseDef` / Schema

| 项 | 内容 |
| --- | --- |
| 类型 | `PoseDef extends AttackPoses { id }`；`AttackPoses = { wind, strike, rec }` |
| 单帧字段 | `Pose`：`y lean head rot ft fk bt bk fa fe ba be w`（弧度骨角 + 微调） |
| Schema | `PoseSchema`：`id` + `wind`/`strike`/`rec` 均 `PoseNums.required()`（各字段 `Schema.number()` 可选填） |
| Service | `PoseService`：`super(ctx, 'poses', true)`；无额外校验 |
| 解析 | `getPose(id)`；`getAttackPose(id)` = `getPose` 缺则 `getPose('slash1')` |
| Anim 路径 | `resolvePoseStrike`：**只取 `strike`**；再试 `skel.${poseId}`；缺则 warn + 跳过 |
| 玩家普攻 | `player.computePose`：`getAttackPose(atk.def.name)`，再回退模块常量 `HUNTER_ATTACKS` |
| 敌人普攻 | `enemy.computePose` attack 分支：**硬读** `SKEL_ATTACKS[atkPoseName()]`（**不**走 `getPose` / `skel.*` 目录） |

### 1.3 `FxRecipeDef` / Schema

| 项 | 内容 |
| --- | --- |
| 类型 | `{ id, emitter: FxPreset, color?, size?, life?, n?, heavy? }` |
| Schema | `FxRecipeSchema`：`emitter: lit(FX_PRESETS).required()` |
| Service | `FxRecipeService`：`super(ctx, 'fxRecipes', true)` |
| Anim | `inkBurst`：有 `recipeId` 则 `getFxRecipe` → 用其 `emitter` + 参数覆盖 |
| 符 | `fx`：`recipe?.emitter ?? step.preset`；两者皆无 soft-skip |
| 新 emitter | **属 C 档**（须改 `FxPreset` + `g.fx` 实现）；本线默认不扩 |

### 1.4 官方种子清单

**`CORE_FX_RECIPES`（7）** — `coreData.ts`：

| id | emitter | 要点参数 |
| --- | --- | --- |
| `flare` | flare | size 70 · life 16 |
| `ring` | ring | size 50 · life 18 |
| `spark` | spark | （默认） |
| `qi` | qi | n 6 · size 10 · life 20 |
| `fire` | fire | n 8 · size 10 |
| `dust` | dust | n 10 |
| `swordQi` | swordQi | （默认） |

**`CORE_POSES`（21）** — 由 `render/poses.ts` 攻击三帧映射：

| 来源 | id |
| --- | --- |
| Hunter `HUNTER_ATTACKS`（12） | `slash1`·`slash2`·`slash3`·`finisher`·`launcher`·`rising`·`sweep`·`dashKick`·`airA`·`airB`·`plunge`·`counter` |
| Skel `SKEL_ATTACKS`（6） | `skel.axe`·`skel.bash`·`skel.charge`·`skel.whip`·`skel.thrust`·`skel.lunge` |
| Garg `GARG_ATTACKS`（3） | `garg.claw1`·`garg.claw2`·`garg.claw3` |

Smoke：`menpai-smoke.ts` 期望 `poses: 21`、`fxRecipes: 7`；断言 `getAttackPose('slash1')` 与缺 id 回退、`getFxRecipe('flare')?.emitter === 'flare'`。

Idle/走/受击等 **非** `AttackPoses` 的 `HP`/`SP`/`GP` 常量**未**进 `ctx.poses`（仍模块硬常量）——本线默认**不**把整棵 idle 树目录化。

### 1.5 长夜登记

`src/menpai/core/index.ts`：

- `inject` 含 `'poses'` · `'fxRecipes'`（与 attacks / animRecipes 等并列）。
- `apply`：`for (d of CORE_POSES) ctx.poses.add(d)`；`for (d of CORE_FX_RECIPES) ctx.fxRecipes.add(d)`。

Cordis 内容包**可以** `ctx.poses.add` / `ctx.fxRecipes.add`（Service 已挂）；**馆远程 JSON 不能**（见下）。

### 1.6 解释器消费点（无内容 id 硬分支）

| 调用 | 文件 | 行为 |
| --- | --- | --- |
| `playPose` / `holdPose` / `loopPose` | `animScripts.ts` | `applyPose` → `resolvePoseStrike` |
| `chainPose` | 同 | 展开为多个 `playPose` |
| `inkBurst` | 同 | 可选 `recipeId` |
| `ScriptStep.fx` | `talismanScripts.ts` | `preset` 或 `recipeId` |
| 玩家攻击姿 | `player.ts` | 目录优先 |
| 敌人攻击姿 | `enemy.ts` | **`SKEL_ATTACKS` 硬表** + `atkPoseName()` 按 `kind` |
| Boss 攻击姿 | `gargoyle.ts` | 本地 `GARG_ATTACKS` / `GP`（边界） |

解释器 **无** 按配方 id / 姿态 id 的特判分支（仅 kind / emitter 白名单）。

### 1.7 设计台：能否编导出？

**X0 调研时全缺；X2 已补 fxRecipes；X3 已补 poses 编导出 + poseId/recipeId 弱挂接。**

| 表面 | 证据 |
| --- | --- |
| `designer-schema.json` 顶键 | **无** `poses` / `fxRecipes`（有 `animRecipes`、`attacks`、`behaviors`…） |
| `state.content` | **无** 两键（`designer.js` 初始对象） |
| `buildContentExport` keys | **无** 两键 |
| `designer.html` 页签 | 有「招式样子」`animRecipes`；**无**「攻击姿态」「特效配方」 |
| `LIST_KEYS` / `emptyDef` | 无 poses/fxRecipes 分支 |
| 仅文案痕迹 | schema 里 `inkBurst`/`fx` 字段 hint 提到「或挂 fxRecipes」；**无可编目录** |

结论：作者无法在设计台新建自定义 pose / fxRecipe；只能手写 Cordis 或改核心种子。导出的 `animRecipes` 若写新 `poseId`/`recipeId`，远程也灌不进依赖目录（见 1.8）。

### 1.8 远程 DLC：是否灌？

| 表面 | 现状 |
| --- | --- |
| `DlcContentBody` | **无** `poses?` · **无** `fxRecipes?`（有 `animRecipes?` 等）— `types.ts` |
| `REMOTE_DLC_INJECT` | **无** `'poses'` / `'fxRecipes'`（有 `'animRecipes'`）— `remote.ts` |
| `applyContent` | **不** `add('poses'|'fxRecipes', …)` |
| 馆种子 | 九包 `content.json`：**无一**含 `poses` / `fxRecipes` |

对照 F1 完成单「已知限制」原文：*远程仍未覆盖全部 B 档（poses / fxRecipes 等）*。

**建议注入序（落地时）**：`poses` + `fxRecipes` 宜在 **`animRecipes` / `talismanScripts` / `skills` 之前**（`poseId` / `recipeId` 可解析）。`attacks` 可仍早于或并列（玩家普攻名常与 pose id 对齐，但非硬依赖本线）。

**可用捷径（现状）**：

- 远程 / 设计台 animRecipe 只写 **核心** `poseId`（如 `slash1`）与 **核心** `recipeId`/`preset`（如 `flare`）→ 能跑。
- 自定义新 pose / fxRecipe id → 远程路径**做不到**；须 Cordis `ctx.*.add`。

### 1.9 示范包与源插件

| 包 / 源 | poses / fxRecipes |
| --- | --- |
| `src/content/*` Cordis | **无** `poses.add` / `fxRecipes.add`（`rg` 仅 `menpai/core`） |
| 馆九包 `content.json` | **均无** 两键 |
| bingren 等 | 可有 `animRecipes`（F 线示范）；steps 蹭核心 pose / 内联粒子参数，**不**示范自建 fxRecipe |

---

## 2. 硬编码 / 缺口债（每条有证据）

| # | 债 | 证据 | 影响 |
| --- | --- | --- | --- |
| 1 | **远程不灌 `poses` / `fxRecipes`** | `types.ts` 无字段；`remote.ts` INJECT/`applyContent` 无 add；F1 完成单已点名 | 馆包自定义姿态/粒子配方远程启用后**静默丢**；只能蹭核心 21+7 |
| 2 | **设计台无编导出面** | schema / `state.content` / export / 页签均无 | 作者无法可视化新建；与「招式样子」已通形成断层 |
| 3 | **示范包零样本** | `src/content` 与 `packages/*/content.json` 无两键 | 「只登记数据」缺可抄样板 |
| 4 | **敌人攻击姿不读目录** | `enemy.ts` `SKEL_ATTACKS[atkPoseName()]`；`atkPoseName` 按 kind | 即便 Cordis `poses.add('skel.axe')` **改不了**杂兵挥砍三帧；Anim `playPose` 路径可读目录，普攻绘制路径不读 |
| 5 | **Anim `playPose` 只用 strike** | `resolvePoseStrike` 忽略 wind/rec | 登记完整三帧对招式样子时间轴**只有 strike 生效**；wind/rec 主要服务 `attackPose()` 普攻时间轴 |
| 6 | **Idle 等非攻击姿仍模块常量** | `HP`/`SP`/`GP` 未进 `CORE_POSES` | 走/受击/盾姿等不可内容包替换——**缓**；勿当 X1 |
| 7 | **Boss / garg 姿** | `gargoyle.ts` + `garg.*` 在目录但绘制主路径本地 | **边界债**；本线不抢 Boss |
| 8 | **解释器 id 特判** | exec 按 kind / emitter；无内容 id 分支 | **本债轻**——勿为清特判乱扩 emitter |

---

## 3. 目标态

| 角色 | 做 | 不做 |
| --- | --- | --- |
| **内容包** | `fxRecipes.add` + `poses.add`；anim/符步骤软引用；远程 JSON 同构 | 不改 `g.fx` 实现；不扩新 emitter；不挂任意 JS/Canvas/外链 |
| **A 核心** | 单一目录 + 既有解释器；缺 id soft-skip / pose 回退 slash1 | 不按内容 id 开分支 |
| **C 档** | 仅当缺粒子原语时扩 `FxPreset` | 不为「多一种墨色 flare」开 C 单 |
| **设计台** | 能编 fxRecipe（闭集 emitter + 参数）；能编/拷 Pose 三帧并导出；挂接 datalist | 不做自由 Canvas 骨骼编辑器、不做运行时完整预览播放器（可后补） |

目标句：**加一条「雨枪墨爆」= 登记 fxRecipe（或 pose）+ animRecipe/`fx` 引用；零战斗文件 diff；设计台导出 → 馆 enable 可灌。**

---

## 4. 分期建议（X1–Xn）

| 期 | 目标 | 改动入口猜测 | 验收一条 | bump | 不做边界 |
| --- | --- | --- | --- | --- | --- |
| **X1 远程灌 poses + fxRecipes（已跟进）** | `DlcContentBody` 加 `poses?`/`fxRecipes?`；`REMOTE_DLC_INJECT` 声明；`applyContent` 在 **animRecipes / talismanScripts / skills 之前** `add`；smoke 合成 body（自定义 fxRecipe + anim/`fx` 引用；可选 pose + playPose）；对照 F1 | `src/dlc/types.ts` · `remote.ts`；`scripts/menpai-smoke.ts`；可选 `门派插件.md` 一句 | 远程 content 含自定义 `fxRecipes`（及可选 `poses`）→ enable 后 `getFxRecipe`/`getPose` 有货；同包 anim/符步骤引用不 warn 缺失 | **否** | 不扩 emitter；不改解释器；不改设计台；不部署；不碰敌人 `SKEL_ATTACKS` |
| **X2 设计台 fxRecipes（优先）+ 导出（已跟进）** | schema 段 `fxRecipes`；`state.content` / `buildContentExport` / 页签「特效配方」；表单：id + emitter 七选一 + color/size/life/n/heavy；emptyDef；人话预览一行 | `designer-schema.json` · `designer.js` · `designer.html` | 设计台能新建配方并导出键；导入再编辑不丢 | **否** | 不做粒子实时预览播放器；不扩 preset |
| **X3 设计台 poses + 弱挂接（已跟进）** | schema `poses`；三帧 PoseNums 表单（可先「从核心拷贝再改」）；export；animRecipes `playPose.poseId` / script `fx.recipeId` datalist（核心 + 本卷） | 同上 + animRecipes/script 字段增强 | 导出含 `poses`；招式样子能点选本卷 poseId / recipeId | **否** | 不做可视化骨骼拖拽；不改 idle 常量树 |
| **X4 示范包「只登记」** | 可选 pack：自建 `fxRecipes` 一条 + `animRecipes`（`inkBurst.recipeId`）或符 `fx.recipeId`；可选自建 pose + `playPose`；Cordis 与馆种子对齐；`test:menpai`+`build` 绿 | `src/content/<id>/` 或扩既有；`dlc-server/packages/…/content.json` | `?pack=` / 远程 enable 可见自定义粒子（或姿态）；零核心 diff | **否** | 不 SSH 部署；不顺手改 F/W/B 已收口项 |
| **X5（可选）敌人攻击姿读目录** | `enemy.computePose` attack 分支改 `getPose('skel.'+name)` / `getAttackPose`，保留 `SKEL_ATTACKS` 回退 | `enemy.ts`；smoke | Cordis 覆盖 `skel.thrust` 后杂兵枪刺三帧变化 | **否** | 不改 Behavior；不抢 Boss；不重做 idle/walk |

**X1 优先理由**：对齐 F1「先让远程吃上已有目录」；Cordis Service/Schema/核心种子**已齐**，卡点在 `DlcContentBody`/`applyContent`。设计台目前连键都没有，故 X2 紧随；fxRecipes 字段面远小于 Pose 三帧，故设计台先 fx 后 pose。默认**不扩** `FxEmitter` kind。

每期落地后可另写 `C档-X*-fxRecipes-poses-完成-2026-….md`。

---

## 5. 不做 / 暂缓

- 任意 JS / Canvas / 外链 URL / 自由 PNG（sheet/sfx 仍 `./art/`）
- **不扩** `FxPreset` / 新粒子绘制（缺原语另开 C 单）
- **不抢 Boss**：`bossMoves` / Gargoyle / 强制把 `garg.*` 绘制改目录主路径
- **不顺手改**已收口 W / F / T / B / A 线（含不重开 animRecipes 注入、不改 BehaviorStep）
- 本蓝图阶段**不部署**、不 bump
- 暂缓：整棵 idle/walk/hurt 姿态目录化；设计台实时骨骼/粒子预览；Anim `playPose` 改播 wind→strike→rec 全时间轴（属解释器语义，另议）

---

## 6. 给内容包（现阶段能 / 不能）

| 已能 | 还不能 |
| --- | --- |
| Cordis：`ctx.fxRecipes.add` / `ctx.poses.add`（Schema 已校验） | 远程 JSON / 设计台导出的**自定义** poses、fxRecipes 被 `applyContent` 吃上（X1 前） |
| 远程 anim/符步骤写**核心** `poseId`（如 `slash1`）或 `preset`/`recipeId`（如 `flare`） | 设计台可视化新建特效配方 / 姿态三帧（X2/X3 前） |
| 玩家普攻：Cordis 覆盖与攻击同名的 pose id → `getAttackPose` 可吃到 | 杂兵挥砍三帧靠 `poses.add('skel.*')` 覆盖（X5 前仍读 `SKEL_ATTACKS`） |
| F 线：远程已灌 `animRecipes`（F1）；可蹭核心姿态/粒子做招式样子 | 抄「自建 fxRecipe + 远程同构」完整示范（X4 前） |
| Smoke 断言核心 21 poses / 7 fxRecipes | 登记未知 `emitter`（Schema 拒收） |

---

## 7. 解释器 / Schema 入口（落地时对照）

| 职责 | 路径 |
| --- | --- |
| 类型 | `src/meta/bTier/types.ts`（`PoseDef` · `FxRecipeDef` · `FxEmitter`） |
| 核心种子 | `src/meta/bTier/coreData.ts`（`CORE_POSES` · `CORE_FX_RECIPES`） |
| 骨角常量源 | `src/render/poses.ts` · `src/render/rig.ts`（`Pose` · `AttackPoses` · `attackPose`） |
| Schema | `src/plugins/schemas.ts`（`PoseSchema` · `PoseNums` · `FxRecipeSchema` · `FX_PRESETS`） |
| 目录服务 | `src/plugins/services.ts`（`PoseService` · `FxRecipeService`） |
| 查询 | `src/meta/contentRegistry.ts` |
| Anim 解释 | `src/meta/animScripts.ts` |
| 符效解释 | `src/meta/talismanScripts.ts` |
| 玩家 / 敌人绘制 | `src/entities/player.ts` · `enemy.ts`（敌人硬表） |
| 长夜登记 | `src/menpai/core/index.ts` |
| 远程注入 | `src/dlc/types.ts` · `remote.ts`（**X1 已跟进**） |
| 设计台 | `dlc-server/public/designer.html` · `assets/designer-schema.json` · `designer.js`（**X2/X3 已跟进**） |
| Smoke | `scripts/menpai-smoke.ts` |
| F1 对照 | `docs-design/C档-F1-DLC-animRecipes注入-完成-2026-10-28.md` |

---

## 附：调研摘录（证据句）

- `CORE_POSES` 21 · `CORE_FX_RECIPES` 7——`coreData.ts`；smoke 期望同数。  
- `FxPreset` 闭集 7 与核心 fx 同名别名——`talismanScripts.ts` · `schemas.ts`。  
- `MenpaiCore` inject/add poses+fxRecipes——`menpai/core/index.ts`。  
- `DlcContentBody` / `REMOTE_DLC_INJECT` / `applyContent` **无** poses/fxRecipes；**有** animRecipes——`types.ts` · `remote.ts`。  
- 设计台 schema/state/export/页签 **无** poses/fxRecipes——`designer-schema.json` · `designer.js` · `designer.html`。  
- 馆九包 content **无** 两键；`src/content` **无** `poses.add`/`fxRecipes.add`。  
- `playPose` 只 strike；`inkBurst`/`fx` 可读 `recipeId`——`animScripts.ts` · `talismanScripts.ts`。  
- 敌人 attack 姿硬 `SKEL_ATTACKS`——`enemy.ts`。  
- F1 完成单已知限制已写 poses/fxRecipes 未覆盖。  
- 本 X0：**只写文档**，未改代码、未 bump、未部署。
