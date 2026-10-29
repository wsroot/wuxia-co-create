# C 档·R4c sfx 示范音频 + 双端打包 — 完成记录

- **日期**：2026-10-29（Asia/Shanghai）
- **蓝图**：`docs-design/C档-R4-sfx文件decode蓝图-2026-10-29.md`（R4c 节 · 已跟进）
- **前置**：R4a `C档-R4a-sfx文件decode-完成-2026-10-29.md`；R4b `C档-R4b-sfx文件decode-完成-2026-10-29.md`
- **债**：远程素材附期 R4；`C档-剩余债清单-2026-10-28.md` #1 旁注
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **部署**：**否**（未 SSH / 未自部署；本刀只打包供推进问双端热更）
- **未开**：#12 perch；未扩 Schema；馆 tgz 仍不塞音频二进制

## 目标达成

1. 1～2 个短示范 wav/ogg 进 `public/art/audio/`（保留 R4a 静音 smoke + 新增轻击 tap）
2. 文档一句固化「**新音频一律进游戏静态** `public/art/audio/`」（Vite `public/` → `dist/art/`；馆包永不塞音频）
3. **顺带** animScripts `case 'sfx'` → `playCatalogSfx`（与符效/hitSfx 对称；成本低）
4. smoke 齐；本地可闻路径写清（须 AudioContext unlock）
5. 双端打包：:4173 含 art/audio 的 deploy-slim + 历史 assets-only（仅 JS）；:4174 `requiem-dlc-server.tgz`（含 R4b designer）

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `public/art/audio/r4a_smoke.wav` | 沿用 R4a：~50ms mono 静音 · 2248B · 22050Hz |
| `public/art/audio/r4c_tap.wav` | **新**：~80ms 轻击 · 3572B · 22050Hz |
| `public/art/audio/r4c_tap.ogg` | **新**：同内容 vorbis · 3719B |
| `src/meta/animScripts.ts` | `case 'sfx'` → `playCatalogSfx`（不再直通 `playSfx`） |
| `src/content/moyu/index.ts` | 增 `moyu_file_click` → `./art/audio/r4c_tap.ogg` |
| `dlc-server/packages/moyu/content.json` | 同上路径登记；**无** 音频二进制；`dlc:regen` |
| `scripts/menpai-smoke.ts` | R4c：文件存在 / 文档句 / animScripts catalog / applyContent ogg；moyu Cordis+remote click 别名 |
| `docs/门派插件.md` | `ctx.sfx` 行固化「新音频一律进游戏静态」+ 示范文件名 |
| `docs/C档原语与设计台-2026-10-28.md` | 增 R4c 节 |
| `docs-design/C档-R4-sfx文件decode蓝图-2026-10-29.md` | R4c 行标已跟进；限制 #4 anim 对齐 |

**未改**：Schema/`SfxDef`；R4a decode 语义；存档 bump；自部署。

## Vite / 静态送达

- `public/art/audio/*` 由 Vite 原样复制到 `dist/art/audio/`（`base: './'`）。
- 运行时 `fetch('./art/audio/….ogg')`（相对页面）。
- **历史 `assets-only` 仅含 `index.html`+`assets/`，不含 `art/`** → 新音频热更须 **deploy-slim**（整份 `dist/`，含 `art/`）或另拷 `art/audio/`。

## 验收 / 验证

| 项 | 结果 |
| --- | --- |
| 示范 wav/ogg 在 `public/art/audio/` | ✅ |
| 文档「新音频进游戏静态」 | ✅ 门派插件 + C 档原语 |
| animScripts → catalog | ✅ |
| 馆包无音频二进制 | ✅ |
| `npm run test:menpai` | **ALL PASS** |
| `npm run build` | **绿**（主 JS `index-B6PVJ1Sr.js`） |
| bump | **否** |
| 自部署 | **否** |

## 本地可闻路径（如实）

1. `npm run build && npm run preview` → `http://localhost:4173/`
2. 用户手势 unlock AudioContext（点 UI / 开局）后，enable/`?pack=moyu` 走 `moyu_file_tap`（静音 wav，几乎听不见）或登记并播 `moyu_file_click` / `r4c_tap.*`（轻击可辨）
3. **首击前**若 ctx 未 unlock：懒 decode 未完成 → file-only soft-skip；有 synth 则回退 synth
4. Node smoke **无** WebAudio：只断言路径/登记/文档；真 decode 须浏览器

## 打包（本单必做 · 勿自部署）

### :4173 游戏侧

| 包 | 路径 | md5 | 含 art/audio？ |
| --- | --- | --- | --- |
| **deploy-slim（推荐热更）** | `/workspace/requiem-web/requiem-web-deploy-slim.tgz`（及 `…-4173-R4c-sfx-20261029-1001.tgz`；`/workspace/` 同名副本） | `d21fbc7ccf7838473b5b60cfee97725f` | **是**（`./art/audio/r4a_smoke.wav` + `r4c_tap.{wav,ogg}`） |
| assets-only（仅 JS/CSS） | `/workspace/requiem-web/requiem-web-assets-only.tgz`（及 dated） | `b7745713c4244a9197e455e37e7be39a` | **否**（历史惯例；新音频不进此包） |

- 主 JS：`assets/index-B6PVJ1Sr.js`
- CSS：`assets/index-BC4dnluz.css`

### :4174 设计台 / 馆

| 包 | 路径 | md5 |
| --- | --- | --- |
| `requiem-dlc-server.tgz` | `/workspace/requiem-web/requiem-dlc-server.tgz`（及 `…-4174-R4c-20261029-1001.tgz`；`/workspace/` 副本） | `9319063041cfc4aaed4a08b37107db45` |

- 排除：`.env` / `node_modules`（包内确认无）
- 含 R4b designer 变更（`designer.js` / `designer-schema.json` / `designer.html`）+ moyu `moyu_file_click` 种子
- **热更提醒**：主机若已有 `.env`（`DLC_UPLOAD_TOKEN`），解压覆盖后**保留/重设** `.env`，勿丢令牌

xfer 副本：`/cursor/stores/user/xfer/{requiem-web-deploy-slim,requiem-web-assets-only,requiem-dlc-server}.tgz`

## 是否建议热更（供推进拍板）

| 端 | 建议 | 说明 |
| --- | --- | --- |
| **:4173** | **是**（须用户拍板） | R4a decode + R4c 静态音 + animScripts catalog；用 **deploy-slim**（勿只丢 assets-only，否则缺 `art/audio`） |
| **:4174** | **是**（须用户拍板） | R4b 设计台去灰 + moyu 种子 click 别名 |

本刀**不** SSH / **不**自部署。

## 已知限制 / 风险

1. **远程 alone 仍无新音频文件送达**；须游戏静态预置
2. **AudioContext unlock**：首势前可能无 buffer → file-only 静默
3. **浏览器编解码差**：ogg 因环境而异；失败静默回退
4. **assets-only ≠ 含 art**：推进若只热更 assets-only，示范音不会出现在线上
5. `r4a_smoke.wav` 为静音，验收「可闻」请用 `r4c_tap.*` / `moyu_file_click`
6. #12 perch 不开

## 文档路径

- 本文件：`/workspace/docs-design/C档-R4c-sfx文件decode-完成-2026-10-29.md`
- 蓝图：`/workspace/docs-design/C档-R4-sfx文件decode蓝图-2026-10-29.md` R4c
- 前置：R4a / R4b 完成单（同目录）
