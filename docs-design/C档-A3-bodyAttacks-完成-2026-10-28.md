# C 档 A3·bodyAttacks：设计台交付面 — 完成记录

- **日期**：2026-10-28（Asia/Shanghai）
- **蓝图**：`docs-design/C档-bodyAttacks目录化蓝图-2026-10-28.md` §分期 A3
- **对照**：A1/A2 `C档-A1/A2-bodyAttacks-完成-2026-10-28.md`；B4 设计台 datalist 体例
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **部署**：**否**（不打包不部署）
- **未做**：不做完整受击编辑器；不改战斗/解释器；不扩 AttackBox 字段任意化；不抢 Boss/武器/符咒；不收口 `QUICK_BASH` / 射箭硬挂（A4）；不 SSH

## 目标达成

设计台导出 content 含自建 `attacks`（排序靠前）；behavior / 外功 `attackKey` datalist = 本卷 attacks + 长夜真实目录（含 `charge`/`arrow`）；预览文案与「只认目录」一致。

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `dlc-server/public/assets/designer.js` | `state.content.attacks`；`buildContentExport` 含 `attacks`（**早于** skills/behaviors）；`emptyGameplay('attacks')`；玩法目录简易攻击盒表单；`attackKeyOptions()` = 本卷 + `coreAttackKeys`；`attachDatalist('coreAttackKeys')` 改用合并表；外功/攻击盒人话预览「只认目录」；首访种子 `demo_cleave`；敌寇向导优先挂本卷盒 |
| `dlc-server/public/assets/designer-schema.json` | 新增 `attacks.defFields`（AttackBoxSchema 子集）；`coreAttackKeys` 对齐 `CORE_ATTACK_BOXES`（45，**含 charge/arrow**）；behavior `meleeAttack.attackKey` / `comboChain.attackKeys` 挂 datalist |
| `dlc-server/public/designer.html` | 玩法目录选项「攻击盒」+ hint |
| `docs/门派插件.md` | §九 一句：设计台可编/导出 attacks；datalist=本卷+核心 |
| `docs/C档原语与设计台-2026-10-28.md` | §② 增 A3 要点 |
| `docs-design/C档-bodyAttacks目录化蓝图-2026-10-28.md` | A3 行标「已跟进」 |

**未改**：`behaviorInterp` / `src/dlc/remote.ts`（A2 已灌）/ AttackBoxSchema 字段表 / 馆种子 / 存档 / Boss。

## coreAttackKeys 实际列表（45，与 `CORE_ATTACK_BOXES` 对齐）

```
slash1 slash2 slash3 finisherPoise finisherDrain finisher
launcher sweep dashKick airA airB rising plunge counter throw
jab1 jab2 palm claw hook bareKick
bengquan huzhua huzhua2 huzhua3
daomang qiangjue huixuan zhanma tuci chuanxin hengsao kaitian tieshan fanyun
plungeWave superSlash superFinal
axeChop bash charge whip thrust lunge arrow
```

敌人七内置：`axeChop` `bash` `charge` `whip` `thrust` `lunge` `arrow`（A1 已进目录；本单 datalist **补 charge/arrow**）。

## 验收

| 项 | 结果 |
| --- | --- |
| 导出 content 含自建 `attacks`（靠前） | ✅ `buildContentExport` keys 以 `attacks` 开头；首访种子 `demo_cleave` |
| behavior `attackKey` 可挂本卷盒 | ✅ datalist 合并本卷；向导默认挂本卷首盒 |
| datalist 只认目录（本卷+核心，不再暗示未入目录也能当真 id） | ✅ `coreAttackKeys`=真实 45；合并本卷 id |
| `coreAttackKeys` 含 `charge`（及 `arrow`） | ✅ |
| 预览「只认目录」 | ✅ 外功/攻击盒人话预览 |
| `npm run test:menpai` | **ALL PASS** |
| `npm run build` | **绿**（`tsc --noEmit && vite build`） |
| bump | **否** |
| 部署 | **否** |

## 缺 Schema 边界

无。表单字段均落在既有 `AttackBoxSchema`（id/name/startup/active/recovery/box/damage/kb*/可选 hitstun·swing·flags）；**未**发明新键。若日后要编 `combatCue`/`swordQi`/`stunTier` 等玩家向字段，可再扩设计台子集——仍勿任意化。

## 是否建议热更

- **:4174（designer）**：**是**（`designer.js` / `designer.html` / `designer-schema.json`）
- **:4173（游戏）**：**否**（本单未改游戏侧 `src/` 运行时）

本单**不打包不部署不 bump**。

## 建议下一步

- **A4**：`QUICK_BASH` / 射箭 `ARROW` 硬引用收口；可标 deprecated / 精简 `BUILTIN_BODY_ATTACKS`

## 文档路径

- 本文件：`/workspace/docs-design/C档-A3-bodyAttacks-完成-2026-10-28.md`
- 蓝图：`/workspace/docs-design/C档-bodyAttacks目录化蓝图-2026-10-28.md` §4 A3
- 对照 A2：`/workspace/docs-design/C档-A2-bodyAttacks-完成-2026-10-28.md`
