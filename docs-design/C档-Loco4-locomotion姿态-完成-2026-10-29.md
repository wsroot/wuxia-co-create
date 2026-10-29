# C 档 Loco4·示范包 locomotion 姿态 — 完成记录

- **日期**：2026-10-29（Asia/Shanghai）
- **范围**：示范包 `bingren`（残锋）覆盖玩家闲姿 `hp.idle`（poses 白名单；三帧同填）；Cordis + 藏经阁种子对齐；`?pack=bingren` 可见
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **未做**：不部署；不扩核心 kind / 解释器；不灌 CORE loco 全树；不开 `sp.*` / GP / Boss；不新建第二包

## 背景

蓝图债 #4 Loco4：在 Loco1–3（运行时 soft 读 + 设计台）已齐后，给内容作者一条可抄的官方示范。

蓝图：`C档-locomotion姿态蓝图-2026-10-29.md` §Loco4。  
前序：`C档-Loco1/2/3-locomotion姿态-完成-2026-10-29.md`。

## 改动入口

| 入口 | 改动 |
| --- | --- |
| `src/content/bingren/index.ts` | `poses.add({ id:'hp.idle', wind≈strike≈rec lean:0.38 })`（残锋闲姿；可辨于硬 `HP.idle` lean:0.12） |
| `src/content/index.ts` | OPTIONAL_PACKS `bingren` lore 点名启卷后站姿微倾 |
| `dlc-server/packages/bingren/content.json` | 种子 poses 追加 `hp.idle`（与 Cordis 同 lean） |
| `dlc-server/packages/bingren/pack.json` | description 点名 Loco4 / 残锋闲姿 |
| `dlc-server/catalog.json` | `npm run dlc:regen` |
| `scripts/menpai-smoke.ts` | Cordis / remote seed / `Player.computePose` / unload 回退 |
| `docs/门派插件.md` | bingren 示例句点名 `hp.idle` |

**未改**：`src/entities/player.ts` / `enemy.ts` / `PoseSchema` / `CORE_POSES` / 设计台 / 存档 / 部署。

## 约定（示范）

| 项 | 内容 |
| --- | --- |
| 包 id | `bingren` |
| 覆盖键 | `hp.idle`（玩家闲；Loco1 soft 读 strike） |
| 形状 | PoseDef 三帧同填 lean=`0.38` |
| 可见 | `?pack=bingren` / `__pack.load('bingren')` / 藏经阁种子 |
| unload | 目录卸下 → `locoPose` / `computePose` 回硬 `HP.idle` |

## 验收

| 项 | 结果 |
| --- | --- |
| Cordis 覆盖 `hp.idle` 后 idle `computePose` 吃 strike | ✅ smoke Loco4 |
| 种子 `content.json` 对齐；remote apply 同效 | ✅ |
| unload = 硬 `HP.idle` | ✅ |
| `npm run test:menpai` | **ALL PASS** |
| `npm run build` | **绿** |
| bump | **否** |
| 部署 | **否** |
| 动核心？ | **否** |

## content.md5

`5d85ef97e3f5b2832a7672d5ad20b4d6`（`dlc:regen` 后 catalog `bingren`）

## 是否建议热更

- **:4173（游戏）**：可选（示范包源变更；用户拍板）
- **:4174（馆）**：可选（种子 / catalog；用户拍板）

本单**不打包不部署不 bump**。

## 建议下一刀

债 #4 收口确认，或后置槽（`hp.jump|guard|…` / `sp` kind 特化）。本单不部署、不 bump。

## 已知限制

- 仅示范 `hp.idle`（未覆 `hp.idle2` / run / hurt / `sp.*`）。
- PoseDef 仍强制三帧；无单帧 loco Schema。
- 不灌 CORE loco；官方观感仍模块常量回退。

## 文档路径

- 本文件：`/workspace/docs-design/C档-Loco4-locomotion姿态-完成-2026-10-29.md`
- 蓝图：`/workspace/docs-design/C档-locomotion姿态蓝图-2026-10-29.md`
- 前序：`C档-Loco1/2/3-locomotion姿态-完成-2026-10-29.md`
