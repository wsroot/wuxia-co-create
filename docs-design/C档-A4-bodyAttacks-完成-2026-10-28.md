# C 档 A4·bodyAttacks：旁系硬引用收口 — 完成记录

- **日期**：2026-10-28（Asia/Shanghai）
- **蓝图**：`docs-design/C档-bodyAttacks目录化蓝图-2026-10-28.md` §分期 A4
- **对照**：A1 `C档-A1-bodyAttacks-完成-2026-10-28.md`（BUILTIN 过渡导出；`QUICK_BASH`/`ARROW` 硬挂待本单）
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **部署**：**否**
- **未做**：不重构盾 AI；不抢 Boss；不改攻击数值手感；不扩 AttackBox/BehaviorStep；不部署

## 目标达成

旁系硬引用收口到 `getAttackBox`：格挡反击用目录 `bash`（再调 startup=11）；射箭伤害源用目录 `arrow`；charge 兜底已在 A1 去掉（本单确认）；`BUILTIN_BODY_ATTACKS` 标 `@deprecated`（仅种子/测试镜像）。

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `src/entities/enemies/enemy.ts` | 删 `SHIELD_BASH`/`QUICK_BASH`；格挡满 3 次 → `getAttackBox('bash')` 后 `{ ...bash, startup: 11 }` |
| `src/entities/enemies/behaviorInterp.ts` | 删 `ARROW` import；放箭帧 `getAttackBox('arrow')`，缺则 soft-skip；charge 仍只 `resolveAttack('charge')`（A1 已无常量兜底） |
| `src/entities/enemies/bodyAttacks.ts` | 头注释更新；`BUILTIN_BODY_ATTACKS` 标 `@deprecated`（种子/测试 only） |
| `scripts/menpai-smoke.ts` | A4：catalog bash/arrow + quick-bash override 手感；A1 种子表断言措辞改为 deprecated |
| `docs/门派插件.md` | `ctx.attacks` 行补盾反击/射箭亦走目录 |
| `docs/C档原语与设计台-2026-10-28.md` | A4 一句 |
| `docs-design/C档-bodyAttacks目录化蓝图-2026-10-28.md` | A4 行标「已跟进」 |

## 运行路径 BUILTIN 符号

| 符号 | 位置 | 说明 |
| --- | --- | --- |
| `BUILTIN_BODY_ATTACKS` | `bodyAttacks.ts` 导出 + smoke 种子断言 | **@deprecated**；**无** runtime import/读（`enemy`/`behaviorInterp`/`resolveAttack`/`loadout` 均不消费） |
| 七常量 `AXE_CHOP`… | `bodyAttacks.ts` → `coreData` `boxFrom` | 仍作 CORE 种子单源（非运行解析） |

`rg` 运行路径（`src/entities/enemies/{enemy,behaviorInterp,loadout}.ts` 等消费侧）：**无** `BUILTIN_BODY_ATTACKS` 符号消费；仅注释提及。

## 验收

| 项 | 结果 |
| --- | --- |
| `QUICK_BASH` → `getAttackBox('bash')` + startup 11 | ✅ |
| 射箭 → `getAttackBox('arrow')` | ✅ |
| charge 无 `SHIELD_CHARGE` 常量兜底 | ✅（A1 已去，本单确认） |
| 运行路径无 `BUILTIN_BODY_ATTACKS` 消费 | ✅ |
| 格挡反击/放箭手感（dmg/box）与种子一致 | ✅ smoke |
| `npm run test:menpai` | **ALL PASS** |
| `npm run build` | **绿**（`tsc --noEmit && vite build`） |
| bump | **否** |
| 部署 | **否** |

## 建议下一步

本线 A1–A4 旁系/目录收口已齐。**债 #11 删表已跟进**（2026-10-29：`BUILTIN_BODY_ATTACKS` 整表删除，仅留七常量给 `coreData`；见 `C档-债11-BUILTIN删表-完成-2026-10-29.md`）。剩余：`arrow` 与 `projectiles` 合并建模（蓝图暂缓项）。

## 路径

- 本文件：`/workspace/docs-design/C档-A4-bodyAttacks-完成-2026-10-28.md`
- 蓝图：`/workspace/docs-design/C档-bodyAttacks目录化蓝图-2026-10-28.md` §4 A4
- 对照 A1：`/workspace/docs-design/C档-A1-bodyAttacks-完成-2026-10-28.md`
