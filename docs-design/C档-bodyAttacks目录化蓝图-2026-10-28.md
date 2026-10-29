# C 档蓝图：敌人 bodyAttacks / BUILTIN → ctx.attacks 目录化收尾

仓库：`requiem-web`（`/workspace/requiem-web`）。  
日期：2026-10-28 Asia/Shanghai。  
本文件为分期蓝图（A0 调研）；**默认不 bump** 玩家存档。本蓝图阶段**不部署、不改代码**。

可读对照：`docs-design/C档-敌人Behavior蓝图-2026-10-28.md`（B 线体例）；`docs-design/C档-符咒ScriptStep蓝图-2026-10-28.md`（T0 体例）；`docs-design/C档-W1-招式盒目录化-完成-2026-10-28.md`（玩家外功只经 `getAttackBox`）；`docs-design/C档-武器全链路蓝图-2026-10-28.md`（W 线显式不改敌人盒）；`requiem-web/docs/门派插件.md`。

---

## 终点（用户）

敌人近战盒 = 与玩家外功同一目录：`ctx.attacks.add`（`AttackBoxDef`，`id = name`）。  
`BehaviorStep.meleeAttack.attackKey` / `comboChain.attackKeys` / `charge` 命中盒 **只** `getAttackBox(id)`；**无** `BUILTIN_BODY_ATTACKS` 双轨回退。  
远程 `content.json` / 设计台导出可灌自建盒；核心七内置名迁入 `CORE_ATTACK_BOXES`。  
**不改战斗结算语义、不扩 BehaviorStep kind、不抢 Boss 去壳**。禁止任意 JS / Canvas / 外链。

---

## 边界（与 W1 / Behavior / Boss）

| 线 | 管什么 | 本蓝图 |
| --- | --- | --- |
| **敌人攻击盒专线（本单 A1–An）** | `bodyAttacks` / `BUILTIN_BODY_ATTACKS` 迁目录；`behaviorInterp.resolveAttack` 去双轨；远程/设计台 `attacks` 交付面 | 分期 A1–A4 |
| **武器 W1（已收口）** | 玩家外功 / `attackChain` 只认 `getAttackBox` | **不顺手改**；只对照策略 |
| **Behavior B1–B4（已跟进）** | `behaviors` 远程/设计台/种子 | **不顺手改** steps / kind；本线只吃 `attackKey` 解析 |
| **符咒 T / 功法 F / CombatStyle** | ScriptStep / castAnim / 普攻链 | **不顺手改** |
| **Boss 去壳 / bossMoves** | Gargoyle 解释器、`bossMoves` kind | **勿混主线**；可点名边界债 |

共用但本线可深改敌人侧：

- `meleeAttack.attackKey` → `resolveAttack` → `startAttack`。
- 旁系：`enemy.ts` 格挡反击 `QUICK_BASH`、`behaviorInterp` 射箭挂 `ARROW` 伤害源——**可在分期收口到目录**，不抢 Boss AI。

---

## 1. 现状（文件 + 符号举证）

### 1.1 链路图

| 层 | 数据入口 | 目录 / 类型 | 解释器 / 调用方 | 证据路径 |
| --- | --- | --- | --- | --- |
| **玩家/外功攻击盒（W1 已收）** | `CORE_ATTACK_BOXES` → `ctx.attacks.add` | `AttackBoxDef` = `AttackDef & { id }` | `getAttackBox`；玩家 `castSkill` / 链；敌人 `loadout` 外功 | `coreData.ts`；`menpai/core` `CoreCombatCatalog`；`player.ts`；`loadout.ts` |
| **敌人内置盒（双轨）** | `bodyAttacks.ts` 常量 + `BUILTIN_BODY_ATTACKS` | **7** 名：`axeChop`/`bash`/`charge`/`whip`/`thrust`/`lunge`/`arrow` | `behaviorInterp.resolveAttack`：先目录，**未中回退 BUILTIN**；无 key 按 `body` switch | `bodyAttacks.ts`；`behaviorInterp.ts` |
| **Behavior 挂接** | `CORE_BEHAVIORS` / 内容包 `meleeAttack.attackKey` | 软字符串 | `tickBehaviorSteps` → `resolveAttack` → `e.startAttack` | `coreData.ts`；`qiangying` 等 |
| **敌人外功负载** | `SkillDef.attackKey` | **只** `getAttackBox`（W1，无 BUILTIN） | `loadout.ts` | 与近战步双轨不一致 |
| **设计台** | `coreAttackKeys` datalist（含 thrust/lunge/axeChop/bash/whip） | **无** `attacks` 内容键 / 导出 | `designer-schema.json`；`designer.js` `buildContentExport` | 见 §1.7 |
| **远程 DLC** | `applyContent` / `DlcContentBody` / `REMOTE_DLC_INJECT` | **不灌** `attacks` | 远程只能蹭**已挂进目录**的盒（现仅 PM/BARE 系）+ 运行时 BUILTIN 名 | `src/dlc/types.ts`；`remote.ts` |

### 1.2 内置七盒（`BUILTIN_BODY_ATTACKS`）

定义：`src/entities/enemies/bodyAttacks.ts`。

| id (= name) | 常量 | 典型挂接 |
| --- | --- | --- |
| `axeChop` | `AXE_CHOP` | `CORE_BEHAVIORS.axe` · meleeAttack |
| `bash` | `SHIELD_BASH` | shield melee；`enemy.ts` `QUICK_BASH` 派生于此 |
| `charge` | `SHIELD_CHARGE` | `resolveAttack('charge')`（BehaviorStep `charge`） |
| `whip` | `WHIP` | archer 近身 |
| `thrust` | `SPEAR_THRUST` | spear / qiangying |
| `lunge` | `SPEAR_LUNGE` | spear / comboChain |
| `arrow` | `ARROW` | 表内有；射箭帧**硬挂** `ARROW` 作弹伤害源（非仅 melee key） |

**均未**进入 `CORE_ATTACK_BOXES`（该数组只 `PM`/`BARE`/`PLUNGE_WAVE`/`SUPER_*` map `boxFrom`）——`coreData.ts` L25–31。

### 1.3 `resolveAttack`（双轨核心）

文件：`src/entities/enemies/behaviorInterp.ts`。

```
key 有 → getAttackBox(key) → 有则返回
       → 否则 BUILTIN[key] → 有则返回
       → 否则 warnOnce + null
key 无 → switch(body): spear→THRUST / axe→CHOP / shield→BASH / archer→WHIP / default→CHOP
```

调用点：`meleeAttack` 开火、`comboChain` 续段、`charge` 步 `resolveAttack('charge')`（再兜底 `SHIELD_CHARGE`）。

类型注释仍写「内置名」：`src/meta/bTier/types.ts` `meleeAttack.attackKey`。  
文档：`门派插件.md` 表仍写「优先 ctx.attacks；否则内置名」。

### 1.4 对照 W1（玩家侧已收口）

| 项 | 玩家 / 外功（W1） | 敌人 Behavior 近战（现状） |
| --- | --- | --- |
| 解析 | **只** `getAttackBox` | 目录 **+** `BUILTIN_BODY_ATTACKS` |
| 缺 id | soft-skip「招式未备」 | warn + skip；或无 key 时 body 默认盒 |
| 种子 | `CORE_ATTACK_BOXES` ← PM/BARE | 独立 `bodyAttacks.ts`，**未** `attacks.add` |
| 敌人 `useLoadout` 外功 | 已跟 W1 只认目录 | 与同文件近战步**不一致** |

证据：`loadout.ts` L385–392 注释 `W1: attackKey → ctx.attacks only`；`playerMoves.ts` / `coreData.ts` 头注释；`C档-W1-…完成` 写明**未做**敌人 `bodyAttacks`。

### 1.5 `ctx.attacks`（Service）

| 项 | 符号 / 行为 |
| --- | --- |
| Service | `AttackBoxService`（`services.ts`）：`super(ctx, 'attacks', true)` |
| Schema | `AttackBoxSchema`：`id`·`name`·startup/active/recovery·box·damage…（`schemas.ts`） |
| 查询 | `getAttackBox` / `listAttackBoxes`（`contentRegistry.ts`） |
| 长夜灌入 | `CoreCombatCatalog`：`for (const d of CORE_ATTACK_BOXES) ctx.attacks.add(d)` |
| Smoke | W1：`attacks.add` 新 id + skill `attackKey`；**无**断言内置敌盒在目录 |

### 1.6 其它硬引用（旁系）

| 位置 | 行为 | 证据 |
| --- | --- | --- |
| `enemy.ts` | 盾格挡满 3 次 → `startAttack(QUICK_BASH)`（`SHIELD_BASH` 改 startup） | L23–24 · L246 |
| `behaviorInterp` 射箭 | `new Projectile(..., ARROW)` 硬传伤害盒 | ~L262 |
| `behaviorInterp` charge | `resolveAttack('charge') ?? (shield ? SHIELD_CHARGE : null)` | ~L512 |

### 1.7 设计台

| 项 | 现状 |
| --- | --- |
| datalist `coreAttackKeys` | **含** `thrust`/`lunge`/`axeChop`/`bash`/`whip`；**缺** `charge`/`arrow`；其余多为玩家盒 | `designer-schema.json` ~3596–3639 |
| 行为草稿默认 | `meleeAttack.attackKey: 'thrust'`；combo `thrust,lunge` | `designer.js` |
| 外功预览文案 | 「须在 ctx.attacks」 | 对玩家盒成立；对上述五敌名**现状靠 BUILTIN**，与文案/目录声称不一致 |
| `state.content` / `buildContentExport` | keys：**无** `attacks`（有 combatStyles/weaponLooks/behaviors/…） | `designer.js` `buildContentExport` |
| 攻击盒编辑面板 | **无**独立「攻击盒」页签（只能填既有 id 字符串） | schema/js 无 `attacks` 段导出 |

### 1.8 远程 DLC：`attacks` 相关灌哪些

| 表面 | 现状（**以当前源为准**；Behavior 蓝图 §1.8 写 behaviors 未灌已过时——B1 后已有） |
| --- | --- |
| `DlcContentBody` | **无** `attacks?`（有 `behaviors`/`silhouettes`/`colliders`/`combatStyles`…） | `types.ts` |
| `REMOTE_DLC_INJECT` | **无** `'attacks'` | `remote.ts` L14–26 |
| `applyContent` | **不** `add('attacks', …)` | `remote.ts` L31–60 |
| 馆种子 | 各包 `content.json` **无** `attacks` 数组（rg 空） | `dlc-server/packages/` |

**可用捷径（现状）**：远程 Behavior 写 `attackKey: 'thrust'` 等 → 运行靠 **BUILTIN** 回退仍能打；写**自建**盒 id → 远程既灌不进 `attacks`，目录也无货 → soft-skip。Cordis 源插件可 `ctx.attacks.add`。

### 1.9 内容包示范

| 包 | 用法 | 与目录关系 |
| --- | --- | --- |
| **长夜 CORE_BEHAVIORS** | axeChop/bash/whip/thrust/lunge | **仅**经 BUILTIN（目录无这些 id） |
| **qiangying** Cordis | `attackKey: 'thrust'|'lunge'`；combo 同 | 同上 |
| **内容包自造近战盒** | 须 Cordis `attacks.add` + attackKey 指向新 id | 远程 JSON **不能**灌盒 |
| **敌人 useLoadout 外功** | attackKey 必须已在目录（玩家系或自 `attacks.add`） | 与 Behavior 近战双轨分裂 |

---

## 2. 硬编码 / 缺口债（每条有证据）

| # | 债 | 证据 | 影响 |
| --- | --- | --- | --- |
| 1 | **`CORE_ATTACK_BOXES` 未含七内置敌盒** | `coreData.ts` 只 map PM/BARE/特招；`bodyAttacks.ts` 独立 | 目录与 Behavior 种子 id 脱节；W1「只认目录」未覆盖敌人近战 |
| 2 | **`resolveAttack` BUILTIN 双轨回退** | `behaviorInterp.ts` L84–98；`const BUILTIN = BUILTIN_BODY_ATTACKS` | 内容包/设计台可「看起来」用敌名，实际不经 Schema 登记；与 `loadout`/玩家路径不一致 |
| 3 | **无 key 时按 body 硬 switch 默认盒** | 同函数 `switch (body)` | 隐藏耦合身形枚举；迁目录后仍应改为「显式默认 id → getAttackBox」或要求必填 attackKey |
| 4 | **远程不灌 `attacks`** | `DlcContentBody` 无字段；`REMOTE_DLC_INJECT` / `applyContent` 无 add | 自建盒远程静默丢；只能靠 BUILTIN 名或长夜已挂玩家盒 |
| 5 | **设计台不导出 / 不编 `attacks`** | `buildContentExport` keys 无 attacks；无面板 | 作者无法在设计台造盒再挂 behavior；只能手填「据说在目录」的 id |
| 6 | **`coreAttackKeys` 谎含未入目录的敌名** | schema 含 thrust…whip；`CORE_ATTACK_BOXES` 无之；靠 BUILTIN | 预览写「须在 ctx.attacks」与运行真相不符；A1 后若未改 datalist 反而会「假提示变真」——须同步 |
| 7 | **`enemy.ts` `QUICK_BASH` 旁路** | 直接 `SHIELD_BASH` 派生，不经目录 | 格挡反击与 Behavior 解析分叉；迁目录后易漏 |
| 8 | **射箭伤害源硬挂 `ARROW`** | `behaviorInterp` Projectile 构造 | `arrow` 在 BUILTIN 表却几乎不走 melee 解析；迁目录时应 `getAttackBox('arrow')` |
| 9 | **类型/文档仍承认内置名** | `bTier/types.ts` 注释；`门派插件.md` meleeAttack 行 | 政策双轨写死；收口后须改「只认 ctx.attacks」 |
| 10 | **Boss / 石兽近战不在本表** | Boss 走 `bossMoves` / gargoyle；`CORE_BEHAVIORS.gargoyle` 无 steps | **边界债**——本蓝图不分期去壳 |

---

## 3. 目标态

| 角色 | 做 | 不做 |
| --- | --- | --- |
| **内容包** | `attacks.add` 新盒 + Behavior `attackKey` 指向之；远程 JSON 同构可灌 | 不改 `behaviorInterp` 战斗几何算法；不扩 kind；不挂任意 JS |
| **A 核心** | 七内置名进 `CORE_ATTACK_BOXES`；`resolveAttack` **只** `getAttackBox`；缺 id soft-skip（对齐 W1） | 不按敌人内容 id 开分支；不把 Boss 招塞进 AttackBox 当 AI |
| **C 档** | 本线是**目录收尾**，默认不扩 BehaviorStep / Attack 字段 | 不为「多一记劈斧」开新 kind |
| **设计台** | 导出/可选编辑 `attacks`；datalist 与真实目录+本卷对齐 | 不做自由连招 DSL、不做完整受击预览播放器（可后补） |

目标句：**敌人近战与玩家外功同一套 `ctx.attacks`；内置名即目录 id；解释器无 BUILTIN 回退；设计台/远程可灌自建盒。**

---

## 4. 分期建议（A1–An）

| 期 | 目标 | 改动入口猜测 | 验收一条 | bump | 不做边界 |
| --- | --- | --- | --- | --- | --- |
| **A1 内置迁目录 + 去 BUILTIN 回退（已跟进）** | 七盒 `boxFrom` 进 `CORE_ATTACK_BOXES`（可仍从 `bodyAttacks` 常量导入，单源）；`resolveAttack` 只 `getAttackBox`；无 key 时改为查默认 id（如 axe→`axeChop`）或要求 key；删/停用 `BUILTIN_BODY_ATTACKS` 消费；改 types 注释与 `门派插件.md` 一句；smoke：七 id `getAttackBox` 有货 + 缺 id soft-absent + Behavior 仍能开火 | `coreData.ts`；`behaviorInterp.ts`；`bodyAttacks.ts`（可保留作种子）；`types.ts`；`门派插件.md`；`menpai-smoke.ts` | `getAttackBox('thrust')` 等七名非空；临时卸掉目录项后同 key soft-skip（不再 BUILTIN 救命）；`?` 核心杂兵/axeChop 行为仍开打 | **否** | 不改伤害数值；不扩 kind；不碰 W 玩家链；不灌远程；不部署；Boss 不动 |
| **A2 远程灌 `attacks`** | `DlcContentBody.attacks?`；`REMOTE_DLC_INJECT` 声明（宜**早于** skills/behaviors）；`applyContent` `add('attacks', …)`；文档一句；对照 F1/B1/CombatStyle 注入 | `src/dlc/types.ts` · `remote.ts`；可选 docs | 手写 content：`attacks:[{id,name,…}]` + behavior `attackKey` 指向 → 远程 enable 后 `getAttackBox` 有货且杂兵能出招 | **否** | 不改解释器；不部署；不顺手改 behaviors 注入顺序以外的键 |
| **A3 设计台交付面（已跟进）** | `state.content.attacks` + `buildContentExport` 含 `attacks`（排序靠前）；可选简易攻击盒表单（或先只支持 JSON/字段列表）；`coreAttackKeys` 与长夜真实目录对齐并**含 charge**（及 arrow 若作盒 id）；预览文案与「只认目录」一致 | `designer.js` · `designer-schema.json` | 设计台导出 content 含自建 attacks + behavior 挂之；datalist 不再暗示「未入目录也能当真目录 id」除非已 A1 种子 | **否** | 不做完整受击编辑器；不改战斗 |
| **A4（可选）旁系硬引用收口（已跟进）** | `QUICK_BASH` → `getAttackBox('bash')` 再调 startup；射箭 `getAttackBox('arrow')`；charge 兜底去掉常量；精简 `bodyAttacks` 再导出或标 deprecated；smoke/文档 | `enemy.ts`；`behaviorInterp.ts` | rg 运行路径无 `BUILTIN_BODY_ATTACKS`；格挡反击/放箭仍正常 | **否** | 不重构盾 AI；不抢 Boss |

**A1 优先理由**：对照 W1——先让**消费侧单轨** + **核心种子进目录**，行为不依赖远程/设计台也能验收；A2/A3 是交付面（与 B1/F1 同型）。设计台 datalist 已提前写出敌名，A1 落地后「假提示」可变为真，A3 再补 charge/导出。

每期落地后可另写 `C档-A*-bodyAttacks目录化-完成-2026-….md`。

---

## 5. 不做 / 暂缓

- 任意 JS / Canvas / 外链 URL / 自由 PNG
- **勿混 Boss 去壳**：`bossMoves` / Gargoyle / 给石兽补 BehaviorSteps 当 AI
- **不顺手改**武器 W1–W4 已收口、符咒 T、功法 F、Behavior B 已收口注入/steps
- **不乱扩** BehaviorStep kind / AttackBox 新语义字段（缺字段另开 C 单）
- 本蓝图阶段**不部署**、不 bump
- 暂缓：设计台实时攻击盒预览；把 `arrow` 与 `projectiles` 合并建模；数值重做斧/枪手感

---

## 6. 给内容包（现阶段能 / 不能）

| 已能 | 还不能 |
| --- | --- |
| Cordis：`ctx.attacks.add` 新盒，外功/`useLoadout` `attackKey` 指向（W1） | 指望远程 `content.json` 的 `attacks` 被 `applyContent` 吃上（A2 前） |
| Behavior 写**内置名** `thrust`/`lunge`/`axeChop`/`bash`/`whip`/`charge`（经 **BUILTIN** 回退） | 设计台导出自建攻击盒数组（**A3 已跟进**） |
| 远程 Behavior 挂上述内置名（仍靠运行时 BUILTIN，不经目录） | A1 前把「内置名」当成真正的 `getAttackBox` 命中（目录无货） |
| 设计台 datalist 选 thrust 等写进 steps 并导出 behaviors | 无 Cordis 时自造全新几何盒并远程启用 |
| `?pack=` 源插件同时 `attacks.add` + 自定义 behavior | 登记未知 AttackBox 字段绕过 Schema |

**A1 后预期变化**：内置名变为真正目录 id；**去掉** BUILTIN 后，未进目录的自造名一律 soft-skip（与外功一致）。远程自造盒仍须等 A2。

---

## 7. 解释器 / Schema 入口（落地时对照）

| 职责 | 路径 |
| --- | --- |
| 内置敌盒种子 | `src/entities/enemies/bodyAttacks.ts` |
| 长夜攻击盒目录种子 | `src/meta/bTier/coreData.ts`（`CORE_ATTACK_BOXES`） |
| 灌入 | `src/menpai/core/index.ts`（`CoreCombatCatalog`） |
| Service / Schema | `src/plugins/services.ts`（`AttackBoxService`）；`schemas.ts`（`AttackBoxSchema`） |
| 查询 | `src/meta/contentRegistry.ts`（`getAttackBox`） |
| Behavior 解析 | `src/entities/enemies/behaviorInterp.ts`（`resolveAttack`） |
| 敌人外功（已单轨） | `src/entities/enemies/loadout.ts` |
| 格挡反击旁路 | `src/entities/enemies/enemy.ts`（`QUICK_BASH`） |
| 行为种子 attackKey | `CORE_BEHAVIORS`；`src/content/qiangying` |
| 远程注入 | `src/dlc/types.ts` · `remote.ts`（**待 A2**） |
| 设计台 | `dlc-server/public/assets/designer.js` · `designer-schema.json`（**A3 已跟进**） |
| W1 对照 | `docs-design/C档-W1-招式盒目录化-完成-2026-10-28.md` |
| Smoke | `scripts/menpai-smoke.ts` |

---

## 附：调研摘录（证据句）

- `BUILTIN_BODY_ATTACKS` 七键——`bodyAttacks.ts` L73–81。  
- `resolveAttack`：`getAttackBox` 后 `BUILTIN[key]`——`behaviorInterp.ts` L84–98。  
- `CORE_ATTACK_BOXES` = PM/BARE/plungeWave/super* only——`coreData.ts` L25–31。  
- `CORE_BEHAVIORS` 使用 axeChop/bash/whip/thrust/lunge——`coreData.ts` L103–142。  
- 敌人外功 W1 只认目录——`loadout.ts` L385–392。  
- `DlcContentBody` / `REMOTE_DLC_INJECT` / `applyContent` **无** attacks——`types.ts` · `remote.ts`（复核日：2026-10-28；behaviors 等已灌，attacks 仍缺）。  
- `buildContentExport` keys **无** attacks；`coreAttackKeys` **含** thrust/lunge/axeChop/bash/whip——`designer.js` · `designer-schema.json`。  
- W1 完成记录写明**未做**敌人 `bodyAttacks`——`C档-W1-…完成`。  
- Behavior 蓝图债 #6 点名本债交回攻击盒线——`C档-敌人Behavior蓝图`。  
- 本 A0：**只写文档**，未改代码、未 bump、未部署。
