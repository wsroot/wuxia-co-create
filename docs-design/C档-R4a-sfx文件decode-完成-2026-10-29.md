# C 档·R4a sfx 包内文件 decode — 完成记录

- **日期**：2026-10-29（Asia/Shanghai）
- **蓝图**：`docs-design/C档-R4-sfx文件decode蓝图-2026-10-29.md`（R4a 节）
- **债**：远程素材附期 R4；`C档-剩余债清单-2026-10-28.md` #1 旁注
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **部署**：**否**（未动 :4173/:4174；未 SSH）
- **未开**：R4b/R4c；#12 perch；未扩 Schema 字段；未第二套音频引擎

## 目标达成

白名单 `SfxDef.src`（`./art/` + `format`）→ `AudioContext.decodeAudioData` → buffer 缓存 → 经现有 `sfxBus` 播。与 synth **并存：file 优先**；无 buffer / decode 失败 → 回退 synth；再无则 soft-skip（hitSfx 回退今日 `hit`/`hitHeavy`）。接线符效 `ScriptStep.sfx` + `hitSfx`（`resolveProjectileHitSfx` / `resolver`）。**不新增** Schema 字段（沿用 `src`+`format`）。

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `src/audio/sfxBuffers.ts` | **新**：path/format 门闩、`fetch`+`decodeAudioData` 懒加载、buffer 缓存、体素上限 2MB、`playSfxBuffer`、dispose 清缓存 |
| `src/audio/sfxCatalog.ts` | **新**：`playCatalogSfx`（buffer → synth → 历史裸名 → soft-skip）；挂 `ensure()` 后懒 decode |
| `src/meta/contentRegistry.ts` | `resolveProjectileHitSfx(def, audio?)`：有 buffer 或 synth → 返回 **catalog id**；仅 src 无 buffer → `undefined`（可踢 decode）→ 今日音 |
| `src/meta/talismanScripts.ts` | `case 'sfx'`：改走 `playCatalogSfx`（去掉 reserved） |
| `src/combat/resolver.ts` | 命中播改 `playCatalogSfx`；resolve 传入 `g.audio` |
| `src/plugins/services.ts` | `SfxCatalogService.add` dispose 时 `clearSfxBuffer` |
| `scripts/menpai-smoke.ts` | 改原「仅 src soft-skip（R4）」；增 R4a 门闩 / buffer 注入 / 符步 / unload 清缓存 |
| `public/art/audio/r4a_smoke.wav` | **新**：极短静音 wav（~2KB）供路径与静态存在断言 |

## Schema / 解释器入口

- **Schema**：未改；仍 `SfxSchema` / `SfxDef{ id, synth?, src?, format? }`
- **登记**：`SfxCatalogService`（禁外链 + `ART_SRC_RE` + 必填 format）— 原有
- **解释器**：`isValidSfxFileSrc` + `playCatalogSfx` / `ensureSfxBuffer`（再钉一层）
- **符效**：`TalismanScriptPlayer` `kind:'sfx'` → `playCatalogSfx`
- **命中**：`resolveProjectileHitSfx` → catalog id → `playCatalogSfx`

## 验收一句

包内合法 `./art/audio/*.wav`（本刀放了 `r4a_smoke.wav`）登记且无 synth → 注入 buffer 后符步/命中走文件路径；非法路径 / 缺 buffer → soft-skip 或回退 synth/今日音；`test:menpai`+`build` 绿。

## 验证

- `npm run test:menpai` → **ALL PASS**（含 hitSfx/R4a:* 与 R4a:* 组）
- `npm run build` → **绿**（`tsc --noEmit && vite build`）

## 示范音频

| 路径 | 说明 |
| --- | --- |
| `public/art/audio/r4a_smoke.wav` | 极短 mono 静音 wav（~50ms / 22050Hz）；供 smoke `existsSync` + 登记路径。浏览器可闻属本地手工（需 unlock + 真 decode） |

## 已知限制

1. **远程 alone 无新音频文件**：馆 tgz 仍不塞二进制；文件须预先在 `public/art/…`
2. **AudioContext 须用户手势 unlock**：懒 decode 挂 `ensure()`；首击前可能尚无 buffer → hitSfx 回退今日音
3. **浏览器编解码差**：ogg/mp3 因环境而异；失败静默回退
4. **animScripts** 仍直通 `playSfx(id)`；本刀以符效 + hitSfx 为主（R4b 可对齐）
5. **Node smoke** 无 WebAudio：用 `putSfxBuffer` 注入伪 buffer 测 resolve/回退；真 decode 须浏览器
6. **#12 perch** / **R4c 热更** 未开（R4b 设计台去灰已跟进）

## 非目标 / 仍开

- R4b：设计台去掉「文件通道未通」灰态 → **已跟进** `C档-R4b-sfx文件decode-完成-2026-10-29.md`  
- R4c：热更验收 / 更多示范音  
- 存档 bump、自部署、SSH  
