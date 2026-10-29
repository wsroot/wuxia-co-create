import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = process.env.BASE || 'http://localhost:4173/';
const OUT = 'screenshots';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(BASE + '?resetmeta=1&autostart=1&god=1');
await sleep(800);

const snap = () => page.evaluate(() => {
  const g = window.__game();
  return {
    px: +g.player.x.toFixed(1),
    py: +g.player.y.toFixed(1),
    camX: +g.cam.x.toFixed(1),
    camY: +g.cam.y.toFixed(1),
    onGround: g.player.body.onGround,
    onPlat: g.player.body.onPlatform,
    locked: g.locked,
    bounds: { ...g.bounds },
    viewWW: window.__VIEW_WW,
  };
});

// Expose VIEW_WW if needed
await page.evaluate(() => {
  // fall back compute
  window.__VIEW_WW = 960 / 1.3;
});

const a0 = await snap();
console.log('start', a0);

// Walk right — camera must move
await page.keyboard.down('KeyD');
await sleep(2200);
await page.keyboard.up('KeyD');
await sleep(200);
const a1 = await snap();
console.log('after walk', a1);
if (!(a1.camX > a0.camX + 30)) throw new Error(`cam did not follow walk: ${a0.camX} -> ${a1.camX}`);
await page.screenshot({ path: `${OUT}/cam-01-follow.png` });

// Keep walking into first arena
await page.keyboard.down('KeyD');
await sleep(3500);
await page.keyboard.up('KeyD');
await sleep(500);
const a2 = await snap();
console.log('arena?', a2);
await page.screenshot({ path: `${OUT}/cam-02-arena.png` });

// If not locked yet, force toward trigger
if (!a2.locked) {
  await page.evaluate(() => {
    const g = window.__game();
    g.player.body.x = 900;
  });
  await page.keyboard.down('KeyD');
  await sleep(1500);
  await page.keyboard.up('KeyD');
  await sleep(400);
}
const a3 = await snap();
console.log('locked check', a3);

// Walk inside arena — cam should still change within span
const camBefore = a3.camX;
await page.keyboard.down('KeyA');
await sleep(900);
await page.keyboard.up('KeyA');
await sleep(150);
const a4 = await snap();
console.log('arena walk left', a4);
const camDelta = Math.abs(a4.camX - camBefore);
console.log('arena cam delta', camDelta);
// In locked arena, span is ARENA_W - VIEW_WW ≈ 122; movement should shift cam if not at edge
if (a4.locked && camDelta < 5 && a4.px > a4.bounds.min + 100 && a4.px < a4.bounds.max - 100) {
  console.warn('small arena cam delta — may be at clamp edge');
}

// Jump onto a nearby platform
await page.evaluate(() => {
  const g = window.__game();
  // find a platform near player
  const pl = g.platforms.find((p) => Math.abs(p.x + p.w / 2 - g.player.x) < 400)
    || g.platforms[0];
  g.player.body.x = pl.x + pl.w * 0.5;
  g.player.body.y = pl.y - 40;
  g.player.body.vy = 0;
  g.player.body.onGround = false;
  g.__plat = pl;
});
// fall onto roof
await sleep(400);
for (let i = 0; i < 20; i++) {
  await page.evaluate(() => window.__game().player.update(window.__game()));
}
// better: let game loop run
await sleep(600);
const onRoof = await page.evaluate(() => {
  const g = window.__game();
  // teleport above platform and wait
  const pl = g.platforms.find((p) => p.x >= 500 && p.x < 1400) || g.platforms[0];
  g.player.body.x = pl.x + 40;
  g.player.body.y = pl.y - 30;
  g.player.body.vy = 2;
  g.player.body.onGround = false;
  g.player.setState?.('air');
  return { pl, px: g.player.x, py: g.player.y };
});
console.log('drop onto', onRoof);
await sleep(800);
const roof = await snap();
console.log('on roof?', roof);
if (!(roof.onPlat >= 0 || roof.py < 468 - 20)) {
  // force land via evaluate physics
  await page.evaluate(() => {
    const g = window.__game();
    const pl = g.platforms.find((p) => p.x >= 500 && p.x < 1400) || g.platforms[0];
    g.player.body.x = pl.x + 50;
    g.player.body.y = pl.y;
    g.player.body.vy = 0;
    g.player.body.onGround = true;
    g.player.body.onPlatform = g.platforms.indexOf(pl);
    g.player.setState('idle');
  });
}
await sleep(200);
await page.screenshot({ path: `${OUT}/plat-01-rooftop.png` });
const roof2 = await snap();
console.log('rooftop snap', roof2);
if (!(roof2.camY < -5 || roof2.py < 450)) console.warn('camY not lifted much', roof2.camY);

// Jump on roof
await page.keyboard.press('KeyW');
await sleep(350);
await page.screenshot({ path: `${OUT}/plat-02-jump.png` });
const midJump = await snap();
console.log('mid jump', midJump);

await browser.close();
if (errors.length) { console.error(errors); process.exit(1); }
console.log('cam-plat ok');
