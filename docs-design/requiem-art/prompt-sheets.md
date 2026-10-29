# 《长夜安魂曲》Prompt Sheets｜可复用提示模板

> 中文说明 + English keywords（供 Codex / image-gen）。  
> 所有模板必须服从 `style-lock.md` + `palette.md`。  
> **负面词统一禁止**：pixel art, 8-bit, anime chibi, bright xianxia gold extravagance, photorealistic, 3D render clutter, detailed faces。

---

## 共用 Negative Prompt（可整段粘贴）

```
pixel art, pixels, 8-bit, 16-bit, dithering, sprite sheet clutter,
anime, chibi, big eyes, detailed face, realistic skin pores,
bright xianxia, golden everything, rainbow rim light, neon cyberpunk,
photorealistic, photo, 3D render, Unreal Engine, Cinematic lighting clutter,
thick oil painting, watercolor wash mess, cute mascot, SD default style
```

---

## A. Title / Key Art / Mood Still

**用途**：宣传静帧、标题氛围、商店图；非 UI 切片。  
**尺寸**：16:9 — 推荐 **1920×1080** 或 **1280×720**（与现屏一致）。

### Positive

```
Dark-night paper-ink wuxia key art, side-view 2D flat vector silhouette,
long night requiem jianghu mood, melancholic poetic, cold full moon upper right,
Jiangnan rooftop pagoda bridge silhouettes, sparse warm lanterns, bamboo hints,
large Songti Chinese title 长夜安魂曲 left side white-to-blood-red gradient,
ink deep blue-black sky #060b17 #0a0f1a, blood red #c41e3a, warm gold #f5a623 #d4af37,
moon white #e8eef5, tiny paper-cut shadow-puppet figure with thin glowing red blade near menu,
slanted parallelogram menu buttons with thin gold underlines,
no pixel art, paper-cut not pixel sprite
```

### Acceptance checklist

- [ ] 16:9；右上冷月、左大标题可读
- [ ] 剪影屋脊/塔/桥；灯笼稀少暖点
- [ ] 色相落在锁定板；无仙侠金爆、无像素
- [ ] 可选小纸人持细红刃，非写实武者

---

## B. Mountain-gate UI Ornaments & Item Icons

**用途**：山门 Hub 装饰角花、卡片图标（丹药、兵刃、甲胄、符箓）。  
**尺寸**：图标 **128×128**（主）或 **64×64**（小）；角花可 **256×256** 透明底。

### Positive — 通用图标壳

```
UI icon for dark-night paper-ink wuxia game hub, flat vector paper-cut silhouette,
centered single object on transparent or #0a0f1a panel, Songti-era wuxia prop,
palette ink navy blood red warm gold moon white, thin gold rim optional,
readable at 64px, mountain-gate Legend-style paper-doll inventory icon,
no text, no pixel art, no chibi
```

### Positive — 分类关键词（替换 object）

| 类 | Keywords |
|---|---|
| 丹药 pills | `round alchemy pill bottle or porcelain vial, blood-red seal, paper talisman strip` |
| 兵刃 weapons | `side-view thin sword or spear or axe silhouette, glowing blood-red edge #e8455a` |
| 甲胄 armor | `paper-doll torso armor plate silhouette, navy lacquer, gold studs sparse` |
| 符箓 talismans | `vertical yellow-brown paper talisman, cinnabar sigil strokes, ink navy accents` |

### Acceptance checklist

- [ ] 64px 仍可辨认类别
- [ ] 透明或夜海军底；无照片质感
- [ ] 单物件居中；无复杂场景
- [ ] 未用 `#4e5058` 以外的灰做「损坏」除非锁定卡

---

## C. Far Background Plates / Interlude Mood

**用途**：远景板、过场情绪图（山门古道、夜竹、远塔）。  
**尺寸**：16:9 **1920×1080**；或可平铺宽板 **2560×720**（高度对齐 720 屏）。

### Positive

```
Far background plate, dark-night paper-ink wuxia side-scroller,
distant mountain silhouettes, cold moon, bamboo grove mid-dark,
architecture teal-gray accents #3a5568, ink sky #060b17,
sparse lantern warm points, fog desat mid #37404c, melancholic requiem mood,
flat vector layered silhouettes, parallax-friendly empty mid band for characters,
no UI, no readable characters in foreground, no pixel art
```

### Acceptance checklist

- [ ] 中景留空带可供纸人站立
- [ ] 分层清晰（远山 / 中竹建 / 近暗地）
- [ ] 无喧宾夺主的亮角色或大字

---

## D. Combat Character Concept Reference ONLY

**用途**：**仅概念参考**，非正式生产精灵。生产路径见 `production-plan.md` Phase 4。  
**尺寸**：单角色 **768×1024** 或 **1024×1024**；需注明可缩至游戏高 **48–64px**。

### Positive — PC

```
Concept reference only, paper-cut shadow-puppet wuxia fighter side view,
navy robe #1a1c2c, red sash #c41e3a, black hat gold rim #d4af37,
white mask disc face #e8eef5, thin glowing red sword #e8455a,
flat vector silhouette, limb thickness paper-strip, head:body about 1:4,
melancholic jianghu, not anime, not pixel sprite, plain ink background
```

### Positive — Enemy example

```
Concept reference only, paper-cut enemy side view, brown robe #6b5344,
red blindfold #c41e3a, blunt silhouette, flat vector, ink background,
readable when scaled to 48-64px height
```

### Acceptance checklist

- [ ] 明确标注 CONCEPT ONLY
- [ ] 侧面；面具/剪纸语言正确
- [ ] 缩到 64px 轮廓仍可读
- [ ] **不**当作最终 sprite sheet 交付

---

## E. Attack FX Concept Reference ONLY

**用途**：刃光、斩弧、气浪的**造型语言参考**；正式 FX 由 Canvas 程序绘制。  
**尺寸**：透明底 **512×512** 或 **768×256** 横幅弧。

### Positive

```
Concept reference for code VFX, thin blood-red slash arc #e8455a,
moon-white spark tips #e8eef5, paper-ink wuxia, flat geometric glow,
minimal particles, dark transparent background, no character body,
style guide for procedural canvas strokes, not a final sprite sheet
```

### Acceptance checklist

- [ ] 造型可被几何/粒子复述（弧、点、短线）
- [ ] 无写实火焰/光电杂讯
- [ ] 交付物不得直接当游戏贴图替换程序刃光

---

## 模板索引

| ID | 名称 |
|---|---|
| A | Title / key art / mood still |
| B | Mountain-gate UI ornaments & item icons |
| C | Far background plates / interlude mood |
| D | Combat character concept reference ONLY |
| E | Attack FX concept reference ONLY |
