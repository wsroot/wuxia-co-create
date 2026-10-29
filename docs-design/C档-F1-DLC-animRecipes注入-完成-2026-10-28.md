# C 档 F1·DLC 半边：远程注入 `animRecipes` — 完成记录

- **日期**：2026-10-28（Asia/Shanghai）
- **范围**：远程 `content.json` → `applyContent` 能 `ctx.animRecipes.add`（须在 `skills` 之前）
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **未做**：不部署；不扩 AnimStep kind；不改解释器；不碰符咒专线；不改设计台（F1 另半边）

## 背景

设计台可导出 `animRecipes`，Cordis 源可 `ctx.animRecipes.add`，但 `DlcContentBody` / `REMOTE_DLC_INJECT` / `applyContent` 此前不灌该键——馆包自定义「招式样子」远程启用后等于没登记。蓝图 F1 要求先打通远程注入，且 **animRecipes 必须在 skills 之前**（`skill.castAnim` 字符串才能解析到刚 add 的配方）。

对照：`C档-DLC注入CombatStyle-完成-2026-10-28.md`（combatStyles / weaponLooks 同型）。

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `src/dlc/types.ts` | `DlcContentBody` 增可选 `animRecipes?: unknown[]` |
| `src/dlc/remote.ts` | `REMOTE_DLC_INJECT` 加入 `'animRecipes'`（**skills 之前**）；`applyContent` 在 `skills` 前 `add('animRecipes', …)` |
| `scripts/menpai-smoke.ts` | 合成 body：animRecipe + skill.`castAnim` 指向该 id；断言 INJECT 顺序 + apply + unload |
| `src/dlc/index.ts` | **未改**（已再导出 `applyContent` / `REMOTE_DLC_INJECT` / `DlcContentBody`） |

**未改**：解释器 / AnimStep 白名单 / 设计台 / 种子 content.json / 存档 / 部署。

## INJECT / apply 顺序

### `REMOTE_DLC_INJECT`

```
pills, materials, talismans, stages, acts,
animRecipes,          // ← 新增；位于 skills 之前
skills, neigong,
combatStyles, weaponLooks,
weapons,
armorSets, wepAffixes, affixes,
enemies, eliteMods, titles, bossKits, fragments, armorPieces
```

### `applyContent` 关键序

1. `talismanScripts` → `talismans` → `pills`
2. **`animRecipes`**（`SkillDef.castAnim` 字符串依赖）
3. **`skills`**
4. `neigong` → `combatStyles` → `weaponLooks` → `weapons` → …
（其余与既有一致）

## 验收

| 项 | 结果 |
| --- | --- |
| 远程 content 含 `animRecipes` 时 `applyContent` → `ctx.animRecipes.add` | ✅ smoke：`remote_rain_thrust` 可 `getAnimRecipe` |
| skill.`castAnim` 指向本卷配方 id | ✅ 同包 apply 后可解析 |
| `menpai-smoke` 覆盖 remote + animRecipes | ✅（仿 combatStyles；合成 body） |
| `npm run test:menpai` | **ALL PASS** |
| `npm run build` | **绿**（`tsc --noEmit && vite build`） |
| bump | **否** |
| 部署 | **否** |

## 是否建议进 F2

**建议**：是。F1 远程半边已通；设计台半边（castAnim presets/datalist / 人话预览）若另单已收口或并行完成，可按蓝图进 **F2**（设计台轻量 `castFx` + bingren 等种子与 Cordis 源对齐 `castFx`/`castAnim`）。本单不部署、不 bump。

## 已知限制

- 馆种子 `content.json` 仍无一含 `animRecipes`（示范包属 F3）；本单只打通注入管。
- string `castAnim` 登记仍不校验配方存在性（既有 soft-resolve；本单未改）。
- 远程仍未覆盖全部 B 档（poses / fxRecipes 等）；按需另扩。

## 文档路径

- 本文件：`/workspace/docs-design/C档-F1-DLC-animRecipes注入-完成-2026-10-28.md`
- 蓝图：`/workspace/docs-design/C档-功法castAnim特效蓝图-2026-10-28.md`
