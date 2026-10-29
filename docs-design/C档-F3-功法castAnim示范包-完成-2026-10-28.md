# C 档 F3：功法 castAnim 示范包「只登记」— 完成记录

日期：2026-10-28 Asia/Shanghai。  
蓝图：`C档-功法castAnim特效蓝图-2026-10-28.md` F3。  
**bump=否**；**不部署**；零核心 diff。

## 做法

扩既有内容包 `bingren`（残锋）：`animRecipes.add` 一条自制配方，外功 `bingren_canmang` 的 `castAnim` 从官方 `slashInk` 改为本包 id；保留既有 `attackKey: daomang` 与轻量 `castFx`。

| id | 说明 |
| --- | --- |
| 包 | `bingren` |
| 配方 | `bingren_canmang_anim`（label「残锋斩芒」） |
| 外功 | `bingren_canmang` → `castAnim: 'bingren_canmang_anim'` |

配方 steps（白名单）：`playPose` · `crescentSlash` · `swordQiFlash` · `weaponTrail` · `afterimage` · `sparkBurst` · `sfx`；冷芒色 `#7090c0` 对齐残锋。

## 改动文件

| 路径 | 改动 |
| --- | --- |
| `src/content/bingren/index.ts` | inject `animRecipes`；`add` 配方；`castAnim` 改自制 id |
| `src/content/index.ts` | OPTIONAL_PACKS 残锋 lore 一句 |
| `dlc-server/packages/bingren/content.json` | 增 `animRecipes`（键序在 skills 前）；skill.`castAnim` 对齐 |
| `dlc-server/packages/bingren/pack.json` | description 点名自制招式样子 |
| `scripts/menpai-smoke.ts` | Cordis 登记/解析/unload + 远程种子 apply/unload 断言 |

未改：`src/meta/animScripts.ts`、`remote.ts`（F1 已灌）、核心 skills、解释器。

## 验收

- `npm run test:menpai` ALL PASS（含 `bingren animRecipe registered` / unload / remote castAnim resolves）
- `npm run build` 绿
- content.json md5：`3d551c32e0d203b1e5fa81dab7ee9270`

## 建议

可入藏试播（`POST /api/upload`），等推进派主机；本单不自部署、不 bump。本地调试：`?pack=bingren`。
