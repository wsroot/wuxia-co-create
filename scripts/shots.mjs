// Headless smoke test + screenshots. Requires `npm run preview` on :4173 (or BASE env).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:4173/';
const OUT = 'screenshots';
mkdirSync(OUT, { recursive: true });
const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
async function newPage(vp = { width: 1280, height: 720 }, extra = {}) {
  const page = await browser.newPage({ viewport: vp, ...extra });
  // In-page helper: presses guard (K) a few frames before a parryable enemy hit lands, facing the attacker.
  await page.addInitScript(() => {
    const send = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code }));
    const loop = () => {
      requestAnimationFrame(loop);
      if (!window.__game || !window.__autoParry || window.__kDown) return;
      const g = window.__game(), p = g.player;
      for (const e of g.targets()) {
        const a = e.atk;
        if (!a || e.dead || !a.def.parryable) continue;
        const left = a.def.startup - a.f;
        if (left > 0 && left <= 5 && Math.abs(e.x - p.x) < 170) {
          window.__kDown = true;
          const dirKey = e.x > p.x ? 'ArrowRight' : 'ArrowLeft';
          send('keydown', dirKey); send('keydown', 'KeyK');
          setTimeout(() => send('keyup', dirKey), 50);
          setTimeout(() => { send('keyup', 'KeyK'); window.__kDown = false; }, 320);
          break;
        }
      }
    };
    loop();
  });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
  return page;
}
const state = (page) => page.evaluate(() => {
  const g = window.__game();
  const p = g.player;
  const foes = g.targets().filter((e) => !e.dead).map((e) => ({ x: e.x, y: e.y, st: e.state, atk: e.atk ? { f: e.atk.f, s: e.atk.def.startup, n: e.atk.def.name } : null }));
  return {
    mode: window.__mode(), px: p.x, py: p.y, pst: p.state, hp: p.hp, rage: p.rage, foes,
    sparks: g.fx.list.filter((q) => q.kind === 'spark').length, combo: g.combo.count, maxCombo: g.stats.maxCombo,
    parries: g.stats.parries, phase: g.director.phase, arena: g.director.arenaIdx, boss: g.boss ? { hp: g.boss.hp, st: g.boss.state, phase: g.boss.phase } : null,
  };
});
const tap = async (page, key, ms = 40) => { await page.keyboard.down(key); await sleep(ms); await page.keyboard.up(key); };

/** Very small fighting bot: walk to nearest foe, mix combos, launchers, guard on telegraphs. */
async function fight(page, ms, opts = {}) {
  const end = Date.now() + ms;
  let held = null;
  let i = 0;
  const shots = { ...opts.shots };
  while (Date.now() < end) {
    const s = await state(page);
    if (s.mode !== 'play') break;
    if (opts.until && opts.until(s)) break;
    for (const [name, cond] of Object.entries(shots)) {
      if (cond(s)) { await page.screenshot({ path: `${OUT}/${name}.png` }); console.log('  shot', name, JSON.stringify({ combo: s.combo, sparks: s.sparks, pst: s.pst })); delete shots[name]; }
    }
    let target = null, best = 1e9;
    for (const f of s.foes) { const d = Math.abs(f.x - s.px); if (d < best && f.st !== 'spawn') { best = d; target = f; } }
    if (!target) {
      const want = opts.roam ? 'KeyD' : null;
      if (held !== want) { if (held) await page.keyboard.up(held); if (want) await page.keyboard.down(want); held = want; }
      await sleep(60);
      continue;
    }
    const dir = target.x > s.px ? 'KeyD' : 'KeyA';
    // an enemy is winding up nearby: stop attacking and let the in-page parry helper time the guard
    const threat = s.foes.some((f) => f.atk && f.atk.f < f.atk.s && Math.abs(f.x - s.px) < 170);
    if (threat && opts.wait !== false) {
      if (held) { await page.keyboard.up(held); held = null; }
      await sleep(40);
      continue;
    }
    if (best > (opts.reach ?? 70)) {
      if (held !== dir) { if (held) await page.keyboard.up(held); await page.keyboard.down(dir); held = dir; }
      if (best > 300 && i % 10 === 0) await tap(page, 'KeyL');
      await sleep(50);
    } else {
      if (held) { await page.keyboard.up(held); held = null; }
      i++;
      const r = i % 9;
      if (r === 3 && s.pst !== 'air') { // launcher + air combo
        await page.keyboard.down('KeyW'); await tap(page, 'KeyJ', 30); await sleep(60); await page.keyboard.up('KeyW');
        for (let k = 0; k < 5; k++) { await sleep(140); await tap(page, 'KeyJ', 30); }
      } else if (r === 7) {
        await page.keyboard.down('KeyS'); await tap(page, 'KeyJ'); await page.keyboard.up('KeyS'); await sleep(300);
      } else if (r === 5) {
        await tap(page, 'Space'); await sleep(120); await tap(page, 'KeyJ'); await sleep(150); await tap(page, 'KeyJ'); await sleep(200);
      } else {
        for (let k = 0; k < 4; k++) { await tap(page, 'KeyJ', 30); await sleep(95); }
        await sleep(120);
      }
    }
  }
  if (held) await page.keyboard.up(held);
  return state(page);
}

// ---------- 1. title ----------
console.log('1) title');
let page = await newPage();
await page.goto(BASE);
await sleep(1800);
await page.screenshot({ path: `${OUT}/01-title.png` });
const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(n / ((performance.now() - t0) / 1000)); }; requestAnimationFrame(f); }));
console.log('  title fps ~', fps.toFixed(1));

// ---------- 2. stage combat ----------
console.log('2) stage');
await page.click('text=拔剑夜行');
await page.evaluate(() => { window.__autoParry = true; });
await sleep(400);
await page.keyboard.down('KeyD'); await sleep(2600); await page.keyboard.up('KeyD');
let s = await fight(page, 45000, {
  roam: true,
  shots: {
    '02-combat-hit': (s) => s.sparks > 8 && s.combo >= 3,
    '03-air-juggle': (s) => s.pst === 'attack' && s.py < 400 && s.foes.some((f) => f.st === 'air' && f.y < 420),
    '04-parry': (s) => s.parries > 0,
    '05-combo-rating': (s) => s.combo >= 8,
  },
});
console.log('  after fight:', JSON.stringify({ hp: s.hp, maxCombo: s.maxCombo, parries: s.parries, arena: s.arena, phase: s.phase, mode: s.mode }));
const perf = await page.evaluate(() => {
  const g = window.__game();
  const t0 = performance.now();
  for (let i = 0; i < 300; i++) g.update();
  return (performance.now() - t0) / 300;
});
console.log('  sim cost per tick (ms):', perf.toFixed(3));
const fps2 = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(n / ((performance.now() - t0) / 1000)); }; requestAnimationFrame(f); }));
console.log('  in-game fps ~', fps2.toFixed(1));
// pause screen
await tap(page, 'Escape');
await sleep(400);
await page.screenshot({ path: `${OUT}/09-pause.png` });
await page.close();

// ---------- 2b. full stage progression (god mode bot) ----------
console.log('2b) progression');
page = await newPage({ width: 960, height: 540 });
await page.goto(BASE + '?autostart=1&god=1');
await page.evaluate(() => { window.__autoParry = true; });
const t0 = Date.now();
s = await fight(page, 150000, { roam: true, shots: { '04b-parry-stage': (s) => s.parries > 0, '05b-arena3': (s) => s.arena === 2 && s.sparks > 6 }, until: (s) => !!s.boss });
console.log('  reached:', JSON.stringify({ arena: s.arena, phase: s.phase, boss: s.boss, parries: s.parries, maxCombo: s.maxCombo, secs: Math.round((Date.now() - t0) / 1000) }));
await page.close();

// ---------- 3. boss ----------
console.log('3) boss');
page = await newPage();
await page.goto(BASE + '?boss=1');
await sleep(500);
await page.mouse.click(10, 10);
await sleep(3000);
await page.screenshot({ path: `${OUT}/06-boss-intro.png` });
await page.evaluate(() => { window.__game().player.god = true; window.__autoParry = true; });
s = await fight(page, 12000, {
  reach: 95,
  shots: { '07-boss-fight': (s) => s.sparks > 6 && s.boss && s.boss.st !== 'roar' },
});
console.log('  boss state:', JSON.stringify(s.boss));
// super move
await page.evaluate(() => { window.__game().player.rage = 100; });
await tap(page, 'KeyU');
await sleep(700);
await page.screenshot({ path: `${OUT}/08-super.png` });
await sleep(1200);
// force phase 2 (霸体)
await page.evaluate(() => { const b = window.__game().boss; if (b) { b.hp = Math.min(b.hp, 430); } });
s = await fight(page, 9000, { reach: 95, shots: { '10-boss-phase2': (s) => s.boss && s.boss.phase === 2 && s.sparks > 4 } });
console.log('  boss state:', JSON.stringify(s.boss));
// finish the boss
await page.evaluate(() => { const b = window.__game().boss; if (b) b.hp = 5; });
s = await fight(page, 15000, { reach: 95 });
await sleep(4000);
s = await state(page);
console.log('  mode after boss:', s.mode);
await page.screenshot({ path: `${OUT}/11-victory.png` });
await page.close();

// ---------- 4. game over ----------
console.log('4) game over');
page = await newPage();
await page.goto(BASE + '?boss=1');
await sleep(4500);
await page.evaluate(() => { window.__game().player.hp = 1; });
for (let k = 0; k < 40 && (await state(page)).mode === 'play'; k++) await sleep(500);
await sleep(800);
console.log('  mode:', (await state(page)).mode);
await page.screenshot({ path: `${OUT}/12-gameover.png` });
await page.close();

// ---------- 5. mobile touch layout ----------
console.log('5) touch');
page = await newPage({ width: 844, height: 390 }, { hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
await page.goto(BASE + '?autostart=1&touch=1');
await sleep(1500);
await page.touchscreen.tap(800, 330);
await sleep(300);
await page.screenshot({ path: `${OUT}/13-touch.png` });
await page.close();

await browser.close();
console.log('\nconsole errors/warnings:', errors.length ? '\n' + errors.join('\n') : 'none');
process.exit(errors.some((e) => !e.includes('[warning]')) ? 1 : 0);
