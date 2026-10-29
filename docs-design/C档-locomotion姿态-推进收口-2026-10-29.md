# C 档·locomotion 姿态（债 #4）— 推进侧收口索引

- **日期**：2026-10-29（Asia/Shanghai）
- **范围**：locomotion 姿态 **蓝图→Loco1→Loco2→Loco3→Loco4** 推进侧收口（只汇总文档）
- **bump 玩家存档**：**否**
- **部署**：本收口单不打包、不 SSH。**:4174** 已热更（Loco3+同批 Pose2，md5 `e792f0978d2092fa9cbfd16e6e1d0d4a`）；**:4173** 仍未上（Loco1/2 运行时 + Loco4 `bingren`）

---

## 总表

| 期 | 完成单路径 | 一句话结果 | 状态 | 落地序 |
| --- | --- | --- | --- | --- |
| **蓝图** | `docs-design/C档-locomotion姿态蓝图-2026-10-29.md` | 债 #4；`hp.*`/`sp.*` 前缀；复用 poses；override-only；分期 Loco1–4 | ✅ 蓝图 | 1 |
| **Loco1** | `docs-design/C档-Loco1-locomotion姿态-完成-2026-10-29.md` | 玩家 idle/idle2/run1/run2/hurt soft→strike；缺回退 `HP.*`；`locoPose` helper | ✅ 完成·**:4173 未部署** | 2 |
| **Loco2** | `docs-design/C档-Loco2-locomotion姿态-完成-2026-10-29.md` | 杂兵通用 idle/walk1/walk2/hurt soft→`sp.*`；缺回退 `SP.*`；kind 特化仍硬 | ✅ 完成·**:4173 未部署** | 3 |
| **Loco3** | `docs-design/C档-Loco3-locomotion姿态-完成-2026-10-29.md` | 设计台 `locoPoseIds` + 三帧同填 strike；export 往返 | ✅ 完成·**:4174 已热更** | 4 |
| **Loco4** | `docs-design/C档-Loco4-locomotion姿态-完成-2026-10-29.md` | `bingren` 灌 `hp.idle` lean:0.38；Cordis+种子 | ✅ 完成·**:4173/:4174 馆种子未再发** | 5 |

落地序：**蓝图→Loco1→Loco2→Loco3→Loco4**。债 **#4 主交付齐**。

### 形状速记

```
locoPose(id, fallback) → getPose(id)?.strike ?? fallback
softHp(slot) → locoPose(`hp.${slot}`, HP[slot])
softSp(slot) → locoPose(`sp.${slot}`, SP[slot])
```

| 前缀 | 闭集槽（本线） | 读路径 |
| --- | --- | --- |
| `hp.*` | idle · idle2 · run1 · run2 · hurt | 玩家 `computePose` |
| `sp.*` | idle · walk1 · walk2 · hurt | 杂兵通用 rest/walk/hitstun·stagger |

登记仍 `PoseDef` 三帧；loco **建议同填**；运行时只读 `strike`。**不灌 CORE 全树**（override-only）。

### Loco4 示范

| 项 | 值 |
| --- | --- |
| 包 | `bingren`（残锋） |
| 覆盖 | `poses.add` → `hp.idle` · 三帧 lean `0.38` |
| content.md5 | `5d85ef97e3f5b2832a7672d5ad20b4d6` |

---

## 热更台账

| 面 | 内容 | 状态 |
| --- | --- | --- |
| **:4174** | Loco3 设计台 + 同批 Pose2 | ✅ 已上 · 包 md5 `e792f0978d2092fa9cbfd16e6e1d0d4a` · URL `http://192.168.31.168:4174/designer.html` |
| **:4173** | Loco1/2 运行时 soft + Loco4 `bingren` 源/种子（与 Pose1/3 等积压可同批） | ❌ 未上 · **须用户拍板** |
| **:4174 再发** | Loco4 馆种子 / catalog（`5d85ef97…`） | ❌ 未再发 · 可选 |

---

## 未部署债 / 已知限制

| 项 | 出处提炼 |
| --- | --- |
| **:4173 未热更** | Loco1/2 绘制主路径 + Loco4 示范 idle 观感上机仍不可见 |
| **jump/guard/dash 等** | 玩家后置槽仍硬 `HP`（蓝图后置） |
| **盾/弓/枪特化** | `shIdle`/`arIdle`/`spIdle`/`shWalk*`/`spWalk*` 仍硬 `SP` |
| **GP / Boss** | 本线默认不开 |
| **PoseDef 三帧** | 无单帧 loco Schema；靠同填 + 只读 strike |
| **债清单 #4** | 主交付齐；后置槽另开，勿默认当下一刀 |

---

## 建议下一动作（三选一）

| 选项 | 利 | 弊 / 注意 |
| --- | --- | --- |
| **A. 热更 :4173** | 玩家/杂兵 soft 上机；`?pack=bingren` idle 吃 `hp.idle` | **须用户拍板**。可与积压 Pose1/acts/R/D 等同批问；馆侧可顺带再发 `5d85ef97…` |
| **B. 换元素线** | 债 #4 主交付齐；可开后置槽或其它债 | :4173 热更债仍积压 |
| **C. 收工观望** | 文档与代码齐、缺覆盖无破坏 | 示范 lean 0.38 要等 :4173 才上机可见 |

验收热更后一句：`?pack=bingren` 玩家 idle 可辨 lean；未挂包 / unload 与硬 `HP`/`SP` 一致；设计台已能编 `hp.*`/`sp.*`（:4174 已验）。

---

## 入口速查

| 职责 | 路径 |
| --- | --- |
| helper | `src/meta/contentRegistry.ts`（`locoPose`） |
| 玩家 | `src/entities/player.ts`（`softHp` / `computePose`） |
| 杂兵 | `src/entities/enemies/enemy.ts`（`softSp`） |
| 设计台 | `dlc-server/public/assets/designer-schema.json` · `designer.js` · `designer-preview.js` · `designer.html` |
| 示范 | `src/content/bingren/index.ts` · `dlc-server/packages/bingren/content.json` |
| Smoke | `scripts/menpai-smoke.ts`（Loco1–4） |
| 文档 | `docs/门派插件.md` `ctx.poses` / bingren |

---

## 文档路径

- 本文件：`/workspace/docs-design/C档-locomotion姿态-推进收口-2026-10-29.md`
- 蓝图：`/workspace/docs-design/C档-locomotion姿态蓝图-2026-10-29.md`
- 分期完成单：Loco1 · Loco2 · Loco3 · Loco4（同目录）
