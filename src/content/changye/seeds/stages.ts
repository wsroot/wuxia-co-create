/** Oc4: 出厂 CORE_STAGES / CORE_BETWEEN_ACT_BEATS 字面量（原 level/stage.ts）。 */
import type { Platform } from '../../../physics/body';
import { GROUND_Y } from '../../../engine/constants';
import type { StageBeat } from '../../../level/narrative';
import type { StageDef } from '../../../level/stage';

// ---------------------------------------------------------------------------
// Act 1 — 第一幕 · 夜雨江湖 (original layout, unchanged geometry)
// ---------------------------------------------------------------------------
export const ACT1_PLATFORMS: Platform[] = [
  { x: 580, y: GROUND_Y - 96, w: 170, h: 96, kind: 'roof' },
  { x: 920, y: GROUND_Y - 72, w: 140, h: 72, kind: 'bridge' },
  { x: 1180, y: GROUND_Y - 110, w: 150, h: 110, kind: 'pavilion' },
  { x: 1550, y: GROUND_Y - 80, w: 160, h: 80, kind: 'roof' },
  { x: 1980, y: GROUND_Y - 100, w: 180, h: 100, kind: 'roof' },
  { x: 2280, y: GROUND_Y - 70, w: 200, h: 70, kind: 'bridge' },
  { x: 2580, y: GROUND_Y - 115, w: 140, h: 115, kind: 'pavilion' },
  { x: 3380, y: GROUND_Y - 105, w: 190, h: 105, kind: 'roof' },
  { x: 3680, y: GROUND_Y - 78, w: 160, h: 78, kind: 'bridge' },
  { x: 3960, y: GROUND_Y - 120, w: 170, h: 120, kind: 'pavilion' },
  { x: 4400, y: GROUND_Y - 88, w: 150, h: 88, kind: 'roof' },
  { x: 4860, y: GROUND_Y - 100, w: 160, h: 100, kind: 'roof' },
  { x: 5120, y: GROUND_Y - 75, w: 140, h: 75, kind: 'bridge' },
];

export const ACT1: StageDef = {
  actIndex: 0,
  id: 'act1',
  title: '第一幕 · 夜雨江湖',
  subtitle: '月下江湖，剑气如霜',
  length: 5800,
  start: 220,
  backdropTheme: 'night',
  arenas: [
    {
      name: '山门古道', x0: 520, trigger: 860,
      waves: [
        [{ type: 'axe', side: 'R', delay: 0 }, { type: 'axe', side: 'L', delay: 50 }],
        [{ type: 'axe', side: 'R', delay: 0 }, { type: 'archer', side: 'R', delay: 30 }],
      ],
    },
    {
      name: '竹林栈道', x0: 1900, trigger: 2240,
      waves: [
        [{ type: 'shield', side: 'R', delay: 0 }, { type: 'axe', side: 'L', delay: 40 }],
        [{ type: 'archer', side: 'R', delay: 0 }, { type: 'archer', side: 'L', delay: 20 }, { type: 'axe', side: 'R', delay: 60 }],
      ],
    },
    {
      name: '古刹前殿', x0: 3300, trigger: 3640,
      waves: [
        [{ type: 'shield', side: 'L', delay: 0 }, { type: 'shield', side: 'R', delay: 30 }],
        [{ type: 'axe', side: 'R', delay: 0 }, { type: 'archer', side: 'L', delay: 20 }, { type: 'archer', side: 'R', delay: 40 }, { type: 'axe', side: 'L', delay: 80 }],
      ],
    },
  ],
  boss: {
    name: '镇山古刹', x0: 4760, trigger: 5040,
    bossName: '镇山石兽', bossSubtitle: '古刹镇山 · 石兽苏醒',
    bossId: 'gargoyle', hpScale: 1, dmgScale: 1, tint: 'jade',
  },
  platforms: ACT1_PLATFORMS,
  beats: [
    { id: 'act1.enter', when: 'enter', title: '第一幕 · 夜雨江湖', subtitle: '月下江湖，剑气如霜', holdFrames: 200 },
    { id: 'act1.afterArena.0', when: 'afterArena', arenaIndex: 0, title: '雨声未歇', subtitle: '古道尽头，竹影摇曳', holdFrames: 110 },
    { id: 'act1.afterArena.1', when: 'afterArena', arenaIndex: 1, title: '寺钟隐隐', subtitle: '前殿灯火，如有人候', holdFrames: 110 },
    { id: 'act1.afterArena.2', when: 'afterArena', arenaIndex: 2, title: '石阶生寒', subtitle: '镇山之物，已睁开眼', holdFrames: 120 },
    { id: 'act1.beforeBoss', when: 'beforeBoss', title: '镇山石兽', subtitle: '古刹镇山 · 石兽苏醒', holdFrames: 170 },
    { id: 'act1.afterBoss', when: 'afterBoss', title: '石兽崩塌', subtitle: '第一幕终 · 夜色更深…', holdFrames: 150, slowmo: 0.55 },
  ],
};

// ---------------------------------------------------------------------------
// Act 2 — 第二幕 · 雨夜客栈
// ---------------------------------------------------------------------------
const ACT2_PLATFORMS: Platform[] = [
  { x: 480, y: GROUND_Y - 90, w: 160, h: 90, kind: 'roof' },
  { x: 820, y: GROUND_Y - 68, w: 180, h: 68, kind: 'bridge' },
  { x: 1120, y: GROUND_Y - 105, w: 140, h: 105, kind: 'pavilion' },
  { x: 1480, y: GROUND_Y - 78, w: 150, h: 78, kind: 'roof' },
  { x: 1880, y: GROUND_Y - 95, w: 170, h: 95, kind: 'roof' },
  { x: 2200, y: GROUND_Y - 70, w: 190, h: 70, kind: 'bridge' },
  { x: 2520, y: GROUND_Y - 112, w: 150, h: 112, kind: 'pavilion' },
  { x: 2920, y: GROUND_Y - 82, w: 140, h: 82, kind: 'roof' },
  { x: 3320, y: GROUND_Y - 100, w: 180, h: 100, kind: 'roof' },
  { x: 3620, y: GROUND_Y - 72, w: 160, h: 72, kind: 'bridge' },
  { x: 3900, y: GROUND_Y - 118, w: 160, h: 118, kind: 'pavilion' },
  { x: 4300, y: GROUND_Y - 88, w: 150, h: 88, kind: 'roof' },
  { x: 4720, y: GROUND_Y - 98, w: 170, h: 98, kind: 'roof' },
  { x: 5000, y: GROUND_Y - 74, w: 150, h: 74, kind: 'bridge' },
];

const ACT2: StageDef = {
  actIndex: 1,
  id: 'act2',
  title: '第二幕 · 雨夜客栈',
  subtitle: '檐下灯笼，水面映刀',
  length: 5600,
  start: 200,
  backdropTheme: 'dock',
  arenas: [
    {
      name: '客栈檐廊', x0: 480, trigger: 820,
      waves: [
        [{ type: 'axe', side: 'R', delay: 0 }, { type: 'axe', side: 'L', delay: 30 }, { type: 'archer', side: 'R', delay: 55 }],
        [{ type: 'shield', side: 'R', delay: 0 }, { type: 'axe', side: 'L', delay: 25 }, { type: 'archer', side: 'L', delay: 50 }],
      ],
    },
    {
      name: '断桥码头', x0: 1800, trigger: 2140,
      waves: [
        [{ type: 'shield', side: 'L', delay: 0 }, { type: 'shield', side: 'R', delay: 20 }, { type: 'axe', side: 'R', delay: 50 }],
        [{ type: 'archer', side: 'R', delay: 0 }, { type: 'archer', side: 'L', delay: 15 }, { type: 'axe', side: 'R', delay: 40 }, { type: 'axe', side: 'L', delay: 70 }],
      ],
    },
    {
      name: '船坞暗巷', x0: 3200, trigger: 3540,
      waves: [
        [{ type: 'shield', side: 'R', delay: 0 }, { type: 'archer', side: 'L', delay: 20 }, { type: 'archer', side: 'R', delay: 35 }],
        [{ type: 'axe', side: 'L', delay: 0 }, { type: 'shield', side: 'R', delay: 25 }, { type: 'archer', side: 'R', delay: 45 }, { type: 'axe', side: 'R', delay: 70 }],
      ],
    },
  ],
  boss: {
    name: '渡口石祠', x0: 4600, trigger: 4880,
    bossName: '渡口石狮', bossSubtitle: '雨湿石毛 · 渡口镇守',
    bossId: 'gargoyle', hpScale: 1.25, dmgScale: 1.12, tint: 'ink',
  },
  platforms: ACT2_PLATFORMS,
  beats: [
    { id: 'act2.enter', when: 'enter', title: '第二幕 · 雨夜客栈', subtitle: '檐下灯笼，水面映刀', holdFrames: 180 },
    { id: 'act2.afterArena.0', when: 'afterArena', arenaIndex: 0, title: '桥上无人', subtitle: '只余雨声与锈铁气味', holdFrames: 110 },
    { id: 'act2.afterArena.1', when: 'afterArena', arenaIndex: 1, title: '船坞深处', subtitle: '有石兽立于水雾之间', holdFrames: 110 },
    { id: 'act2.afterArena.2', when: 'afterArena', arenaIndex: 2, title: '潮声如鼓', subtitle: '渡口石祠已近', holdFrames: 120 },
    { id: 'act2.beforeBoss', when: 'beforeBoss', title: '渡口石狮', subtitle: '雨湿石毛 · 渡口镇守', holdFrames: 170 },
    { id: 'act2.afterBoss', when: 'afterBoss', title: '潮退石裂', subtitle: '第二幕终 · 岸影渐远', holdFrames: 150, slowmo: 0.55 },
  ],
};

// ---------------------------------------------------------------------------
// Act 3 — 第三幕 · 荒冢残城
// ---------------------------------------------------------------------------
const ACT3_PLATFORMS: Platform[] = [
  { x: 500, y: GROUND_Y - 100, w: 150, h: 100, kind: 'roof' },
  { x: 860, y: GROUND_Y - 70, w: 160, h: 70, kind: 'bridge' },
  { x: 1160, y: GROUND_Y - 118, w: 140, h: 118, kind: 'pavilion' },
  { x: 1520, y: GROUND_Y - 85, w: 155, h: 85, kind: 'roof' },
  { x: 1920, y: GROUND_Y - 108, w: 175, h: 108, kind: 'roof' },
  { x: 2240, y: GROUND_Y - 68, w: 200, h: 68, kind: 'bridge' },
  { x: 2560, y: GROUND_Y - 120, w: 145, h: 120, kind: 'pavilion' },
  { x: 2960, y: GROUND_Y - 80, w: 150, h: 80, kind: 'roof' },
  { x: 3380, y: GROUND_Y - 102, w: 185, h: 102, kind: 'roof' },
  { x: 3680, y: GROUND_Y - 75, w: 155, h: 75, kind: 'bridge' },
  { x: 3960, y: GROUND_Y - 122, w: 165, h: 122, kind: 'pavilion' },
  { x: 4360, y: GROUND_Y - 90, w: 145, h: 90, kind: 'roof' },
  { x: 4780, y: GROUND_Y - 105, w: 165, h: 105, kind: 'roof' },
  { x: 5060, y: GROUND_Y - 72, w: 140, h: 72, kind: 'bridge' },
];

const ACT3: StageDef = {
  actIndex: 2,
  id: 'act3',
  title: '第三幕 · 荒冢残城',
  subtitle: '灰雾压城，箭雨如丝',
  length: 5700,
  start: 200,
  backdropTheme: 'ash',
  arenas: [
    {
      name: '墓道石阶', x0: 500, trigger: 840,
      waves: [
        [{ type: 'shield', side: 'R', delay: 0 }, { type: 'archer', side: 'R', delay: 20 }, { type: 'archer', side: 'L', delay: 40 }],
        [{ type: 'shield', side: 'L', delay: 0 }, { type: 'shield', side: 'R', delay: 25 }, { type: 'axe', side: 'R', delay: 50 }, { type: 'archer', side: 'L', delay: 70 }],
      ],
    },
    {
      name: '废城残垣', x0: 1850, trigger: 2190,
      waves: [
        [{ type: 'archer', side: 'R', delay: 0 }, { type: 'archer', side: 'L', delay: 10 }, { type: 'shield', side: 'R', delay: 35 }, { type: 'axe', side: 'L', delay: 55 }],
        [{ type: 'shield', side: 'L', delay: 0 }, { type: 'shield', side: 'R', delay: 20 }, { type: 'archer', side: 'R', delay: 40 }, { type: 'archer', side: 'L', delay: 55 }, { type: 'axe', side: 'R', delay: 80 }],
      ],
    },
    {
      name: '祭坛废墟', x0: 3300, trigger: 3640,
      waves: [
        [{ type: 'shield', side: 'R', delay: 0 }, { type: 'shield', side: 'L', delay: 15 }, { type: 'archer', side: 'R', delay: 30 }, { type: 'archer', side: 'L', delay: 45 }],
        [{ type: 'axe', side: 'R', delay: 0 }, { type: 'axe', side: 'L', delay: 20 }, { type: 'shield', side: 'R', delay: 40 }, { type: 'archer', side: 'L', delay: 55 }, { type: 'archer', side: 'R', delay: 70 }],
      ],
    },
  ],
  boss: {
    name: '冢门石阵', x0: 4680, trigger: 4960,
    bossName: '墓守石俑', bossSubtitle: '灰土裂开 · 冢门苏醒',
    bossId: 'gargoyle', hpScale: 1.45, dmgScale: 1.22, tint: 'ash',
  },
  platforms: ACT3_PLATFORMS,
  beats: [
    { id: 'act3.enter', when: 'enter', title: '第三幕 · 荒冢残城', subtitle: '灰雾压城，箭雨如丝', holdFrames: 180 },
    { id: 'act3.afterArena.0', when: 'afterArena', arenaIndex: 0, title: '碑文漫漶', subtitle: '残垣之后，城影更暗', holdFrames: 110 },
    { id: 'act3.afterArena.1', when: 'afterArena', arenaIndex: 1, title: '祭火已熄', subtitle: '废坛之上，石俑睁目', holdFrames: 110 },
    { id: 'act3.afterArena.2', when: 'afterArena', arenaIndex: 2, title: '冢门洞开', subtitle: '灰雾中有沉重脚步', holdFrames: 120 },
    { id: 'act3.beforeBoss', when: 'beforeBoss', title: '墓守石俑', subtitle: '灰土裂开 · 冢门苏醒', holdFrames: 170 },
    { id: 'act3.afterBoss', when: 'afterBoss', title: '俑碎烟散', subtitle: '第三幕终 · 峰影在望', holdFrames: 150, slowmo: 0.55 },
  ],
};

// ---------------------------------------------------------------------------
// Act 4 — 第四幕 · 月蚀峰巅
// ---------------------------------------------------------------------------
const ACT4_PLATFORMS: Platform[] = [
  { x: 460, y: GROUND_Y - 98, w: 155, h: 98, kind: 'roof' },
  { x: 800, y: GROUND_Y - 72, w: 170, h: 72, kind: 'bridge' },
  { x: 1100, y: GROUND_Y - 115, w: 145, h: 115, kind: 'pavilion' },
  { x: 1460, y: GROUND_Y - 88, w: 150, h: 88, kind: 'roof' },
  { x: 1860, y: GROUND_Y - 105, w: 180, h: 105, kind: 'roof' },
  { x: 2180, y: GROUND_Y - 70, w: 195, h: 70, kind: 'bridge' },
  { x: 2500, y: GROUND_Y - 120, w: 150, h: 120, kind: 'pavilion' },
  { x: 2880, y: GROUND_Y - 82, w: 145, h: 82, kind: 'roof' },
  { x: 3280, y: GROUND_Y - 108, w: 190, h: 108, kind: 'roof' },
  { x: 3580, y: GROUND_Y - 74, w: 160, h: 74, kind: 'bridge' },
  { x: 3880, y: GROUND_Y - 124, w: 170, h: 124, kind: 'pavilion' },
  { x: 4280, y: GROUND_Y - 92, w: 155, h: 92, kind: 'roof' },
  { x: 4700, y: GROUND_Y - 110, w: 175, h: 110, kind: 'roof' },
  { x: 5000, y: GROUND_Y - 76, w: 150, h: 76, kind: 'bridge' },
];

const ACT4: StageDef = {
  actIndex: 3,
  id: 'act4',
  title: '第四幕 · 月蚀峰巅',
  subtitle: '长夜尽头，月色如血',
  length: 5750,
  start: 200,
  backdropTheme: 'eclipse',
  arenas: [
    {
      name: '绝壁栈道', x0: 460, trigger: 800,
      waves: [
        [{ type: 'shield', side: 'R', delay: 0 }, { type: 'axe', side: 'L', delay: 15 }, { type: 'archer', side: 'R', delay: 30 }, { type: 'archer', side: 'L', delay: 50 }],
        [{ type: 'shield', side: 'L', delay: 0 }, { type: 'shield', side: 'R', delay: 20 }, { type: 'axe', side: 'R', delay: 40 }, { type: 'archer', side: 'L', delay: 55 }, { type: 'axe', side: 'L', delay: 80 }],
      ],
    },
    {
      name: '峰腰祭坛', x0: 1800, trigger: 2140,
      waves: [
        [{ type: 'archer', side: 'R', delay: 0 }, { type: 'archer', side: 'L', delay: 8 }, { type: 'shield', side: 'R', delay: 30 }, { type: 'shield', side: 'L', delay: 45 }, { type: 'axe', side: 'R', delay: 65 }],
        [{ type: 'axe', side: 'L', delay: 0 }, { type: 'axe', side: 'R', delay: 15 }, { type: 'shield', side: 'R', delay: 35 }, { type: 'archer', side: 'L', delay: 50 }, { type: 'archer', side: 'R', delay: 65 }, { type: 'axe', side: 'L', delay: 90 }],
      ],
    },
    {
      name: '月蚀台', x0: 3200, trigger: 3540,
      waves: [
        [{ type: 'shield', side: 'R', delay: 0 }, { type: 'shield', side: 'L', delay: 12 }, { type: 'archer', side: 'R', delay: 28 }, { type: 'archer', side: 'L', delay: 40 }, { type: 'axe', side: 'R', delay: 60 }],
        [{ type: 'axe', side: 'R', delay: 0 }, { type: 'shield', side: 'L', delay: 18 }, { type: 'shield', side: 'R', delay: 32 }, { type: 'archer', side: 'L', delay: 48 }, { type: 'archer', side: 'R', delay: 60 }, { type: 'axe', side: 'L', delay: 85 }],
      ],
    },
  ],
  boss: {
    name: '长夜祭台', x0: 4620, trigger: 4900,
    bossName: '长夜石魔', bossSubtitle: '月蚀峰巅 · 长夜尽头',
    bossId: 'gargoyle', hpScale: 1.75, dmgScale: 1.35, tint: 'blood',
  },
  platforms: ACT4_PLATFORMS,
  beats: [
    { id: 'act4.enter', when: 'enter', title: '第四幕 · 月蚀峰巅', subtitle: '长夜尽头，月色如血', holdFrames: 200 },
    { id: 'act4.afterArena.0', when: 'afterArena', arenaIndex: 0, title: '风裂衣袂', subtitle: '祭坛在上，月已半蚀', holdFrames: 110 },
    { id: 'act4.afterArena.1', when: 'afterArena', arenaIndex: 1, title: '血月将圆', subtitle: '台下石影，如魔伫立', holdFrames: 110 },
    { id: 'act4.afterArena.2', when: 'afterArena', arenaIndex: 2, title: '夜色尽头', subtitle: '此战之后，再无退路', holdFrames: 130 },
    { id: 'act4.beforeBoss', when: 'beforeBoss', title: '长夜石魔', subtitle: '月蚀峰巅 · 长夜尽头', holdFrames: 180 },
    { id: 'act4.afterBoss', when: 'afterBoss', title: '长夜安魂', subtitle: '四幕终 · 剑收月升', holdFrames: 180, slowmo: 0.45 },
  ],
};

/** Inter-act transition beats (stable ids for story hooks) — registered below. */
export const CORE_BETWEEN_ACT_BEATS: StageBeat[] = [
  { id: 'betweenActs.1to2', when: 'betweenActs', title: '夜色更深…', subtitle: '雨夜客栈的灯火在远方亮起', holdFrames: 160, slowmo: 0.5 },
  { id: 'betweenActs.2to3', when: 'betweenActs', title: '夜色更深…', subtitle: '岸尽处，荒冢残城吞没雾色', holdFrames: 160, slowmo: 0.5 },
  { id: 'betweenActs.3to4', when: 'betweenActs', title: '夜色更深…', subtitle: '峰巅月蚀，长夜将尽', holdFrames: 170, slowmo: 0.45 },
];

/** Official four acts — registered by the official 内容包 (src/content/core). */
export const CORE_STAGES: StageDef[] = [ACT1, ACT2, ACT3, ACT4];
