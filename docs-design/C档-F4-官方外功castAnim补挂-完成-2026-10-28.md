# C 档 F4：官方外功 castAnim 补挂 — 完成记录

日期：2026-10-28 Asia/Shanghai。  
蓝图：`C档-功法castAnim特效蓝图-2026-10-28.md` F4。  
**bump=否**；**不部署**；纯数据；不新建 AnimStep kind / 配方；不改伤害数值。

## 做法

为尚无 `castAnim` 的 `CORE_SKILLS` 主动外功挂**既有**官方技能向配方（13 条中的 7 条技能向；符向未用）。保留 `zhanma→hopSlash`、`tuci→dashThrust`。被动无施放，不挂。

### skill → recipe（完整表）

| skill | 名 | castAnim | 语义 |
| --- | --- | --- | --- |
| daomang | 刀芒 | crescentInk | 刃芒 / 月牙+剑气 |
| qiangjue | 刺枪诀 | thrustInk | 透骨一刺 |
| bengquan | 崩拳 | groundBreak | 崩山砸地 |
| huzhua | 虎爪 | slashInk | 爪击挥砍 |
| huixuan | 回旋斩 | crescentInk | 宽幅回旋 |
| zhanma | 斩马刀 | hopSlash | **保留** 跃斩 |
| tuci | 突刺 | dashThrust | **保留** 突进刺 |
| chuanxin | 穿心枪 | thrustInk | 贯穿刺 |
| hengsao | 横扫 | slashInk | 横斫挥砍 |
| kaitian | 开天斧 | groundBreak | 霸体重砸 |
| tieshan | 铁山靠 | dashThrust | 肩靠突进 |
| fanyun | 翻云腿 | hopSlash | 翻身上踢 |
| liaoshang | 疗伤 | mistRise | 运功气雾 |
| pojun | 破军 | mistRise | 破喝气势 |
| ningqi | 凝气 | mistRise | 凝神聚气 |

被动（qinggong / shanshen / tiebushan / lianhuan）：无 `castAnim`。

配方仍 **13** 条，未加种。

## 改动文件

| 路径 | 改动 |
| --- | --- |
| `src/meta/skills.ts` | 13 门外功补 `castAnim` 字符串（上表新增项） |
| `scripts/menpai-smoke.ts` | F4 抽查断言 skill→recipe + `listAnimRecipes().length === 13` |

未改：`animScripts.ts`、解释器、符咒、武器已收口项、DLC/设计台。

## 验收

- `npm run test:menpai` ALL PASS（含 F4 全部 skill→recipe 断言）
- `npm run build` 绿（`tsc --noEmit` + `vite build`）

## 建议

本线惯例 **不建议部署**（数据观感补挂，非紧急体验缺口；推进若要试播可再派）。不 bump。

## 功法观感线收口

| 期 | 状态 |
| --- | --- |
| F1 远程+设计台 castAnim | **已做**（`C档-F1-DLC-animRecipes注入-完成` · `C档-F1-设计台castAnim-完成`） |
| F2 设计台 castFx + 种子 | **已做**（设计台：`C档-F2-设计台castFx-完成`；bingren 种子随 F3 对齐） |
| F3 示范包只登记 | **已做**（`C档-F3-功法castAnim示范包-完成`） |
| F4 官方外功补挂 | **本单完成** |

蓝图 F1–F4 范围内 **功法观感线可收口**。后续若要扩 AnimStep kind / 实时预览 / 符咒专线，另开单。
