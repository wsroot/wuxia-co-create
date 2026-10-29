# C 档·Boss silhouette（债 #9）— 推进侧收口索引

- **日期**：2026-10-29（Asia/Shanghai）
- **范围**：Boss silhouette **蓝图→BossSil1→BossSil2→BossSil3** 推进侧收口（只汇总文档）
- **bump 玩家存档**：**否**
- **部署**：**均未部署**（本收口单亦不打包、不 SSH、不热更）

---

## 总表

| 期 | 完成单路径 | 一句话结果 | 状态 | 落地序 |
| --- | --- | --- | --- | --- |
| **蓝图** | `docs-design/C档-Boss-silhouette蓝图-2026-10-29.md` | 债 #9；唯一 `drawGargoyle`；禁第二绘制器；分期 Sil1–3 | ✅ 蓝图 | 1 |
| **BossSil1** | `docs-design/C档-BossSil1-完成-2026-10-29.md` | soft 读 sil → palette/scale（0.85–1.25）；缺则 bit-identical | ✅ 完成·未部署 | 2 |
| **BossSil2** | `docs-design/C档-BossSil2-完成-2026-10-29.md` | faceMark/ornament/armorLayer/cloak.color 程序叠加 | ✅ 完成·未部署 | 3 |
| **BossSil3** | `docs-design/C档-BossSil3-完成-2026-10-29.md` | `shixiang` 灰石剪影挂 Boss；Cordis+种子 | ✅ 完成·未部署 | 4 |

落地序：**蓝图→BossSil1→BossSil2→BossSil3**。债 **#9 主交付齐**。

### 形状速记

| 项 | 约定 |
| --- | --- |
| 入口 | **仍** `drawGargoyle`（`GargOpts.silhouette`） |
| Sil1 | `palette.skin|arm|coat` → tint；`scale` clamp |
| Sil2 | faceMark / ornament / armorLayer / cloak.color |
| 禁区 | 第二绘制器 · `drawSkeleton` 改调 · 扩 SilhouettePartKind · perch · mainhand |

### BossSil3 示范

| 项 | 值 |
| --- | --- |
| 包 | `shixiang` pack **1.2.0** |
| 剪影 | `shixiang_yexun` · skin `#8a8680` · scale 1.12 · 饰件 |
| content.md5 | `6d43f65c5e1dddb20289e109e3dbe53e` |

---

## 未部署债 / 已知限制

| 项 | 出处提炼 |
| --- | --- |
| **热更未发** | Sil1/2 改 :4173；Sil3 示范+馆种子——**:4173 / :4174 均未上本批** |
| **mainhand** | 蓝图未接 |
| **cloak** | 仅 color |
| **#12 perch** | 默认不开 |
| **债清单 #9** | 主交付齐；以本收口为准 |

另：同批未热更积压尚有债 **#7** Boss负载、**#11** 删表。

---

## 建议下一动作（三选一）

| 选项 | 利 | 弊 / 注意 |
| --- | --- | --- |
| **A. 热更 :4173** | 灰石剪影+负载+#11 同批上机；`?pack=shixiang` 可辨 | **须用户拍板**；馆可发 md5 `6d43f65c…`（含负载石甲） |
| **B. 换元素线 / 收工** | Top 债主交付基本齐 | 热更债仍积压 |
| **C. 观望** | 核心 gargoyle 无破坏 | 示范要等热更才上机可见 |

验收热更后一句：`?pack=shixiang` 灰石剪影可辨于核心 jade；无 sil 与今日一致；仍走 `drawGargoyle`。

---

## 入口速查

| 职责 | 路径 |
| --- | --- |
| 绘制 | `src/render/drawGargoyle.ts`（`resolveGargoyleSilhouetteLook`） |
| 壳 | `src/entities/boss/gargoyle.ts`（`getSilhouette` 传入） |
| 示范 | `src/content/shixiang/index.ts` · `dlc-server/packages/shixiang/` |
| Smoke | `scripts/menpai-smoke.ts`（BossSil1–3） |

---

## 文档路径

- 本文件：`/workspace/docs-design/C档-Boss-silhouette-推进收口-2026-10-29.md`
- 蓝图：`/workspace/docs-design/C档-Boss-silhouette蓝图-2026-10-29.md`
- 分期完成单：BossSil1 · BossSil2 · BossSil3（同目录）
