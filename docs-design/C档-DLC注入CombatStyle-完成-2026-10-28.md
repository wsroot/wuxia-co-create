# C 档：远程 DLC 注入 CombatStyle / weaponLooks — 完成记录

- **日期**：2026-10-28（Asia/Shanghai）
- **范围**：远程 `content.json` → `applyContent` 能注入 `combatStyles` + `weaponLooks`（以 bingren 种子为准）
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **未做**：不部署；不扩任意 JS；不碰 Boss；不补 `attacks`（bingren 种子未用）

## 背景

Cordis 源包 `src/content/bingren` 与种子 `dlc-server/packages/bingren/content.json` 已挂 Style + 外观 + 兵器 + 外功，但 `src/dlc/remote.ts` 的 `INJECT`/`applyContent` 与 `DlcContentBody` 只认旧玩法列表，远程路径无法注入 B 档 Style/外观。

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `src/dlc/types.ts` | `DlcContentBody` 增可选 `combatStyles?` / `weaponLooks?` |
| `src/dlc/remote.ts` | `REMOTE_DLC_INJECT`（原 `INJECT`）加入两服务；`applyContent` 导出并 `add`；**顺序固定** |
| `src/dlc/index.ts` | 再导出 `applyContent`、`REMOTE_DLC_INJECT` |
| `scripts/menpai-smoke.ts` | 用 bingren 种子 JSON 走 `applyContent` 的 remote smoke |

**未改**：`src/content/bingren`、种子 content.json、Boss、存档 schema、部署脚本。

## INJECT / apply 顺序与新增字段

### 新增字段（`DlcContentBody`）

- `combatStyles?: unknown[]`
- `weaponLooks?: unknown[]`

### `REMOTE_DLC_INJECT`（服务依赖）

```
pills, materials, talismans, stages, acts,
skills, neigong,
combatStyles, weaponLooks,   // ← 新增；位于 weapons 之前
weapons,
armorSets, wepAffixes, affixes,
enemies, eliteMods, titles, bossKits, fragments, armorPieces
```

### `applyContent` 登记顺序（关键）

1. `talismanScripts` → `talismans` → `pills` → `skills` → `neigong`
2. **`combatStyles`**（`WeaponDef.combatStyleId` 依赖）
3. **`weaponLooks`**（`WeaponDef.lookId` 依赖；**必须在 weapons 之前**）
4. **`weapons`**
5. `materials` → `armorSets` → `armorPieces` → `wepAffixes` → `affixes` → `enemies` → `eliteMods` → `titles` → `bossKits` → `fragments` → `stages`

## 相对 bingren 种子是否还缺字段

种子键：`combatStyles` · `weaponLooks` · `weapons` · `skills`。

| 键 | 远程能否注入 |
| --- | --- |
| combatStyles | ✅ 本单补上 |
| weaponLooks | ✅ 本单补上 |
| weapons | ✅ 既有 |
| skills | ✅ 既有 |
| attacks | 种子**无**此键；技能 `attackKey:'daomang'` 挂长夜既有盒 → **不补** |

**结论**：相对当前 bingren 种子，远程路径**不再缺字段**。

## 验收

| 项 | 结果 |
| --- | --- |
| `npm run test:menpai` | **ALL PASS**（含 remote applyContent smoke：Style / look / lookId / combatStyleId / skill） |
| `npm run build` | （本单跑一遍；见回报） |
| 远程 `?pack=` / 馆 enable → content.json | 经 `loadRemoteDlc` → `applyContent` 可注入 Style+外观（本地 Cordis `?pack=bingren` 仍走源插件，路径不同） |
| bump | **否** |
| 部署 | **否**（建议：合入后择机部署 DLC/客户端使馆页远程包受益；本单不部署） |

## 验收说明（远程路径）

1. 馆侧已有 `packages/bingren/content.json`（含 Style+外观）。
2. 客户端拉 content 后 `applyContent` 会按上表顺序 `add`。
3. Smoke：读种子 JSON → fork + `applyContent` → 断言 `bingren_canfeng_chain` / `lookBingrenCanfeng` / 兵器软引用可解析 → dispose 干净。

本地调试 Cordis 源仍用 `?pack=bingren`；验证**远程 JSON 链**用馆 enable / `loadRemoteDlc('bingren','pack')`（无内建 Cordis 时走远程；有内建时 `enableDlcAsync` 仍优先源插件）。

## 已知限制

- 远程 JSON 仍未覆盖全部 B 档（如 `attacks` / `poses` / `silhouettes` 等）；按种子按需扩展。
- `acts` 仍在 inject 列表、不在 body/`add`（既有行为，本单未动）。

## 文档路径

- 本文件：`/workspace/docs-design/C档-DLC注入CombatStyle-完成-2026-10-28.md`
