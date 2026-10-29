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

await page.goto(BASE + '?resetmeta=1');
await sleep(500);
await page.screenshot({ path: `${OUT}/wuxia2-01-title.png` });

await page.goto(BASE + '?gallery=3');
await sleep(400);
await page.screenshot({ path: `${OUT}/wuxia2-03-enemies.png` });

await page.goto(BASE + '?meta=1&hub=1');
await sleep(800);
await page.click('text=拔剑夜行');
await sleep(1000);
await page.keyboard.down('KeyD'); await sleep(2000); await page.keyboard.up('KeyD');
for (let i = 0; i < 8; i++) { await page.keyboard.press('KeyJ'); await sleep(100); }
await sleep(200);
await page.screenshot({ path: `${OUT}/wuxia2-02-combat.png` });

await page.goto(BASE + '?hub=1');
await sleep(400);
await page.click('text=挑战镇山石兽');
await sleep(2800);
await page.evaluate(() => {
  const g = window.__game();
  if (g.boss) { g.player.body.x = g.boss.body.x - 110; g.player.facing = 1; }
  g.player.rage = 100;
});
for (let i = 0; i < 4; i++) { await page.keyboard.press('KeyJ'); await sleep(140); }
await sleep(200);
await page.screenshot({ path: `${OUT}/wuxia2-04-boss.png` });

// super
await page.keyboard.press('KeyU');
await sleep(700);
await page.screenshot({ path: `${OUT}/wuxia2-05-super.png` });

await browser.close();
console.log('wuxia2', errors.length ? errors : 'ok');
if (errors.length) process.exit(1);
