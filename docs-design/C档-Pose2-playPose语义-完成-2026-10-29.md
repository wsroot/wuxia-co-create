# C 档 Pose2·playPose 语义（设计台对齐）— 完成记录

- **日期**：2026-10-29（Asia/Shanghai）
- **范围**：设计台招式样子 / animRecipes 的 `playPose` 步骤：可勾 `timeline` strike|full；人话 hint；预览 `full` scrub 三态；export 不丢 `full`
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **未做**：不改解释器（Pose1 已齐）；不改示范包（Pose3）；不加 holdPose/loopPose/chainPose.timeline；不做骨骼拖拽；不部署；不 bump

## 背景

Pose1 解释器已支持 `playPose.timeline?: 'strike'|'full'`（默认 strike）。本单对齐设计台字段 / 预览 / 导出。

对照：蓝图 `C档-playPose语义蓝图-2026-10-29.md` §Pose2；Pose1 完成单 `C档-Pose1-playPose语义-完成-2026-10-29.md`。

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `dlc-server/public/assets/designer-schema.json` | `animRecipes.steps.playPose` 增 `timeline` enum `strike\|full` + 人话 hint；顶栏 `note` 点名 Pose2 |
| `dlc-server/public/assets/designer.js` | 步骤表单 enum 选项人话（击发定格 / 全时间轴）；招式样子人话预览标 full；poses 人话一句补 timeline:full |
| `dlc-server/public/assets/designer-preview.js` | scrub `playPose`+`timeline==='full'` 按 localT 切三段取 wind/strike/rec（本卷 poses PoseNums→棍人角，无则启发式偏移）；缺省/strike 仍今日 |
| `scripts/menpai-smoke.ts` | Pose2：schema 字段/hint/hold·loop 无 timeline；designer+preview 标记；JSON 往返 full 保留 / 缺省省略；运行时 Schema 接受 |

**未改**：`src/meta/animScripts.ts` / `schemas.ts`（Pose1）；示范包；`holdPose`/`loopPose`/`chainPose`；存档；部署；bump。

## 字段约定

| 值 | 行为 |
| --- | --- |
| 缺省 / 不写 / 选空「—」 | 与解释器一致 = strike（定格击发） |
| `strike` | 显式击发定格；导出可写可省略 |
| `full` | 按 frames≈1:1:1 播 wind→strike→rec；**导出必保留** |

`buildContentExport` 对 `animRecipes` deepClone，步骤上的 `timeline` 随对象导出；导入 JSON 原样回填，往返不丢 `full`。

## 验收

| 项 | 结果 |
| --- | --- |
| 设计台 playPose 可勾/选 timeline strike\|full | ✅ schema + enum UI |
| 人话 hint 说明 full vs strike | ✅ schema hint + 选项文案 |
| 预览 full scrub 可见三态（可糙） | ✅ `poseAnglesForPlayPose` + phase 标签 |
| export / 导入不丢 `full` | ✅ deepClone + smoke JSON 往返 |
| `npm run test:menpai` | **ALL PASS**（含 Pose2 断言） |
| `npm run build` | **绿**（`tsc --noEmit && vite build`） |
| bump | **否** |
| 部署 | **否** |

## 是否建议热更

- **:4174（designer）**：**是**（schema / designer.js / designer-preview.js）
- **:4173（游戏）**：**否**（本单未改游戏侧解释器；Pose1 已覆盖）

本单**不打包不部署不 bump**。

## 是否建议下一刀

**建议**：**Pose3 示范包**（一条 anim 改用 `timeline:'full'`，Cordis+种子对齐，`?pack=` 可见三帧过渡）；或收口债 #3 / 换线。本单不部署、不 bump。

## 已知限制

- 设计台预览为棍人示意：有本卷 pose 时用 lean/fa/w 映射；否则启发式偏移；非游戏骨骼复刻，无邻帧 lerp。
- `holdPose` / `loopPose` / `chainPose` 仍不加 `timeline`（与 Pose1 一致）。
- 首访样例 `animDemoSlash` 仍不写 timeline（默认 strike）；官方示范 full 留给 Pose3。
- 不做骨骼拖拽编辑器。

## 文档路径

- 完成单：`docs-design/C档-Pose2-playPose语义-完成-2026-10-29.md`
- 蓝图：`docs-design/C档-playPose语义蓝图-2026-10-29.md`
- Pose1：`docs-design/C档-Pose1-playPose语义-完成-2026-10-29.md`
