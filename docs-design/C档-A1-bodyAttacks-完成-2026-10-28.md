# C 档 A1·bodyAttacks：七内置迁目录 + 去 BUILTIN 回退 — 完成记录

- **日期**：2026-10-28（Asia/Shanghai）
- **蓝图**：`docs-design/C档-bodyAttacks目录化蓝图-2026-10-28.md` §分期 A1
- **对照**：W1（玩家外功只经 `getAttackBox`）；`C档-W1-招式盒目录化-完成-2026-10-28.md`
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **部署**：**否**
- **未做**：不扩 AttackBox 字段/任意 JS；不改玩家 W1 路径语义；不碰 Boss；不灌远程 `attacks`（A2）；不收口 `QUICK_BASH` / 射箭硬挂 `ARROW`（A4）；不改手感数值

## 目标达成

敌人近战七内置名进入 `CORE_ATTACK_BOXES` → `ctx.attacks`；`behaviorInterp.resolveAttack` **只** `getAttackBox`；缺 id soft-skip；运行路径不再读 `BUILTIN_BODY_ATTACKS`。

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `src/meta/bTier/coreData.ts` | 自 `bodyAttacks` 导入七常量，`boxFrom` 进 `CORE_ATTACK_BOXES`（单源；数值/盒形不变） |
| `src/entities/enemies/behaviorInterp.ts` | `resolveAttack` 去掉 `BUILTIN` 回退；无 key 时 body→默认 id（axe→`axeChop` 等）再 `getAttackBox`；`charge` 步去掉 `SHIELD_CHARGE` 常量兜底 |
| `src/entities/enemies/bodyAttacks.ts` | 保留作种子/旁系导入；`BUILTIN_BODY_ATTACKS` 标为过渡（运行时不再消费） |
| `src/meta/bTier/types.ts` | `meleeAttack.attackKey` 注释改为只认 `ctx.attacks` |
| `docs/门派插件.md` | `meleeAttack` 运行时句 + `ctx.attacks` 行：敌人近战同目录 |
| `scripts/menpai-smoke.ts` | A1：七名有货、手感抽检、CORE Behavior 挂 key、卸目录 soft-absent、临时删 `thrust` 目录项证明无 BUILTIN 救命；`attacks` 期望计数 38→45 |

## 残留 BUILTIN 符号

| 符号 | 位置 | 说明 |
| --- | --- | --- |
| `BUILTIN_BODY_ATTACKS` | `bodyAttacks.ts` 导出 | **过渡种子表**；`resolveAttack` 已不 import / 不读 |
| `SHIELD_BASH` | `enemy.ts` → `QUICK_BASH` | **A4** 旁系（格挡反击） |
| `ARROW` 常量 | `behaviorInterp` 射箭 `Projectile(..., ARROW)` | **A4** 旁系（伤害源硬挂） |

运行路径 `resolveAttack` / `meleeAttack` / `comboChain` / `charge`：**无** `BUILTIN_BODY_ATTACKS` 消费。

## 验收

| 项 | 结果 |
| --- | --- |
| `getAttackBox` 七名（axeChop/bash/charge/whip/thrust/lunge/arrow）均有货 | ✅ |
| 卸掉目录项后同 key soft-absent（不再靠 BUILTIN） | ✅ smoke 删 live map + 临时 add/dispose |
| 核心杂兵 Behavior 仍挂 `axeChop` / `thrust` 等 | ✅ |
| 手感（damage/startup/box）与 `bodyAttacks` 一致 | ✅ |
| `npm run test:menpai` | **ALL PASS** |
| `npm run build` | **绿**（`tsc --noEmit && vite build`） |
| bump | **否** |
| 部署 | **否** |

## 建议下一步

- **A2**：远程 `DlcContentBody.attacks?` + `REMOTE_DLC_INJECT` / `applyContent` 灌盒（自建盒可远程交付）
- **A3**：设计台导出/编辑 `attacks`；datalist 补 `charge`/`arrow`
- **A4**：`QUICK_BASH` / 射箭 `ARROW` 硬引用收口；可标 deprecated / 精简 `BUILTIN_BODY_ATTACKS`
