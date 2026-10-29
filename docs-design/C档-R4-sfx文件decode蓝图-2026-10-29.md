# C 档蓝图：R4 · sfx 包内文件 decode

- **日期**：2026-10-29（Asia/Shanghai）
- **仓库**：`/workspace/requiem-web`
- **债**：远程素材附期；`C档-剩余债清单-2026-10-28.md` #1 旁注 / 仍开表 **R4**；蓝图预留见 `C档-远程素材蓝图-2026-10-28.md` §4 R4
- **前置**：R0–R3 已收口（`C档-远程素材-推进收口-2026-10-29.md`）；hitSfx 命中消费已通（synth 白名单）
- **bump**：**否** · **部署**：**否**（蓝图阶段）· **不开** #12 perch · **勿重开** R1–R3 交付面

本文件为分期蓝图；**只文档，不改代码、不 bump、不部署、不跑 test/build**。

---

## 1. 目标 / 非目标（禁区）

### 目标

包内（游戏静态）`./art/` 白名单路径下的 **wav / ogg / mp3**，经 `AudioContext.decodeAudioData` 进**现有** sfx 管线，可被：

- `ScriptStep.sfx`（符效）
- `ProjectileDef.hitSfx`（及既有 `playSfx` / 目录 id 消费方）
- 其他已指向 sfx 目录 id 的软引用

…在 **有已 decode 的 buffer** 时播放；失败或未就绪则静默回退既有路径（synth 或今日默认音）。

### 非目标 / 禁区

| 禁 | 说明 |
| --- | --- |
| 任意 JS | 不跑包内脚本、不 eval |
| 任意外链 URL | `http(s)://` / `://` 继续拒（`SfxCatalogService` 已有） |
| 自由 PNG / 非白名单路径 | `src` 须 `/^\.\/art\//`；建议约定 `./art/audio/` |
| 第二套音频引擎 | 不新开 Howler / HTMLAudio 主路径；仍走 `AudioEngine` + `sfxBus` |
| 任意 Canvas | 不沾渲染 |
| 远程二进制 art 通道 | 馆 tgz 仍仅 pack+content；**新音频须进游戏静态** `public/art/…`（与 sheet 同策） |
| 扩 synth 闭集 / 新合成原语 | 文件通道与 synth 并存；不为「多一个文件」开 C 原语枚举债 |
| 热更 / SSH / 存档 bump | 蓝图阶段一律不动 |

---

## 2. Schema / 解释器边界与白名单字段

### 已有（勿另起炉灶）

| 面 | 证据 |
| --- | --- |
| 类型 | `SfxDef{ id, synth?, src?, format? }` · `SfxFormat = wav\|ogg\|mp3` — `src/meta/bTier/types.ts`（注释已写 `./art/audio/`） |
| Schema | `SfxSchema` — `src/plugins/schemas.ts` |
| 登记校验 | `SfxCatalogService.add`：须 `synth` **或** `src`；有 `src` → 禁外链 + `ART_SRC_RE` + 必填 `format` — `src/plugins/services.ts` |
| 设计台 | R2b 已有 src/format 字段（灰显「文件通道未通」）— `designer.js` / `designer-schema.json` `sfxFormats` |
| 目录查询 | `getSfxDef` — `contentRegistry.ts` |

**新字段**：默认 **不新增**。继续用既有 `src` + `format`；不引入第二套 `file` / `path` 键（除非落地时发现命名冲突——当前无）。

### 路径 / 扩展名白名单（解释器侧再钉一层）

| 规则 | 约定 |
| --- | --- |
| 前缀 | `/^\.\/art\//`（与 Service 一致） |
| 建议子目录 | `./art/audio/`（types 旁注；R4a 可软提示，**硬拒非 art 前缀即可**） |
| 扩展名 | 与 `format` 一致：`.wav` / `.ogg` / `.mp3`（大小写不敏感）；`format` 与后缀不一致 → soft-skip / 登记拒（落地择一，默认登记已靠 Schema） |
| 体素 | 建议对齐 sheet 思路：默认上限（如 512KB～2MB）；超限拒登记或拒 decode（R4a 写死一句） |

### 与 synth 并存

| 情况 | 播放 |
| --- | --- |
| 仅 `synth` | 今日 `playSfx(synth)`（不变） |
| 仅 `src`(+`format`) | R4：**优先**已缓存 `AudioBuffer`；无 buffer / decode 失败 → **静默不播**（hitSfx 则回退今日 hit/hitHeavy，与现 soft-skip 一致） |
| **同时**有 `synth` + `src` | **file 优先**（有 buffer 播文件）；无 buffer 时 **回退 synth**（便于作者预挂文件、未放静态时仍可闻声） |
| 无条目 / 非法 | 与今日一致 soft-skip |

不把 format 枚举「永久塞进核心债」：闭集已在 Schema/`SfxFormat`；本刀只接线 decode，**不扩**枚举。

---

## 3. 与现有 hitSfx / getSfxDef / synth 的衔接

### 现状（证据）

| 面 | 行为 |
| --- | --- |
| 统一播入口 | `playSfx(audio, name)` — `src/audio/sfx.ts`；未知名 default soft-skip |
| AudioEngine | 已有 `AudioContext` / `sfxBus` / `AudioBuffer`（noise/impulse）；**尚无** `decodeAudioData` 消费包文件 |
| 符效 | `talismanScripts` `case 'sfx'`：`getSfxDef` → 有 `synth` 则 `playSfx`；**仅 src reserved** |
| hitSfx | `resolveProjectileHitSfx`：仅 `sdef?.synth`；仅 src → undefined → 今日 hit/hitHeavy — hitSfx 完成单 |
| anim 脚本 | `animScripts` 仍直接 `playSfx(step.id)`（历史名）；R4 **可顺手**走目录解析，但非 R4a 必做 |

### 目标消费链

```
命中 / 符步 / 其他
  → sfx 目录 id（如 hitSfx / ScriptStep.sfx）
  → getSfxDef(id)
  → 若有已 decode 的 AudioBuffer → 经 sfxBus 播 buffer
  → 否则若有 synth → playSfx(synth)
  → 否则 soft-skip（hitSfx：回退今日 hit/hitHeavy）
```

### 加载时机（建议）

| 策略 | 说明 |
| --- | --- |
| **懒 decode（R4a 默认）** | 首次需要播该 id 时 `fetch(src)` → `decodeAudioData` → 缓存；AudioContext 未 unlock 则等 `ensure()` 后再试 |
| 可选预热 | 包 `apply` / Cordis `add` 后后台预 decode（R4b+）；失败不挡登记 |
| 失败 | **静默**：warn 一次即可；回退 synth / 不播；不抛穿战斗环 |
| unload | 包卸时清该 id 的 buffer 缓存（与 catalog dispose 对齐） |

远程 alone：**不能**靠馆 JSON 送达新音频文件；验收文件须已在 `public/art/audio/…`（或作者本机 Cordis 同路径静态）。与 R 收口「远程 alone 无新 PNG/音频」一致。

### 衔接改动猜测（落地时，非本蓝图）

| 入口 | 方向 |
| --- | --- |
| `src/audio/` | 小模块：buffer 缓存 + `playSfxBuffer` / 扩展 `playSfx` 查目录 |
| `talismanScripts.ts` | `case 'sfx'`：有 buffer 播文件；否则 synth（去掉 reserved 注释） |
| `contentRegistry.ts` | `resolveProjectileHitSfx`：有可播文件 id 或 synth 均算白名单（返回 **catalog id** 或区分 marker——落地择一；须让 `resolver` 能播 buffer 而非只 `playSfx(synth名)`） |
| `combat/resolver.ts` | 确认命中路径吃「可播 id」，不仅 synth 字符串 |
| Smoke | 登记 `./art/audio/…` + 假/真短文件；断言 decode 路径或回退 |

---

## 4. 分期刀序与每刀验收句

| 期 | 目标 | 验收一句 | bump | 部署 |
| --- | --- | --- | --- | --- |
| **R4a（建议先开）** | 核心：白名单 `src`→`decodeAudioData`→缓存→经 `sfxBus` 播；与 synth 并存（file 优先、失败回退）；接线符 `sfx` + hitSfx 解析扩至「可播文件」；`./art/`+format 再校验；失败静默 | 包内合法 `./art/audio/*.ogg`（文件已在客户端）登记且无 synth → 符步/命中可闻文件音；非法路径/缺文件 → soft-skip 或回退 synth/今日音；`test:menpai`+`build` 绿 | **否** | **否**（默认不自部署） |
| **R4b**（**已跟进** 见 `C档-R4b-sfx文件decode-完成-2026-10-29.md`） | 设计台去掉「文件通道未通」灰态；可填 src/format 并提示须放 `public/art/audio/`；可选示范包挂一条 file sfx（Cordis±馆种子仍 **不**塞二进制进 tgz） | 设计台导出含 `src`+`format` 的 sfx 可被 `applyContent` 吃；预览或文档句说明静态送达；smoke 覆盖 file 别名 | **否** | 若改设计台静态 → 可能要 **:4174**（须用户拍板） |
| **R4c（可选）**（**已跟进** 见 `C档-R4c-sfx文件decode-完成-2026-10-29.md`） | 热更验收 / 放 1～2 个短示范 wav·ogg 进 `public/art/audio/`；文档一句固化「新音频进游戏静态」；顺带 animScripts→catalog | 热更后 `?pack=` 或 enable 可闻示范文件音 | **否** | 本刀**打包** :4173+:4174 供推进问热更；**勿自部署** |

**建议先开：R4a。**  
每刀落地后另写 `C档-R4*-sfx文件decode-完成-2026-….md`。

---

## 5. 是否动 :4173 / :4174、是否要热更

| 阶段 | :4173 游戏 | :4174 设计台 | 热更 |
| --- | --- | --- | --- |
| **本蓝图** | **不动** | **不动** | **否** |
| R4a 落地 | 改 `src/audio/*` 等 → 默认 **不自部署**；验本地 `test:menpai`+`build` | 不改台则否 | 否 |
| R4b | 通常否 | 改 `designer.*` → 可能要 :4174 | 否除非拍板 |
| R4c | 静态 art + 运行时 → 可能要 :4173 | 视需要 | **须用户拍板** |

默认：**不自部署、不 SSH、不 upload。**

---

## 6. A / B / C 档边界

| 档 | 本刀 |
| --- | --- |
| **C（本刀）** | 白名单路径 + format 闭集上的 **decode 接线**；解释器吃 `SfxDef.src`；不扩战斗原语 |
| **B** | 示范包只登记 `src` 指向已有静态；设计台字段已有，R4b 仅去灰态/文案 |
| **A** | 不改物理/存档/taxonomy；不按内容 id 开特判分支 |

插件勿把 format 枚举永久塞进核心债：`wav|ogg|mp3` 已在 Schema；若将来加格式另开 C 单，不在 R4 顺手扩。

---

## 7. 已知限制

1. **远程 alone 无新音频文件**：馆包不能送达二进制；文件须预先在 `public/art/…`（与 sheet 同）。  
2. **AudioContext 须用户手势 unlock**：首播前可能尚无 ctx；懒 decode 须挂 `ensure()`。  
3. **浏览器编解码差**：ogg/mp3 支持因环境而异；失败须静默回退，勿卡战斗。  
4. **animScripts**：R4c 已改走 `playCatalogSfx`（与符效/hitSfx 对称）；历史核心裸名仍经 catalog 回退。  
5. **#12 perch** 本线不开。

---

## 8. 入口速查（落地对照）

| 职责 | 路径 |
| --- | --- |
| 类型 / format | `src/meta/bTier/types.ts`（`SfxDef` · `SfxFormat`） |
| Schema | `src/plugins/schemas.ts`（`SfxSchema`） |
| 登记白名单 | `src/plugins/services.ts`（`SfxCatalogService` · `ART_SRC_RE`） |
| 目录 | `src/meta/contentRegistry.ts`（`getSfxDef` · `resolveProjectileHitSfx`） |
| synth 解释器 | `src/audio/sfx.ts`（`playSfx`） |
| AudioContext | `src/audio/audio.ts`（`AudioEngine`） |
| 符效 sfx 步 | `src/meta/talismanScripts.ts` |
| 命中播 | `src/combat/resolver.ts` |
| 设计台 | `dlc-server/public/assets/designer.js` · `designer-schema.json` |
| 静态 art | `public/art/`（现有 weapons/bg/icons；**尚无** `audio/` 子目录） |
| Smoke | `scripts/menpai-smoke.ts`（已有「仅 src soft-skip（R4）」断言，落地须改） |

---

## 附：R 系列预留引用

- 远程蓝图 §4：**「R4（可选/暂缓）sfx 文件解码 + art 送达策略」**；验收「登记 `./art/audio/….ogg` 后能播（文件已在客户端）」；默认缓、禁外链。  
- 推进收口：未部署债表 **「sfx 包内文件 decode（R4）」**；建议下一动作 **勿默认开 R4**——**本单用户已点名开蓝图**。  
- R1/R2b/R3 完成单均写 reserved / 仅 synth；hitSfx 蓝图与完成单明确 **非目标 = R4 文件 decode**。

---

## 路径

- 本蓝图：`/workspace/docs-design/C档-R4-sfx文件decode蓝图-2026-10-29.md`
- 对照体例：`/workspace/docs-design/C档-hitSfx命中消费蓝图-2026-10-29.md`
- 母线：`/workspace/docs-design/C档-远程素材蓝图-2026-10-28.md` · 收口 `C档-远程素材-推进收口-2026-10-29.md`
