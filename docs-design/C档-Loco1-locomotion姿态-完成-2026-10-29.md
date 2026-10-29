# C 档 Loco1·玩家 locomotion 姿态 soft 目录 — 完成记录

- **日期**：2026-10-29（Asia/Shanghai）
- **范围**：玩家 `computePose` 对 `idle` / `idle2` / `run1` / `run2` / `hurt` soft 读 `hp.*`（`getPose?.strike`），缺则回退模块常量 `HP.*`；override-only（不灌 `CORE_POSES`）
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **未做**：不部署；不改 enemy / SP / GP / Boss；不改 jump/guard/dash/down/getup/charge；不改设计台（Loco3）；不改示范包（Loco4）；不改 Anim `playPose` / 攻击姿

## 背景

蓝图债 #4：玩家走/闲/受击硬读 `HP.*`，Cordis 无法覆盖观感。蓝图 Loco1：复用 `poses` 目录 + id 前缀 `hp.<slot>`；登记仍用三帧 `PoseDef`（loco 建议同填）；只读 `strike`。

蓝图：`C档-locomotion姿态蓝图-2026-10-29.md` §Loco1。

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `src/meta/contentRegistry.ts` | 新增 `locoPose(id, fallback)` → `getPose(id)?.strike ?? fallback` |
| `src/entities/player.ts` | `softHp` + `computePose`：`run`/`hurt`/默认 idle 周期改 soft；`computePose` 公开（smoke）；其余状态仍硬 `HP` |
| `scripts/menpai-smoke.ts` | Cordis 覆盖 `hp.idle` → idle 态吃目录；unload 回 `HP.idle`；可选 `hp.run1`/`hp.hurt`；断言 CORE 未灌 `hp.*` |
| `docs/门派插件.md` | `ctx.poses` 行点名 `hp.*` loco 约定 |

**未改**：`CORE_POSES` 种子 / enemy / Boss / 设计台 / remote / 存档 / 部署。

## 读法（最终）

```ts
locoPose(id, fallback) → getPose(id)?.strike ?? fallback
// player:
softHp(slot) → locoPose(`hp.${slot}`, HP[slot])
// run / hurt / idle↔idle2 cycle 用 softHp；jump|guard|dash|down|getup|charge|attack rest 仍硬 HP
```

## 验收

| 项 | 结果 |
| --- | --- |
| 核心无 `hp.*`（override-only） | ✅ smoke |
| Cordis 覆盖 `hp.idle` 后 idle `computePose` 吃 strike | ✅ |
| unload / 未覆盖 = `HP.idle` | ✅ |
| 可选 `hp.run1` / `hp.hurt` 同构 | ✅ |
| poses 计数 unload 后不变（CORE 21） | ✅ |
| `npm run test:menpai` | **ALL PASS** |
| `npm run build` | **绿** (`tsc --noEmit && vite build`) |
| bump | **否** |
| 部署 | **否** |

## 已知限制

- jump / fall / land / guard / dash / down / getup / charge 仍硬 `HP`（蓝图后置）。
- 杂兵 `sp.*` 未接（Loco2）。
- 设计台尚无 loco 快捷（Loco3）；无官方示范包（Loco4）。
- PoseDef 仍强制三帧；loco 靠同填 / 只读 strike。

## 文档路径

- 本文件：`/workspace/docs-design/C档-Loco1-locomotion姿态-完成-2026-10-29.md`
- 蓝图：`/workspace/docs-design/C档-locomotion姿态蓝图-2026-10-29.md`
