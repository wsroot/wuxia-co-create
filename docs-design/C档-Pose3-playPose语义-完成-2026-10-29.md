# C 档 Pose3·playPose 语义（示范包 timeline:full）— 完成记录

- **日期**：2026-10-29（Asia/Shanghai）
- **范围**：示范包一条 anim 改用 `playPose` + `timeline:'full'`；Cordis + 馆种子对齐；smoke 覆盖；零核心解释器 diff
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **未做**：不部署 / upload；不扩 kind；不改 `animScripts` / `schemas`（Pose1 已齐）；不改设计台（Pose2 已齐）；不开 locomotion

## 背景

Pose1 解释器已支持 `timeline?: 'strike'|'full'`；Pose2 设计台已对齐。蓝图 Pose3：官方示范一条改 `full`，`?pack=` 可见起手→击发→收招。

对照：蓝图 `C档-playPose语义蓝图-2026-10-29.md` §Pose3；Pose1/Pose2 完成单。

## 做法

扩既有内容包 **`bingren`（残锋）**（不新建包 id）：

| id | 说明 |
| --- | --- |
| 包 | `bingren`（OPTIONAL_PACKS 已挂） |
| pose | 复用 `bingren_canmang_pose`（三帧可辨） |
| anim | `bingren_canmang_anim`：`playPose` → `frames:12` + `timeline:'full'` |
| 外功 | `bingren_canmang.castAnim` 仍挂本包配方（无改 id） |

## 改动文件

| 路径 | 改动 |
| --- | --- |
| `src/content/bingren/index.ts` | playPose 加 `timeline:'full'`、`frames:12`；注释 Pose3 |
| `src/content/index.ts` | OPTIONAL_PACKS 残锋 lore 点名全时间轴 |
| `dlc-server/packages/bingren/content.json` | 同构对齐 |
| `dlc-server/packages/bingren/pack.json` | description 点名 timeline:full / Pose3 |
| `dlc-server/catalog.json` | `dlc:regen` |
| `scripts/menpai-smoke.ts` | Cordis/远程种子断言 + Pose3 块（load / 三帧 / Schema / cast U1·U5·U9 / seed / unload） |

**未改**：`src/meta/animScripts.ts` · `src/plugins/schemas.ts` · 设计台 · 其它包 · 存档 · 部署。

## 验收

| 项 | 结果 |
| --- | --- |
| Cordis：`bingren_canmang_anim` playPose `timeline:'full'` frames:12 | ✅ |
| 种子 content.json 同构 | ✅ |
| cast mock：U1 wind / U5 strike / U9 rec（本包 pose lean） | ✅ |
| `npm run test:menpai` | **ALL PASS** |
| `npm run build` | **绿** |
| content.md5 | `522298c0c5205676fe6c253966438b25` |
| bump | **否** |
| 部署 | **否** |
| 动核心解释器？ | **否** |

## 验收一句

`?pack=bingren` 施放残锋诀：招式样子 `playPose{ poseId:bingren_canmang_pose, frames:12, timeline:'full' }` 可见 wind→strike→rec；Cordis+种子对齐；`test:menpai`+`build` 绿；零核心 diff。

## 是否建议热更

- **:4173（游戏）**：**是**（示范包数据；需已含 Pose1 解释器）
- **:4174（馆）**：可选侧重 gen / 入藏后 catalog 可见新 md5

本单**不打包不部署不 bump**。

## 已知限制

- 段内定格键帧（非邻帧 lerp）；与 Pose1 一致。
- `holdPose` / `loopPose` / `chainPose` 仍无 timeline。
- 仅残锋一条示范改 full；其它官方外功默认仍 strike。

## 文档路径

- 完成单：`docs-design/C档-Pose3-playPose语义-完成-2026-10-29.md`
- 蓝图：`docs-design/C档-playPose语义蓝图-2026-10-29.md`
- Pose1 / Pose2：同目录对应完成单
