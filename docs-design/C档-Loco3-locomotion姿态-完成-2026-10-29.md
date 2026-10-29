# C 档 Loco3·设计台 locomotion 姿态 — 完成记录

- **日期**：2026-10-29（Asia/Shanghai）
- **范围**：设计台复用既有 `poses` 目录，可新建/编辑 `hp.*` / `sp.*` PoseDef；三帧同填 strike 快捷；note/hint/datalist 点名 loco 前缀；export/导入不丢；首访样例 `hp.idle`
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **未做**：不部署；不改解释器主路径（Loco1/2 已齐）；不改示范包（Loco4）；不新 Catalog / Service；不开 GP/Boss；不做骨骼拖拽；不灌 CORE loco 全树

## 背景

蓝图债 #4：Loco1/2 运行时已 soft 读 `locoPose('hp.*'|'sp.*', fallback)`；远程 poses 灌已通（X1）。本单把设计台对齐，使内容作者能在台面编这些 id 并导出。

蓝图：`C档-locomotion姿态蓝图-2026-10-29.md` §Loco3。  
前序：`C档-Loco1-locomotion姿态-完成-2026-10-29.md` · `C档-Loco2-locomotion姿态-完成-2026-10-29.md`。

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `dlc-server/public/assets/designer-schema.json` | 顶 note 点名 Loco3；`poses.label/note` 点名 hp.*/sp.* 与攻击姿区分；`poses.id` datalist=`locoPoseIds` + hint；新增闭集 `locoPoseIds`（9） |
| `dlc-server/public/assets/designer.js` | `attachDatalist('locoPoseIds')`；「三帧同填 strike」快捷；人话/列表标 loco；首访种子追加 `hp.idle`（三帧同 lean）；export 仍随 poses deepClone |
| `dlc-server/public/assets/designer-preview.js` | poses 轻预览：strike 棍人 + loco 标签（只读 strike 提示） |
| `dlc-server/public/designer.html` | 玩法选项「攻击姿态（含 loco）」+ hint |
| `scripts/menpai-smoke.ts` | Loco3：schema/UI 标记 + JSON 往返含 `hp.idle` + applyContent 后 `locoPose('hp.idle', …)` 吃到 |

**未改**：`src/` 运行时 / `PoseSchema` / `CORE_POSES` / enemy·player / 示范包 / 存档 / 部署。

## 约定（台面）

| 项 | 内容 |
| --- | --- |
| id 闭集 | `hp.idle`·`hp.idle2`·`hp.run1`·`hp.run2`·`hp.hurt`；`sp.idle`·`sp.walk1`·`sp.walk2`·`sp.hurt` |
| 形状 | 仍 `PoseDef` 三帧必填；loco **建议三帧同填**；运行时只读 `strike` |
| 与攻击姿 | slash / skel.* / garg.* 仍供 playPose；loco 强制前缀 `hp.`/`sp.` |
| 快捷 | 「从核心拷贝」+「三帧同填 strike」 |
| 首访 | `demo_slash_ink`（攻击）+ `hp.idle`（loco 样例） |

## 验收

| 项 | 结果 |
| --- | --- |
| 可新建/编辑闭集 id PoseDef | ✅ schema + 表单 + datalist |
| 三帧同填 strike 快捷 | ✅ designer.js |
| poses note / hint 点名 loco | ✅ |
| export 含 `hp.idle`；导入不丢 | ✅ deepClone + smoke JSON 往返 |
| apply 后 `locoPose('hp.idle', …)` 吃到 | ✅ designer-shaped applyContent smoke |
| `npm run test:menpai` | **ALL PASS** |
| `npm run build` | **绿** (`tsc --noEmit | `npm run build` | **绿**（跑验） || `npm run build` | **绿**（跑验） | vite build`) |
| bump | **否** |
| 部署 | **否** |

## 是否建议热更

- **:4174（designer）**：**是**（schema / designer.js / designer-preview.js / designer.html）
- **:4173（游戏）**：**否**（本单未改游戏侧；Loco1/2 已覆盖）

本单**不打包不部署不 bump**。

## 建议下一刀

**Loco4 示范包**（一条 pack 覆盖 `hp.idle` 或 `sp.hurt`；Cordis+种子；`?pack=` 可见）或债 #4 收口。本单不部署、不 bump。

## 已知限制

- PoseDef 仍强制三帧；无单帧 loco Schema。
- 不灌 CORE loco 全树（override-only）；datalist 仅为闭集提示，不强制校验 id。
- jump/guard/dash 等后置槽、盾/枪特化 `sp.shIdle` 等仍不在闭集。
- Boss `GP` 不在本线；不做骨骼拖拽 / 实时预览播放器大改。
- 首访样例 lean 故意可辨（0.81），非官方 HP.idle 复刻。

## 文档路径

- 本文件：`/workspace/docs-design/C档-Loco3-locomotion姿态-完成-2026-10-29.md`
- 蓝图：`/workspace/docs-design/C档-locomotion姿态蓝图-2026-10-29.md`
- 前序：`C档-Loco1-locomotion姿态-完成-2026-10-29.md` · `C档-Loco2-locomotion姿态-完成-2026-10-29.md`
