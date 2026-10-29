# C 档 B1·敌人 Behavior：远程灌 behaviors（+ silhouettes）— 完成记录

- **日期**：2026-10-28（Asia/Shanghai）
- **范围**：远程 `content.json` → `applyContent` 能 `ctx.behaviors.add` / `ctx.silhouettes.add`（须在 `enemies` 之前）
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **未做**：不部署；不扩 BehaviorStep kind；不改解释器；不碰 Boss/武器/符咒；不灌 colliders（B3）；不改设计台；不改馆种子（B2）

## 背景

设计台可导出 `behaviors` / `silhouettes`，Cordis 源可 `ctx.behaviors.add`，但 `DlcContentBody` / `REMOTE_DLC_INJECT` / `applyContent` 此前不灌这两键——馆包自定义「怎么打 / 长相」远程启用后静默丢，敌人只能挂核心 `behaviorId`。蓝图 B1 要求先打通远程注入，且 **behaviors / silhouettes 必须在 enemies 之前**（`EnemyDef.behaviorId` / `silhouetteId` 才能解析到刚 add 的配方）。

对照：`C档-F1-DLC-animRecipes注入-完成-2026-10-28.md`（同型「先打通远程吃上已有目录」）。

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `src/dlc/types.ts` | `DlcContentBody` 增可选 `silhouettes?` / `behaviors?` |
| `src/dlc/remote.ts` | `REMOTE_DLC_INJECT` 加入 `'silhouettes'`、`'behaviors'`（**enemies 之前**）；`applyContent` 在 `enemies` 前 `add` |
| `scripts/menpai-smoke.ts` | 合成 body：behavior + silhouette + enemy.`behaviorId`/`silhouetteId`；断言 INJECT 顺序 + apply + `makeEnemy.behaviorSteps` + unload |
| `docs/门派插件.md` | §九 一句：远程灌 silhouettes/behaviors（enemies 前） |
| `src/dlc/index.ts` | **未改**（已再导出 `applyContent` / `REMOTE_DLC_INJECT` / `DlcContentBody`） |

**未改**：`behaviorInterp` / BehaviorStep 白名单 / 设计台 / 馆种子 content.json / 存档 / 部署 / colliders。

## INJECT / apply 顺序

### `REMOTE_DLC_INJECT`

```
pills, materials, talismans, stages, acts,
animRecipes,          // skills 之前
skills, neigong,
combatStyles, weaponLooks,
weapons,
armorSets, wepAffixes, affixes,
silhouettes, behaviors,  // ← 新增；位于 enemies 之前
enemies, eliteMods, titles, bossKits, fragments, armorPieces
```

### `applyContent` 关键序（本单相关）

1. …（既有 talismans / pills / animRecipes / skills / … / affixes）
2. **`silhouettes`**（`EnemyDef.silhouetteId`）
3. **`behaviors`**（`EnemyDef.behaviorId` → steps）
4. **`enemies`**
5. …（eliteMods / titles / …）

## 验收

| 项 | 结果 |
| --- | --- |
| 远程 content 含 `behaviors` 时 `applyContent` → `ctx.behaviors.add` | ✅ smoke：`remote_rain_spear` 可 `getBehavior` 且 `steps.length ≥ 4` |
| `enemies.behaviorId` 指向本卷 behavior | ✅ 同包 apply 后挂接 |
| `makeEnemy` 后 `behaviorSteps` 非空 | ✅ 含 `keepDistance` |
| 同卷 `silhouettes` + `silhouetteId` | ✅ `getSilhouette` / `makeEnemy.silhouetteId` |
| `REMOTE_DLC_INJECT`：silhouettes/behaviors **在** enemies 前 | ✅ |
| `npm run test:menpai` | **ALL PASS** |
| `npm run build` | **绿**（`tsc --noEmit && vite build`） |
| bump | **否** |
| 部署 | **否** |

## 是否建议进 B2

**建议**：是。B1 远程注入管已通；下一期 **B2** 把 `qiangying` 馆种子补 `behaviors`（至少 `qiangying_mid_spear`）+ 需要的 `silhouettes`，先锋 `behaviorId`/`silhouetteId` 对齐 Cordis 源。colliders 交付面列 **B3**。本单不部署、不 bump。

## 已知限制

- 馆种子 `content.json` 仍无一含自定义 `behaviors`（qiangying 种子对齐属 B2）。
- 远程仍未灌 `colliders`（B3）。
- `BehaviorDef.body` 仍必填五档枚举（蓝图缓项，非本单）。

## 文档路径

- 本文件：`/workspace/docs-design/C档-B1-敌人Behavior-完成-2026-10-28.md`
- 蓝图：`/workspace/docs-design/C档-敌人Behavior蓝图-2026-10-28.md` §4 B1
