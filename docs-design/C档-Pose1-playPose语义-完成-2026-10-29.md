# C 档 Pose1·playPose 语义（债 #3 opt-in 全时间轴）— 完成记录

- **日期**：2026-10-29（Asia/Shanghai）
- **范围**：`playPose` 增可选 `timeline?: 'strike' | 'full'`（默认 strike）；`full` 按 frames≈1:1:1 播 wind→strike→rec；缺帧 soft 回退 strike；`holdPose` / `loopPose` / `chainPose` 仍只 strike
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **未做**：不部署；不改设计台（Pose2）；不改示范包（Pose3）；不改普攻 `attackPose`；不开 locomotion / perch；不扩 Fighter 字段

## 背景

X1–X5 已通 poses 交付面，但 Anim `playPose` 故意只取 `def.strike` 定格。债 #3 / 蓝图 Pose1：解释器 opt-in 全时间轴，默认保旧观感。

对照：蓝图 `C档-playPose语义蓝图-2026-10-29.md` §Pose1 / 方案 A。

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `src/meta/animScripts.ts` | `AnimStep.playPose` 加 `timeline?`；`resolvePoseFull` / `splitPoseTimelineFrames`（clamp 3–90，≈1:1:1）；方案 A：`AnimCast.poseEmit` 分相 + `tickEmitters` 推进；`playPose`+`full` 起手 wind，段切 strike→rec；缺三帧 → warn + strike；`holdPose` 清 poseEmit 仍 strike；`emittersDone` 含 poseEmit |
| `src/plugins/schemas.ts` | `ANIM_STEP_SCHEMAS.playPose` 加 `timeline: lit(['strike','full'])` 可选 |
| `scripts/menpai-smoke.ts` | 自建三帧可辨 pose + Schema ± AnimScriptPlayer mock 推进断言 wind/strike/rec；默认/strike/holdPose 仍 strike |
| `docs/门派插件.md` | `playPose` 行补 `timeline?` |

**未改**：`fighter.ts`；设计台；示范包；`attackPose` / 普攻；`holdPose`/`loopPose`/`chainPose` 语义；存档；部署；bump。

## 实现要点（方案 A）

播放器内部分相，不扩 Fighter：

1. `timeline` 缺省 / `'strike'` → 今日 `applyPose`（只 strike）+ `animPoseT = frames`。
2. `timeline: 'full'` 且 wind/strike/rec 齐全 → 立刻 `animPoseOverride = wind`，挂 `cast.poseEmit` 三段；每 tick 在 `tickEmitters` 倒段并切 strike→rec；**不**设 `cast.wait`（与今日 playPose 非阻塞、可与后续特效并行一致）。
3. 缺任帧 → `warnAnim` + 回退 strike。

## 验收

| 项 | 结果 |
| --- | --- |
| 自建 pose 三帧明显不同 | ✅ smoke |
| 不写 timeline / `'strike'` → override === strike | ✅ |
| `timeline:'full'` + frames:12 → U1 wind / U5 strike / U9 rec | ✅ |
| Schema 接受 strike\|full\|缺省；拒未知 lit | ✅ |
| `holdPose` 仍只 strike | ✅ |
| `npm run test:menpai` | **ALL PASS** |
| `npm run build` | **绿** (`tsc --noEmit && vite build`) |
| bump | **否** |
| 部署 | **否** |

## 是否建议热更

- **:4173（游戏）**：**是**（解释器 + Schema；作者写 `timeline:'full'` 才生效，旧配方观感不变）
- **:4174（designer）**：**否**（本单未改设计台；Pose2）

本单**不打包不部署不 bump**。

## 是否建议下一刀

**建议**：**Pose2 设计台**（schema 字段 + hint；预览 `full` scrub 可见三态；export 带字段）；或可选 **Pose3 示范包** 一条 anim 改 `full`。亦可换线。本单不部署、不 bump。

## 已知限制

- 段内为定格键帧（非邻帧 lerp）；验收以三态可见为准。
- `chainPose` 仍展开为 strike `playPose`（不加 timeline）；要全时间轴请手写多个 `playPose`+`full`。
- `holdPose` / `loopPose` 不加 `timeline`（语义是定格）。
- 设计台尚未暴露字段（Pose2）；官方示范未默认 full（Pose3）。
- 不绑 AttackDef startup/active/recovery；Anim 用 frames 比例近似。

## 文档路径

- 完成单：`docs-design/C档-Pose1-playPose语义-完成-2026-10-29.md`
- 蓝图：`docs-design/C档-playPose语义蓝图-2026-10-29.md`
