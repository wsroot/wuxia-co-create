# C 档·ArrowProj2：设计台 `attackKey` + moyu 示范挂键 — 完成记录

- **日期**：2026-10-29（Asia/Shanghai）
- **蓝图**：`docs-design/C档-arrow-projectiles蓝图-2026-10-29.md` §分期 ArrowProj2
- **债**：`docs-design/C档-剩余债清单-2026-10-28.md` #11 余项
- **对照**：`docs-design/C档-ArrowProj1-完成-2026-10-29.md`
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **内容包 version**：`moyu` **1.0.0 → 1.1.0**（馆 pack.json；玩家存档 bump=否）
- **部署**：**否**
- **未做**：Boss 火球对称 `attackKey:'gFire'`（**仍待 Proj3**）；不扩 drawKind；不删双目录；不新建 `ctx.arrows`；不改石兽 AI；不消费 `hitSfx`

## 目标达成

设计台投射物表单接可选 `attackKey`（datalist=核心+本卷 attacks）；导出/导入不丢。`moyu` 示范提前并入：自建 AttackBox `moyu_ink_shot`（dmg16/kbX6）+ projectile `moyu_ink_arrow.attackKey` 指向它，远射伤害可辨于核心箭（10/3）。未挂键回退不变。

**完成单注明**：moyu 示范已提前并入 Proj2；火球仍待 Proj3。

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `dlc-server/public/assets/designer-schema.json` | `projectiles.defFields` 增 `attackKey`（datalist=`coreAttackKeys`）；note/顶注提示「改伤害请挂攻击盒」 |
| `dlc-server/public/assets/designer.js` | 投射物表单读 schema + fallback 字段；datalist 增强；预览/列表显示 attackKey；hint「改伤害请挂攻击盒」 |
| `src/content/moyu/index.ts` | inject `attacks`；`moyu_ink_shot` AttackBox；`moyu_ink_arrow.attackKey` |
| `dlc-server/packages/moyu/{pack,content}.json` | 同构；version **1.1.0**；`attacks` 键序靠前 |
| `src/content/index.ts` | moyu lore 一句 |
| `docs/门派插件.md` | `ctx.projectiles` 行 + apply 段：改伤害请挂攻击盒；moyu 挂键说明 |
| `scripts/menpai-smoke.ts` | ArrowProj2 设计台字段/导出形状；moyu Cordis+remote attackKey 可辨 |
| `docs-design/C档-剩余债清单-2026-10-28.md` | #11 旁注 Proj2 已跟进 |
| `docs-design/C档-arrow-projectiles蓝图-2026-10-29.md` | 分期行 Proj2 已跟进；Proj3 收窄为火球/`hitSfx` |

**未改**：核心 `CORE_PROJECTILES` / AttackBox `arrow`；gargoyle 火球仍显式 `bossBox('gFire')`；石兽 AI；drawKind 闭集。

## 验收

| 项 | 结果 |
| --- | --- |
| 设计台可编 `attackKey`（datalist 核心+本卷） | ✅ schema + designer.js |
| 导出/导入形状 `applyContent` 保留 `attackKey` 且可解析 | ✅ smoke |
| `?pack=moyu`：`moyu_ink_arrow.attackKey==='moyu_ink_shot'`；dmg/kb ≠ 核心 arrow | ✅ smoke（Cordis + remote seed） |
| 未挂 `attackKey` 回退 `'arrow'`（Proj1 仍绿） | ✅ |
| `npm run test:menpai` | **ALL PASS** |
| `npm run build` | **绿**（`tsc --noEmit && vite build`） |
| 玩家存档 bump | **否** |
| 部署 | **否** |

## 已知限制

- **ArrowProj3**：Boss 火球尚未接 Def.`attackKey`；`hitSfx` 命中路径仍未消费。
- 设计台不做飞行实时预览器；不删 attacks 页的 arrow 盒。
- 墨羽弓手仍需调试召唤 / 另包挂浪才进战役（R3 已知）。

## 建议下一步

开 **ArrowProj3**（火球对称 `attackKey:'gFire'`；可选 `hitSfx`；**勿**改石兽招式权重）。

## 路径

- 本文件：`/workspace/docs-design/C档-ArrowProj2-完成-2026-10-29.md`
- 蓝图：`/workspace/docs-design/C档-arrow-projectiles蓝图-2026-10-29.md`
- 债清单：`/workspace/docs-design/C档-剩余债清单-2026-10-28.md` #11
