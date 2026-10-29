# C 档蓝图：符咒 / ScriptStep 全链路

仓库：`requiem-web`（`/workspace/requiem-web`）。  
日期：2026-10-28 Asia/Shanghai。  
本文件为分期蓝图（T0 调研）；**默认不 bump** 玩家存档。本蓝图阶段**不部署、不改代码**。

可读对照：`docs-design/C档-武器全链路蓝图-2026-10-28.md`（体例）；`docs-design/C档-功法castAnim特效蓝图-2026-10-28.md`（观感线，**勿混**）；`requiem-web/docs/门派插件.md`；`requiem-web/docs/C档原语与设计台-2026-10-28.md`。

---

## 终点（用户）

新灵符 = 内容包只登记数据：`talismans.script`（ScriptStep 时间轴 + 可选 `anim`）+ `talismans.add`（`TalismanDef`）。  
远程 `content.json` / 设计台导出同构可灌。  
**不改战斗 TS**。缺 ScriptStep kind 才开 C 档扩表白名单。禁止任意 JS / Canvas / 外链 / 自由连招 DSL。

---

## 边界（与功法观感 / 武器）

| 线 | 管什么 | 本蓝图 |
| --- | --- | --- |
| **符咒专线（本单）** | `ScriptStep` 语义与登记、符箓实体、`TalismanDef` / `TalismanScriptDef`、设计台符面板、符相关种子对齐 | 分期 T1–Tn |
| **功法观感线（已收口多项）** | `castAnim` / `animRecipes`；F1·DLC + F4 已落地；F2/F3 若在进行 | **不抢、不顺手改** |
| **武器线（已收口多项）** | CombatStyle / weaponLooks / weapons feel / 普攻链 | **不顺手改** |
| **Boss / 机体积木** | collider / silhouette / behavior / Boss 壳 | **不顺手改** |

共用但本线可深改符箓侧：

- `castFx` ↔ 符箓 **同一套 ScriptStep**（政策已开闸：含 `damage*`）。本线可补齐符侧交付面与解释器债；**不扩 kind 除非缺原语**。
- `AnimStep` 白名单：`TalismanDef.anim` / `TalismanScriptDef.anim` 与技能 `castAnim` **共用**；观感配方目录归属功法线；本线只挂接 `anim` 字段与示范，不抢 `animRecipes` 注入单。

---

## 1. 现状（文件 + 符号举证）

### 1.1 链路图

| 层 | 数据入口 | 目录 / 类型 | 解释器 / 调用方 | 证据路径 |
| --- | --- | --- | --- | --- |
| **ScriptStep 白名单** | `ScriptStep` 联合类型 · `STEP_SCHEMAS` | 19 kind（见下） | 登记 `validateSteps`（未知 **拒收**）；运行 `TalismanScriptPlayer.exec` | `src/meta/talismanScripts.ts`；`src/plugins/schemas.ts` |
| **符效目录** | `ctx.talismans.script` | `TalismanScriptDef{ id, steps, anim? }` | `TalismanService.scripts`；`getTalismanScript` | `src/plugins/services.ts`；`src/meta/contentRegistry.ts` |
| **灵符目录** | `ctx.talismans.add` | `TalismanDef`（`scriptId` / `timeline` / `anim` / `icon`…） | `TalismanService.add`；缺 script 仅 warn | 同上；`src/meta/talismans.ts` |
| **解释器** | `game.talismanScripts` | `TalismanScriptPlayer` | `start`（符）· `playSteps`（外功 castFx）· `update` | `talismanScripts.ts`；`src/game.ts` |
| **官方种子** | `CORE_SCRIPTS` + `CORE_TALISMANS` | 各 12 条 | `CoreTalismans`：先 `script` 再 `add` | `talismanScripts.ts`；`talismans.ts`；`src/menpai/core/index.ts` |
| **设计台** | 玩法页签「符」 | 仅 Def 元数据字段；**无**符效时间轴面板 | `designer.html` / `designer.js` / `designer-schema.json` | `dlc-server/public/` |
| **远程 DLC** | `applyContent` / `DlcContentBody` | **已灌** `talismanScripts` + `talismans` | 先 `talismans.script` 再 `talismans.add` | `src/dlc/remote.ts`；`src/dlc/types.ts` |

### 1.2 ScriptStep 白名单（kind 全文）

定义：`src/meta/talismanScripts.ts` → `export type ScriptStep`。  
Schema：`src/plugins/schemas.ts` → `STEP_SCHEMAS` + `validateSteps`（未知 kind **登记抛错拒收**；`multihit.step` 须为 `damageRadius|damageCone|damageBox|damageDonut`）。

| 组 | kind |
| --- | --- |
| 节奏 / 文案 | `wait` · `banner` · `float` |
| 观感轻量 | `fx` · `shake` · `hitstop` · `flash` · `sfx` |
| 伤害几何 | `damageRadius` · `damageCone` · `damageBox` · `damageDonut` |
| 连段 / 召击 | `multihit` · `spawnVolley` · `knockback` |
| 状态 / 场域 | `status` · `zone` · `pull` · `root` |

`fx.preset` 闭集：`flare|ring|spark|qi|fire|dust|swordQi`（可另挂 `recipeId` → `ctx.fxRecipes`，缺则 soft-skip）。  
`spawnVolley.style` 闭集：`skySword|thunder|waterPulse`（可另挂 `volleyId`）。

设计台 `designer-schema.json` → `scriptSteps.steps`：**仅 12 kind**，缺 `banner` / `float` / `damageRadius` / `damageCone` / `spawnVolley` / `knockback` / `status`（见债表）。外功 `skills.castFx.kinds` 与此 12 子集同表——属功法线 F2 已用子集；本线补全面向**符箓完整时间轴**。

### 1.3 `ctx.talismans.script` / `add`（Service）

| 项 | 符号 / 行为 |
| --- | --- |
| Service | `TalismanService`（`services.ts`）：`super(ctx, 'talismans', true)`；另有 `scripts: KeyedStack<TalismanScriptDef>` |
| `script(def)` | `TalismanScriptSchema` + `validateSteps(steps)`；数组 `anim` → `validateAnimSteps`；string `anim` **登记不校验**配方存在 |
| `add(def)` | `TalismanSchema`；有 `timeline` → `validateSteps`；缺 `timeline` 且 `scriptId??id` 未登记 → **warn**（施放退化为只显示名字） |
| 查询 | `getTalisman` / `listTalismans`；`getTalismanScript` / `listTalismanScripts`（`contentRegistry.ts`） |

### 1.4 `TalismanDef` / `anim`

| 字段 | 类型 | 运行时 |
| --- | --- | --- |
| `scriptId?` | string | 默认 `id`；解析 `getTalismanScript` |
| `timeline?` | ScriptStep[] | 非空则**优先于** script 目录 steps |
| `scriptParams?` | 数值字典 | 合并进 cast（如 `damage` 乘区） |
| `anim?` | string \| AnimStep[] | **覆盖** `script.anim`；`playCastAnim` 同播 |
| `icon?` | string | `talismanIconUrl`：`./`/`/` 原样；否则 `./art/icons/{key}_{size}.png` |

`TalismanScriptPlayer.start`：先播 `def.anim ?? script.anim`，再跑 steps；无 steps → banner+飘字回退。  
`playSteps`：外功 `castFx` 入口；内部 `talismanId: '_castFx'`（`player.ts` / `loadout.ts`）。

Schema 必填：`id` · `name` · `fogName` · `lore` · `tip` · `color` · `cost` · `fee` · `stockCap` · `runCharges`（`TalismanSchema`）。

### 1.5 解释器：`playSteps` / `start` / `exec`

| API | 文件 | 作用 |
| --- | --- | --- |
| `start(g, id, def, caster?)` | `talismanScripts.ts` | 符箓施放；挂 anim + timeline/script |
| `playSteps(g, steps, color, caster?)` | 同 | castFx / 一次性时间轴 |
| `update` / `exec` | 同 | 按 `step.kind` 分支；缺 fx preset / volley style → soft-skip |

解释器 **无** 按符箓 **内容 id** 的硬分支（`rg` 无 `talismanId === '…'` 玩法特判）。  
`status` 字段（`poshi` / `hushen` / `dingshen` / `anhun`…）与 `spawnVolley.style` 闭集属**白名单语义**，非内容 id 特判。  
登记层拒未知 kind；运行层 switch 穷尽已知 kind。

### 1.6 官方种子（`CORE_SCRIPTS` / `CORE_TALISMANS`，各 12）

| script id | 对应符（示例） | 要点 kind / anim |
| --- | --- | --- |
| `quxie` | 驱邪符 | status 压精英；`anim: 'exorcismPulse'` |
| `qingwu` | 清雾符 | affixSuppress · clearHazards |
| `jiekong` | 解控符 | clearControl · invuln |
| `poshi` | 破势符 | `status.poshi` |
| `hushen` | 护身符 | `status.hushen` |
| `dingshen` | 定身符 | `status.dingshen`；`anim: 'baguaBind'` |
| `anhunfu` | 安魂符 | `status.anhun` |
| `jingxue` | 净血符 | clearHazards · heal |
| `zhangyan` | 障眼符 | eliteSuppress |
| `skySwords` | 飞剑符（`feijianfu`） | `spawnVolley` style `skySword` |
| `thunder` | 雷符（`leifu`） | `spawnVolley` style `thunder` |
| `waterPulse` | 水龙符（`shuilongfu`） | `spawnVolley` style `waterPulse` |

Smoke：`scripts/menpai-smoke.ts` 期望 `talismans: 12`、`scripts: 12`；断言 `quxie.anim`、`dingshen.anim`；拒 `eval` 与坏 `damageRadius`。

仅前四枚核心符挂了 `icon: 'H-05-tal-*'`；其余无 icon。

### 1.7 远程 DLC：符箓相关已灌哪些

| 表面 | 现状 |
| --- | --- |
| `DlcContentBody` | **有** `talismanScripts?` · `talismans?`（`types.ts`） |
| `applyContent` | 先 `for … talismans.script(s)`，再 `add('talismans', …)`（`remote.ts`） |
| `REMOTE_DLC_INJECT` | 含 `'talismans'`（script 走 service 方法，不单独 inject 名） |
| 馆种子 | `hanmang` / `chixia` / `qiangying` / `yinfeng` 均含 `talismanScripts` + `talismans` |

对照功法线：`animRecipes` 曾缺灌、F1 已补——**符箓远程注入面本身已通**；债在**设计台导出不产 `talismanScripts`**、以及种子与 Cordis 不一致。

### 1.8 设计台符箓面板能力

**存在**：`designer.html` 玩法页签 option `talismans`（「符」）；`gameplayFields('talismans')` 表单。

**能改（Def 半边）**：

- `id` / `name` / `tip` / `color` / `anim`（裸 string）/ `scriptId` / `fee` / `quality` / `grade`
- `emptyGameplay` 默认带 `anim`/`scriptId`/`fee`/`stockCap`/`runCharges`（但缺 Schema 多项必填）

**不能 / 残缺**：

- **无** `talismanScripts` 内容键、无符效积木面板（`state.content` 与 `buildContentExport` keys **均无** `talismanScripts`）
- Def 缺：`fogName` · `lore` · `cost` · `stockCap`/`runCharges` 表单（empty 有后二者但 fields 列表无）· `icon` · `timeline` · `scriptParams`
- `anim` **无** presets/datalist（不像外功 `castAnim` 已挂 `animRecipeIds`）
- `scriptSteps` 白名单缺 7 个符向常用 kind（见上）
- 导出 `content.json` 只有 `talismans` Def → 远程能 add Def，但 **无脚本 steps** → 施放 warn + 名字回退（除非手写 JSON）

外功侧轻量 `castFx` 编辑器已存在（F2），注释写明「不做完整符箓脚本编辑器」——本线要的是**符专属**时间轴编辑，不是把技能页撑成完整符编辑器。

### 1.9 内容包示范

| 包 | Cordis 源 | 馆种子 `content.json` | 要点 / 差 |
| --- | --- | --- | --- |
| **hanmang** | `src/content/hanmang`：`hanmangSlash` + `hanmangfu`；`damageCone`；伤害走 Config | 有 script+tal；固定 damage | 源无 `anim`；种子与源步骤大体同构 |
| **chixia** | `chixiaBurst`：`config.bursts` 展开多段 `damageRadius` | 固化 27 步（≈ 默认 3 爆） | 远程无 Config；步骤已展开 |
| **qiangying** | `qiangyingQiangmang`：`anim: 'sealStampFull'` + `multihit`+`damageCone`+`damageBox`；敌人 loadout 挂符 | 种子：**无 anim**；步骤简化为单次 `damageCone`（无 multihit/box） | **种子 ≂̸ Cordis**；smoke 对 **Cordis** 断言 `anim === 'sealStampFull'` |
| **yinfeng** | 纯馆 JSON（无 `src/content`） | `yinfengDash` 轻量观感步 + `yinfengfu` | 试篇；无伤害几何 |

另：官方 `CORE_*` 为必载示范；`qiangying` 亦示范敌人施符共用播放器。

---

## 2. 硬编码 / 缺口债（每条有证据）

| # | 债 | 证据 | 影响 |
| --- | --- | --- | --- |
| 1 | **设计台不产 / 不编 `talismanScripts`** | `designer.js` `state.content` 无该键；`buildContentExport` keys 无；仅有 `talismans` Def 表单 | 设计台导出远程启用后 Def 有、符效无 → 施放退化；作者只能手改 JSON 或写 Cordis |
| 2 | **设计台 `scriptSteps` 白名单缺 7 kind** | `designer-schema.json` steps 12 个；TS `ScriptStep` 19 个；缺 banner/float/damageRadius/damageCone/spawnVolley/knockback/status | 即便补面板，也编不出官方/寒芒/赤霞同款时间轴 |
| 3 | **设计台 TalismanDef 缺 Schema 必填** | fields 无 `fogName`/`lore`/`cost`…；`TalismanSchema` 均 required | 设计台默认导出易被 `TalismanService.add` **拒收** |
| 4 | **qiangying 种子 ≂̸ Cordis** | 源有 `anim: 'sealStampFull'`+multihit+box；`dlc-server/packages/qiangying/content.json` 无 anim、单 cone | 远程馆启用与 `?pack=qiangying` 观感/判定不一致 |
| 5 | **`icon` 无外链拒收**（**T3 已收**） | 原：`add` 无 http 检查；现：`TalismanService.add` + `talismanIconUrl` 拒 `http(s)://`；hanmang 挂 `H-05-tal-1` | 外链拒收；合法 key/`./art/` 可显示 |
| 6 | **设计台 `anim` 弱挂接** | 裸 string；无 datalist/presets；人话预览弱 | 易写错官方配方 id；与「招式样子」面板割裂 |
| 7 | **解释器 id 特判** | `exec` **无** 内容 id 分支；闭集字段属白名单 | **本债轻**——勿为清特判乱扩 kind；优先交付面 |
| 8 | **string `anim` 登记不校验存在** | `script`/`add` 对 string anim 空操作；播放 soft-skip | 可接受；设计台 presets 可降踩坑 |

---

## 3. 目标态

| 角色 | 做 | 不做 |
| --- | --- | --- |
| **内容包** | `talismans.script` + `talismans.add`；远程 JSON 同构；可选 `anim` 挂既有/本卷配方 | 不改 `talismanScripts.ts` 解释器；不扩新 kind；不挂任意 JS/Canvas/外链 |
| **A 核心** | 单一解释器读目录播符效；缺 script soft 回退 | 不按内容 id 开分支 |
| **C 档** | 仅当缺原语时扩 `ScriptStep` kind | 不为「多一枚符」开 C 单 |
| **设计台** | 编符效 steps（全白名单）+ Def 必填齐 + 导出含 `talismanScripts`；`anim`/`scriptId` 可点选 | 不做自由连招 DSL、不做运行时完整预览播放器（可后补）；不把技能 castFx 页做成完整符编辑器 |

目标句：**加一枚「雨枪符」= 登记 script（steps+可选 anim）+ TalismanDef；零战斗文件 diff；设计台导出 → 馆 enable 可灌可放。**

---

## 4. 分期建议（对齐推进侧）

| 期 | 目标 | 改动入口猜测 | 验收一条 | bump | 不做边界 |
| --- | --- | --- | --- | --- | --- |
| **T1 设计台/远程符箓交付面**（**设计台半边已跟进** · 见 `C档-T1-符咒-完成-2026-10-28.md`） | 设计台可编并导出 `talismanScripts`；`scriptSteps` 白名单对齐核心 19 kind；TalismanDef 表单补齐 Schema 必填（fogName/lore/cost/stockCap/runCharges/icon?）；`anim` 加 datalist（核心符向配方 + 本卷 animRecipes）；导出 keys 含 `talismanScripts`（**先于** talismans） | `designer-schema.json` · `designer.js` · `designer.html`（若需页签）；文档一句；可选 smoke 对「导出形状」注释 | 设计台新建一符：有 script steps（含 `damageCone` 或 `banner`）+ 齐字段 Def；导出 content 远程 `applyContent` 后 `getTalismanScript` 有货且施放非名字回退 | **否** | 不扩 ScriptStep kind；不改解释器；不抢 castAnim F 线；不部署；不动武器/Boss |
| **T2 种子与 Cordis 对齐**（**已落地** · 见 `C档-T2-符咒-完成-2026-10-28.md`） | `qiangying`（及必要时 hanmang）馆种子补 `anim`、对齐 multihit/box 等步骤；文档说明远程无 Config、伤害取默认展开值 | `dlc-server/packages/qiangying/content.json`（± hanmang）；`dlc:regen` 若流程需要 | 远程启用 qiangying 后 `getScript('qiangyingQiangmang')?.anim === 'sealStampFull'`，步骤含 multihit 语义 | **否** | 不改 Cordis 数值手感；不 SSH 部署 |
| **T3 icon 拒外链 + 示范补全**（**已落地** · 见 `C档-T3-符咒-完成-2026-10-28.md`） | `TalismanService`/`talismanIconUrl` 拒 `http(s)://`；示范包（或 hanmang）挂 `./art/` 或既有 key；设计台 icon 字段提示 | `services.ts` · `artAssets.ts`；示范 pack / 种子 | 外链 icon 登记拒收；合法 `./art/` 或 `H-05-*` 可显示 | **否** | 不引入自由 PNG 上传；不扩 sheet 规则 |
| **T4（可选）官方/文档清理**（**已跟进** · 见 `C档-T4-符咒-完成-2026-10-28.md`） | 核心无 icon 符补内置 key（若有美术）；`门派插件.md` / 设计台 note 与 19 kind 同步；人话预览展示 scriptId/anim/步数 | `talismans.ts`；docs；`designer.js` 预览 | 文档与 schema 种类表一致；预览可见「符效 N 步」 | **否** | 不为好看新建 ScriptStep kind；不改伤害数值 |

**T1 优先理由**：远程 `applyContent` **已能**灌符效；卡点在设计台交付面（对照功法线 F1「先打通远程/设计台吃上已有目录」——本线远程已通，故先补设计台+白名单+必填）。不先扩任意新 kind。

每期落地后可另写 `C档-T*-符咒-完成-2026-….md`。

---

## 5. 不做 / 暂缓

- 任意 JS / Canvas / 外链 URL / 自由 PNG（icon/sheet 仍 `./art/` 或既有 key）
- 自由连招 DSL、Boss 壳、敌人 bodyAttacks、武器已收口项
- **不抢**功法观感线：`animRecipes` 注入、F2/F3 示范与 castFx 技能页（castFx 与符共用 ScriptStep——本线深改符侧，**不扩 kind**）
- 本蓝图阶段**不部署**、不 bump
- 暂缓：设计台实时施符预览、AnimStep/ScriptStep 伤害桥接、扩任意新 kind（C 档另单）、把 `status.poshi` 等改成「数据驱动无字段」大重构

---

## 6. 给内容包（现阶段能做什么）

| 已能 | 还不能 |
| --- | --- |
| Cordis：`ctx.talismans.script` + `add`（hanmang/chixia/qiangying 可抄） | 设计台编完整符效时间轴并导出 `talismanScripts`（T1 前） |
| 远程手写 JSON：`talismanScripts` + `talismans` → `applyContent` 已灌 | 设计台一键导出「可过 Schema 的齐字段 Def」（T1 前易拒收） |
| 挂 `anim: 'sealStampFull'` 等**官方**配方 id（核心已载） | 指望 qiangying **馆种子**与 Cordis 同 anim/multihit（T2 前） |
| 外功 `castFx` 轻量子集（设计台 F2 已有） | 在设计台用 `damageCone`/`status`/`spawnVolley` 等符向 kind（T1 白名单前） |
| 敌人 loadout 挂符 id（qiangying 示范） | 符 icon 安全外链（本就应禁；T3 前缺硬拒） |

---

## 7. 解释器 / Schema 入口（落地时对照）

| 职责 | 路径 |
| --- | --- |
| ScriptStep 白名单 + 解释器 | `src/meta/talismanScripts.ts` |
| TalismanDef | `src/meta/talismans.ts` |
| Schema / validate | `src/plugins/schemas.ts`（`STEP_SCHEMAS` · `TalismanSchema` · `TalismanScriptSchema`） |
| 目录服务 | `src/plugins/services.ts`（`TalismanService`） |
| 查询 | `src/meta/contentRegistry.ts` |
| 玩家 / 敌人施符 | `src/game.ts` · `src/entities/enemies/loadout.ts` |
| castFx 同播 | `src/entities/player.ts` · `loadout.ts` → `playSteps` |
| 长夜种子 | `CORE_SCRIPTS` / `CORE_TALISMANS`；`src/menpai/core/index.ts` |
| 远程注入 | `src/dlc/types.ts` · `remote.ts`（**已灌**） |
| 设计台 | `dlc-server/public/assets/designer-schema.json` · `designer.js` · `designer.html` |
| 示范包 | `src/content/{hanmang,chixia,qiangying}`；`dlc-server/packages/{hanmang,chixia,qiangying,yinfeng}` |
| Smoke | `scripts/menpai-smoke.ts` |
| Icon | `src/render/artAssets.ts`（`talismanIconUrl`） |

---

## 附：调研摘录（证据句）

- `ScriptStep` 19 kind · `CORE_SCRIPTS` 12 · `playSteps` / `start`——`src/meta/talismanScripts.ts`。  
- `validateSteps` 未知 kind 拒收；`TalismanService.script`/`add`——`schemas.ts` · `services.ts`。  
- `DlcContentBody` / `applyContent` **已有** talismanScripts+talismans——`src/dlc/types.ts` · `remote.ts`。  
- 设计台 `buildContentExport` **无** `talismanScripts`；符表单仅 Def 半边——`designer.js`。  
- `scriptSteps` 设计台缺 7 kind——`designer-schema.json` vs TS 联合类型。  
- qiangying Cordis `anim: 'sealStampFull'` + multihit；种子无 anim、单 cone——`src/content/qiangying/index.ts` vs `packages/qiangying/content.json`；smoke 断言 Cordis anim。  
- `talismanIconUrl` 对 `./`/`/` 原样；Service **无** http 拒——`artAssets.ts` · `services.ts`。  
- castFx 与符箓共用 ScriptStep；功法观感线 F1·DLC/F4 已收口——`门派插件.md`；`docs-design/C档-功法castAnim特效蓝图-*.md` 完成记录。  
- 本 T0：**只写文档**，未改代码、未 bump、未部署。
