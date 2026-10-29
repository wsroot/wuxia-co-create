# C 档 X4·示范包「只登记」fxRecipes + poses — 完成记录

- **日期**：2026-10-28（Asia/Shanghai）
- **范围**：示范包自建 `fxRecipes`（+ 可选 `poses`）+ `animRecipes` / 符·功法 `fx` 软引用；Cordis 与馆种子对齐
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **未做**：不 SSH 部署；不扩 `FxPreset` / emitter kind；零核心解释器 / 战斗核心 diff；不新建包 id

## 背景

X1 已通远程灌 poses/fxRecipes；X2/X3 已通设计台编导出。蓝图 X4：缺可抄「只登记数据」样板——馆种子与 `src/content` 此前无一示范自建配方。对照 F3 扩既有 `bingren`。

蓝图：`C档-fxRecipes-poses蓝图-2026-10-28.md` §X4。

## 做法

扩既有内容包 **`bingren`（残锋）**：

| id | 说明 |
| --- | --- |
| 包 | `bingren`（OPTIONAL_PACKS 已挂，未新建） |
| fxRecipe | `bingren_cold_flare`（emitter `flare` · 冷芒 `#7090c0` · size 52 · heavy） |
| pose | `bingren_canmang_pose`（slash1 冷抄略倾；Anim `playPose` 只吃 strike） |
| anim | `bingren_canmang_anim`：`playPose`→本包 pose；`inkBurst.recipeId`→本包 fx |
| 外功 | `bingren_canmang`：`castFx` 首步 `recipeId: bingren_cold_flare`；`castAnim` 仍本包配方 |

键序（馆 `content.json`）：`poses` / `fxRecipes` **在** `animRecipes` / `skills` **之前**（对齐 remote apply）。

## 改动文件

| 路径 | 改动 |
| --- | --- |
| `src/content/bingren/index.ts` | inject `fxRecipes`+`poses`；`add` 配方/姿态；anim/castFx 软引用 |
| `src/content/index.ts` | OPTIONAL_PACKS 残锋 lore 一句（点名冷芒配方） |
| `dlc-server/packages/bingren/content.json` | 增 `poses`/`fxRecipes`；anim/skill 对齐；键序正确 |
| `dlc-server/packages/bingren/pack.json` | description 点名冷芒配方与斩姿 |
| `scripts/menpai-smoke.ts` | Cordis 登记/引用/unload + 远程种子 apply/引用/unload |
| `dlc-server/catalog.json` + `dist-packages/*.tgz` | `dlc:regen --zip` |

**未改**：`animScripts.ts` / `talismanScripts.ts` / `remote.ts`（X1 已灌）/ 核心种子 / 解释器 / `FxPreset` / 存档 / 部署。

## 验收

| 项 | 结果 |
| --- | --- |
| Cordis：`getFxRecipe('bingren_cold_flare')` / `getPose('bingren_canmang_pose')` | ✅ smoke |
| anim `playPose` / `inkBurst.recipeId`、castFx `recipeId` 可解析 | ✅ |
| unload 清掉 fx/pose/anim/skill | ✅ |
| 远程种子含两键；键序 poses/fx → anim → skills；apply 后解析 | ✅ |
| `npm run test:menpai` | **ALL PASS** |
| `npm run build` | **绿** |
| content.json md5 | `88653d2aaa798364433d48e3853fb5bc` |
| bump | **否** |
| 部署 | **否**（本单不自部署） |

## 建议部署？

**建议**：可入藏试播（`POST /api/upload` 或主机侧重 gen 后启用 `bingren`），本地 `?pack=bingren`。**勿自部署**；等推进派主机。tgz catalog md5（zip 后）：`208723cf4a9b814b353e9850a120080b`。

## 已知限制

- Anim `playPose` 仍只用 strike（既有语义；未改解释器）。
- 敌人普攻姿仍硬读 `SKEL_ATTACKS`（X5）；本单未碰。
- 未扩 emitter；粒子观感仍是闭集 `flare` + 参数染色。

## 文档路径

- 本文件：`/workspace/docs-design/C档-X4-fxRecipes-poses-完成-2026-10-28.md`
- 蓝图：`/workspace/docs-design/C档-fxRecipes-poses蓝图-2026-10-28.md`
