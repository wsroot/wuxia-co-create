# C 档 Loco2·杂兵 locomotion 姿态 soft 目录 — 完成记录

- **日期**：2026-10-29（Asia/Shanghai）
- **范围**：杂兵 `restPose` / walk1·2 / hurt（hitstun·stagger）soft 读 `sp.*`（`getPose?.strike`），缺则回退模块常量 `SP.*`；override-only（不灌 `CORE_POSES`）；kind 特化（shIdle/arIdle/spIdle、shWalk/spWalk）仍硬读
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **未做**：不部署；不改 Player / HP / GP / Boss；不改 Behavior；不灌 CORE；不改设计台（Loco3）；不改示范包（Loco4）；不 soft 盾/枪/弓特化 idle·walk

## 背景

蓝图债 #4：杂兵走/闲/受击硬读 `SP.*`，Cordis 无法覆盖观感。蓝图 Loco2：复用 `poses` 目录 + id 前缀 `sp.<slot>`；登记仍用三帧 `PoseDef`（loco 建议同填）；只读 `strike`。优先最小：通用 idle/walk/hurt。

蓝图：`C档-locomotion姿态蓝图-2026-10-29.md` §Loco2。  
Loco1（helper 已就位）：`C档-Loco1-locomotion姿态-完成-2026-10-29.md`。

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `src/entities/enemies/enemy.ts` | `import locoPose`；`softSp(slot)`；`restPose` 默认 → soft `sp.idle`；`walkA`/`walkB` 通用 → soft `sp.walk1`/`sp.walk2`；`hitstun`/`stagger` → soft `sp.hurt` |
| `scripts/menpai-smoke.ts` | Cordis 覆盖 `sp.walk1` → axe walk cycle 吃目录；unload 回 `SP.walk1`；可选 `sp.idle`/`sp.hurt`；断言 CORE 未灌 `sp.*` |
| `docs/门派插件.md` | `ctx.poses` 行补 `sp.idle`/`sp.walk1`/`sp.walk2`/`sp.hurt` |

**未改**：`CORE_POSES` 种子 / player / Boss / 设计台 / remote / 存档 / 部署 / Behavior。

## 读法（最终）

```ts
locoPose(id, fallback) → getPose(id)?.strike ?? fallback  // Loco1 已有
// enemy:
softSp(slot) → locoPose(`sp.${slot}`, SP[slot])
// restPose default / walkA·B 通用 / hitstun·stagger 用 softSp
// shield|archer|spear idle 与 shWalk|spWalk 仍硬 SP.*
```

## 验收

| 项 | 结果 |
| --- | --- |
| 核心无 `sp.*`（override-only） | ✅ smoke |
| Cordis 覆盖 `sp.walk1` 后 walk `computePose` 吃 strike | ✅ |
| unload / 未覆盖 = `SP.walk1` | ✅ |
| 可选 `sp.idle` / `sp.hurt` 同构 | ✅ |
| poses 计数 unload 后不变（CORE 21） | ✅ |
| `npm run test:menpai` | **ALL PASS** |
| `npm run build` | **绿** (`tsc --noEmit && vite build`) |
| bump | **否** |
| 部署 | **否** |

## 已知限制

- 盾/弓/枪特化 idle（`shIdle`/`arIdle`/`spIdle`）与 `shWalk*`/`spWalk*` 仍硬 `SP`（蓝图「优先最小」）。
- spawn/air/down/getup/parried/hop/bang/charge 等仍硬 `SP`。
- 设计台尚无 loco 快捷（Loco3）；无官方示范包（Loco4）。
- PoseDef 仍强制三帧；loco 靠同填 / 只读 strike。
- Boss `GP` 不在本线。

## 文档路径

- 本文件：`/workspace/docs-design/C档-Loco2-locomotion姿态-完成-2026-10-29.md`
- 蓝图：`/workspace/docs-design/C档-locomotion姿态蓝图-2026-10-29.md`
- 前序：`/workspace/docs-design/C档-Loco1-locomotion姿态-完成-2026-10-29.md`
