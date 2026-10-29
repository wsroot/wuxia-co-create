# C 档·playPose 语义（债 #3）— 推进侧收口索引

- **日期**：2026-10-29（Asia/Shanghai）
- **范围**：playPose 全时间轴 **蓝图→Pose1→Pose2→Pose3** 推进侧收口（只汇总文档）
- **bump 玩家存档**：**否**
- **部署**：**均未部署**（本收口单亦不打包、不 SSH、不热更）

---

## 总表

| 期 | 完成单路径 | 一句话结果 | 状态 | 落地序 |
| --- | --- | --- | --- | --- |
| **蓝图** | `docs-design/C档-playPose语义蓝图-2026-10-29.md` | 债 #3；opt-in `timeline`；默认 strike；分期 Pose1–3 | ✅ 蓝图 | 1 |
| **Pose1** | `docs-design/C档-Pose1-playPose语义-完成-2026-10-29.md` | 解释器 `playPose.timeline?: 'strike'|'full'`；full≈1:1:1 分相；缺帧回退 strike | ✅ 完成·未部署 | 2 |
| **Pose2** | `docs-design/C档-Pose2-playPose语义-完成-2026-10-29.md` | 设计台字段+hint+预览 scrub 三态；export 不丢 full | ✅ 完成·未部署 | 3 |
| **Pose3** | `docs-design/C档-Pose3-playPose语义-完成-2026-10-29.md` | `bingren` 残锋 anim `timeline:'full'` frames:12；Cordis+种子对齐 | ✅ 完成·未部署 | 4 |

落地序：**蓝图→Pose1→Pose2→Pose3**（解释器 → 台面 → 示范）。债 **#3 主交付齐**。

### 形状速记

```
{ kind: 'playPose', poseId, frames?, timeline?: 'strike' | 'full' }
```

| timeline | 行为 |
| --- | --- |
| 缺省 / `'strike'` | 今日：只定格 `strike` |
| `'full'` | 按 `frames`（clamp 3–90）≈1:1:1 播 wind→strike→rec；缺帧 → strike + warn |

`holdPose` / `loopPose` / `chainPose`：**不加** timeline（仍 strike / 展开 strike）。

### Pose3 示范

| 项 | 值 |
| --- | --- |
| 包 | `bingren`（残锋） |
| anim | `bingren_canmang_anim` · `playPose` → `bingren_canmang_pose` · `frames:12` · `timeline:'full'` |
| content.md5 | `522298c0c5205676fe6c253966438b25` |

---

## 未部署债 / 已知限制

| 项 | 出处提炼 |
| --- | --- |
| **热更未发** | Pose1 改 :4173 解释器+Schema；Pose2 改 :4174 设计台静态；Pose3 示范数据+馆种子——**:4173 / :4174 均未上** |
| **段内定格非 lerp** | Pose1 方案 A；验收以三态可见为准 |
| **hold / loop / chain 无 timeline** | 蓝图边界；要全时间轴手写多个 `playPose`+`full` |
| **不绑 AttackDef 帧** | Anim 用 frames 比例近似，不读 startup/active/recovery |
| **债清单 #3** | 解释器+台+示范已齐；发布后可改债状态——以本收口为准 |
| **债 #4 locomotion** | **未开**；勿默认当下一刀 |
| **perch / takeoff** | **勿默认开** |

---

## 建议下一动作（三选一）

| 选项 | 利 | 弊 / 注意 |
| --- | --- | --- |
| **A. 热更** | 玩家侧吃 Pose1；馆台吃 Pose2；`?pack=bingren` / 远程吃 Pose3 full | **须用户拍板**。建议同批：**先 :4173（Pose1+Pose3 数据）**，再 **:4174（Pose2）**；馆侧重 gen/入藏使 md5 `522298c0…` 可见 |
| **B. 换元素线** | 债 #3 主交付齐；可开债 #4 locomotion（须另蓝图）或其它债 | 热更债仍积压（与 R/D/G/acts/affixBias 同批可问） |
| **C. 收工观望** | 文档与代码齐、默认 strike 无破坏 | 作者写 full / 残锋示范要等热更才上机可见 |

验收热更后一句：`?pack=bingren` 施放残锋诀可见 wind→strike→rec；设计台勾 full 导出可被游戏吃；旧配方不写 timeline 观感不变。

---

## 入口速查

| 职责 | 路径 |
| --- | --- |
| 解释器 | `src/meta/animScripts.ts`（`timeline` / `poseEmit` 分相） |
| Schema | `src/plugins/schemas.ts`（`playPose.timeline` lit） |
| 设计台 | `dlc-server/public/assets/designer-schema.json` · `designer.js` · `designer-preview.js` |
| 示范 | `src/content/bingren/index.ts` · `dlc-server/packages/bingren/content.json` |
| Smoke | `scripts/menpai-smoke.ts`（Pose1/2/3） |
| 文档 | `docs/门派插件.md` `playPose` 行 |

---

## 附：蓝图路径

`/workspace/docs-design/C档-playPose语义蓝图-2026-10-29.md`
