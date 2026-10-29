# C 档：CombatStyle / 普攻链 Style 进内容包目录 — 完成记录

- **日期**：2026-10-28（Asia/Shanghai）
- **范围**：`AttackChainStyle` 进 `ctx.combatStyles`；核心 blade/bare 迁目录种子；`WeaponDef.combatStyleId` + 解析优先级；选招经 `resolveCombatStyle`（不写死仅两套常量对象身份）
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **未做**：不改 designer 字段（可后补）；不替 bingren 挂链；不做自由连招 DSL；不碰 Boss；不部署/不热更；禁任意 JS/Canvas/外链

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `src/combat/playerMoves.ts` | `CombatStyleDef` 别名；`CORE_COMBAT_STYLES`；`categoryDefaultCombatStyleId`；`chainStyleFor` 标 deprecated |
| `src/meta/weapons.ts` | `WeaponDef.combatStyleId?` |
| `src/plugins/schemas.ts` | `CombatStyleSchema`（闭集）；`WeaponSchema.combatStyleId` |
| `src/plugins/services.ts` | `CombatStyleService` → `ctx.combatStyles`（add/get/list；airNeutral 长度 2） |
| `src/meta/contentRegistry.ts` | `getCombatStyle` / `listCombatStyles` / `resolveCombatStyle` |
| `src/menpai/core/index.ts` | `CoreCombatCatalog` 登记 `CORE_COMBAT_STYLES` |
| `src/entities/player.ts` | `activeChainStyle` → `resolveCombatStyle(weapon.def)`；链窗读当前 Style，不再 OR 两套常量 |
| `scripts/menpai-smoke.ts` | EXPECTED `combatStyles: 2`；目录 + 内容包 `styles.add` 示范断言 |
| `docs/门派插件.md` | `ctx.combatStyles` 行 + 完成表 |
| `docs-design/C档-武器全链路蓝图-2026-10-28.md` | §6 / §7 更新 |

## API 形状（给内容包 / bingren 下一拍）

### 登记

```ts
ctx.combatStyles.add({
  id: 'my_chain',                    // 必填，稳定 id
  groundKeys: ['slash1', 'slash2', 'slash3', 'finisher'],  // 必填，≥1；软引用 ctx.attacks id
  branches: {                        // 必填
    dash: 'dashKick',
    groundUp: 'launcher',
    groundDown: 'sweep',
    airDown: 'plunge',
    airUp: 'rising',
    airNeutral: ['airA', 'airB'],    // 必填，长度必须为 2
    finisherPoise?: 'finisherPoise', // 可选
    finisherDrain?: 'finisherDrain', // 可选
    throw: 'throw',
  },
  noChainOpen: ['finisher', 'throw', 'plunge'],  // 必填（可空数组）
  plungeWaveKey?: 'plungeWave',      // 可选
});
```

类型名：`CombatStyleDef`（=`AttackChainStyle`）。Schema 闭集，禁止任意 JS。

### 挂到兵器

```ts
ctx.weapons.add({
  /* …WeaponDef 既有字段… */
  combatStyleId: 'my_chain',  // 可选软引用
});
```

### 解析优先级（`resolveCombatStyle`）

1. `WeaponDef.combatStyleId` → `ctx.combatStyles.get`（**缺 id soft-skip**，不炸）
2. `category === 'bare'` → 默认 id `bare`；否则（blade/spear/heavy）→ `blade`
3. 目录命中；否则回退 CORE 种子常量 `BLADE_CHAIN_STYLE` / `BARE_CHAIN_STYLE`

读法：`getCombatStyle(id)` / `listCombatStyles()` / `resolveCombatStyle(weaponDef)`。

### 最小挂接样例（内容包，勿改核心）

```ts
export const PackExample = {
  name: 'pack-example',
  inject: ['combatStyles', 'weapons', 'attacks'],
  apply(ctx) {
    ctx.combatStyles.add({
      id: 'example_chain',
      groundKeys: ['slash1', 'slash2', 'palm', 'claw'],
      branches: {
        dash: 'dashKick', groundUp: 'launcher', groundDown: 'sweep',
        airDown: 'plunge', airUp: 'rising', airNeutral: ['airA', 'airB'],
        throw: 'throw',
      },
      noChainOpen: ['claw', 'throw'],
      plungeWaveKey: 'plungeWave',
    });
    ctx.weapons.add({
      id: 'example_blade',
      /* …必填 WeaponDef 字段… */
      category: 'blade',
      combatStyleId: 'example_chain',
    });
  },
};
```

换链：只改 Style 数据或 `combatStyleId`；**无需**改 `player.ts` 常量。

## 核心种子如何迁入

- 源数据仍为 `BLADE_CHAIN_STYLE` / `BARE_CHAIN_STYLE`（`playerMoves.ts`）
- `CORE_COMBAT_STYLES = [blade, bare]` → 长夜 `CoreCombatCatalog` → `ctx.combatStyles.add`
- 双源：目录优先；缺则回退种子常量（boot 前 / soft 后仍可解析）

## rg 自证（选招不写死仅两套对象身份）

```
rg 'BLADE_CHAIN_STYLE|BARE_CHAIN_STYLE|chainStyleFor' src/entities/player.ts
# → 无匹配（经 resolveCombatStyle）
```

## 验收

- `npm run test:menpai` — ALL PASS（含 CS 目录 / soft 示范）
- `npm run build` — 绿
- bump=**否**

## 是否建议内容包 / 设计台跟进

| 跟进 | 建议 |
| --- | --- |
| **内容包**（如 bingren） | 可选：挂 `combatStyleId` + 自有 `combatStyles.add`（本单不替改 bingren） |
| **设计台** | 建议后补：`combatStyles` defFields + 兵器表单 `combatStyleId` 下拉 |

## 已知限制

- 设计台尚无 Style 字段（本单明确可不改 designer）
- finisher 精通仍扫固定 skill id 列表（非本单）
- `GROUND_CHAIN`/`BARE_CHAIN` 对象数组仍供 `__wep` debug
- 不做自由连招 DSL；输入路由语义未改
- 远程 JSON 入藏对 B/C 档覆盖仍弱于 Cordis 源插件

## 文档路径

- 本文件：`/workspace/docs-design/C档-CombatStyle目录-完成-2026-10-28.md`
- 蓝图：`/workspace/docs-design/C档-武器全链路蓝图-2026-10-28.md`
