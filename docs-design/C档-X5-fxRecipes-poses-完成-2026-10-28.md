# C 档 X5·敌人攻击姿读目录 — 完成记录

- **日期**：2026-10-28（Asia/Shanghai）
- **范围**：杂兵 `Enemy.computePose` attack 分支改读目录 `skel.*`（`getPose`），保留 `SKEL_ATTACKS` 硬表回退
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **未做**：不部署；不改 Behavior / BehaviorStep；不抢 Boss / gargoyle；不改 idle/walk 常量树；不扩 `FxPreset`；不改 remote / 设计台（X1–X3 已完）

## 背景

X1–X4 已通远程灌、设计台、示范包。蓝图债 #4：杂兵普攻姿硬读 `SKEL_ATTACKS[atkPoseName()]`，即便 Cordis `poses.add('skel.axe')` 也改不了挥砍三帧。蓝图 X5：attack 分支改目录优先，保留硬表回退。

**注意**：`getAttackPose(id)` 缺 id 时回退猎人 `slash1`，对杂兵不合适。本单主路径用 `getPose('skel.'+name)`，缺则 `SKEL_ATTACKS`，**不**裸调 `getAttackPose` 当主路径。

蓝图：`C档-fxRecipes-poses蓝图-2026-10-28.md` §X5。

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `src/entities/enemies/enemy.ts` | `computePose` `case 'attack'`：`getPose(\`skel.${name}\`) ?? SKEL_ATTACKS[name] ?? SKEL_ATTACKS.axe`；补 `getPose` import；注释说明为何不用 `getAttackPose` |
| `scripts/menpai-smoke.ts` | Cordis 覆盖 `skel.thrust`（可辨 lean/rot）→ 断言目录三帧 + 解析路径 + `attackPose` 消费 + `Enemy.computePose` 吃到覆盖；unload 还原 |

**未改**：`atkPoseName()` / idle·walk / Behavior / Boss·gargoyle / `SKEL_ATTACKS` 常量本体 / remote / 设计台 / 存档 / 部署。

## attack 分支（最终）

```ts
case 'attack': {
  if (!this.atk) return this.restPose();
  // Catalog `skel.*` first (Cordis/DLC). Prefer getPose over getAttackPose:
  // getAttackPose missing-id falls back to hunter slash1, unsuitable for trash mobs.
  const name = this.atkPoseName();
  const set = getPose(`skel.${name}`) ?? SKEL_ATTACKS[name] ?? SKEL_ATTACKS.axe;
  return attackPose(this.atk, set, this.restPose());
}
```

## 验收

| 项 | 结果 |
| --- | --- |
| Cordis `poses.add` 覆盖 `skel.thrust` 后 `getPose` 三帧 lean/rot 为覆盖值 | ✅ smoke |
| 覆盖值 ≠ `SKEL_ATTACKS` / CORE 默认 | ✅ |
| 解析路径 `getPose('skel.thrust') ?? SKEL…` 命中覆盖 | ✅ |
| `attackPose` + spear `Enemy.computePose` 吃到目录 | ✅ |
| unload 还原核心 `skel.thrust` | ✅ |
| 文档：`getAttackPose` 缺 id → slash1（故不用作杂兵主路径） | ✅ |
| `npm run test:menpai` | **ALL PASS** |
| `npm run build` | **绿** (`tsc --noEmit && vite build`) |
| bump | **否** |
| 部署 | **否** |

## 已知限制

- Idle / walk / hurt 等非 `AttackPoses` 仍模块常量（蓝图缓项；本单未目录化）。
- Boss / gargoyle 绘制主路径仍本地（边界债；本线不抢）。
- Anim `playPose` 仍只用 strike（既有语义；未改解释器）。
- `getAttackPose` 缺 id → slash1 行为未改（玩家路径仍用）；杂兵刻意避开。

## 文档路径

- 本文件：`/workspace/docs-design/C档-X5-fxRecipes-poses-完成-2026-10-28.md`
- 蓝图：`/workspace/docs-design/C档-fxRecipes-poses蓝图-2026-10-28.md`
