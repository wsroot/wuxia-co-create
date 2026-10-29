export const VIEW_W = 960;
export const VIEW_H = 540;
export const GROUND_Y = 468;
export const GRAVITY = 0.62;
export const STEP_MS = 1000 / 60;
/** Base world zoom: the world is rendered larger than the 960x540 UI space. */
export const WORLD_ZOOM = 1.3;
/** Width / height of the visible world area in world units. */
export const VIEW_WW = VIEW_W / WORLD_ZOOM;
export const VIEW_WH = VIEW_H / WORLD_ZOOM;
/** Screen y where the ground line is drawn. */
export const GROUND_SCREEN_Y = 488;
