# C 档 Act1.5·ActPool.kit lit→开放 string — 完成记录

- **日期**：2026-10-29（Asia/Shanghai）
- **范围**：`ActPoolSchema.kit` / `ActPool.kit` / `DlcContentBody.acts.pools[].kit` 与 Stage/Enemy 对齐为 **开放 string**（软引用 `bossKits`）；smoke 自建 kit id 经幕池回退进 `resolveBossKit`；docs 一句；蓝图 Act1.5 标已跟进
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **未做**：不部署；不改 close/far 表；不重开 G；不做 Act2 设计台；不开 perch/takeoff；不改导演算法（类型被迫外）；核心四 lit 行为保持可用

## 背景

Act1 打通远程灌幕池后，`ActPool.kit` 仍 Schema lit 四元（`stone|rain|tomb|night`），与已开放的 `Stage.boss.kit` / `EnemyDef.kitId` 不一致——自建 `bossKits` 只能挂关卡/敌人，不能作整幕默认回退。蓝图债 #4 / 否决项「勿绑死 Act1」→ 本小单。

对照：蓝图 `C档-acts幕池蓝图-2026-10-29.md` §分期 Act1.5 / §否决项；Act1 完成单 `C档-Act1-acts幕池-完成-2026-10-29.md`。

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `src/plugins/schemas.ts` | `ActPoolSchema.kit`：`lit(BOSS_KITS)` → `Schema.string().required()`；原四元改 `_CORE_BOSS_KITS` 参考 void |
| `src/level/actPools.ts` | `ActPool.kit: string`（软引用注释）；保留 `BossKit` 类型别名描述核心四默认 |
| `src/dlc/types.ts` | `acts.pools[].kit: string` |
| `scripts/menpai-smoke.ts` | Act1.5：Cordis `pool.kit=自建 id` + 远程 body 同构 → `actPool(0).kit` / `resolveBossKit({ poolKit })` 吃到；核心 stone/rain 仍绿；unload 回退 |
| `docs/门派插件.md` | `ctx.acts` / Boss 招式行 + §九 Act1 句补 Act1.5 开放 string 软引用 |
| 蓝图 `C档-acts幕池蓝图-2026-10-29.md` | Act1.5 行 / §建议先开 / Schema·交叉表·债#4·风险·§6·§7·§8 标**已跟进** |

**未改**：导演 `resolveBossKit` / `enterBoss` 算法；`CORE_ACT_POOLS` 四幕默认值；close/far 表；设计台；馆种子；存档；部署。

## 验收

| 项 | 结果 |
| --- | --- |
| Schema 接受自建 kit id（非 lit 拒收） | ✅ Cordis `ctx.acts.pool(0, { kit: 'act15_custom_kit', … })` |
| `actPool(0).kit` === 自建 id | ✅ |
| `resolveBossKit({ poolKit: actPool(0).kit })` === 自建 id | ✅ |
| 远程 `body.acts.pools[].kit` 同构可灌 | ✅ |
| 核心四（stone/rain/…）仍可用 | ✅ |
| unload 回退核心 pool.kit | ✅ |
| `npm run test:menpai` | **ALL PASS** |
| `npm run build` | **绿**（`tsc --noEmit && vite build`） |
| bump | **否** |
| 部署 | **否** |

## 是否建议下一刀

**建议**：**Act2 设计台幕池段 + 导出**（schema/state/表单按幕序编七字段 ± 幕间 beat；`buildContentExport` 同构 `content.acts`；kit datalist=核心+本卷 bossKits；与 stages 页分栏）。本单不部署、不 bump。

## 已知限制

- 软引用：目录缺 kit id 时运行期走既有 bossKits 缺失路径（不硬拒登记）。
- 设计台仍无幕池段（Act2）；馆无「只改幕池」示范包（Act3）。
- `tint` 仍 lit 四色（本单不扩）。

## 文档路径

- 完成单：`docs-design/C档-Act1.5-acts幕池-完成-2026-10-29.md`
- 蓝图：`docs-design/C档-acts幕池蓝图-2026-10-29.md`
- Act1：`docs-design/C档-Act1-acts幕池-完成-2026-10-29.md`
