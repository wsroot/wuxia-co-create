# C 档蓝图：功法 castAnim / 特效全链路（观感配方）

仓库：`requiem-web`（`/workspace/requiem-web`）。  
日期：2026-10-28 Asia/Shanghai。  
本文件为分期蓝图（F0 调研）；**默认不 bump** 玩家存档。本蓝图阶段**不部署、不改代码**。

可读对照：`docs-design/C档-武器全链路蓝图-2026-10-28.md`（体例）；`requiem-web/docs/门派插件.md` 七附丙；`requiem-web/docs/C档原语与设计台-2026-10-28.md`。

---

## 终点（用户）

新外功「看起来怎样」= 内容包只登记数据：`animRecipes` 配方 + `SkillDef.castAnim`（+ 可选已开闸的 `castFx`）。  
**不改战斗 TS / 解释器**。缺 AnimStep kind 才开 C 档扩表白名单。禁止任意 JS / Canvas / 外链。

---

## 边界（与符咒线）

| 线 | 管什么 | 本蓝图 |
| --- | --- | --- |
| **功法观感线（本单）** | `castAnim` / `ctx.animRecipes` / 设计台招式样子 / DLC 灌配方 / 示范包 | 分期 F1–F4 |
| **符咒专线（另开则勿混）** | `ScriptStep` 语义、符箓实体、符咒伤害逻辑、`TalismanDef.anim` 深改 | **不顺手改** |
| **武器线（已收口多项）** | CombatStyle / weaponLooks / weapons feel / 普攻链 | **不顺手改** |

共用但本线只读引用：

- `castFx` ↔ 符箓 **同一套 ScriptStep**（政策已开闸：含 `damage*`）；本线可挂字段、设计台补编，**不扩 ScriptStep kind**。
- `AnimStep` 白名单技能 `castAnim` 与符咒 `anim` **共用**；本线主攻技能侧挂接与交付面。

---

## 1. 现状（文件 + 符号举证）

### 1.1 链路图

| 层 | 数据入口 | 目录 / 类型 | 解释器 / 调用方 | 证据路径 |
| --- | --- | --- | --- | --- |
| **AnimStep 白名单** | `ANIM_STEP_KINDS` + 联合类型字段 | 约 50 kind（共用 / 外功向 / 符箓向） | 登记 `validateAnimSteps`；运行 `AnimScriptPlayer.exec` | `src/meta/animScripts.ts`；`src/plugins/schemas.ts`（`ANIM_STEP_SCHEMAS`） |
| **配方目录** | `ctx.animRecipes.add` | `AnimRecipeDef{ id, steps, label? }` | `AnimRecipeService`；解析 `resolveAnimSteps` / `getAnimRecipe` | `src/plugins/services.ts`；`src/meta/contentRegistry.ts` |
| **外功挂点** | `SkillDef.castAnim` / `castFx` | string\|AnimStep[]；ScriptStep[] | `Player.playSkillAnim` → `playCastAnim`；`talismanScripts.playSteps` | `src/meta/skills.ts`；`src/entities/player.ts`；`src/entities/enemies/loadout.ts` |
| **解释器** | `game.animScripts` | `AnimScriptPlayer` | `play` / `playCastAnim` / `update` / `draw*` | `src/meta/animScripts.ts`；`src/game.ts` |
| **官方种子** | `CORE_ANIM_RECIPES` | 13 条（smoke 期望） | `menpai/core` `for (d of CORE_ANIM_RECIPES) ctx.animRecipes.add(d)` | `src/meta/animScripts.ts`；`src/menpai/core/index.ts` |
| **设计台** | 面板「招式样子」 | 积木编 `steps`；外功仅 `castAnim` 字符串 | `designer.html` / `designer.js` / `designer-schema.json` | `dlc-server/public/` |
| **远程 DLC** | `applyContent` / `REMOTE_DLC_INJECT` / `DlcContentBody` | **当前未灌 `animRecipes`** | skills 可随包注入；字段随 `skills.add` 进目录 | `src/dlc/remote.ts`；`src/dlc/types.ts` |

### 1.2 AnimStep 白名单（kind 摘要）

定义：`src/meta/animScripts.ts` → `ANIM_STEP_KINDS` / `AnimStep`。  
Schema：`src/plugins/schemas.ts` → `ANIM_STEP_SCHEMAS` + `validateAnimSteps`（未知 kind **登记拒收**）。

| 组 | kind（节选） |
| --- | --- |
| 共用基线 | `wait` · `playPose` · `holdPose` · `afterimage` · `weaponTrail` · `swingArc` · `sealGlyph` · `inkBurst` · `tintCaster` · `sfx` · `flash` · `hitstop` · `shake` · `hop` · `bounce` · `hover` · `fallStrike` |
| 外功向 A | `dash` · `face` · `scalePunch` · `landDust` · `sparkBurst` · `flareBurst` · `ringPulse` · `swordQiFlash` · `camZoom` · `slowmo` · `parryFlash` · `guardGlow` · `chainPose` · `loopPose` · `pullIn` · `orbitRing` · `beamLine` · `crescentSlash` · `groundCrack` · `riseMist` |
| 符箓向 B | `sealPaper` · `sealStamp` · `sealSpin` · `sealRain` · `sealChain` · `talismanTrail` · `inkSplash` · `baguaRing` · `runeOrbit` · `paperBurn` · `exorcismWave` · `bindThreads` · `soulBell` |

设计台 `designer-schema.json` → `animRecipes.steps`：**50 kind**，与核心白名单对齐（本调研未发现缺 kind）。

**硬规则**：AnimStep **默认不造成伤害**；伤害走 `attackKey` / `castFx` 的 ScriptStep `damage*`。位移类（`hop`/`dash`/…）只改 `body` 速度/坐标/`noGravity`。

### 1.3 `ctx.animRecipes`（Service / 注册 / 解析）

| 项 | 符号 / 行为 |
| --- | --- |
| Service | `AnimRecipeService`（`services.ts`）：`super(ctx, 'animRecipes', true)`；`add` 时 `validateAnimSteps(d.steps, …)` |
| Schema | `AnimRecipeSchema`：`id` 必填 · `steps` 必填 · `label?` |
| 长夜登记 | `MenpaiCore` inject 含 `'animRecipes'`；循环 `CORE_ANIM_RECIPES` |
| 解析 | `resolveAnimSteps(src)`：数组原样；string → `getAnimRecipe(src)?.steps`；缺 → `undefined`（soft） |
| 运行入口 | `AnimScriptPlayer.playCastAnim(g, src, color, caster)` → 缺配方 `warnAnim` + 跳过 |
| 查询 | `getAnimRecipe` / `listAnimRecipes` / `animRecipeMapView`（`contentRegistry.ts`） |

### 1.4 `SkillDef.castAnim` / `castFx`

| 字段 | 类型 | 运行时 |
| --- | --- | --- |
| `castFx?: ScriptStep[]` | 与符箓完整 ScriptStep（政策开闸，含伤害类） | `g.talismanScripts.playSteps(g, def.castFx, color[, caster])` |
| `castAnim?: string \| AnimStep[]` | 配方 id 或内联 steps | `g.animScripts.playCastAnim(…)`；**可与 castFx 同播** |

登记（`SkillService.add`）：

- `castFx` → `validateSteps(…, 'castFx')`
- `castAnim` 为 **string** → **不**在登记时校验配方是否存在（播放时 soft-resolve）
- `castAnim` 为数组 → `validateAnimSteps`

玩家：`castSkill` 各 `castKind` 分支播 `castFx` 后调 `playSkillAnim`。  
敌人：`loadout.ts` 同源双播。

### 1.5 `playCastAnim` / `playSteps`

| API | 文件 | 作用 |
| --- | --- | --- |
| `AnimScriptPlayer.play` / `playCastAnim` | `animScripts.ts` | 观感时间轴；`exec` 按 kind 分支；未知 kind 运行 soft-skip |
| `TalismanScriptPlayer.playSteps` | `talismanScripts.ts` | 外功 `castFx` 与符箓共用；内部 `talismanId: '_castFx'` |

`game.animScripts = new AnimScriptPlayer()`；主循环 `animScripts.update(this)`（`game.ts`）。

解释器 **无** 按技能 id / 配方 id 的硬分支（`rg` 仅命中种子表内的 `hopSlash`/`dashThrust` 字面量）。`bounce`/`sealChain` 等 kind 内部会注入后续 steps——属白名单语义，非内容 id 特判。

### 1.6 官方配方清单（`CORE_ANIM_RECIPES`，共 13）

| id | 向 | 要点 kind |
| --- | --- | --- |
| `slashInk` | 技能 | playPose · swingArc · weaponTrail · afterimage |
| `thrustInk` | 技能 | thrust 姿 · trail · inkBurst |
| `sealBurst` | 符 | sealGlyph · inkBurst |
| `hopSlash` | 技能 | hop · rising · swingArc · fallStrike |
| `dashThrust` | 技能 | face · dash · beamLine · sparkBurst |
| `crescentInk` | 技能 | crescentSlash · swordQiFlash |
| `groundBreak` | 技能 | fallStrike · groundCrack · landDust |
| `mistRise` | 技能 | riseMist · orbitRing |
| `sealStampFull` | 符 | sealPaper · sealStamp |
| `sealRainCast` | 符 | sealRain |
| `baguaBind` | 符 | baguaRing · bindThreads |
| `paperBurnBurst` | 符 | paperBurn · flareBurst |
| `exorcismPulse` | 符 | exorcismWave · soulBell |

Smoke：`scripts/menpai-smoke.ts` 期望 `animRecipes: 13`，并断言 `tuci→dashThrust`、`zhanma→hopSlash`。

### 1.7 设计台 animRecipes 面板

**存在**：`designer.html` 页签「招式样子」→ `#panel-animRecipes`；托盘积木 + 配方列表 + 人话预览。

**能改**：

- 配方 `id` / `label` + `steps[]`（白名单 kind 字段）
- 导出 `content.json` 含 `animRecipes`（`buildContentExport` 键列表含此项）
- 外功表单有 `castAnim` **字符串**（「招式样子编号」）；schema 亦有该字段

**不能 / 残缺**：

- 外功 **无 `castFx` 字段**（`designer-schema.json` skills.defFields 与 `designer.js` fallback 字段表均无）
- `castAnim` **无** 官方配方 presets / datalist（不像 `attackKey` 有 `coreAttackKeys`）
- 外功人话预览**不展示** `castAnim` / `castFx`
- 设计台导出的 `animRecipes` **远程 `applyContent` 当前会静默丢弃**（见下）

### 1.8 DLC：`animRecipes` 是否已灌

| 表面 | 现状 |
| --- | --- |
| `DlcContentBody` | **无** `animRecipes?`（`types.ts`） |
| `REMOTE_DLC_INJECT` | **无** `'animRecipes'`（`remote.ts`） |
| `applyContent` | **不** `add('animRecipes', …)` |
| 馆种子 | `dlc-server/packages/*/content.json`：**无一**含 `animRecipes` |
| skills 的 `castAnim`/`castFx` | 类型上随 `skills?: unknown[]` 注入；`SkillService.add` 会校验。**但** bingren 种子 JSON **剥掉了** Cordis 源里已有的 `castFx`；亦无 `castAnim` |

对照：武器线刚补的 `combatStyles`/`weaponLooks` 注入（见 `C档-DLC注入CombatStyle-完成-2026-10-28.md`）——**animRecipes 仍是同型债**。

**可用捷径（现状）**：远程 skill 只写 `castAnim: 'hopSlash'` 等**长夜已登记**配方 id → 播放时能解析（核心必载）。自定义新配方 id → 远程路径**做不到**，须 Cordis 源插件 `ctx.animRecipes.add`。

---

## 2. 硬编码 / 缺口债（每条有证据）

| # | 债 | 证据 | 影响 |
| --- | --- | --- | --- |
| 1 | **远程 / DlcContentBody 缺 `animRecipes`** | `types.ts` 无字段；`remote.ts` INJECT/`applyContent` 无 add；设计台却导出该键 | 馆包自定义「招式样子」远程启用后等于没登记；只能蹭官方 13 条 |
| 2 | **设计台外功 `castFx` 缺失** | `designer-schema.json` skills.defFields 无 `castFx`；`designer.js` ~1029 字段表无 | 作者无法在设计台编结算/粒子时间轴；只能手改 JSON 或 Cordis |
| 3 | **设计台 `castAnim` 弱挂接** | 仅 string；无 presets/datalist；预览不显示 | 易写错 id；与「招式样子」面板割裂 |
| 4 | **内容包 / 种子示范不足** | `src/content/*`：无 `animRecipes.add`；外功几乎无 `castAnim`（`bingren` 仅 `castFx`）；`qiangying` 只示范符 `anim`；bingren **种子**相对源插件还缺 `castFx` | 「只登记数据」路径缺少可抄样板；远程与本地 Cordis 观感不一致 |
| 5 | **核心外功大量无 `castAnim`** | `CORE_SKILLS`：仅 `zhanma→hopSlash`、`tuci→dashThrust`；`daomang`/`huixuan`/`chuanxin`/… 无观感配方 | 官方招「看起来」参差；非硬编码解释器，但是数据示范债 |
| 6 | **解释器特判** | `animScripts.exec`：**无** skill/recipe id 分支；kind 内注入 steps 属白名单语义 | **本债轻**——勿为清特判乱扩；优先交付面 |
| 7 | **string `castAnim` 登记不校验存在性** | `SkillService.add` 对 string 空操作；播放 soft-skip | 错 id 静默无动画（有 warn）；可接受，设计台应用 presets 降低踩坑 |

---

## 3. 目标态

| 角色 | 做 | 不做 |
| --- | --- | --- |
| **内容包** | `animRecipes.add` + `skills.add({ castAnim, castFx?, attackKey })`；远程 JSON 同构可灌 | 不改 `animScripts.ts`；不扩新 kind；不挂任意 JS/Canvas/外链 |
| **A 核心** | 单一解释器读目录播观感；缺 id soft-skip | 不按内容 id 开分支 |
| **C 档** | 仅当缺观感原语时扩 `ANIM_STEP_KINDS` | 不为「多一招样子」开 C 单 |
| **设计台** | 编配方 + 外功挂既有/本卷 `castAnim`；可选轻量 `castFx` 编辑 | 不做自由连招 DSL、不做运行时预览播放器（可后补） |

目标句：**加一门「雨枪突」= 登记/引用 animRecipe + skill.castAnim（+ 可选 castFx）；零战斗文件 diff；远程 content.json 也能灌。**

---

## 4. 分期建议（对齐推进侧，粒度≈ W1–W3）

| 期 | 目标 | 改动入口猜测 | 验收一条 | bump | 不做边界 |
| --- | --- | --- | --- | --- | --- |
| **F1 远程+设计台可配官方/本卷配方** | `DlcContentBody`/`REMOTE_DLC_INJECT`/`applyContent` 灌 `animRecipes`（**须在 skills 之前或至少同包可解析**）；设计台 skills：`castAnim` 加 presets/datalist（核心 13 + 本卷 id）；人话预览显示 castAnim；补一条 smoke | `src/dlc/types.ts` · `remote.ts` · `index.ts`；`designer-schema.json` · `designer.js`；`scripts/menpai-smoke.ts` | 远程 content 含自定义 `animRecipes` + skill.`castAnim` 指向该 id，启用后 `getAnimRecipe` 有货且施放不 warn 缺失；设计台能点选 `hopSlash` | **否** | 不扩 AnimStep kind；不改解释器；不部署；不动符咒 ScriptStep 语义 |
| **F2 设计台 castFx + 种子对齐** | skills 可编轻量 `castFx`（复用已有 `scriptSteps` 子集或简化字段）；bingren（或新示范）**种子**与 Cordis 源对齐写入 `castFx`/`castAnim` | `designer-schema.json` / `designer.js`；`dlc-server/packages/bingren/content.json`（或专用示范包）；文档 `门派插件.md` 一句 | 设计台导出 skill 带 castFx；馆种子远程启用后播粒子/震屏与本地 Cordis 一致 | **否** | 不新开 ScriptStep kind；不做完整符箓脚本编辑器迁入技能页 |
| **F3 示范内容包「只登记」** | 可选 pack：`animRecipes.add` 一条自制配方 + 外功 `castAnim` 引用；挂既有 `attackKey`；`test:menpai`+`build` 绿 | `src/content/<id>/` 或扩既有 `canzhao`/`bingren`；`OPTIONAL_PACKS`；可选馆种子 | `?pack=` 可见新招样子；零核心 diff | **否** | 不碰武器已收口项；不 SSH 部署 |
| **F4（可选）官方外功补挂观感** | 为若干无 `castAnim` 的 `CORE_SKILLS` 挂既有官方配方（如 `crescentInk`/`slashInk`），纯数据 | `src/meta/skills.ts`；smoke 断言 | 多门外功施放有稳定观感；仍 13 配方不强制加种 | **否** | 不为好看新建 kind；不改伤害数值 |

**F1 优先理由**：对齐武器线「先让远程/设计台吃上已有目录」；官方 13 配方已够用，先打通交付面，再谈示范与补挂。

每期落地后可另写 `C档-F*-完成-2026-….md`。

> **进度（2026-10-28）**：F1 **设计台半边已跟进**（`castAnim` presets/datalist + 人话预览；见 `C档-F1-设计台castAnim-完成-2026-10-28.md`）。远程 `animRecipes` inject 半边另派。F2 **设计台半边已跟进**（外功轻量 `castFx`；见 `C档-F2-设计台castFx-完成-2026-10-28.md`）；bingren 种子对齐另派。

---

## 5. 不做 / 暂缓

- 任意 JS / Canvas / 外链 URL / 自由 PNG（sheet/sfx 仍 `./art/` + 目录）
- 自由连招 DSL、Boss 壳、敌人 bodyAttacks
- **不顺手改**武器已收口：CombatStyle / weaponLooks / weapons feel / 普攻链 W1–W4
- **符咒专线**若另开：ScriptStep 语义深改、符箓实体、符咒伤害逻辑 → 勿混本线 PR
- 本蓝图阶段**不部署**、不 bump
- 暂缓：AnimStep 伤害桥接、设计台实时播放预览、扩任意新 kind（C 档另单）

---

## 6. 给内容包（现阶段能做什么）

| 已能 | 还不能 |
| --- | --- |
| Cordis：`ctx.animRecipes.add` + `skills.add({ castAnim: id \| steps, castFx })` | 远程 JSON **自定义** animRecipes（F1 前） |
| 远程 skill 写 `castAnim: 'dashThrust'` 等**官方 id**（核心已载） | 设计台编 `castFx`（F2 前） |
| 符侧：`TalismanDef.anim` / script.anim 引用官方符配方（如 `qiangying`→`sealStampFull`） | 抄「外功+自制配方」完整示范包（F3 前） |
| 设计台编 animRecipes 积木并导出（本地/源插件路径可用） | 导出后指望馆 enable 自动灌配方（F1 前会丢） |

---

## 7. 解释器 / Schema 入口（落地时对照）

| 职责 | 路径 |
| --- | --- |
| AnimStep 白名单 + 解释器 | `src/meta/animScripts.ts` |
| Schema / validate | `src/plugins/schemas.ts`（`ANIM_STEP_SCHEMAS` · `AnimRecipeSchema` · `SkillSchema.cast*`） |
| 目录服务 | `src/plugins/services.ts`（`AnimRecipeService` · `SkillService`） |
| 查询 | `src/meta/contentRegistry.ts` |
| 玩家 / 敌人施放 | `src/entities/player.ts` · `src/entities/enemies/loadout.ts` |
| castFx 解释 | `src/meta/talismanScripts.ts`（`playSteps`） |
| 长夜种子 | `CORE_ANIM_RECIPES`；`src/menpai/core/index.ts` |
| 远程注入 | `src/dlc/types.ts` · `remote.ts` |
| 设计台 | `dlc-server/public/assets/designer-schema.json` · `designer.js` · `designer.html` |
| Smoke | `scripts/menpai-smoke.ts` |

---

## 附：调研摘录（证据句）

- `ANIM_STEP_KINDS` 闭集 · `CORE_ANIM_RECIPES` 13 条——`src/meta/animScripts.ts`。  
- `playCastAnim`：缺配方 warn + return——同文件。  
- `SkillService`：string castAnim 登记不校验存在——`services.ts`。  
- 仅 `zhanma`/`tuci` 挂 castAnim——`skills.ts`；smoke 断言同。  
- `DlcContentBody` / `applyContent` **无 animRecipes**——`src/dlc/types.ts` · `remote.ts`。  
- 设计台有 animRecipes 面板；skills **无 castFx**、castAnim 无 presets——`designer-schema.json` / `designer.js`。  
- bingren 源有 `castFx`、种子 JSON 无——`src/content/bingren/index.ts` vs `dlc-server/packages/bingren/content.json`。  
- 内容包无 `animRecipes.add`；`qiangying` 仅符 `anim`——`rg` over `src/content`。  
- castFx 政策已开闸、与符箓共用 ScriptStep——`docs/门派插件.md`；本线不扩其 kind。

