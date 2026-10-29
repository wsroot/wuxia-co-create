# C 档 Gsm5·示范包 Behavior 收口 — 完成记录

- **日期**：2026-10-29（Asia/Shanghai）
- **范围**：示范包 `shixiang` 挂非空 Boss 空档 Behavior steps；CORE `gargoyle` behavior **仍无 steps**；`docs/门派插件.md` 写明「Boss 可挂积木空档」+ `?pack=` 自验；smoke 可辨；高风险招仍壳
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **未做**：不强制热更 / 不部署 / 不动 `:4173`/`:4174`；不并 drawKind；#12 perch 不开；不扩 BehaviorStep kind；不把 changye 塞 OPTIONAL_PACKS；不 rebuild slim 热更包

蓝图：`C档-石兽状态机-另债蓝图-2026-10-29.md` §4 Gsm5 · §8。  
前置：Gsm1 旁路 / Gsm2 `BOSS_GAP_LOCO_KINDS` / Gsm3–4 地面招 soft（完成单同目录）。

## 示范挂载

| 项 | 值 |
| --- | --- |
| **包** | `shixiang`（OPTIONAL_PACKS；Cordis `src/content/shixiang`） |
| **Boss 敌** | `shixiang_yexun`（isBoss） |
| **behaviorId** | `shixiang_yexun_pace`（自建；**非** CORE `gargoyle`） |
| **steps 概要** | `facePlayer` · `keepDistance`(180–280, chase 520) · `circleStrafe` · `idlePace` · `flank` · `phaseAtHp`(夜醒@45%) · `phaseGate`→更紧 keep+strafe |
| **许可集** | 仅 Gsm2 `BOSS_GAP_LOCO_KINDS`（无 melee/dive 等招式步） |
| **CORE** | `gargoyle` behavior **仍无 steps** → bit-identical 壳 idle/walk |
| **包版本** | 馆种子 `dlc-server/packages/shixiang` **1.3.0**（内容版本；**非**玩家存档 bump） |

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `src/content/shixiang/index.ts` | inject `behaviors`；登记 `shixiang_yexun_pace`；EnemyDef.behaviorId 改挂之 |
| `dlc-server/packages/shixiang/{content.json,pack.json}` | 同步 behaviors + behaviorId；version **1.3.0** |
| `dlc-server/catalog.json` | `npm run dlc:regen` |
| `docs/门派插件.md` | 「Boss 可挂积木空档」+ Gsm5 示范/`?pack=shixiang` 自验 + 示例代码；AI/已知债/内容包列更新 |
| `scripts/menpai-smoke.ts` | 早段 assembly/makeBoss 断言；Gsm5 块：load→steps⊆allowlist→gap 追距可辨→dive 不打断→CORE 无 steps→unload |
| 蓝图 §8 | Gsm5 已跟进；Gsm 线标收口（dive 等可留壳另债） |

**未改**：`gargoyle.ts` / `behaviorInterp.ts` 旁路实现（Gsm1 已够）；kit/`chooseMove`；CORE_BEHAVIORS.gargoyle stub；drawKind；存档；部署。

## 怎么验

1. **smoke**：`npm run test:menpai`（含 Gsm5：空档 face+keep 可辨；dive 不被 steps 打断；CORE 无 steps）。  
2. **真机自验 URL**（本地已 boot；**本刀未热更 :4173**）：`?pack=shixiang` → 第一幕 Boss「石像夜巡」空档巡廊控距/环绕应可辨于核心镇山石兽无积木路径；俯冲等仍走 kit→壳。  
3. 卸包后 `shixiang_yexun` / `shixiang_yexun_pace` 应从目录消失。

## 验收

| 项 | 结果 |
| --- | --- |
| 示范路径空档吃积木可辨 | ✅ smoke（makeBoss steps + gap chase） |
| CORE gargoyle 仍无 steps | ✅ smoke |
| 高风险招（dive）仍壳、不被 steps 打断 | ✅ smoke |
| `npm run test:menpai` | **ALL PASS** |
| `npm run build` | **绿**（改 `src/**`） |
| bump | **否** |
| 部署 / 热更 | **否** |

## 已知限制 / 遗留

- dive / fireball / roar 等飞行·震啸 **仍可留壳**（蓝图默认；另债点名再迁）
- 招式步（melee/ranged/…）Boss 空档仍 soft-skip；出招主权仍 kit→`chooseMove`
- `flank` 无动作挑子时粘性弱；主可辨靠 face+keepDistance 180–280
- 不强制热更；用户/推进侧按需 `?pack=shixiang` 自验

## 一句验收摘要（给 @项目推进）

> Gsm5 已合：`shixiang`→`shixiang_yexun`→`behaviorId: shixiang_yexun_pace`（非空 loco steps）；CORE `gargoyle` 仍无 steps；门派插件写明「Boss 可挂积木空档」；dive 等仍壳。Gsm 线收口。`bump=否` · 部署=否 · 热更=否。包版本 1.3.0。
