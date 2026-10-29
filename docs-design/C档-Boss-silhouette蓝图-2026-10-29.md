# C 档蓝图：Boss silhouette parts（债 #9）

仓库：`requiem-web`（`/workspace/requiem-web`）。  
日期：2026-10-29 Asia/Shanghai。  
本文件为分期蓝图（**BossSil0** 调研）；**默认不 bump** 玩家存档。本蓝图阶段**不部署、不改代码**。

可读对照：`docs-design/C档-剩余债清单-2026-10-28.md`（债 **#9**）；`docs-design/C档-Boss去壳蓝图-2026-10-28.md`（G4 / G6「第二绘制器」）；`docs-design/C档-G4-Boss去壳-完成-2026-10-28.md`；`docs-design/C档-P2-Boss组装-完成-2026-10-28.md`；`src/render/drawGargoyle.ts` · `drawSkeleton.ts` · `resolveSilhouetteLook.ts` · `src/entities/boss/gargoyle.ts`。

---

## 建议先开 · 验收一句（推进用）

> **先开 BossSil1**：在 **现有 `drawGargoyle`** 内 soft 读 `EnemyDef.silhouetteId` → `getSilhouette` → 白名单 parts 子集（优先 **`palette` / `scale`**），映射到石兽肤色/整体缩放；**缺 silhouette / 无 parts → 与今日 bit-identical**。`bump=否`。  
> **验收一句**：Cordis 给 isBoss 挂自建 silhouette（`palette.skin` 可辨 + 可选 `scale`）→ 石兽绘制可见变色/缩放；核心 `gargoyle`（无 parts）观感不变；**仍走 `drawGargoyle`**（无第二绘制器）；`test:menpai`+`build` 绿。

---

## 终点（用户）

内容包能用 **既有 `SilhouettePart` 白名单**微调石兽长相（色 / 比例 / 轻量饰件），经 `silhouetteId` 驱动，而不改战斗文件、不新建石兽绘制入口。

**不**把 Boss 改画成杂兵 `drawSkeleton` 人形；**不**开「第二绘制器」新模块替代壳；**不**自由 PNG/外链；**不** perch/takeoff；**不** Behavior 化 AI。

---

## 边界

| 线 | 管什么 | 本蓝图 |
| --- | --- | --- |
| **G4 姿态 soft（已收）** | `getPose('garg.*')` → 关节 Pose | **不抢**；本线只管 **外观 parts → 绘制参数/叠加** |
| **drawGargoyle 壳（保留）** | 石狮/屋脊兽程序几何 + tint/wing/jaw | **唯一绘制入口**；本线只扩 `GargOpts` / 内部读 parts |
| **杂兵 silhouette（已通）** | `drawSkeleton` + `parseParts` + `resolveSilhouetteWeaponLook` | **对照语义**；**禁止** Boss 直接改调 `drawSkeleton` 当主路径（=第二绘制器风险） |
| **Boss 负载（#7 已跟进）** | gear heldWeapon | 可与 mainhand 叠优先级（Sil2+）；Sil1 可不接兵刃 |
| **G6 第二绘制器 / 新 class** | — | **勿开** |
| **债 #12 perch** | — | **勿开** |

一句话：**改「石兽怎么上色/加料」，不换「谁画石兽」。**

---

## 1. 现状（举证）

### 1.1 双轨已分叉

| 面 | 杂兵 | Boss |
| --- | --- | --- |
| 姿态 | `skel.*` / loco | G4：`garg.*` soft + `GP` 回退 ✅ |
| 长相 | `getSilhouette` → `drawSkeleton(…, { silhouette, weaponLook })` | `silhouetteId` **仅存储**；`drawGargoyle(ctx, pose, GargOpts)` **不读** sil |
| CORE sil | axe/shield/… 可带 parts | `CORE_SILHOUETTES.gargoyle`：**无 parts**，仅 id/body/baseRig |

### 1.2 绘制入口

- `gargoyle.ts` draw：`drawGargoyle(…, { time, flash, wing, jaw, rage, glow, armor, tint })` — **无** `silhouette` 字段。
- `GargOpts.tint`：幕级四色枚举（jade/ink/blood/ash），与 silhouette `palette` **未接通**。
- 注释仍写：「Soft silhouette id — P2 stored; draw still uses drawGargoyle。」

### 1.3 内容侧证据

- `shixiang` 杂兵 `shixiang_yong`：自建 sil + `palette`/`armorLayer`/`scale`/`faceMark` → **杂兵路径已可见**。
- `shixiang` Boss `shixiang_yexun`：`silhouetteId: 'gargoyle'`（核心空 parts）→ 换装债对 Boss **零体感**；夜巡石俑剪影**未**挂到 Boss。

### 1.4 为何不能「Boss 改调 drawSkeleton」

`drawSkeleton` 面向人形 kit（袍/帽/盾/刀）；石兽是独立几何（云披/石尾/獠牙/翼根）。整段改调 = **实质第二绘制器**（G6 禁区）+ 碰撞/镜头/受击闪白全套重验。蓝图强制：**parts 解释器长在 `drawGargoyle` 内**（或同文件私有 helper），对外仍一个 `drawGargoyle`。

---

## 2. 建模约定（关键决策）

### 2.1 推荐：壳内 soft 解释（非第二绘制器）

| 方案 | 做法 | 取舍 |
| --- | --- | --- |
| **A. drawGargoyle 读 parts（推荐）** | `gargoyle.draw` 传入 `getSilhouette(silhouetteId)`；`drawGargoyle` 解析白名单子集 → 改 skinMap / scale / 轻叠加 | 单一入口；缺省回退今日 |
| B. 新 `drawBossFromSilhouette` | 并行入口 | **禁止**（第二绘制器） |
| C. Boss → `drawSkeleton` | 复用杂兵 | **禁止**（几何错位 + G6） |

### 2.2 Parts 子集分期（闭集，不扩 kind）

| 期 | 解释的 kind | 映射到石兽 |
| --- | --- | --- |
| **BossSil1** | `palette`（至少 `skin`；可选 arm/coat→石色辅色）、`scale.value` | 覆盖 `skin`/`skinB` 推导或替换 tint 表；`ctx.scale` 外层已有 facing scale 时可乘 |
| **BossSil2** | + `faceMark` / `ornament` / `armorLayer`（轻叠加）；可选 `cloak.color`→云披 | 关节上程序饰件；仍无新 kind |
| **BossSil3** | 示范数据 | Boss 挂自建 sil（可复用/改编 `shixiang_yong` 石色，或新 id）；文档改「绘制已读 sil」 |

**本线默认不扩** `SILHOUETTE_PART_KINDS`。未支持的 kind：**soft-skip + warn once**（对齐杂兵未知 part）。

### 2.3 与幕级 `tint` 优先级

建议：`silhouette.palette` **覆盖** `GargOpts.tint` 推导的皮肤；无 palette 时仍用幕 `tint`。完成单写清，避免双源打架。

### 2.4 heldWeapon / mainhand

BossLoad 已有 `loadout.heldWeapon`。BossSil1 **可不接**主手；Sil2+ 可 `resolveSilhouetteWeaponLook` 后在石爪关节浅画（须防与爪几何打架）。**勿**为兵刃新开绘制器文件若能复用 `drawWeaponAppearance`。

### 2.5 bump

默认 **否**。

---

## 3. 分期（BossSil1–3）

| 期 | 目标 | 主要触点 | 验收（用户可感知） | bump | 不做 |
| --- | --- | --- | --- | --- | --- |
| **BossSil1（建议先开）** | sil → palette/scale 进 `drawGargoyle` | `gargoyle.ts` draw 传 sil；`drawGargoyle.ts` 解析；smoke | 见文首 | **否** | 不换绘制入口；不扩 kind；不接 mainhand；不部署 |
| **BossSil2** | faceMark/ornament/armorLayer（+可选 cloak 色） | 同文件叠加绘制；warn 未知 kind | Cordis 挂 mask/肩甲可见 | **否** | 不 Behavior；不第二绘制器 |
| **BossSil3** | 示范 + 文档 | `shixiang` Boss `silhouetteId` 指向石色 sil；`门派插件.md` | `?pack=shixiang` 石兽长相可辨于核心 jade | **否** | 不强制热更 |

设计台：silhouettes 编导出若已有（B 线），本线**默认不新开设计台单**。

---

## 4. 风险与回退

| 风险 | 缓解 |
| --- | --- |
| 误开第二绘制器 | 验收强制「仍 `drawGargoyle`」；PR/完成单 checklist |
| palette 与 tint 双源 | §2.3 优先级；smoke 无 palette 时四 tint 仍工作 |
| scale 过大撑破碰撞观感 | clamp（如 0.85–1.25）；碰撞仍 collider 目录 |
| 把人形 parts 硬套石兽 | 只映射有石兽语义的字段；其余 skip |
| shixiang 示范误挂 `gargoyle` 空 sil | Sil3 才改内容；Sil1 smoke 用临时 Cordis id |

回退：draw 忽略 sil → 今日几何；核心无 parts 路径保持。

---

## 5. 非目标

- 新建 `drawBoss*` 公共入口 / 废弃 `drawGargoyle`  
- Boss 主路径改 `drawSkeleton`  
- 任意 JS/Canvas/外链 PNG  
- perch/takeoff；behaviorSteps 驱动 Boss  
- 扩 `SilhouettePartKind`（另 C 档单）  
- 热更/SSH（推进另拍）  

---

## 6. 路径

- 本蓝图：`/workspace/docs-design/C档-Boss-silhouette蓝图-2026-10-29.md`
- 债清单：`/workspace/docs-design/C档-剩余债清单-2026-10-28.md` #9
- 对照：G4 完成单；Boss 去壳蓝图 §G4/G6 / 「还不能：用 silhouettes parts 换石兽骨架绘制」
