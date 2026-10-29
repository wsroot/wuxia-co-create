# C 档·Arena.affixBias 导演接线 — 完成单

- **日期**：2026-10-29（Asia/Shanghai）
- **债**：剩余债清单 #5
- **bump 玩家存档**：**否**
- **部署**：**否**（未打包 / 未 SSH / 未热更）

---

## 一句话结果

关卡 `Arena.affixBias` 不再空转：幕开始与进场路径把偏味 id 送进既有 `pickAffixForAct`（listed ∩ primary 为掷池），不扩 Schema、不改 `tickAffix`。

---

## 改动入口

| 路径 | 改动 |
| --- | --- |
| `src/level/affixes.ts` | `pickAffixForAct(actIndex, bias?)` prefer-subset；`collectStageAffixBias` |
| `src/game.ts` | `applyActAffix` → `collectStageAffixBias(this.stage.arenas)` 传入 pick |
| `src/level/director.ts` | `enterArena`：本场有 `affixBias` 则按本场列表重掷 primary（+ secondary / 清 evolve 旗） |
| `src/level/stage.ts` | 字段注释对齐「已接线」 |
| `scripts/menpai-smoke.ts` | bias 全胜断言 + collect 联合 + 源码接线口 |
| `docs/C档原语与设计台-2026-10-28.md` | §F 已接线；暂缓 #2 划掉 |
| `docs/门派插件.md` | D3 一句改「导演已读」 |
| 设计台静态（hint） | schema / designer.js / html 去掉「另单·未接线」措辞 |
| `docs-design/C档-剩余债清单-2026-10-28.md` | #5 旁注「已跟进」 |
| `docs-design/C档-设计台玩法副目录-推进收口-2026-10-29.md` | 已知限制表 #5 → 已跟进 |

---

## 偏味语义（对齐既有池，非新原语）

- 仍走 `primaryAffixPool` + `pickWeightedAffix`（`primaryWeight`）——不新造抽取器。
- `bias` ∩ primary 池非空 → **只在该子集内**按 `primaryWeight` 加权掷；空交 → 退回全 primary 池。
- 未知 id / `evolveOnly`（如 `zhanghai`）不进 primary → soft 忽略。
- 空 / null bias → 与接线前完全一致（同 seed 同结果）。
- 幕开始：各场 `affixBias` **并集**；进场：若本场有列表则按**本场**再掷（可换味）。

---

## 验收

| 项 | 结果 |
| --- | --- |
| `npm run test:menpai` | ✅ PASS |
| `npm run build` | ✅ `tsc --noEmit` + vite build |
| smoke：`pickAffixForAct(i, ['duwu'])` / `['canyue']` 全胜 | ✅ 40/40 |
| smoke：无效 bias 不改变 unbiased | ✅ |
| smoke：多 id 子集内加权 | ✅ |
| smoke：`game.ts` / `director.ts` 接线口 | ✅ |

---

## 已知限制

- 多 id bias 时仍按子集内 `primaryWeight` 分布，非均匀、非硬指定单 id。
- 幕间「改写场地」`rerollAffix` **未**吃当前场 bias（仍均匀重掷 primary 池）；若要跟偏味可另小单。
- 进场换味会清 `affixEvolved`；已演化中的 DOT 时间线以新 primary 为准。
- 设计台静态措辞已改，**:4174 未热更**。

---

## 建议下一刀

| 选项 | 说明 |
| --- | --- |
| A. 热更 :4173（游戏）+ 可选 :4174（设计台文案） | 须用户拍板；本单不部署 |
| B. 债 #10 BossKit move∈bossMoves 校验 | 低风险小单 |
| C. 远程素材线（债 #1）或其它债清单首选 | 大线；勿默认开 acts（#6） |

---

## 本单确认

- **未** bump 存档；**未**部署；**未**开 acts；**未**改 `tickAffix` 效果语义；**未**扩 Affix Schema 词汇。
