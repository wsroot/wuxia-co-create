import './style.css';
import { preloadArt } from './render/artAssets';
import { VIEW_H, VIEW_W } from './engine/constants';
import { Input } from './engine/input';
import { Loop } from './engine/loop';
import { AudioEngine } from './audio/audio';
import { Music } from './audio/music';
import { playSfx } from './audio/sfx';
import { Game } from './game';
import { buildBackdrop } from './render/backgrounds';
import { renderScene } from './render/scene';
import { drawHUD, betweenCardRect } from './ui/hud';
import { Screens } from './ui/screens';
import { TouchControls } from './ui/touch';
import { renderGallery } from './render/gallery';
import { Progression } from './meta/progression';
import { renderHub } from './ui/hub';
import { makeEnemy } from './entities/enemies/factory';
import { SAVE_KEY } from './meta/types';
import { scaleAttack, loadout, affinityVs } from './combat/weaponRuntime';
import { WEAPONS } from './meta/weapons';
import { GROUND_CHAIN, PM } from './combat/playerMoves';
import { bootMenpai, loadMenpai, unloadMenpai, menpaiFromUrl, loadPack, unloadPack, packFromUrl, listLoadedMenpai, isMenpaiLoaded, listMenpaiCatalog, listDlcStore, listDlcStoreAsync, listLoadedPacks, isPackLoaded, listPackCatalog, enableDlc, enableDlcAsync } from './menpai';
import { game as gameCtx } from './plugins/root';

type Mode = 'title' | 'hub' | 'play' | 'pause' | 'over' | 'win';

const params = new URLSearchParams(location.search);
// Load 官方内容包 + 官方门派, then any ?pack= / ?menpai= extras (before save).
bootMenpai(menpaiFromUrl(location.search), packFromUrl(location.search));
const flag = (k: string) => params.has(k) && params.get(k) !== '0';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d', { alpha: false })!;

/** Block mobile Safari/Chrome pinch, page bounce, and non-intentional scroll. */
function installNoPageZoom(): void {
  const block = (e: Event) => { e.preventDefault(); };
  const scrollableSel = '.hub-tab-body, .help.open, .hub-tabs, .hub-acts, .dlc-scroll';
  const inScrollable = (t: EventTarget | null) =>
    !!(t instanceof Element && t.closest(scrollableSel));

  // Safari non-standard gesture events
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend'] as const) {
    document.addEventListener(ev, block, { passive: false });
  }
  // Block page/trackpad scroll; allow only intentional hub scroll regions
  document.addEventListener('wheel', (e) => {
    if (e.ctrlKey || !inScrollable(e.target)) e.preventDefault();
  }, { passive: false });
  // Pinch + body bounce: keep tab-body / help / tab strip usable
  document.addEventListener('touchmove', (e) => {
    const te = e as TouchEvent & { scale?: number };
    if (typeof te.scale === 'number' && te.scale !== 1) { e.preventDefault(); return; }
    if (e.touches.length > 1) { e.preventDefault(); return; }
    if (!inScrollable(e.target)) e.preventDefault();
  }, { passive: false });
  // Double-tap zoom: only suppress rapid successive taps on the game canvas / empty chrome
  let lastTap = 0;
  document.addEventListener('touchend', (e) => {
    const t = e.target as Element | null;
    const onChrome = !t || t === document.body || t === document.documentElement
      || t.id === 'app' || t.id === 'game' || (t as HTMLElement).tagName === 'CANVAS';
    if (!onChrome) { lastTap = Date.now(); return; }
    const now = Date.now();
    if (now - lastTap < 350) e.preventDefault();
    lastTap = now;
  }, { passive: false });
}
installNoPageZoom();

const input = new Input();
input.attachKeyboard(window);
preloadArt();
const audio = new AudioEngine();
const music = new Music(audio);
const ua = navigator.userAgent || '';
const isAppleMobile = /iPhone|iPad|iPod/i.test(ua)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isTouch = flag('touch') || isAppleMobile
  || matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
document.body.classList.toggle('touch', isTouch);
const touch = new TouchControls(document.getElementById('touch')!, input);
touch.setVisible(false);

const prog = new Progression();
if (flag('resetmeta')) prog.reset();
// ?meta=1 seeds a mid-game save for tests / demos (overwrites current save).
if (flag('meta')) prog.seedForTest();

let backdrop = buildBackdrop(Math.min(1.5, window.devicePixelRatio || 1));
let mode: Mode = 'title';
let startBoss = flag('boss');
let startAct = Math.max(0, Math.min(3, Number(params.get('act') ?? '0') || 0));

const makeGame = (boss: boolean, beginMeta: boolean, act?: number, training = false) => {
  const mods = beginMeta ? prog.beginRun() : { ...prog.mods(), startPotions: 0 };
  const g = new Game(input, audio, music, {
    boss, debug: flag('debug'), god: flag('god') || training, touch: isTouch, mods, meta: prog,
    training,
    act: act ?? startAct,
  });
  g.on((e) => {
    touch.setVisible(false);
    if (e.type === 'gameover') {
      mode = 'over';
      screens.gameOver(e.stats, e.rewards);
    } else {
      mode = 'win';
      screens.victory(e.stats, e.rewards);
    }
  });
  return g;
};
let game = makeGame(false, false);

const screens = new Screens(document.getElementById('ui')!, {
  start: (boss) => { startBoss = !!boss || flag('boss'); startGame(); },
  resume: () => setPause(false),
  restart: () => startGame(),
  title: () => toTitle(),
  hub: () => toHub(),
  toggleMute: () => { audio.setMuted(!audio.muted); return audio.muted; },
  click: () => { unlockAudio(); playSfx(audio, 'ui'); },
});

function unlockAudio(): void {
  const ua = (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation;
  if (ua && !ua.isActive) return;
  const had = !!audio.ctx;
  if (audio.ensure() && !had) music.resume();
}
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', unlockAudio);

function startTraining(): void {
  unlockAudio();
  input.clear();
  prog.data.dojoVisits = (prog.data.dojoVisits ?? 0) + 1;
  prog.mark();
  startBoss = false;
  game = makeGame(false, false, 0, true);
  mode = 'play';
  screens.hide();
  touch.setVisible(isTouch);
  {
    const layout = localStorage.getItem('requiem-touch-layout') as 'compact' | 'wide' | null;
    if (layout) touch.setLayout(layout);
  }
  music.setMode('stage');
  game.showBanner('训练场', '木人演武 · 败北或通关后回山门', 120);
  setTimeout(() => {
    game.enemies.push(makeEnemy('axe', game.player.x + 180, { scale: 0.9, eliteChance: 0.5 }));
    game.enemies.push(makeEnemy('shield', game.player.x + 260, { scale: 0.85, eliteChance: 0.3 }));
  }, 400);
  game.on(() => { setTimeout(() => toHub(), 600); });
}

function startGame(act?: number): void {
  unlockAudio();
  input.clear();
  if (act !== undefined) startAct = act;
  game = makeGame(startBoss, true, startAct);
  mode = 'play';
  screens.hide();
  touch.setVisible(isTouch);
  {
    const layout = localStorage.getItem('requiem-touch-layout') as 'compact' | 'wide' | null;
    if (layout) touch.setLayout(layout);
  }
  music.setMode(startBoss ? 'boss' : 'stage');
}

function toTitle(): void {
  mode = 'title';
  game = makeGame(false, false);
  screens.title(audio.muted, prog.summaryLine());
  touch.setVisible(false);
  music.setMode('title');
}

function toHub(): void {
  mode = 'hub';
  touch.setVisible(false);
  music.setMode('title');
  renderHub(document.getElementById('ui')!, prog, {
    start: (boss, act) => { startBoss = !!boss; startGame(act); },
    training: () => startTraining(),
    title: () => toTitle(),
    refresh: () => toHub(),
    click: () => { unlockAudio(); playSfx(audio, 'ui'); },
  });
  // mark screens current so its global click ignores hub buttons it doesn't own
  screens.current = 'hub';
}

function setPause(p: boolean): void {
  if (p && mode === 'play') { mode = 'pause'; screens.pause(); touch.setVisible(false); input.clear(); }
  else if (!p && mode === 'pause') { mode = 'play'; screens.hide(); touch.setVisible(isTouch); }
}

input.onPress((a) => {
  if (a === 'pause') setPause(mode === 'play');
  else if (mode === 'title' && (a === 'attack' || a === 'jump') && !document.querySelector('.help.open')) {
    if (document.activeElement?.tagName !== 'BUTTON') startGame();
  }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) setPause(true); });

const pauseBtn = document.createElement('button');
pauseBtn.className = 'pause-btn';
pauseBtn.textContent = '❚❚';
pauseBtn.setAttribute('aria-label', '暂停');
pauseBtn.addEventListener('click', () => setPause(mode === 'play'));
document.getElementById('app')!.appendChild(pauseBtn);

/** Map a pointer event on the game canvas to 960×540 view coords. */
function pointerToView(e: PointerEvent): { x: number; y: number } | null {
  const r = canvas.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return null;
  return {
    x: ((e.clientX - r.left) / r.width) * VIEW_W,
    y: ((e.clientY - r.top) / r.height) * VIEW_H,
  };
}

/** Tap 幕间三选一 cards drawn on canvas (touch pills are a backup). */
canvas.addEventListener('pointerdown', (e) => {
  if (mode !== 'play') return;
  if (!game.pausedForEvent || !game.runEvents.between) return;
  const pt = pointerToView(e);
  if (!pt) return;
  for (let i = 0; i < 3; i++) {
    const r = betweenCardRect(i);
    if (pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h) {
      e.preventDefault();
      game.pickBetweenChoice(i);
      playSfx(audio, 'ui');
      return;
    }
  }
});


/**
 * Fit #app / #touch / canvas to the *visual* viewport.
 * iOS Safari can keep page-zoom (scale≠1) even with user-scalable=no; layout
 * viewport then exceeds what the user sees and crops the virtual stick.
 * Pinning the shell to visualViewport keeps playfield + HUD fully visible.
 */
const appEl = document.getElementById('app')!;
const touchEl = document.getElementById('touch')!;
const zoomHint = document.createElement('button');
zoomHint.type = 'button';
zoomHint.id = 'zoom-hint';
zoomHint.hidden = true;
zoomHint.textContent = '页面已放大 · 点此适配画面（或双指捏合缩小）';
appEl.appendChild(zoomHint);

function readSafeInsets(): { t: number; r: number; b: number; l: number } {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;'
    + 'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const n = (v: string) => Math.max(0, parseFloat(v) || 0);
  const out = { t: n(cs.paddingTop), r: n(cs.paddingRight), b: n(cs.paddingBottom), l: n(cs.paddingLeft) };
  probe.remove();
  // Landscape notch / Dynamic Island: ensure a usable minimum even if env is 0 briefly
  const landscape = window.matchMedia('(orientation: landscape)').matches;
  if (landscape && isTouch) {
    out.l = Math.max(out.l, 28);
    out.r = Math.max(out.r, 16);
    out.b = Math.max(out.b, 10);
    out.t = Math.max(out.t, 8);
  }
  return out;
}

function pinShell(left: number, top: number, width: number, height: number): void {
  for (const el of [appEl, touchEl]) {
    el.style.position = 'fixed';
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;
    el.style.right = 'auto';
    el.style.bottom = 'auto';
    el.style.margin = '0';
    el.style.transform = 'none';
  }
}

function resize(): void {
  const vv = window.visualViewport;
  const scale = vv?.scale ?? 1;
  const vw = Math.max(1, vv?.width ?? window.innerWidth);
  const vh = Math.max(1, vv?.height ?? window.innerHeight);
  const ox = vv?.offsetLeft ?? 0;
  const oy = vv?.offsetTop ?? 0;

  pinShell(ox, oy, vw, vh);

  const safe = readSafeInsets();
  document.documentElement.style.setProperty('--safe-t', `${safe.t}px`);
  document.documentElement.style.setProperty('--safe-r', `${safe.r}px`);
  document.documentElement.style.setProperty('--safe-b', `${safe.b}px`);
  document.documentElement.style.setProperty('--safe-l', `${safe.l}px`);

  // Letterbox (contain) 960×540 inside the visible safe rect — never cover-crop HUD
  const availW = Math.max(1, vw - safe.l - safe.r);
  const availH = Math.max(1, vh - safe.t - safe.b);
  const s = Math.min(availW / VIEW_W, availH / VIEW_H);
  const cw = Math.max(1, Math.floor(VIEW_W * s));
  const ch = Math.max(1, Math.floor(VIEW_H * s));
  const dpr = Math.min(2, window.devicePixelRatio || 1);

  canvas.style.width = `${cw}px`;
  canvas.style.height = `${ch}px`;
  canvas.width = Math.floor(cw * dpr);
  canvas.height = Math.floor(ch * dpr);
  document.documentElement.style.setProperty('--gw', `${cw}px`);
  document.documentElement.style.setProperty('--gh', `${ch}px`);

  // Keep UI overlay aligned with canvas letterbox box
  const ui = document.getElementById('ui');
  if (ui) {
    ui.style.width = `${cw}px`;
    ui.style.height = `${ch}px`;
  }

  zoomHint.hidden = !(scale > 1.01);
  document.body.classList.toggle('page-zoomed', scale > 1.01);

  const want = Math.min(1.5, s * dpr);
  if (Math.abs(want - lastBackdropScale) > 0.35) {
    backdrop = buildBackdrop(want);
    lastBackdropScale = want;
  }
}
let lastBackdropScale = Math.min(1.5, window.devicePixelRatio || 1);

zoomHint.addEventListener('click', () => {
  // Cannot reset Safari page-zoom via JS; re-fit shell to current visualViewport.
  resize();
  zoomHint.textContent = '已适配当前可视区 · 建议双指捏合缩回 100%';
  setTimeout(() => {
    zoomHint.textContent = '页面已放大 · 点此适配画面（或双指捏合缩小）';
  }, 2400);
});

function bindViewport(): void {
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 50));
  const vv = window.visualViewport;
  if (vv) {
    vv.addEventListener('resize', resize);
    vv.addEventListener('scroll', resize);
  }
  // Re-fit after Safari chrome show/hide
  window.addEventListener('focus', () => setTimeout(resize, 100));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) setTimeout(resize, 100);
  });
}
bindViewport();
resize();

const gallery = flag('gallery');
const loop = new Loop(
  () => {
    if (gallery) return;
    if (mode === 'play' || mode === 'over' || mode === 'win') game.update();
    else if (mode === 'title' || mode === 'hub') game.attract();
    touch.setDashUnlocked(!!game.player.mods.canDash);
    touch.setExecuteReady(mode === 'play' && game.executePromptT > 0);
    {
      const cur = game.player.currentTalisman();
      const has = !!cur && cur.n > 0;
      const lab = has && cur ? ( { quxie:'驱', qingwu:'清', jiekong:'解', poshi:'破', hushen:'护', dingshen:'定', anhunfu:'安', jingxue:'净', zhangyan:'障' } as Record<string,string>)[cur.id] ?? '符' : '符';
      touch.setTalismanState({ has, cooling: game.player.talismanCd > 0, label: lab });
    }
  },
  () => {
    const k = canvas.width / VIEW_W;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.imageSmoothingEnabled = true;
    if (gallery) { renderGallery(ctx, Number(params.get('gallery')) || 1); return; }
    renderScene(ctx, game, backdrop);
    if (mode !== 'title' && mode !== 'hub') drawHUD(ctx, game, prog);
  },
);
loop.start();

(window as unknown as { __game: () => Game; __mode: () => Mode; __prog: () => Progression }).__game = () => game;
(window as unknown as { __mode: () => Mode }).__mode = () => mode;
(window as unknown as { __prog: () => Progression }).__prog = () => prog;
(window as unknown as { __SAVE_KEY: string }).__SAVE_KEY = SAVE_KEY;
(window as unknown as { __menpai: unknown }).__menpai = {
  ctx: gameCtx, load: loadMenpai, unload: unloadMenpai,
  list: listLoadedMenpai, isLoaded: isMenpaiLoaded, catalog: listMenpaiCatalog,
  store: listDlcStore, storeAsync: listDlcStoreAsync, enable: enableDlc, enableAsync: enableDlcAsync,
};
(window as unknown as { __pack: unknown }).__pack = {
  ctx: gameCtx, load: loadPack, unload: unloadPack,
  list: listLoadedPacks, isLoaded: isPackLoaded, catalog: listPackCatalog,
};
(window as unknown as { __wep: unknown }).__wep = { scaleAttack, loadout, affinityVs, WEAPONS, GROUND_CHAIN, PM };

if (gallery) document.getElementById('ui')!.style.display = 'none';
if (flag('hub')) toHub();
else if (flag('autostart') || flag('boss')) startGame();
else toTitle();
