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
await page.screenshot({ path: `${OUT}/wuxia-01-title.png` });

await page.goto(BASE + '?meta=1&hub=1');
await sleep(900);
await page.screenshot({ path: `${OUT}/wuxia-03-hub.png` });

await page.click('text=拔剑夜行');
await sleep(1000);
await page.keyboard.down('KeyD'); await sleep(2200); await page.keyboard.up('KeyD');
for (let i = 0; i < 6; i++) { await page.keyboard.press('KeyJ'); await sleep(110); }
await sleep(300);
await page.screenshot({ path: `${OUT}/wuxia-02-combat.png` });

await page.goto(BASE + '?hub=1');
await sleep(400);
await page.click('text=挑战镇山石兽');
await sleep(3000);
await page.evaluate(() => {
  const g = window.__game();
  if (g.boss) { g.player.body.x = g.boss.body.x - 110; g.player.facing = 1; }
});
for (let i = 0; i < 8; i++) { await page.keyboard.press('KeyJ'); await sleep(130); }
await sleep(250);
await page.screenshot({ path: `${OUT}/wuxia-04-boss.png` });

await browser.close();
console.log('wuxia shots', errors.length ? errors : 'ok');
if (errors.length) process.exit(1);
