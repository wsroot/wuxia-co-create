# C 档·ArrowProj1：ProjectileDef soft `attackKey` + 斩落认 drawKind — 完成记录

- **日期**：2026-10-29（Asia/Shanghai）
- **蓝图**：`docs-design/C档-arrow-projectiles蓝图-2026-10-29.md` §分期 ArrowProj1 / 文首建议先开
- **债**：`docs-design/C档-剩余债清单-2026-10-28.md` #11 余项（arrow↔projectiles 合并建模）
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **部署**：**否**
- **未做**：设计台 UI（ArrowProj2）；moyu 示范挂自建 AttackBox（ArrowProj3）；Boss 火球对称 `attackKey:'gFire'`；不扩 drawKind；不删核心 arrow 两条目；不新建 `ctx.arrows`；不消费 `hitSfx`

## 目标达成

`ProjectileDef` 增可选 soft `attackKey`（缺省视为 `'arrow'`）；`rangedAttack` 放箭用 `getAttackBox(def.attackKey ?? 'arrow')`；空中斩落改认目录 `drawKind === 'arrow'`（无目录且 `kind==='arrow'` 亦斩）。双目录保留；未挂键核心箭手感 bit-identical。

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `src/meta/bTier/types.ts` | `ProjectileDef.attackKey?: string`（软挂 AttackBox id） |
| `src/plugins/schemas.ts` | `ProjectileSchema.attackKey: Schema.string()`（可选；灌包经既有 `add('projectiles')`） |
| `src/entities/enemies/behaviorInterp.ts` | 放箭帧：`atkKey = projDef?.attackKey ?? 'arrow'` → `getAttackBox(atkKey)`；缺盒 soft-skip + warnOnce |
| `src/combat/resolver.ts` | 斩落：`getProjectile(pr.kind)?.drawKind === 'arrow'`，无目录回退 `pr.kind === 'arrow'` |
| `scripts/menpai-smoke.ts` | ArrowProj1：缺省回退 / 挂键可辨 dmg·kb / 斩落 drawKind / remote 灌包保留字段 |
| `docs-design/C档-剩余债清单-2026-10-28.md` | #11 旁注 ArrowProj1 已跟进 |

**未改**：`CORE_PROJECTILES` 仍不写 `attackKey`（缺省即今日）；`moyu` 包仍不挂键（Proj3）；gargoyle 火球仍显式 `bossBox('gFire')`；设计台 schema/表单。

## 验收

| 项 | 结果 |
| --- | --- |
| Cordis 自建 projectile 挂 `attackKey` → `getAttackBox` 可辨 dmg/kb | ✅ smoke |
| 未挂 `attackKey` → 回退 `'arrow'`，dmg=10 / kbX=3 | ✅ |
| `drawKind:'arrow'` 自建 id 斩落谓词为真；fireball / 无目录非 arrow 为假 | ✅ |
| 双目录 `getAttackBox('arrow')` + `getProjectile('arrow')` 仍在 | ✅ |
| remote `applyContent` 保留 `attackKey` | ✅ |
| `npm run test:menpai` | **ALL PASS** |
| `npm run build` | **绿**（`tsc --noEmit && vite build`） |
| bump | **否** |
| 部署 | **否** |

## 已知限制

- **ArrowProj2**：设计台投射物表单尚无 `attackKey` datalist；作者须 Cordis / 手写 JSON。
- **ArrowProj3**：`moyu` 墨箭仍未挂自建 AttackBox，伤害与核心箭相同直至示范期。
- **Boss 火球**：未接 Def.`attackKey`；仍运行时显式 `gFire`（与今日 bit-identical）。
- **`hitSfx`**：目录字段仍在；命中路径仍未消费（远程蓝图轻债 / Proj3 可选）。

## 建议下一步

开 **ArrowProj2**（设计台 + `门派插件.md` 一句）或 **ArrowProj3**（moyu 自建盒 + `attackKey` 示范；可选火球对称 / `hitSfx`）。

## 路径

- 本文件：`/workspace/docs-design/C档-ArrowProj1-完成-2026-10-29.md`
- 蓝图：`/workspace/docs-design/C档-arrow-projectiles蓝图-2026-10-29.md`
- 债清单：`/workspace/docs-design/C档-剩余债清单-2026-10-28.md` #11
