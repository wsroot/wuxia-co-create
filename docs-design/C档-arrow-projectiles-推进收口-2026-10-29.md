# C 档·arrow↔projectiles（债 #11 余项）— 推进侧收口索引

- **日期**：2026-10-29（Asia/Shanghai）
- **范围**：arrow↔projectiles **蓝图→ArrowProj1→ArrowProj2→ArrowProj3** 推进侧收口（只汇总文档）
- **bump 玩家存档**：**否**
- **部署**：**均未部署**（本收口单亦不打包、不 SSH、不热更）

---

## 总表

| 期 | 完成单路径 | 一句话结果 | 状态 | 落地序 |
| --- | --- | --- | --- | --- |
| **蓝图** | `docs-design/C档-arrow-projectiles蓝图-2026-10-29.md` | 飞行归 projectiles、伤害 soft 挂 attacks；双目录保留；分期 Proj1–3 | ✅ 蓝图 | 1 |
| **ArrowProj1** | `docs-design/C档-ArrowProj1-完成-2026-10-29.md` | soft `attackKey`（缺省 arrow）；斩落认 `drawKind==='arrow'` | ✅ 完成·未部署 | 2 |
| **ArrowProj2** | `docs-design/C档-ArrowProj2-完成-2026-10-29.md` | 设计台 datalist；moyu 1.1.0 墨箭挂键可辨伤 | ✅ 完成·未部署 | 3 |
| **ArrowProj3** | `docs-design/C档-ArrowProj3-完成-2026-10-29.md` | CORE `fireball.attackKey:'gFire'`；`resolveProjectileAttackKey`；线收口 | ✅ 完成·未部署 | 4 |

落地序：**蓝图→Proj1→Proj2→Proj3**。债 **#11 arrow↔projectiles 主交付齐**。

### 形状速记

| 项 | 约定 |
| --- | --- |
| 心智 | 飞行归 projectiles；伤害软挂 AttackBox |
| soft 缺省 | 未挂 → `arrow`；`drawKind`/hint 为 fireball → `gFire` |
| 斩落 | `drawKind==='arrow'`（不认 kind 名） |
| 禁区 | 大爆炸合并双目录；删 attacks 页 arrow/gFire；Behavior 化 Boss 火球 |

### 示范

| 项 | 值 |
| --- | --- |
| 包 | `moyu` v1.1.0 |
| 盒 | `moyu_ink_shot`（16/6） |
| 箭 | `moyu_ink_arrow.attackKey` |
| 辨识 | `?pack=moyu` 墨箭伤可辨于核心箭 10/3 |
| 火球 | CORE `fireball` → gFire 12/5/-3 |

---

## 未部署债 / 已知限制

| 项 | 出处提炼 |
| --- | --- |
| **热更未发** | Proj1–3 改 :4173；设计台 attackKey + moyu → **:4173 / :4174 均未上本批** |
| **`hitSfx` 命中消费** | 轻债可选；本线跳过（叠音风险） |
| **双目录** | 有意保留，勿默认合并 |
| **债清单 #11** | 删表 + Proj1–3 主交付齐；以本收口为准 |

---

## 建议下一动作（三选一）

| 选项 | 利 | 弊 / 注意 |
| --- | --- | --- |
| **A. 热更 :4173 + :4174** | 火球/墨箭/设计台 attackKey 上机 | **须用户拍板**；moyu 包可顺带发 |
| **B. 换元素线** | #11 本线可结；首选债 #1 远程素材 | 热更债仍积压 |
| **C. 收工观望** | 文档与代码齐、核心箭无破坏 | 示范要等热更才上机可见 |

验收热更后一句：`?pack=moyu` 墨箭伤可辨；石兽火球 12/5；未挂箭手感不变；设计台可编 attackKey。

---

## 入口速查

| 职责 | 路径 |
| --- | --- |
| soft 解析 | `src/meta/contentRegistry.ts`（`resolveProjectileAttackKey`） |
| CORE | `src/meta/bTier/coreData.ts`（fireball.attackKey） |
| 远射 | `src/entities/enemies/behaviorInterp.ts` · `gargoyle.ts` fbCast |
| 设计台 | `dlc-server/public/assets/designer.js` / `designer-schema.json` |
| 示范 | moyu Cordis + 种子 |
| Smoke | `scripts/menpai-smoke.ts`（ArrowProj1–3） |

---

## 文档路径

- 本文件：`/workspace/docs-design/C档-arrow-projectiles-推进收口-2026-10-29.md`
- 蓝图：`/workspace/docs-design/C档-arrow-projectiles蓝图-2026-10-29.md`
- 完成单：ArrowProj1 / 2 / 3
- 债清单：`/workspace/docs-design/C档-剩余债清单-2026-10-28.md` #11
