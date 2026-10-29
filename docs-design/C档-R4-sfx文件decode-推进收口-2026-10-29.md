# C 档·R4 sfx 文件 decode — 推进侧收口索引

- **日期**：2026-10-29（Asia/Shanghai）
- **范围**：R4 **蓝图→R4a→R4b→R4c→双端热更** 推进侧收口（只汇总文档）
- **bump 玩家存档**：**否**
- **部署**：R4a–c 落地时未自部署；**热更已发**（:4173+:4174，本收口只记结果）

---

## 总表

| 期 | 完成单路径 | 一句话结果 | 状态 | 落地序 |
| --- | --- | --- | --- | --- |
| **蓝图** | `docs-design/C档-R4-sfx文件decode蓝图-2026-10-29.md` | 沿用 `src`+`format`；file 优先回退 synth；分期 a/b/c | ✅ 蓝图 | 1 |
| **R4a** | `docs-design/C档-R4a-sfx文件decode-完成-2026-10-29.md` | decode→缓存→sfxBus；符 `sfx`+hitSfx | ✅ 完成·已热更 | 2 |
| **R4b** | `docs-design/C档-R4b-sfx文件decode-完成-2026-10-29.md` | 设计台去灰；可填 src/format；静态送达提示 | ✅ 完成·已热更 | 3 |
| **R4c** | `docs-design/C档-R4c-sfx文件decode-完成-2026-10-29.md` | 示范音进 `public/art/audio/`；animScripts 走 catalog；双端打包 | ✅ 完成·已热更 | 4 |
| **热更** | 主机回传 2026-10-29 | :4173 slim + :4174 DLC；音频四路 200 | ✅ 已上机 | 5 |

落地序：**蓝图→R4a→R4b→R4c→热更**。债 **#1 旁注 R4 主交付齐**。

### 形状速记

| 项 | 约定 |
| --- | --- |
| 字段 | 不新增；`SfxDef.src` + `format`（wav\|ogg\|mp3） |
| 播放 | file buffer 优先 → 回退 synth → soft-skip（hitSfx→今日 hit/hitHeavy） |
| 路径 | `/^\.\/art\//`；建议 `./art/audio/`；禁外链 |
| 送达 | **新音频一律进游戏静态** `public/art/…`；馆 tgz 不塞二进制 |
| 禁区 | 任意 JS；第二套音频引擎；远程 alone 送达新音频 |

### 示范

| 项 | 值 |
| --- | --- |
| 静态 | `public/art/audio/r4a_smoke.{wav,ogg}` · `r4c_tap.{wav,ogg}` |
| 别名 | moyu `moyu_file_tap` / `moyu_file_click`（路径 only） |
| 热更包 | slim md5 `003ebcbd8f75b602da2c00315461cacd`（含四音频；替换 `d21fbc7c…`）· DLC `9319063041cfc4aaed4a08b37107db45` |
| 上机 | :4173 PID 6959 · :4174 PID 6665（Asia/Shanghai 当日） |

---

## 已知限制 / 旁注

| 项 | 说明 |
| --- | --- |
| **slim 缺 ogg** | ~~首发缺 `r4a_smoke.ogg`~~ → 补包 `003ebcbd…` 已含四音频并热更 :4173；无需再补编 |
| **AudioContext unlock** | 首击前可能尚无 buffer → file-only 静默 / hitSfx 回退 |
| **编解码差** | ogg/mp3 因浏览器而异；失败静默回退 |
| **#12 perch** | 默认未开 |
| **债清单 #1** | R0–R3 已收口；**R4 附期本收口结** |

---

## 建议下一动作

| 选项 | 利 | 注意 |
| --- | --- | --- |
| **A. 收工观望** | R4 线齐、已上机 | 人耳听示范音需 unlock |
| **B. 补 slim 含 ogg 再发** | 去掉主机补丁债 | 须用户拍板热更 |
| **C. 点名 #12 perch** | 新元素线 | 默认不开，须点名 |

---

## 入口速查

| 职责 | 路径 |
| --- | --- |
| buffer / catalog 播 | `src/audio/sfxBuffers.ts` · `sfxCatalog.ts` |
| 符效 / 命中 / anim | `talismanScripts.ts` · `resolver.ts` · `animScripts.ts` |
| 设计台 | `dlc-server/public/assets/designer.js` · `designer-schema.json` |
| 静态 | `public/art/audio/` |
| Smoke | `scripts/menpai-smoke.ts`（R4a/R4b/R4c 组） |

---

## 文档路径

- 本文件：`/workspace/docs-design/C档-R4-sfx文件decode-推进收口-2026-10-29.md`
- 蓝图 + R4a / R4b / R4c 完成单
- 债清单：`/workspace/docs-design/C档-剩余债清单-2026-10-28.md` #1 / R4
