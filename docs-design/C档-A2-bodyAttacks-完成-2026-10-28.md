# C 档 A2·bodyAttacks：远程灌 attacks — 完成记录

- **日期**：2026-10-28（Asia/Shanghai）
- **蓝图**：`docs-design/C档-bodyAttacks目录化蓝图-2026-10-28.md` §分期 A2
- **对照**：A1 `C档-A1-bodyAttacks-完成-2026-10-28.md`；F1/B1 注入体例
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **部署**：**否**
- **未做**：不改解释器；不碰 Boss；不扩 AttackBox 字段；不改设计台（A3）；不收口 `QUICK_BASH` / 射箭硬挂（A4）；不改馆种子 content.json

## 目标达成

远程 `content.json` 可灌自建 `attacks`；`behavior.attackKey` 指向本卷盒 id 时，`applyContent` 后 `getAttackBox` 有货，杂兵可 `startAttack` 出该盒。

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `src/dlc/types.ts` | `DlcContentBody` 增可选 `attacks?: unknown[]` |
| `src/dlc/remote.ts` | `REMOTE_DLC_INJECT` 加入 `'attacks'`（**早于** skills / behaviors）；`applyContent` 早段 `add('attacks', …)` |
| `scripts/menpai-smoke.ts` | 合成 body：自建 attack + behavior `attackKey` + enemy；断言 INJECT 顺序、`getAttackBox`、resolve、`startAttack` 出招、unload |
| `docs/门派插件.md` | §九 一句：远程灌 `attacks`（宜早于 skills/behaviors） |
| `src/dlc/index.ts` | **未改**（已再导出） |

**未改**：`behaviorInterp` / Schema 字段 / 设计台 / 馆种子 / 存档 / 部署 / Boss。

## INJECT / apply 顺序

### `REMOTE_DLC_INJECT`

```
pills, materials, talismans, stages, acts,
attacks,              // ← A2；早于 skills / behaviors（attackKey）
animRecipes,          // skills 之前
skills, neigong,
combatStyles, weaponLooks,
weapons,
armorSets, wepAffixes, affixes,
silhouettes, behaviors, colliders,
enemies, eliteMods, titles, bossKits, fragments, armorPieces
```

### `applyContent` 关键序（本单相关）

1. `talismans` → `pills`
2. **`attacks`**（`attackKey` / 外功盒依赖）
3. `animRecipes` → `skills` → …
4. `silhouettes` → `behaviors` → `colliders` → `enemies` → …

## 验收

| 项 | 结果 |
| --- | --- |
| 远程 content 含 `attacks` 时 `applyContent` → `ctx.attacks.add` | ✅ smoke：`a2_remote_cleave` 可 `getAttackBox`，damage=17 |
| behavior `attackKey` 指向本卷盒 | ✅ 同包 apply 后挂接 |
| `makeEnemy` 后 step 可 resolve 到该盒 | ✅ `getAttackBox(attackKey)` |
| 出招：`startAttack` 用远程盒 | ✅ `e.atk.def.name === 'a2_remote_cleave'` |
| `REMOTE_DLC_INJECT`：attacks **早于** skills/behaviors | ✅ |
| `npm run test:menpai` | **ALL PASS** |
| `npm run build` | **绿**（`tsc --noEmit && vite build`） |
| bump | **否** |
| 部署 | **否** |

## 建议下一步

- **A3**：设计台导出/编辑 `attacks`；datalist 补 `charge`/`arrow`
- **A4**：`QUICK_BASH` / 射箭 `ARROW` 硬引用收口

## 文档路径

- 本文件：`/workspace/docs-design/C档-A2-bodyAttacks-完成-2026-10-28.md`
- 蓝图：`/workspace/docs-design/C档-bodyAttacks目录化蓝图-2026-10-28.md` §4 A2
