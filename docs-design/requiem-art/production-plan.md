# 《长夜安魂曲》Production Plan｜分阶段制作计划

> 原则：静帧 / 图标可走 Codex 或图生；**战斗可读性与同步性优先程序化 Canvas**。  
> 不改游戏代码；本文件只定美术生产路径。

---

## Phase 1 — Title / Promo / Mood Stills（最高优先）

| 项 | 内容 |
|---|---|
| Assets | ① 标题关键静帧 16:9（1920×1080）② 商店/宣传裁切 ③ 可选情绪静帧（冷月+剪影） |
| Owner | **Codex / 静帧图生**（模板 A） |
| Acceptance | 符合 style-lock；右上冷月、左标题白→血红、稀灯笼、无像素；色板抽查通过 |

---

## Phase 2 — Hub UI Ornaments + Item Icons

| 项 | 内容 |
|---|---|
| Assets | 角花/面板饰线；图标集：**丹药、兵刃、甲胄、符箓**（每类至少 4 个变体）；主尺寸 **128²**，导出 **64²** |
| Owner | **Codex 静帧**（模板 B）；Hub 现有文字卡替换为剪影图标由程序接入（代码侧另排期，本计划不改代码） |
| Acceptance | 64px 可辨类；透明底；金/血红点缀克制；锁定卡可用 `#4e5058` |

---

## Phase 3 — Far BG Plates / Interlude

| 项 | 内容 |
|---|---|
| Assets | 远景板「山门古道」夜色、竹林中景空板、过场情绪图；16:9 或 2560×720 |
| Owner | **Codex 静帧**（模板 C） |
| Acceptance | 分层可 parallax；中带留空；无 UI/无抢戏前景角色 |

---

## Phase 4 — Combat Characters & Attack FX（决策锁定）

### 推荐结论（必须执行的生产路径）

**正式战斗角色与攻击特效：继续以现有 procedural Canvas draw（几何剪影 + glow + particles）为唯一生产路径。**  
图生 / Codex 出图**仅允许**作为：（1）造型与比例的 **concept reference**（模板 D/E），供程序还原；或（2）可选的 **静态道具剪影**本地 sprite 化（地上兵器、旗、灯笼道具等非动画主体）。  

**理由（摘要）**：游戏纸人目标高度仅 **48–64px**，点阵贴图易糊且难锁色；硬核「读报机」手感依赖多帧姿态、受击闪与 **hitbox 同步**，贴图帧难以对齐现有纸人代码路径；刃光/粒子需与输入帧精确耦合；锁定色板在程序调色单点维护成本最低。已有 navy robe / 红束带 / 白面具 / 细红刃的纸人绘制链路，应增强而非推翻。

### 允许图生的

- 角色三视图/侧视概念（CONCEPT ONLY）
- 攻击弧线语言参考（CONCEPT ONLY）
- 静态场景道具剪影（可选 sprite）

### 禁止图生、必须留在代码 VFX 的

| 禁止贴图化 | 原因 |
|---|---|
| 受击火花 hit sparks | 帧同步、池化粒子 |
| 斩击拖尾 slash trails | 随刃角度与挥砍弧实时 |
| 格挡闪光 parry flashes | 判定瞬间反馈 |
| 通用 particles（粉瓣、蓝珠等） | 密度与性能由代码控 |
| HP / 怒气条 | UI 动态数值 |
| 连击数字 combo numbers | 字号/暴击态程序排版 |
| 刃口 procedural glow | 与攻击状态机绑定 |

| 项 | Owner | Acceptance |
|---|---|---|
| 角色/FX 概念稿 | Codex（D/E） | 标注 CONCEPT ONLY；可被几何复述 |
| 正式战斗体 | **代码 Canvas** | 48–64px 可读；hitbox 对齐；色板常量 |
| 静态道具剪影（可选） | Codex → 本地 sprite | 无动画或仅摇摆；不替代 PC/敌主体 |

---

## 阶段优先级总览

1. Phase 1 标题/宣传静帧  
2. Phase 2 山门图标与饰件（解决文字卡）  
3. Phase 3 远景/过场板  
4. Phase 4 概念参考（若需要）+ **程序强化**；不切换到精灵表生产  

每阶段交付物需附：所用模板 ID、色板自检截图或 hex 列表、尺寸声明。
