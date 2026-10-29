# C 档 F1：设计台外功 castAnim — 完成记录（设计台半边）

- **日期**：2026-10-28（Asia/Shanghai）
- **范围**：设计台外功表单为 `castAnim` 补 presets / datalist（长夜核心 13 配方 + 本卷 `animRecipes` id）；人话预览展示挂接；schema / fallback 同步。远程 inject `animRecipes` **不在本单**（另派）。
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **未做**：不扩 AnimStep kind；不改解释器 / 战斗 TS；不做完整 castFx 编辑（F2）；不 SSH / 不部署；不 bump

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `dlc-server/public/assets/designer-schema.json` | `skills.defFields.castAnim`：hint · presets · `datalist: animRecipeIds`；新增闭集 `coreAnimRecipeIds`（13） |
| `dlc-server/public/assets/designer.js` | `animRecipeIdOptions()`；`attachDatalist` 认 `animRecipeIds`；外功人话预览显示 castAnim；schema/fallback 字段同步；首访示范外功挂 `slashInk` |
| `dlc-server/public/designer.html` | 玩法目录 hint 点名 castAnim |
| 本文档 | 收口 |

**未改核心**：`animScripts.ts` / `schemas.ts` / `services.ts` / 远程 `applyContent`（inject 半边另做）。

## 体例（对齐 combatStyleId / attackKey）

- datalist = `coreAnimRecipeIds` ∪ 本卷 `content.animRecipes[].id`
- presets：常用样子芯片（墨斩 / 跃斩 / 突进刺 …）
- 导出：`buildContentExport` 键序已含 `animRecipes` **在** `skills` **前**，本单确认后不动

## 验收

- [x] 外功能点选 `hopSlash` 等（datalist / presets）
- [x] 导出 `skills[].castAnim` 仍为字符串字段
- [x] 人话预览显示 castAnim（本卷 / 长夜核心 / 待登记）
- [x] `npm run test:menpai` + `npm run build` 绿
- bump=**否**；静态文件落盘于 `dlc-server/public`（馆服直接读）

## 取舍

只补设计台挂接面，让作者点到官方/本卷样子；远程灌配方与 castFx 编辑器留给 F1 inject / F2。
