# C 档蓝图：敌人 Behavior / BehaviorStep 交付面全链路

仓库：`requiem-web`（`/workspace/requiem-web`）。  
日期：2026-10-28 Asia/Shanghai。  
本文件为分期蓝图（B0 调研）；**默认不 bump** 玩家存档。本蓝图阶段**不部署、不改代码**。

可读对照：`docs-design/C档-符咒ScriptStep蓝图-2026-10-28.md`（T0 体例）；`docs-design/C档-功法castAnim特效蓝图-2026-10-28.md`（远程注入债型）；`docs-design/C档-机体积木方案-2026-10-28.md`（P0–P3 组装已收口）；`requiem-web/docs/门派插件.md`；`requiem-web/docs/C档原语与设计台-2026-10-28.md`。

---

## 终点（用户）

新杂兵打法 = 内容包只登记数据：`behaviors.add`（`BehaviorDef` + 白名单 `BehaviorStep[]`）+ `enemies.add({ behaviorId })`。  
远程 `content.json` / 设计台导出同构可灌、可跑。  
**不改战斗 TS / 不扩 kind（默认）**。禁止任意 JS / Canvas / 外链 / 自由 AI DSL。

---

## 边界（与 Boss / 武器 / 符咒）

| 线 | 管什么 | 本蓝图 |
| --- | --- | --- |
| **敌人 Behavior 专线（B1–B4 已跟进）** | `BehaviorStep` 语义与登记、`BehaviorDef`、设计台「怎么打」、远程灌 behaviors、示范种子对齐 | 分期 B1–B4（B4 弱 UX 收口） |
| **机体积木 P0–P3（已收口）** | `ColliderProfile`、通用 `Enemy`、Boss 组装旁路、去必填 `body` | **不重开**；本线只吃交付面 |
| **Boss 去壳 / bossMoves** | `Gargoyle` 解释器、`bossMoves` kind、perch/takeoff | **勿混主线**；可点名边界债 |
| **武器线（已收口多项）** | CombatStyle / weaponLooks / attacks | **不顺手改** |
| **符咒线（T1–T4 已跟进）** | ScriptStep / talismanScripts | **不顺手改** |
| **功法观感线（F 已收口多项）** | castAnim / animRecipes | **不顺手改** |

共用但本线可深改敌人侧：

- `EnemyDef.behaviorId` → `getBehavior` → `behaviorSteps` → `tickBehaviorSteps`。
- 旁系交付面：`silhouettes` / `colliders` 与自定义敌人常同卷出现——**可在分期里顺带打通注入**，但不抢剪影 part / 碰撞字段扩表，不抢 Boss AI。

---

## 1. 现状（文件 + 符号举证）

### 1.1 链路图

| 层 | 数据入口 | 目录 / 类型 | 解释器 / 调用方 | 证据路径 |
| --- | --- | --- | --- | --- |
| **BehaviorStep 白名单** | `BEHAVIOR_STEP_KINDS` · `BEHAVIOR_STEP_SCHEMAS` | **18** kind（见下） | 登记 `validateBehaviorSteps`（未知 **拒收**）；运行 `tickBehaviorSteps`（未知 **soft-skip**） | `src/meta/bTier/types.ts`；`src/plugins/schemas.ts` |
| **行为目录** | `ctx.behaviors.add` | `BehaviorDef{ id, body, label?, steps? }` | `BehaviorService`；`getBehavior` / `listBehaviors` | `src/plugins/services.ts`；`src/meta/contentRegistry.ts` |
| **敌人挂接** | `EnemyDef.behaviorId` | 组装键之一（+ silhouetteId + collider） | `factory.makeEnemy`：候选 `behaviorId` → `def.body` → kit `body`，取首个有非空 `steps` 的配方 | `src/entities/enemies/factory.ts`；`schemas.ts` Enemy |
| **解释器** | `e.behaviorSteps` | `behaviorInterp.tickBehaviorSteps` | `Enemy.update` 有 steps 则 tick；无则 idle fallback `think` | `behaviorInterp.ts`；`enemy.ts` |
| **官方种子** | `CORE_BEHAVIORS` | 5 条（axe/shield/archer/spear **有 steps**；gargoyle **无 steps**） | `CoreBodyCatalog`：`ctx.behaviors.add` | `src/meta/bTier/coreData.ts`；`src/menpai/core/index.ts` |
| **设计台** | 页签「怎么打」 | schema `behaviors.steps` **已 18**；导出含 `behaviors` | `designer.html` / `designer.js` / `designer-schema.json` | `dlc-server/public/` |
| **远程 DLC** | `applyContent` / `DlcContentBody` / `REMOTE_DLC_INJECT` | **不灌** `behaviors`（亦无 silhouettes / colliders） | 远程敌人只能挂**已有**（多为核心）`behaviorId` | `src/dlc/remote.ts`；`src/dlc/types.ts` |

### 1.2 BehaviorStep 白名单（kind 全文 · 18）

定义：`src/meta/bTier/types.ts` → `BEHAVIOR_STEP_KINDS`。  
Schema：`src/plugins/schemas.ts` → `BEHAVIOR_STEP_KIND_LIST` + `BEHAVIOR_STEP_SCHEMAS` + `validateBehaviorSteps`（未知 kind **登记抛错**；`phaseGate.steps` 递归校验）。

| 组 | kind |
| --- | --- |
| 控距 / 姿态 | `keepDistance` · `idlePace` · `facePlayer` |
| 攻防原语 | `meleeAttack` · `rangedAttack` · `block` · `charge` |
| 负载 | `useLoadout` |
| C 档扩表已落地 | `dodge` · `circleStrafe` · `flank` · `callAlly` · `phaseAtHp` · `phaseGate` · `comboChain` · `retreatBurst` · `taunt` · `idleEmote` |

设计台 `designer-schema.json` → `behaviors.steps`：**同 18 kind**（与核心对齐——对照符咒线 T0 时设计台曾缺 kind，本线 schema **已齐**）。

运行层：`behaviorInterp` 对未知 kind `warnOnce` 后跳过；`meleeAttack.attackKey` 先查攻击盒目录再回退 `bodyAttacks` 内置名；`block` 非 shield body soft-skip；`callAlly.enemyId` 缺目录 soft-skip。

### 1.3 `ctx.behaviors`（Service）

| 项 | 符号 / 行为 |
| --- | --- |
| Service | `BehaviorService`（`services.ts`）：`super(ctx, 'behaviors', true)` |
| `add(def)` | `BehaviorSchema` + 有 `steps` 则 `validateBehaviorSteps`；未知 kind **拒收** |
| Schema 必填 | `id` · `body`（仍 ∈ `axe\|shield\|archer\|spear\|gargoyle`）· 可选 `label` / `steps` |
| 查询 | `getBehavior` / `listBehaviors`（`contentRegistry.ts`） |
| Smoke | 核心 5 条；`spear/axe/shield/archer` 有对应 steps；拒未知 kind；Cordis `qiangying_mid_spear` 有货 |

### 1.4 组装：`behaviorId` → `behaviorSteps`

| 步骤 | 文件 | 行为 |
| --- | --- | --- |
| 登记敌人 | `EnemyService` / `EnemySchema` | 无 `body` 时须 `silhouetteId` + `behaviorId` + 碰撞；有 `body` 时软别名兼容 |
| `makeEnemy` | `factory.ts` | 非 Boss 路由：写 `e.behaviorId`；按候选列表解析首个**非空 steps** 配方挂到 `e.behaviorSteps` |
| 每帧 | `enemy.ts` | `behaviorSteps?.length` → `tickBehaviorSteps(g, this)`；否则 fallback `think` |
| Boss 路由 | `factory` / `gargoyle.ts` | Boss **不**走杂兵 BehaviorSteps 主路径；`behaviorId: 'gargoyle'` 的 CORE 条目**无 steps**（P2 stub） |

### 1.5 解释器：`tickBehaviorSteps`

| API | 文件 | 作用 |
| --- | --- | --- |
| `tickBehaviorSteps(g, e)` | `behaviorInterp.ts` | 读 `e.behaviorSteps`；处理 `phaseAtHp` / `phaseGate`；加权抽攻防步；持续步 `keepDistance`/`idlePace`/`facePlayer` |
| 依赖 | `bodyAttacks.ts` · `loadout.ts` | 近战盒回退名；`useLoadout` 施技能/符/丹 |

解释器 **无** 按敌人内容 id 的硬分支（按 `step.kind` 分支）。`attackKey` / `projectileId` / `enemyId` 软引用属白名单语义。

### 1.6 官方种子（`CORE_BEHAVIORS`，5）

| id | steps 要点 | 备注 |
| --- | --- | --- |
| `axe` | face · keepDistance · meleeAttack `axeChop` | 杂兵 |
| `shield` | face · keep · bash · charge · block | 杂兵 |
| `archer` | face · keep · ranged `arrow` · whip · dodge · retreatBurst | 杂兵 |
| `spear` | face · keep · thrust/lunge · retreatBurst | 杂兵 |
| `gargoyle` | **无 steps** | Boss 走 `bossMoves` / Gargoyle；注释写明 P2 stub |

Smoke：`scripts/menpai-smoke.ts` 期望 `behaviors: 5`；断言四杂兵 steps 种类。

### 1.7 设计台「怎么打」面板

**存在**：`designer.html` 页签「怎么打」→ `#panel-behaviors`；托盘积木 + 步骤列表；敌寇草稿会预填 `behaviors[0].steps`（keepDistance + meleeAttack + facePlayer）。

**能改 / 已齐**：

- Def：`id` / `label` / `body`（五档 enum，仍必填）
- `steps[]`：schema **18 kind** 与核心同表
- 导出 `buildContentExport` keys **含** `silhouettes` · `behaviors`（且排在 `enemies` 前）
- 玩法敌人表单有 `behaviorId` / `silhouetteId` / `colliderId`

**不能 / 残缺**：

- **无** `colliders` 内容键：`state.content` 与 `buildContentExport` **均无** colliders（schema 虽有 `colliders` 段）
- 导出注释写「与远程 applyContent 一致」，但远程**实际不灌** behaviors/silhouettes——注释超前
- `behaviorId` 为裸 string，无本卷 behaviors datalist（弱挂接，可后补）

### 1.8 远程 DLC：behaviors 相关灌哪些

| 表面 | 现状 |
| --- | --- |
| `DlcContentBody` | **无** `behaviors?` · **无** `silhouettes?` · **无** `colliders?`（`types.ts`） |
| `REMOTE_DLC_INJECT` | **无** `'behaviors'` / `'silhouettes'` / `'colliders'`（有 `enemies`） |
| `applyContent` | **不** `add('behaviors'|'silhouettes'|'colliders', …)` |
| 馆种子 | `qiangying`：有 `enemies`，**无** `behaviors` 数组；`shixiang`：enemies 挂核心 `axe`/`gargoyle` behaviorId |

对照功法线 F1（`animRecipes` 已补灌）与武器线 CombatStyle 注入——**behaviors 仍是同型债**。

**可用捷径（现状）**：远程敌人只写 `behaviorId: 'spear'` 等**长夜已登记** id → 能跑核心套路。自定义新 behavior id → 远程路径**做不到**，须 Cordis 源插件 `ctx.behaviors.add`。

### 1.9 内容包示范

| 包 | Cordis 源 | 馆种子 `content.json` | 要点 / 差 |
| --- | --- | --- | --- |
| **qiangying** | `qiangying_mid_spear`：circleStrafe / comboChain / phaseAtHp+phaseGate / callAlly / useLoadout 等；剪影 `qiangying_vanguard`；先锋 `behaviorId: 'qiangying_mid_spear'` | 仅 `enemies`+符；**无 behaviors**；先锋 `behaviorId: 'spear'`、`silhouetteId: 'spear'` | **种子 ≂̸ Cordis**；远程只能核心枪法 |
| **shixiang** | 自定义 `shixiang_box` collider；敌人挂核心 behavior | 种子 enemies/bossKits；behaviorId 核心；**无**自建 behaviors | Boss 示范属 bossMoves 线 |
| **hanmang / chixia / yinfeng** | 无自定义 behavior | 无 enemies/behaviors | 无关本线 |

Smoke 对 **Cordis** `?pack=qiangying` 断言 `qiangying_mid_spear` 有 steps——**不覆盖**馆远程路径。

---

## 2. 硬编码 / 缺口债（每条有证据）

| # | 债 | 证据 | 影响 |
| --- | --- | --- | --- |
| 1 | **远程不灌 `behaviors`（及 silhouettes/colliders）** | `types.ts` 无字段；`remote.ts` `REMOTE_DLC_INJECT` / `applyContent` 无 add；设计台却导出 silhouettes+behaviors | 设计台/手写 JSON 自定义打法远程启用后**静默丢**；敌人只能挂核心 behaviorId |
| 2 | **qiangying 种子 ≂̸ Cordis** | 源有 `qiangying_mid_spear` + 自定义剪影；`packages/qiangying/content.json` 无 behaviors，先锋挂 `spear` | 馆启用 ≠ `?pack=qiangying` 打法/长相 |
| 3 | **设计台导出注释谎称与 applyContent 一致** | `designer.js` `buildContentExport` 注释；实际 remote 无 behaviors add | 作者误以为导出即可远程跑自定义 steps |
| 4 | **设计台无 colliders 交付面** | `state.content` / export keys 无 colliders；schema 有段 | 无 body 远程包难自带碰撞盒（只能蹭核心 colliderId 或依赖 body 软别名）——**旁系**，非 Behavior kind 债 |
| 5 | **`BehaviorDef.body` 仍必填五档** | `BehaviorSchema.body: lit(ENEMY_BODIES).required()`；P3 仅放松 `EnemyDef.body` | 自定义打法仍绑身形枚举；姿态/盾挡等软基线未完全数据化——**缓**，勿当 B1 |
| 6 | **近战盒仍有 `bodyAttacks` 内置名** | `behaviorInterp` → `BUILTIN_BODY_ATTACKS`；W 线已目录化 attacks | 缺 catalog id 时靠内置名；**本线不顺手改**攻击盒 |
| 7 | **Boss `gargoyle` 无 BehaviorSteps** | `CORE_BEHAVIORS` 注释；AI 在 `bossMoves` / `gargoyle.ts` | **边界债**——属 Boss 线，本蓝图不分期去壳 |
| 8 | **解释器 id 特判** | `tickBehaviorSteps` **无** 内容 id 分支 | **本债轻**——勿为清特判乱扩 kind；优先交付面 |

---

## 3. 目标态

| 角色 | 做 | 不做 |
| --- | --- | --- |
| **内容包** | `behaviors.add` + `enemies.add({ behaviorId })`；远程 JSON 同构；可选同卷 silhouettes/colliders | 不改 `behaviorInterp.ts`；不扩新 kind；不挂任意 JS/Canvas/外链 |
| **A 核心** | 单一解释器读目录 tick；缺 behavior / 空 steps → idle fallback | 不按内容 id 开分支；不把 Boss 强行塞进 BehaviorSteps |
| **C 档** | 仅当缺 AI 原语时扩 `BEHAVIOR_STEP_KINDS` | 不为「多一套枪法」开 C 单 |
| **设计台** | 已能编 18 kind steps 并导出；补远程能吃上；可选 behaviorId datalist / colliders 面板 | 不做自由 AI DSL、不做运行时完整 AI 预览播放器（可后补） |

目标句：**加一套「雨枪中距」= 登记 BehaviorDef.steps + EnemyDef.behaviorId；零战斗文件 diff；设计台导出 → 馆 enable 可灌可跑。**

---

## 4. 分期建议（B1–Bn）

| 期 | 目标 | 改动入口猜测 | 验收一条 | bump | 不做边界 |
| --- | --- | --- | --- | --- | --- |
| **B1 远程灌 behaviors（+ silhouettes）** | `DlcContentBody` 加 `behaviors?`（建议同加 `silhouettes?`）；`REMOTE_DLC_INJECT` 声明；`applyContent` 在 **enemies 之前** `add`；文档一句；对照 F1 animRecipes | `src/dlc/types.ts` · `remote.ts`；可选 `门派插件.md` 一句 | 手写/设计台导出 content：自定义 `behaviors` + `enemies.behaviorId` 指向之 → 远程 enable 后 `getBehavior(id)?.steps?.length`；`makeEnemy` 后 `behaviorSteps` 非空且会 tick | **否** | 不扩 BehaviorStep kind；不改解释器；不碰 Boss/武器/符咒；不部署；colliders 可列 B3 |
| **B2 种子与 Cordis 对齐（qiangying）** | 馆种子补 `behaviors`（至少 `qiangying_mid_spear`）+ 需要的 `silhouettes`；先锋 `behaviorId`/`silhouetteId` 对齐源；`dlc:regen` 若流程需要 | `dlc-server/packages/qiangying/content.json` | 远程启用 qiangying 后 `getBehavior('qiangying_mid_spear')` 有 steps；先锋 def.behaviorId 同 Cordis | **否** | 不改 Cordis 手感数值；不 SSH 部署；不顺手改符种子（符线已收） |
| **B3（旁系）colliders 交付面** | 设计台 `state`/export 加 `colliders`；远程 `DlcContentBody`/`applyContent`/`INJECT` 加 `colliders`（仍在 enemies 前）；无 body 示范可挂自建盒 | `designer.js` · schema 已有则可只接线；`remote.ts` | 远程 content 含自建 collider + enemy.colliderId → 组装盒尺寸生效 | **否** | 不扩碰撞字段；不改物理；不抢 Boss |
| **B4（可选）文档 / smoke / 弱 UX（已跟进）** | 纠正设计台「与 applyContent 一致」注释；smoke 可选覆盖「远程形状」或种子含 behaviors；敌人 `behaviorId` datalist（本卷+核心） | `designer.js`；`menpai-smoke.ts`；docs | 文档/注释与真实注入表一致；预览可见「打法 N 步」 | **否** | 不为好看新建 kind；不改 AI 权重数值 |

**B1 优先理由**：设计台 **已能**编满 18 kind 并导出；卡点在远程注入面（对照功法线 F1「先打通远程吃上已有目录」）。不先扩任意新 kind。silhouettes 建议与 B1 同单顺带灌——否则自定义 `silhouetteId` 仍丢；若单要极窄可只灌 behaviors，剪影下一期。

每期落地后可另写 `C档-B*-敌人Behavior-完成-2026-….md`。

---

## 5. 不做 / 暂缓

- 任意 JS / Canvas / 外链 URL / 自由 PNG（sheet 仍 `./art/`）
- 自由 AI DSL、按敌人 id 硬编码 think
- **勿混 Boss 去壳主线**：`bossMoves` / Gargoyle / perch/takeoff / 给 gargoyle 强行补 BehaviorSteps 当 Boss AI
- **不顺手改**武器已收口项、符咒 T 线、功法 F 线、`bodyAttacks` 目录化残留
- 本蓝图阶段**不部署**、不 bump
- 默认**不扩** `BEHAVIOR_STEP_KINDS`（缺原语另开 C 单）
- 暂缓：`BehaviorDef.body` 去必填大重构；设计台实时 AI 预览；把内置近战名全部迁光

---

## 6. 给内容包（现阶段能 / 不能）

| 已能 | 还不能 |
| --- | --- |
| Cordis：`ctx.behaviors.add` + `enemies.add({ behaviorId })`（抄 qiangying） | 远程 JSON / 设计台导出的**自定义** behaviors 被 `applyContent` 吃上（B1 前） |
| 远程敌人挂**核心** `behaviorId`（`spear`/`axe`/…）可跑 | 指望 qiangying **馆种子**跑 `qiangying_mid_spear`（B2 前） |
| 设计台编满 18 kind steps 并导出 `behaviors` 键 | 设计台一键导出 colliders（B3 前）；无 body 纯远程自建盒 |
| `?pack=qiangying` 本地 Cordis 验证自定义打法 | 把 Boss 石兽打法写成 BehaviorSteps 替代 bossMoves |
| 杂兵 AI 仅 Behavior（Skeleton 已删，P1） | 登记未知 BehaviorStep kind（Schema 拒收） |

---

## 7. 解释器 / Schema 入口（落地时对照）

| 职责 | 路径 |
| --- | --- |
| BehaviorStep 白名单 + 类型 | `src/meta/bTier/types.ts`（`BEHAVIOR_STEP_KINDS`） |
| Schema / validate | `src/plugins/schemas.ts`（`BEHAVIOR_STEP_SCHEMAS` · `validateBehaviorSteps` · `BehaviorSchema`） |
| 目录服务 | `src/plugins/services.ts`（`BehaviorService`） |
| 查询 | `src/meta/contentRegistry.ts`（`getBehavior`） |
| 解释器 | `src/entities/enemies/behaviorInterp.ts` |
| 组装 | `src/entities/enemies/factory.ts` · `enemy.ts` |
| 近战盒回退 | `src/entities/enemies/bodyAttacks.ts` |
| 长夜种子 | `CORE_BEHAVIORS`；`src/menpai/core/index.ts`（`CoreBodyCatalog`） |
| 远程注入 | `src/dlc/types.ts` · `remote.ts`（**待 B1**） |
| 设计台 | `dlc-server/public/designer.html` · `assets/designer-schema.json` · `designer.js` |
| 示范包 | `src/content/qiangying`；`dlc-server/packages/qiangying` |
| Smoke | `scripts/menpai-smoke.ts` |
| Boss 边界 | `src/entities/boss/gargoyle.ts`；`CORE_BOSS_MOVES`；`docs-design/C档-机体积木方案-*.md` |

---

## 附：调研摘录（证据句）

- `BEHAVIOR_STEP_KINDS` **18** · `behaviorInterp.tickBehaviorSteps`——`src/meta/bTier/types.ts` · `behaviorInterp.ts`。  
- `validateBehaviorSteps` 未知 kind 拒收；运行未知 soft-skip——`schemas.ts` · `behaviorInterp.ts`。  
- 设计台 `behaviors.steps` **18** kind；`buildContentExport` **含** `behaviors`/`silhouettes`——`designer-schema.json` · `designer.js`。  
- `DlcContentBody` / `REMOTE_DLC_INJECT` / `applyContent` **无** behaviors/silhouettes/colliders——`src/dlc/types.ts` · `remote.ts`。  
- `CORE_BEHAVIORS` 5 条；gargoyle **无 steps**——`coreData.ts`。  
- qiangying Cordis：`qiangying_mid_spear` + 先锋挂之；种子无 behaviors、先锋 `behaviorId: 'spear'`——`src/content/qiangying/index.ts` vs `packages/qiangying/content.json`。  
- P0–P3 机体积木已收口；本线是**交付面**而非再拆 Skeleton——`docs-design/C档-P*-*.md`。  
- 本 B0：**只写文档**，未改代码、未 bump、未部署。
