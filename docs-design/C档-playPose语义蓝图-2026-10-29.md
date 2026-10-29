# C 档蓝图：Anim `playPose` 语义（债 #3 · 全时间轴）

仓库：`requiem-web`（`/workspace/requiem-web`）。  
日期：2026-10-29 Asia/Shanghai。  
本文件为分期蓝图（**Pose0** 调研）；**默认不 bump** 玩家存档。本蓝图阶段**不部署、不改代码**。

可读对照：`docs-design/C档-剩余债清单-2026-10-28.md`（债 **#3**）；`docs-design/C档-fxRecipes-poses蓝图-2026-10-28.md`（X 线暂缓「全时间轴」）；`docs-design/C档-acts幕池蓝图-2026-10-29.md`（体例）；`requiem-web/docs/门派插件.md`（`playPose` 表）；`src/meta/animScripts.ts`（`resolvePoseStrike` / `applyPose`）。

---

## 建议先开 · 验收一句（推进用）

> **先开 Pose1**：解释器 opt-in 全时间轴——`playPose` 增可选字段 `timeline?: 'strike' | 'full'`（**默认 `'strike'`**，旧配方观感不变）；`timeline: 'full'` 时按 `frames` 比例播 `wind → strike → rec`；缺任帧 soft 回退只播 strike；`holdPose` / `loopPose` **仍只 strike**；smoke 盖两种；`bump=否`。  
> **验收一句**：自建 pose 三帧明显不同 + anim `playPose{ poseId, frames:12, timeline:'full' }` → cast 可见 wind→strike→rec 过渡；同 pose 不写 `timeline`（或 `'strike'`）仍只定格 strike；`test:menpai`+`build` 绿。

---

## 终点（用户）

招式样子登记完整三帧（`wind`/`strike`/`rec`）后，**能在 Anim 时间轴真正播出来**，而不只是普攻 `attackPose()` 吃三帧、招式样子却定格 strike。

**不**把 idle/walk/hurt 目录化（债 #4）；**不**改杂兵/Boss 普攻绘制主路径；**不**扩任意 JS/Canvas。

---

## 边界（与已闭环 X / F / 普攻）

| 线 | 管什么 | 本蓝图 |
| --- | --- | --- |
| **playPose 语义专线（本单 Pose）** | `AnimScriptPlayer` 对 `playPose` 的三帧时间轴 | 分期 **Pose1–Pose3** |
| **X1–X5 poses 交付面（已收口）** | 远程灌 / 设计台三帧 / 示范登记 | **不抢**；本线只消费已有 `getPose` |
| **功法 castAnim（F 线）** | 步骤白名单含 `playPose` | **不抢**；默认 strike 保旧配方；`full` 为作者 opt-in |
| **玩家普攻 `attackPose()`** | `startup/active/recovery` × wind/strike/rec | **不合并**；Anim 无 AttackInst，用 `frames` 比例近似 |
| **债 #4 locomotion** | idle/run/hurt 常量 | **默认不开** |
| **perch / takeoff** | Boss | **默认不开** |

---

## 1. 现状（文件 + 符号举证）

### 1.1 链路

| 层 | 行为 | 证据 |
| --- | --- | --- |
| Pose 目录 | `PoseDef = { id, wind, strike, rec }`；Schema 三帧均 required | `schemas.ts` `PoseSchema`；`render/rig.ts` `AttackPoses` |
| Anim 解析 | `resolvePoseStrike(id)` → **只** `def.strike`（再试 `skel.${id}`） | `animScripts.ts:416–422` |
| 应用 | `applyPose` → `c.animPoseOverride = pose`（**单帧**）+ `animPoseT = frames` | 同文件 `463–471`；`fighter.ts` 注释 |
| 步骤 | `playPose` / `holdPose` 同走 `applyPose`；`loopPose` 同；`chainPose` 展开多个 `playPose` 仍 strike | `case 'playPose'|'holdPose'` · `chainPose` · `loopPose` |
| 玩家普攻 | `attackPose(atk, set, rest)` 按 startup/active/recovery **lerp** 三帧 | `rig.ts:59–67`；`player.computePose` |
| 设计台预览 | `poseAngles(poseId)` 多半取 strike 系角度；**不**播三帧时间轴 | `designer-preview.js` ~1146 |
| 文档 | 「播 strike 关键帧」 | `门派插件.md` `playPose` 行；X 完成单已知限制 |

### 1.2 为何是「解释器语义」债

- 交付面（远程+台+示范）**已齐**（X1–X5）；作者能登记三帧，但 **Anim 路径故意丢掉 wind/rec**。
- 普攻路径已吃满三帧；招式样子与普攻**双轨**—— intentional 简化，X 蓝图标「另议」。
- 改默认行为会影响既有 `slashInk` / `bingren` 等 `playPose` 观感 → **必须默认保 strike + opt-in full**。

### 1.3 Fighter 钩子限制

今日只有 **一个** `animPoseOverride: Pose | null` + 倒计时 `animPoseT`。  
全时间轴实现候选（Pose1 内选一，倾向 A）：

| 方案 | 做法 | 利 | 弊 |
| --- | --- | --- | --- |
| **A. 播放器内部分相**（推荐） | `playPose`+`full` 时不立刻单帧 override；用 cast 本地相位 / 或注入内部 wait+分相 apply | 少动 Fighter 字段 | 须小心与 wait/并行 step 交互 |
| **B. 扩 Fighter** | `animPoseSet` + `animPosePhase` 每 tick lerp | 贴近 `attackPose` | 字段债；绘制侧也要读 |
| **C. 编译期展开** | `full` → 三个隐式 playPose(strike-only frames) | 简单 | 无 lerp，观感硬切；与「时间轴」弱 |

**Pose1 建议 A**：按 `frames` 切三段（默认约 **1:1:1**，可文档写死；勿引入 startup/active 字段进 AnimStep）；段内可 `lerpPose` 邻帧或段中点定格——实现自选，验收以「肉眼可见三态」为准。

---

## 2. 目标态

| 角色 | 做 | 不做 |
| --- | --- | --- |
| **作者** | 写 `timeline: 'full'` 即播三帧；不写则与今日一致 | 不改普攻盒/命中帧 |
| **A 核心解释器** | `resolvePose*` 能取三帧；soft-skip / 回退 strike | 不按内容 id 开分支；不扩任意脚本 |
| **设计台** | Pose2：字段 + 预览提示 | 不做自由骨骼拖拽 |
| **内容包** | Pose3 可选：一条示范改 `full` | 不强制改官方外功 |

目标句：**同一 poseId，`timeline:'full'` 能看出起手→击发→收招；默认不写则旧样。**

---

## 3. 分期建议（Pose1–Pose3）

| 期 | 目标 | 改动入口猜测 | 验收一条 | bump | 不做边界 |
| --- | --- | --- | --- | --- | --- |
| **Pose1 解释器 opt-in**（建议先开） | Schema/`AnimStep`：`playPose.timeline?` lit `strike\|full` 默认 strike；`timeline:'full'` → 按 frames 比例播 wind→strike→rec；缺帧 → strike + 可选 warn；`holdPose`/`loopPose`/`chainPose` 行为**不变**（仍 strike / 展开 strike）；smoke：同 pose 两种 timeline | `src/meta/animScripts.ts`；`src/plugins/schemas.ts`；`scripts/menpai-smoke.ts`；可选 `门派插件.md` 一句 | 见文首验收句 | **否** | 不改 hold/loop；不改普攻 `attackPose`；不改设计台；不部署；不碰债 #4 |
| **Pose2 设计台对齐** | schema `playPose` 字段 + 人话 hint；预览：`full` 时 scrub 可见三态（可糙）；export 带字段 | `designer-schema.json` · `designer.js` · `designer-preview.js` | 设计台能勾/选 full 并导出；导入不丢 | **否** | 不做骨骼编辑器；不强制改旧样例 |
| **Pose3 示范（可选）** | 一条 pack anim 改用 `timeline:'full'`（新建或扩 bingren/残锋类）；Cordis+种子对齐；`test:menpai`+`build` | `src/content/…` · `packages/…/content.json` | `?pack=` 可见三帧过渡；零无关 diff | **否** | 不 SSH；不顺手开 locomotion |

**Pose1 优先理由**：债本质在解释器；交付面已齐；opt-in 零破坏；台面可后补。

落地后写 `C档-Pose*-playPose语义-完成-2026-….md`。

---

## 4. Schema / 步骤面（草案）

```ts
// playPose only — holdPose / loopPose 不加 timeline
{ kind: 'playPose', poseId: string, frames?: number, timeline?: 'strike' | 'full' }
```

| 字段 | 默认 | 含义 |
| --- | --- | --- |
| `timeline` 缺省 / `'strike'` | 今日行为 | `resolvePoseStrike` → 单帧 override `frames` |
| `timeline: 'full'` | — | 解析 `wind`/`strike`/`rec`；按 `frames`（建议 clamp 3–90）比例分相；缺任一帧 → 等价 strike + warn |

`chainPose`：**本线不扩** `timeline`（仍展开为 strike `playPose`）；若未来要链式全时间轴，另议或作者手写多个 `playPose`+`full`。

---

## 5. 不做 / 暂缓

- 任意 JS / Canvas / 外链 / 自由 PNG  
- **不**默认改 `playPose` 为 full（破坏旧观感）  
- **不**改 `holdPose` / `loopPose` 为三帧（语义是「定格」）  
- **不**把 Anim 绑到 AttackDef startup/active/recovery  
- **不**开债 #4 locomotion；**不**开 perch/takeoff  
- 本蓝图阶段**不部署**、不 bump  

---

## 6. 给内容包（Pose1 后）

| 已能 | 还不能（待 Pose2/3） |
| --- | --- |
| Cordis/远程：`playPose` + `timeline:'full'` 吃三帧 | 设计台一键勾选（Pose2） |
| 不写 `timeline` 与今日完全一致 | 官方示范默认 full（Pose3 可选） |

---

## 7. 风险与回退

| 风险 | 约定 |
| --- | --- |
| 旧配方被改观感 | **默认 strike**；无迁移脚本 |
| `frames` 过短（&lt;3）full 看不清 | clamp 或强制至少每段 1 帧；文档注明建议 ≥9 |
| 与 `wait`/并行特效不同步 | full 只占用本 step 的 `frames` 窗口；特效 step 仍作者自排 |
| Fighter 单 override | Pose1 用方案 A，避免先扩字段；若卡住再评估 B |

---

## 附：债清单对照

| 债 | 本蓝图 |
| --- | --- |
| **#3** Anim playPose 只播 strike | **本线** Pose1–3 |
| #4 locomotion | 不开 |
| X 暂缓「全时间轴」 | **收口为本蓝图**；X 完成单「已知限制」在 Pose1 后可改述 |

