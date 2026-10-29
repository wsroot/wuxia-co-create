# C 档蓝图：locomotion 姿态目录化（债 #4）

仓库：`requiem-web`（`/workspace/requiem-web`）。  
日期：2026-10-29 Asia/Shanghai。  
本文件为分期蓝图（**Loco0** 调研）；**默认不 bump** 玩家存档。本蓝图阶段**不部署、不改代码**。

可读对照：`docs-design/C档-剩余债清单-2026-10-28.md`（债 **#4**）；`docs-design/C档-fxRecipes-poses蓝图-2026-10-28.md`（暂缓 idle 树；X5 已收杂兵**攻击**姿）；`docs-design/C档-playPose语义蓝图-2026-10-29.md`（债 #3 已收口，**不**含 locomotion）；`docs-design/C档-X5-fxRecipes-poses-完成-2026-10-28.md`（`skel.*` 目录优先范式）；`src/render/poses.ts`（`HP`/`SP`/`GP`）；`src/entities/player.ts` · `src/entities/enemies/enemy.ts`。

---

## 建议先开 · 验收一句（推进用）

> **先开 Loco1**：玩家 locomotion soft 目录——`player.computePose` 对 **`idle` / `idle2` / `run1` / `run2` / `hurt`** 改读 `getPose('hp.<key>')?.strike`（或等价 helper），**缺则回退**模块常量 `HP.*`；**不**强行把整棵 HP 种子进 `CORE_POSES`（override-only）；smoke：Cordis 覆盖 `hp.idle` 后 idle 态吃到新 lean；`bump=否`。  
> **验收一句**：Cordis `poses.add({ id:'hp.idle', wind≈strike≈rec 可辨 })` → 玩家 idle `computePose` 吃目录；unload / 未覆盖时观感与今日 `HP.idle` 一致；`test:menpai`+`build` 绿。

---

## 终点（用户）

内容包能替换**走/闲/受击**观感（玩家 + 杂兵主路径），而不改战斗文件、不扩任意 JS/Canvas。

**不**默认开整棵 jump/guard/dash/盾兵特化 / Boss `GP` 全树；**不**开 perch/takeoff；**不**新建第二绘制器。

---

## 边界

| 线 | 管什么 | 本蓝图 |
| --- | --- | --- |
| **locomotion 专线（本单 Loco）** | 绘制主路径 soft 读目录 + id 约定 + 回退 | 分期 **Loco1–Loco4** |
| **X1–X5 poses（已收口）** | 攻击三帧远程/台/示范；杂兵 **attack**→`skel.*` | **不抢**；本线只扩 **loco 槽位**读法 |
| **playPose 债 #3（已收口）** | Anim 招式样子时间轴 | **不抢**；loco 不走 AnimStep |
| **Boss / GP / G4** | `garg.*` 部分 soft；silhouette 另债 | **默认缓**；Loco 不抢 Boss |
| **债 #12 perch** | — | **勿开** |

---

## 1. 现状（举证）

### 1.1 双轨姿态

| 轨 | 形状 | 目录？ | 消费者 |
| --- | --- | --- | --- |
| **攻击三帧** | `PoseDef extends { wind, strike, rec }` | ✅ `CORE_POSES`（21）+ 远程/台 | 普攻 `attackPose`；Anim `playPose`；杂兵 attack（X5） |
| **locomotion 单帧** | `Pose`（`HP`/`SP`/`GP` 模块常量） | ❌ **未**进 `ctx.poses` | `player.computePose`；`enemy.restPose` / walk / hurt 等 |

Schema：`PoseSchema` **强制** wind/strike/rec——今日目录**没有**「单帧 loco」专用 kind。

### 1.2 玩家硬读（`player.ts` `computePose`）

| state | 硬读 |
| --- | --- |
| run | `cycle(HP.run1, HP.run2, …)` |
| idle（默认） | `cycle(HP.idle, HP.idle2, …)` ± land |
| hurt | `HP.hurt` |
| air / guard / dash / down / getup / charge / attack rest | `HP.jump|fall|guard|…`（**本线 MVP 可后置**） |

另有 `animPoseOverride`（Anim）优先——与 loco 目录正交。

### 1.3 杂兵硬读（`enemies/enemy.ts`）

| 路径 | 硬读 |
| --- | --- |
| `restPose()` | kind→`SP.shIdle|arIdle|spIdle|idle` |
| walk 循环 | `SP.walk1/2` 或盾/枪变体 |
| hitstun / stagger | `SP.hurt` 等 |
| attack | **已** `getPose('skel.*') ?? SKEL_ATTACKS`（X5） |

### 1.4 Boss `GP`

`gargoyle.computePose` 仍大量本地 / 部分 `garg.*`——**本线默认不收**（防扯第二绘制器；对齐债 #9 缓）。

---

## 2. 建模约定（关键决策）

### 2.1 复用 `poses` 目录，不新开 Service（推荐）

| 约定 | 内容 |
| --- | --- |
| **id 前缀** | 玩家 `hp.<slot>`；杂兵 `sp.<slot>`（与 `skel.` / `garg.` 并列） |
| **登记形状** | 仍用 `PoseDef`（三帧必填）；loco **建议三帧同值**，或仅保证 `strike` 为生效帧 |
| **读取** | helper 如 `locoPose(id, fallback: Pose): Pose` → `getPose(id)?.strike ?? fallback`（与 playPose/X5「目录优先 + 硬表回退」同构） |
| **种子** | **默认 override-only**：不把整棵 HP/SP 灌进 `CORE_POSES`（避免 smoke 计数/体积暴涨）；官方观感仍模块常量 |
| **不做** | 新 `locoPoses` Catalog（除非后期单帧 Schema 痛到必须拆） |

### 2.2 MVP 槽位闭集（先这些）

| 前缀 | 槽位（Loco1/2） | 回退常量 |
| --- | --- | --- |
| `hp.` | `idle` · `idle2` · `run1` · `run2` · `hurt` | `HP.*` |
| `sp.` | `idle` · `walk1` · `walk2` · `hurt` | `SP.*` |

**后置（可选期）**：`hp.jump|fall|land|guard|dash|down|getup|charge`；`sp` kind 特化（`shIdle`/`spWalk1`/…）；整棵 `GP`。

---

## 3. 目标态

| 角色 | 做 | 不做 |
| --- | --- | --- |
| **内容包** | `poses.add` 覆盖 `hp.*` / `sp.*` 即换闲走受击 | 不改 player/enemy 状态机逻辑 |
| **A 核心** | soft 读 + 硬常量回退；缺 id 静默回退（可可选 warn） | 不按内容 id 开分支；不删 `HP`/`SP` 常量 |
| **设计台** | Loco3：可编/导出上述 id（或「从核心拷贝」单帧→三帧同填） | 不做实时骨骼编辑器 |
| **Boss** | — | 默认不收 GP 全树 |

目标句：**换玩家站姿 = 登记 `hp.idle`（三帧同 lean）+ enable；未登记则与今日一字不差。**

---

## 4. 分期建议（Loco1–Loco4）

| 期 | 目标 | 改动入口猜测 | 验收一条 | bump | 不做边界 |
| --- | --- | --- | --- | --- | --- |
| **Loco1 玩家 MVP**（建议先开） | helper；`computePose` 接线 idle/idle2/run1/run2/hurt；smoke 覆盖 `hp.idle`（± run/hurt）；文档 id 约定一句 | `player.ts`；可选小 helper 文件；`menpai-smoke.ts`；可选 `门派插件.md` | 见文首 | **否** | 不改 enemy；不灌 CORE 全树；不改设计台；不部署；不碰 GP |
| **Loco2 杂兵 MVP** | `restPose` / walk1·2 / hurt（及 hitstun 用 hurt）改 `sp.*` soft；kind 默认 idle 先只 `sp.idle`（盾/枪特化可仍硬读或同单软读 `sp.shIdle`——**优先最小：通用 idle/walk/hurt**） | `enemies/enemy.ts`；smoke | Cordis 覆盖 `sp.walk1` 后行走 cycle 吃目录；未覆盖 = `SP.*` | **否** | 不改 Behavior；不抢 Boss；不强制种特化全表 |
| **Loco3 设计台** | schema/UI：可新建 `hp.*`/`sp.*`（三帧表单可「同填 strike」快捷）；export；poses 页 hint 点名 loco | `designer-schema.json` · `designer.js` | 导出含 `hp.idle`；远程/apply 已能灌 poses（X1）→ enable 生效 | **否** | 不做预览播放器大改；不扩新 Catalog 键 |
| **Loco4 示范（可选）** | 一条 pack 覆盖 `hp.idle` 或 `sp.hurt`；Cordis+种子；`?pack=` 可见 | `src/content/…` · `packages/…` | 零核心 diff；观感可辨 | **否** | 不 SSH；不顺手开 GP |

**Loco1 优先理由**：债点名玩家硬读；与 X5「目录优先 + 回退」同型；不碰杂兵 kind 矩阵；opt-in 零破坏。

落地后写 `C档-Loco*-locomotion姿态-完成-2026-….md`。

---

## 5. 不做 / 暂缓

- 任意 JS / Canvas / 外链 / 自由 PNG  
- **不删** `HP`/`SP`/`GP` 模块常量（永远是回退源）  
- **不**默认把 loco 全树写入 `CORE_POSES`（除非另单为「可发现性」点名）  
- **不**改 Anim `playPose` / 攻击盒 / Behavior  
- **不**开 Boss GP 全目录化、silhouette 第二绘制器、perch/takeoff  
- 本蓝图阶段**不部署**、不 bump  

---

## 6. 风险与回退

| 风险 | 约定 |
| --- | --- |
| PoseDef 三帧对 loco 冗余 | 文档写清「三帧同填 / 只读 strike」；台面可提供一键同填 |
| 与攻击 id 撞名 | 强制前缀 `hp.`/`sp.`；禁止裸 `idle` |
| kind 特化遗漏 | Loco2 最小通用槽；特化后置 |
| smoke poses 计数 | override-only 不改核心 21；覆盖测 unload |
| 热更面 | Loco1/2→:4173；Loco3→:4174；均须用户拍板 |

---

## 7. 给内容包（Loco1 后）

| 已能 | 还不能 |
| --- | --- |
| Cordis 覆盖 `hp.idle` 等改玩家闲姿 | 设计台一键（Loco3）；杂兵 walk（Loco2）；官方示范（Loco4） |
| 不登记 = 与今日完全一致 | 用单帧 Schema 免写三帧（不在本线） |

---

## 附：债清单对照

| 债 | 本蓝图 |
| --- | --- |
| **#4** 玩家/杂兵 locomotion 仍常量 | **本线** Loco1–4 |
| #3 playPose | 已收口；不重复 |
| X 暂缓 idle 树 | **收口为本蓝图** |
| #9 Boss 长相 / GP | 默认缓 |

