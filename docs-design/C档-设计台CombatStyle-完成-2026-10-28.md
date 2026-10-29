# C 档：设计台可编 CombatStyle — 完成记录

- **日期**：2026-10-28（Asia/Shanghai）
- **范围**：设计台玩法目录可新建/编辑 `combatStyles`，兵器表单可选挂 `combatStyleId`；导出 content 含 `combatStyles`（顺序 styles → looks → weapons，与远程 applyContent 一致）
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **未做**：不 SSH / 不部署；不扩任意 JS/Canvas/外链；不 bump；不发明 Schema 外字段

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `dlc-server/public/assets/designer-schema.json` | `combatStyles.defFields`（闭集对齐 `CombatStyleSchema`）；`coreCombatStyleIds`；兵器 `combatStyleId` |
| `dlc-server/public/assets/designer.js` | 玩法目录可编 Style；兵器 datalist；导出顺序；首访/向导种子挂链 |
| `dlc-server/public/designer.html` | 玩法目录选项「普攻链 Style」+ hint |
| 本文档 | 一句收口 |

**未改核心**：`schemas.ts` / `services.ts` / bingren 源（字段名已对齐）。

## 字段白名单（勿发明）

`id` · `groundKeys` · `branches.{dash,groundUp,groundDown,airDown,airUp,airNeutral,finisherPoise?,finisherDrain?,throw}` · `noChainOpen` · `plungeWaveKey?`

兵器：`combatStyleId?`（datalist = 核心 `blade`/`bare` + 本卷 `combatStyles.id`）。

## 验收

- 设计台能新建/编辑一条 Style 并挂到兵器
- 导出 JSON 含 `combatStyles`
- `npm run test:menpai` + `npm run build` 绿
- bump=**否**；静态文件落盘于 `dlc-server/public`（馆服直接读，无需拷 dist）
