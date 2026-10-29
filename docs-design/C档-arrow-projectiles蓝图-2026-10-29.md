# C 档蓝图：arrow ↔ projectiles 合并建模（债 #11 余项）

仓库：`requiem-web`（`/workspace/requiem-web`）。  
日期：2026-10-29 Asia/Shanghai。  
本文件为分期蓝图（**ArrowProj0** 调研）；**默认不 bump** 玩家存档。本蓝图阶段**不部署、不改代码**。

可读对照：`docs-design/C档-剩余债清单-2026-10-28.md`（债 **#11**）；`docs-design/C档-债11-BUILTIN删表-完成-2026-10-29.md`（删表半边已收）；`docs-design/C档-A4-bodyAttacks-完成-2026-10-28.md`；`docs-design/C档-远程素材蓝图-2026-10-28.md`（暂缓「合并建模」）；`src/entities/projectile.ts` · `behaviorInterp.ts` · `combat/resolver.ts` · `meta/bTier/{types,coreData}.ts` · `plugins/schemas.ts`。

---

## 建议先开 · 验收一句（推进用）

> **先开 ArrowProj1**：`ProjectileDef` 增可选 soft `attackKey`（缺省视为 `'arrow'`）；`rangedAttack` 放箭用 `getAttackBox(def.attackKey ?? 'arrow')`，不再无条件硬绑 AttackBox `arrow`；空中斩落改认 **`drawKind === 'arrow'`**（或目录缺省同语义），自建 id（如 `moyu_ink_arrow`）亦可斩。`bump=否`。  
> **验收一句**：Cordis 自建 projectile 挂 `attackKey` 指向自建/核心 AttackBox → 弓兵远射可见不同伤害/击退；未挂 `attackKey` 的核心 `arrow` / 墨羽墨箭手感与今日一致；斩落对 `drawKind:arrow` 自建箭生效；`test:menpai`+`build` 绿。

---

## 终点（用户）

内容包用 **一条投射物配方**（飞行 + 绘制 + 软挂伤害盒）就能做出「另一种箭」，作者不必同时改「攻击盒名叫 arrow」和「投射物名叫 arrow」两套同名条目才摸清伤害从哪来。

**不**把 `AttackDef` 整表塞进 `ProjectileDef`；**不**删核心 AttackBox `arrow` / ProjectileDef `arrow`；**不**新建 `ctx.arrows`；**不**扩 `drawKind` 闭集；**不**任意 JS/Canvas。

---

## 边界

| 线 | 管什么 | 本蓝图 |
| --- | --- | --- |
| **A 线 AttackBox `arrow`** | 伤害 / kb / hitstun / parryable（零盒） | **保留**；作缺省伤害源；可被 `attackKey` 指向 |
| **B 线 `ctx.projectiles`** | 飞行盒 / life / drawKind / 爆炸·音效软引用 | **超集入口（作者面）**；增 soft `attackKey` |
| **运行池** | `g.projectiles: Projectile[]` | **已一池**；不拆第二池 |
| **设计台** | attacks 页 vs projectiles 页 | Proj2 起：投射物表单挂 `attackKey` datalist；**不**删 attacks 页的 arrow 盒 |
| **远程素材 R1–R3** | 灌/编/示范 projectiles | **已收**；本线不重做灌管 |
| **Boss 火球** | `Projectile('fireball')` + AttackBox `gFire` | **同型双源**；本线默认可对称读 `attackKey`，**不**改石兽 AI/壳 |
| **债 #11 删表半边** | `BUILTIN_BODY_ATTACKS` 已删 | **勿重开** |
| **volleys** | 弹幕模板另目录 | **勿并入** projectiles |

一句话：**飞行归 projectiles，伤害软挂 attacks；同名 `arrow` 两条目分工写清，不靠「大爆炸合并删一删二」。**

---

## 1. 现状（举证）

### 1.1 双轨已分叉（非两套实体池）

| 面 | AttackBox `arrow` | ProjectileDef `arrow`（及自建） |
| --- | --- | --- |
| Schema | `AttackBoxDef` = `AttackDef` + `id` | `ProjectileDef`：`drawKind`/`hitW`/`hitH`/`life?`/`explode*`/`hitSfx?` |
| 注册表 | `ctx.attacks` · `getAttackBox` | `ctx.projectiles` · `getProjectile` |
| CORE 种子 | `bodyAttacks.ARROW` → `CORE_ATTACK_BOXES`（`boxFrom`） | `CORE_PROJECTILES[0]`：`id:'arrow', drawKind:'arrow', hitW:24, hitH:8, life:240` |
| 同名碰撞 | id / name = **`arrow`** | id = **`arrow`**（**两目录同字符串**） |
| 设计台 | attacks 可编（`coreAttackKeys` 含 arrow） | 玩法目录「投射物」（R2）；`coreProjectileIds` = arrow\|fireball |
| 内容包字段 | 可 `attacks.add` 覆盖/别名 | `projectiles.add`（例 `moyu_ink_arrow`） |

**无** `ctx.arrows` / `Arrow` 独立 Service。债名「arrow↔projectiles」= **AttackBox 名 arrow** ↔ **projectiles 目录**，不是第三套类型。

### 1.2 生成 / 更新 / 碰撞 / 绘制

| 步骤 | 证据 | 现状问题 |
| --- | --- | --- |
| 生成（杂兵） | `behaviorInterp`：`getProjectile(projId)` → `new Projectile(kind, …, arrowAtk)`，**`arrowAtk = getAttackBox('arrow')` 写死** | 自建 `moyu_ink_arrow` 只改飞行盒/寿命；**伤害永远是目录 arrow（10）** |
| 生成（Boss） | `gargoyle` fbCast：`new Projectile('fireball', …, bossBox('gFire'))` | 飞行 id=`fireball`，伤害盒 id=`gFire`——**同型双源、命名更岔** |
| 更新/绘制 | `projectile.ts`：`getProjectile(this.kind)` → drawKind / hitW·H / life / 爆炸 | 缺目录时按 kind 名回退 arrow\|fireball；`ProjKind` 注释已 `@deprecated` 偏好目录 id |
| 碰撞伤害 | `resolver`：`pr.def`（构造时塞入的 AttackDef） | 与 ProjectileDef **字段不重叠**；伤害不在 Def 上 |
| 空中斩落 | `resolver`：`pr.kind !== 'arrow'` 才 skip | **只认 id=`arrow`**；`moyu_ink_arrow`（drawKind arrow）**斩不掉** |
| 音效 | Def 有 `hitSfx`；爆炸用 `explodeSfx` | **命中路径未见消费 `hitSfx`**（远程蓝图已标轻债） |
| 运行池 | `game.projectiles` 单一数组；update/filter/draw 一处 | ✅ 无双池 |

### 1.3 字段重叠（实际很少）

| 概念 | attacks `arrow` | projectiles |
| --- | --- | --- |
| 伤害 / kb / stun / parry | ✅ | ❌ |
| startup/active/box（近战时间轴） | 有但箭为**零盒占位** | ❌（飞行用 hitW/H） |
| drawKind / life / 爆炸 | ❌ | ✅ |
| sfx | 无（放箭 sfx 在 interp 按 kind 猜） | `hitSfx`/`explodeSfx` 软字符串 |

重叠几乎只有「都叫 arrow」的**命名空间认知债**，不是两套平行飞弹系统。

### 1.4 内容 / 文档证据

- 债清单 #11：删表已跟进；**合并建模仍暂缓**（本蓝图收余项）。  
- 债11 完成单 / A4 收口 / `docs/C档原语与设计台` / 远程素材蓝图暂缓池：均点名 **arrow↔projectiles 合并建模**。  
- `moyu`：只登记 projectile，**不**登记自建 AttackBox → 体感只有「箭变大变久」，伤害不变。  
- 设计台双入口：编「攻击盒 arrow」与编「投射物 arrow」是**两页**；作者易以为改其一即改飞行+伤害。

---

## 2. 建模约定（关键决策）

### 2.1 推荐：双目录保留 + soft `attackKey`（底层已一池）

| 方案 | 做法 | 取舍 |
| --- | --- | --- |
| **A. projectiles 软挂 attackKey（推荐）** | `ProjectileDef.attackKey?: string` → `getAttackBox`；缺省 `'arrow'`；Boss 火球可对称缺省 `'gFire'` | 作者面「一条箭配方」；伤害仍走 attacks 白名单；不扩任意数值旁路 |
| B. 把 damage/kb 内联进 ProjectileDef | 复制 AttackDef 子集 | **不取**：与 attacks 双源打架；旁路 Schema |
| C. 删 AttackBox `arrow`，伤害只活在 projectiles | 合并删表 | **不取**：打断 A4/债11 种子与 melee 目录一致性；Boss `gFire` 同构难收 |
| D. 新建 `ctx.arrows` | 第三目录 | **禁止** |
| E. 仅文档说明双轨 | 不接线 | **不够**：moyu 仍改不出伤害；斩落仍漏自建 id |

**结论**：API 上仍是 `ctx.projectiles` + `ctx.attacks`；运行已一池；合并的是**心智与接线**（攻击键软引用），不是物理删并类型。

### 2.2 缺省与回退

| 情况 | 行为 |
| --- | --- |
| Def 无 `attackKey` | 视为 `'arrow'`（火球生成点若接本线：视为 `'gFire'` 或显式传入） |
| `attackKey` 指向缺失盒 | warn once + soft-skip 放箭（对齐 A4 无 arrow 盒） |
| `projectileId` 缺失 | 仍 warn + 回退 kind `arrow`（既有） |
| 斩落 | `getProjectile(pr.kind)?.drawKind === 'arrow'`（无目录且 kind===`arrow` 亦斩） |

### 2.3 白名单（勿扩）

- `ProjDrawKind`：**仍** `arrow | fireball`。  
- 伤害参数：**只**经 `AttackBoxDef`（既有 AttackSchema），不在 ProjectileSchema 开自由 damage 字段。  
- 禁任意 JS / 外链 / 自由 PNG。

### 2.4 bump

默认 **否**（仅目录软字段 + 解释器读法；存档无投射物序列化债）。

---

## 3. 分期（ArrowProj1–3）

| 期 | 目标 | 主要触点 | 验收（用户可感知） | bump | 不做 |
| --- | --- | --- | --- | --- | --- |
| **ArrowProj1（建议先开）** · **已跟进**（2026-10-29） | soft `attackKey` 接线 + 斩落认 drawKind | `types.ts` / `ProjectileSchema`；`behaviorInterp` 放箭；`resolver` 斩落；smoke | 见文首；完成单 `C档-ArrowProj1-完成-2026-10-29.md` | **否** | 不改设计台 UI；不改手感默认值；不部署；不扩 drawKind；不删核心 arrow 两条目 |
| **ArrowProj2** · **已跟进**（2026-10-29；**moyu 示范提前并入**） | 设计台 + 文档 + moyu 挂键 | `designer-schema` / `designer.js`：投射物 `attackKey` datalist；`门派插件.md`；`moyu` 自建 `moyu_ink_shot` + projectile.`attackKey`；完成单 `C档-ArrowProj2-完成-2026-10-29.md` | 设计台可编/导出/导入 `attackKey`；`?pack=moyu` 墨箭伤可辨于核心箭；未挂回退不变 | **否**（玩家存档）；内容包 moyu **1.1.0** | 不做飞行实时预览器；不删 attacks 页；**勿硬塞 Boss 火球** |
| **ArrowProj3** · **已跟进 / 线收口**（2026-10-29） | 轻债收口（火球对称；`hitSfx` 本刀跳过） | Boss `fireball` Def→`attackKey:'gFire'` + `resolveProjectileAttackKey`（勿改石兽 AI）；完成单 `C档-ArrowProj3-完成-2026-10-29.md` | 火球可对称读 Def.`attackKey`；缺省 bit-identical gFire；可辨于箭 | **否** | 不强制热更；不并 volleys；不 Behavior 化 Boss；moyu 示范已在 Proj2；`hitSfx` 可选另刀 |

Boss 火球对称（`fireball` Def → `attackKey:'gFire'`）：**Proj3 已跟进**（完成单 `C档-ArrowProj3-完成-2026-10-29.md`）；**未**改石兽招式权重。moyu 示范已提前并入 Proj2。ArrowProj 线收口；`hitSfx` 仍可选轻债。

设计台：Proj2 再开投射物字段；**不**为 arrow 合并新开「箭专用」页。

---

## 4. 风险与回退

| 风险 | 缓解 |
| --- | --- |
| 改硬绑后核心箭手感漂 | 缺省 `attackKey→arrow`；smoke 断言 damage/kb 与今日 ARROW 种子一致 |
| 自建箭忘挂 attackKey | 缺省仍 arrow；文档/设计台 hint「要改伤害请挂攻击盒」 |
| 斩落误伤火球 | 只认 `drawKind==='arrow'`；fireball 不斩 |
| 与 attacks 同名混淆加剧 | 文档表：飞行 id ≠ 伤害 id；示范用 `moyu_ink_arrow` + `moyu_ink_shot`（盒）错开命名 |
| 把 damage 写进 ProjectileDef | Schema review 拒；验收强制走 getAttackBox |
| Boss 火球半接半不接 | Proj1 若动 Boss，须 gFire 缺省 bit-identical；否则留给 Proj3 |

回退：忽略 `attackKey` 字段、放箭恢复硬 `getAttackBox('arrow')`；斩落恢复 `kind==='arrow'` → 今日行为。

---

## 5. 非目标

- 删除 `CORE` AttackBox `arrow` 或 ProjectileDef `arrow`  
- 新建 `ctx.arrows` / 第二运行池 / 第二 Projectile 类  
- 扩 `drawKind`、内联自由 damage、任意 JS  
- 合并或改造 `volleys`  
- 重开 `BUILTIN_BODY_ATTACKS`  
- perch / 第二绘制器 / Behavior 化 Boss  
- 热更 / SSH / 部署（推进另拍）  
- 玩家存档 bump  

---

## 6. 路径

- 本蓝图：`/workspace/docs-design/C档-arrow-projectiles蓝图-2026-10-29.md`
- 债清单：`/workspace/docs-design/C档-剩余债清单-2026-10-28.md` #11
- 删表完成：`/workspace/docs-design/C档-债11-BUILTIN删表-完成-2026-10-29.md`
- 对照：A4 完成单；远程素材蓝图「暂缓：arrow 与 projectiles 合并建模」；`moyu` R3 完成单
