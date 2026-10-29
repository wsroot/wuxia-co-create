/**
 * The game's root Cordis context.
 *
 * Created once on first import (before any catalog is read) with the content
 * services already installed, so live catalog aliases (WEAPONS, PILLS, …)
 * exist from module init. Official 内容包 + 门派 are loaded at boot by
 * `bootMenpai` (src/menpai/index.ts → also boots src/content), which main.ts
 * calls before the save is read.
 */
import { Context } from 'cordis';
import { ContentServices } from './services';

export const game = new Context();
game.plugin(ContentServices);

export type GameContext = Context;
