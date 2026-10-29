# C 档·R4b sfx 文件通道 · 设计台去灰 — 完成记录

- **日期**：2026-10-29（Asia/Shanghai）
- **蓝图**：`docs-design/C档-R4-sfx文件decode蓝图-2026-10-29.md`（R4b 节）
- **前置**：R4a `C档-R4a-sfx文件decode-完成-2026-10-29.md`（decode 已齐）
- **债**：远程素材附期 R4；`C档-剩余债清单-2026-10-28.md` #1 旁注
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **部署**：**否**（未 SSH / 未自部署；未动 :4173）
- **未开**：R4c 热更验收；#12 perch；未改 R4a decode 语义；未扩 Schema 字段；未塞音频二进制进馆 tgz

## 目标达成

设计台去掉「文件通道未通」灰态；可填 `src`/`format` 并提示须放游戏静态 `public/art/audio/`（馆包不送达二进制）。导出含 `src`+`format` 的 sfx 可被既有 `applyContent` 吃（R4a 已接线 decode）。可选示范：设计台首访 `demo_file_tap` + 墨羽 `moyu_file_tap`（**仅路径**，指向已有 `r4a_smoke.wav`）。

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `dlc-server/public/assets/designer-schema.json` | sfx.note / src·format·synth hint；顶 note 点名 R4b「文件通道已通 + 静态送达」 |
| `dlc-server/public/assets/designer.js` | 人话预览去「文件通道暂缓」；fallback src hint；首访加 `demo_file_tap`（`./art/audio/r4a_smoke.wav` + `wav`） |
| `dlc-server/public/designer.html` | 玩法 hint：sfx 可 src+format；一句静态送达 |
| `src/content/moyu/index.ts` | 增 `moyu_file_tap` file 别名（路径 only） |
| `dlc-server/packages/moyu/content.json` | 同上路径登记；**无** wav 二进制 |
| `scripts/menpai-smoke.ts` | R4b：去灰文案 / 静态提示 / `demo_file_tap`→`applyContent`；moyu Cordis+remote file 别名 |
| `docs/门派插件.md` | `ctx.sfx` + §九：静态送达一句 |
| `docs/C档原语与设计台-2026-10-28.md` | R2b 改写 + 增 R4b 节 |
| `docs-design/C档-R4-sfx文件decode蓝图-2026-10-29.md` | R4b 行标「已跟进」 |

**未改**：`src/audio/*` decode（R4a）；Schema/`SfxDef` 字段；存档 bump；馆 tgz 二进制；自部署。

## Schema / 解释器

- **Schema**：未改；仍 `SfxSchema` / `SfxDef{ id, synth?, src?, format? }`
- **解释器**：沿用 R4a `playCatalogSfx` / `isValidSfxFileSrc`（本刀不改语义）
- **设计台**：`artSrc` 前端拒外链（既有）；文案去灰 + 静态送达提示

## 示范（路径 only）

| id | 面 | 说明 |
| --- | --- | --- |
| `demo_file_tap` | 设计台首访 | `src=./art/audio/r4a_smoke.wav` · `format=wav` |
| `moyu_file_tap` | Cordis + 馆种子 JSON | 同上；wav 在 `public/art/audio/`，**不**进 tgz |

## 验收

| 项 | 结果 |
| --- | --- |
| 设计台无「文件通道未通/暂缓」 | ✅ smoke |
| 可填 src/format + 提示 `public/art/audio/` | ✅ schema/js/html |
| 导出 `src`+`format` → `applyContent` 可吃 | ✅ `getSfxDef('demo_file_tap')` |
| 文档/UI 静态送达一句 | ✅ 门派插件 / 设计台 / C 档原语 |
| 馆包无音频二进制 | ✅ `packages/moyu/` 仅 pack.json+content.json |
| `npm run test:menpai` | **ALL PASS**（含 R4b） |
| `npm run build` | **绿** |
| bump | **否** |
| 部署 | **否** |

## 是否建议热更

- **:4174（designer）**：**是**（动了 `designer.js` / `designer-schema.json` / `designer.html`；须用户拍板）
- **:4173（游戏）**：**可选**（moyu Cordis 增 file 别名；真 decode 依赖既有 R4a + 静态 wav；本单**不自部署**）

## 已知限制 / 仍开

1. 远程 alone 仍无新音频文件送达；须预先在 `public/art/…`
2. 不做 wav 解码预览 / PNG·音频上传到馆
3. **R4c**：热更验收 / 更多示范音（须拍板 :4173）
4. animScripts 历史直通 `playSfx(id)` 未在本刀对齐
5. #12 perch 不开

## 文档路径

- 本文件：`/workspace/docs-design/C档-R4b-sfx文件decode-完成-2026-10-29.md`
- 蓝图：`/workspace/docs-design/C档-R4-sfx文件decode蓝图-2026-10-29.md` R4b
- 前置 R4a：`/workspace/docs-design/C档-R4a-sfx文件decode-完成-2026-10-29.md`
