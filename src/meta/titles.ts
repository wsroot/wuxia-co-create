/**
 * 战绩称号 — hub wall + tiny QoL.
 */
import { getTitle, listTitles, titleMapView } from './contentRegistry';

/** Built-in 称号 ids. */
export type CoreTitleId =
  | 'wushang'      // 无伤通关
  | 'chaoxi'       // 潮汐全清
  | 'lingbeng'     // 零崩刀
  | 'chujue'       // 处决达人
  | 'anhun';       // 安魂目标

/** Runtime id — any registered title. */
export type TitleId = string;

export interface TitleDef {
  id: TitleId;
  name: string;
  desc: string;
  /** Tiny permanent QoL (not big power). */
  qol: string;
  startPotions?: number;
  parryWindowBonus?: number;
  shopDiscount?: number;
}

/** Oc5: isCore* 查官方包 id 集（字面量在 changye/seeds；不对外 re-export）。 */
import { CORE_TITLES } from '../content/changye/seeds/titles';

/** Live catalog backed by ctx.titles. */
export const TITLES: TitleDef[] = listTitles();
export const TITLE_BY_ID: Record<string, TitleDef> = titleMapView();

export function isTitleId(id: string): id is TitleId {
  return getTitle(id) !== undefined;
}

/** Oc4: 查官方包 id 集。 */
export function isCoreTitleId(id: string): id is CoreTitleId {
  return CORE_TITLES.some((t) => t.id === id);
}

export { getTitle, listTitles };

export interface TitleProgress {
  unlocked: TitleId[];
  /** Run counters (reset each beginRun). */
  runDamageTaken: number;
  runBengdao: number;
  runExecutes: number;
  runTideCleared: boolean;
  runAnhunDone: boolean;
  /** Act clear without damage this act. */
  actDamageTaken: number;
}

export function emptyTitleProgress(): TitleProgress {
  return {
    unlocked: [],
    runDamageTaken: 0,
    runBengdao: 0,
    runExecutes: 0,
    runTideCleared: false,
    runAnhunDone: false,
    actDamageTaken: 0,
  };
}
