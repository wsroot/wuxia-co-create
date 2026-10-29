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
await sleep(400);
await page.screenshot({ path: `${OUT}/art-01-title.png` });

await page.goto(BASE + '?meta=1&hub=1');
await sleep(800);
await page.screenshot({ path: `${OUT}/art-02-hub.png` });

await page.click('text=拔剑夜行');
await sleep(900);
await page.keyboard.down('KeyD'); await sleep(2000); await page.keyboard.up('KeyD');
for (let i = 0; i < 5; i++) { await page.keyboard.press('KeyJ'); await sleep(110); }
await sleep(250);
await page.screenshot({ path: `${OUT}/art-03-combat.png` });

await page.goto(BASE + '?hub=1');
await sleep(400);
await page.evaluate(() => {
  const p = window.__prog();
  if (!p.owns('bell')) p.unlockWeapon('bell');
  p.equipWeapon('bell');
});
await page.click('text=挑战镇山石兽');
await sleep(2800);
await page.evaluate(() => {
  const g = window.__game();
  if (g.boss) { g.player.body.x = g.boss.body.x - 100; g.player.facing = 1; }
});
for (let i = 0; i < 8; i++) { await page.keyboard.press('KeyJ'); await sleep(130); }
await sleep(200);
await page.screenshot({ path: `${OUT}/art-04-boss.png` });

await browser.close();
console.log('art shots ok', errors.length ? errors : 'no errors');
if (errors.length) process.exit(1);
