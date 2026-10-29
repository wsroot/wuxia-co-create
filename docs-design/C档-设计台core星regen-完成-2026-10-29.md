# C 档·设计台 core* regen — 完成记录

- **日期**：2026-10-29（Asia/Shanghai）
- **前置**：Oc1–Oc5 本线齐；Oc5 完成单写明设计台 `schema.core*` regen **未开**（本刀拍板落地）
- **蓝图**：`docs-design/C档-官方默认大包-核心去内容蓝图-2026-10-29.md`（中期键名仍可叫 `core*`）
- **仓库路径**：`/workspace/requiem-web`（本地无 git remote）
- **是否 bump 玩家存档**：**否**
- **部署**：**否**（未动 :4173 / :4174；未 SSH；未 upload；未 `dlc:regen`）

## 目标达成

1. 按官方包「长夜」`changye` 出厂 id **重生成/对齐** `dlc-server/public/assets/designer-schema.json` 的 `core*` 快照
2. 补齐 Oc1 缺口：`coreAttackKeys` 含 Boss 八盒（45→**53**）；新增 skill/talisman/script/enemy/stage/weaponLook 等快照
3. 脚本化导出，避免手抄漂移：`scripts/regen-designer-core.ts` + `npm run designer:regen-core`
4. 设计台已挂 datalist 的三处源接上新键；未挂 UI 的记本单
5. `npm run test:menpai` → **ALL PASS**；bump=否；部署=否

## 1. 对齐方式

| 项 | 说明 |
| --- | --- |
| 单源 | `src/content/changye/data.ts` → `./seeds/*`（Oc4 出厂字面量） |
| 脚本 | `scripts/regen-designer-core.ts`：esbuild 打成 ESM 后读 `CORE_*`，写回 `designer-schema.json` 的 `core*` |
| 命令 | `npm run designer:regen-core` |
| 键名 | 仍叫 `core*`（蓝图中期；长期 `official*` 另刀） |
| `coreTalismanAnimRecipeIds` | **故意子集**：符向 6 条（`sealBurst…exorcismPulse`），非全量 `coreAnimRecipeIds`；脚本内常量校验 ⊆ 全量 anim |
| `corePoseTemplates` | 由 `CORE_POSES` 剥 `id`  regener；本刀条数/内容与旧快照一致（21） |
| `coreScriptIds` vs 符 id | 脚本 id 末三为 `skySwords/thunder/waterPulse`（非 `feijianfu/leifu/shuilongfu`）——与 `CORE_SCRIPTS` 一致，**非**笔误 |

## 2. `core*` 条数前后

| 键 | 前 | 后 | 备注 |
| --- | --- | --- | --- |
| `coreAttackKeys` | **45** | **53** | +Boss 八盒 `claw1,claw2,claw3,gCharge,gDive,gDiveWave,gRoar,gFire` |
| `coreCombatStyleIds` | 2 | 2 | 齐 |
| `coreAnimRecipeIds` | 13 | 13 | 齐 |
| `coreTalismanAnimRecipeIds` | 6 | 6 | 子集；故意非全量 |
| `coreBehaviorIds` / `Silhouette` / `Collider` | 5/5/5 | 5/5/5 | 齐 |
| `coreFxRecipeIds` | 7 | 7 | 齐 |
| `corePoseIds` / `corePoseTemplates` | 21 / 21 | 21 / 21 | 齐 |
| `coreBossMoveIds` / `coreBossKitIds` | 10 / 4 | 10 / 4 | 齐 |
| `coreProjectileIds` / `coreVolleyIds` | 2 / 3 | 2 / 3 | 齐 |
| `coreSheetIds` / `coreSynthIds` / `coreBackdropIds` | 6 / 30 / 4 | 6 / 30 / 4 | 齐 |
| `coreEliteModIds` | 6 | 6 | 齐 |
| `coreFragmentIds` / `coreTitleIds` | 7 / 5 | 7 / 5 | 齐（schema 有；见 §4 未挂 UI） |
| `coreMaterialIds` / `ArmorSet` / `ArmorPiece` / `WepAffix` / `Affix` | 10/7/21/6/7 | 同 | 齐 |
| `corePillIds` / `coreNeigongIds` / `coreWeaponIds` | 14/4/14 | 同 | 齐 |
| **`coreSkillIds`** | ∅ | **19** | 新快照 |
| **`coreTalismanIds`** | ∅ | **12** | 新快照 |
| **`coreScriptIds`** | ∅ | **12** | 新快照；已挂 UI |
| **`coreEnemyIds`** | ∅ | **5** | 新快照；已挂 UI（替硬编码） |
| **`coreStageIds`** | ∅ | **4** | 新快照 |
| **`coreWeaponLookIds`** | ∅ | **8** | 新快照；已挂 UI |

**故意差异（完成单须写明）**

1. `coreTalismanAnimRecipeIds` = 符向子集 6，≠ `coreAnimRecipeIds` 13（设计台符页优先列子集，再并全量 anim）
2. `coreScriptIds` 与 `coreTalismanIds` 不完全同名（末三脚本为飞剑/雷/水龙的 script id）
3. 键名未改 `official*`（蓝图：中期仍 `core*`）

## 3. 是否动 `designer.js`

**是（最小 datalist 源）**，未扩任意 JS / 未改解释器：

| 位点 | 改动 |
| --- | --- |
| `talismanScriptIdOptions` | 并入 `SCHEMA.coreScriptIds` + 本卷 |
| `enemyTypeOptions` | 硬编码五机体 → 读 `SCHEMA.coreEnemyIds`（fallback 仍五机体） |
| `lookId` enum（`renderFieldInput` / weapons defFields / 草稿 fallback） | 并入 `SCHEMA.coreWeaponLookIds` |
| 兵器摘要文案 | 命中 core look →「（长夜核心）」 |

schema 旁注：`weapons.lookId` / `talismans.scriptId` hint 点名可引用长夜 core*。

## 4. 未挂 UI（schema 有快照、设计台无对应 soft-ref datalist）

下列键**已写入** `designer-schema.json`，但本刀**未**新开 datalist / 下拉源（完成单记「未挂 UI」；需要时另刀）：

- `coreSkillIds`
- `coreTalismanIds`
- `coreStageIds`
- （既有）`coreFragmentIds` / `coreTitleIds` / `corePillIds` / `coreNeigongIds` / `coreArmorPieceIds` / `coreWepAffixIds` — 本就几乎只被 smoke 条数钉，无 `*IdOptions` 合并

已挂 UI 的新键：`coreEnemyIds` · `coreScriptIds` · `coreWeaponLookIds`（及原有大量 `core*`）。

## 5. 改动文件

| 路径 | 作用 |
| --- | --- |
| `dlc-server/public/assets/designer-schema.json` | `core*` 对齐 / 新增 |
| `dlc-server/public/assets/designer.js` | 三处 datalist 源 + 摘要文案 |
| `scripts/regen-designer-core.ts` | **新建** regen 脚本 |
| `package.json` | 增 `designer:regen-core` |

**未改**：`src/**` 玩法/解释器、馆种子、:4174 热更、任意战斗 JS。

## 6. 测试

| 项 | 结果 |
| --- | --- |
| `npm run test:menpai` | **ALL PASS**（2026-10-29 Asia/Shanghai） |
| `npm run build` | **未跑**（本刀未改 `src/**`；仅 schema/设计台静态 + regen 脚本） |
| bump | **否** |
| 部署 / :4174 | **否** / **未动** |

## 7. 未开项

1. 长期键名 `core*` → `official*`（蓝图另刀）
2. §4 未挂 UI 的 soft-ref datalist（skill/talisman/stage/…）
3. 石兽状态机 / 扩 `drawKind` / #12 perch（另债，本线不迁）
4. 馆 `changye` 完整 content 镜像 + `dlc:regen` 上架（勿与 always-on 双载混淆）
5. 本机/主机 :4174 热更设计台静态（须另拍板上架）

## 8. 一句验收摘要（给 @项目推进）

> 设计台 `core*` 已按长夜 `changye` seeds 脚本 regen：`coreAttackKeys` 45→53（含 Boss 八盒）；新增 skill/talisman/script/enemy/stage/weaponLook 快照；enemy/script/look 三处 datalist 已接；其余玩法 id 未挂 UI 已记单；`test:menpai` 全绿；未 bump、未部署。`bump=否`。

## 文档路径

- 本文件：`/workspace/docs-design/C档-设计台core星regen-完成-2026-10-29.md`
- Oc5（记未开）：`/workspace/docs-design/C档-Oc5-官方默认大包收尾-完成-2026-10-29.md`
- Oc1（缺口来源）：`/workspace/docs-design/C档-Oc1-官方默认大包盘点-完成-2026-10-29.md`
- 蓝图：`/workspace/docs-design/C档-官方默认大包-核心去内容蓝图-2026-10-29.md`
