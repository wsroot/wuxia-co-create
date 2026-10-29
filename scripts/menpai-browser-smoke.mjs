// Browser smoke: boot, save round-trip, optional 门派 load/unload, short autoplay.
// Usage: BASE=http://localhost:4173/ node scripts/menpai-browser-smoke.mjs
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:4173/';
const browser = await chromium.launch({
  executablePath: process.env.CHROME || undefined,
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const out = {};
const wait = (ms) => page.waitForTimeout(ms);
const save = () => page.evaluate(() => localStorage.getItem(window.__SAVE_KEY));

await page.goto(BASE + '?meta=1&hub=1'); await wait(1200);
out.seeded = await save();
await page.goto(BASE + '?hub=1'); await wait(1200);
out.reloaded = await save();
out.hasMenpai = await page.evaluate(() => !!window.__menpai);
if (out.hasMenpai) {
  out.counts = await page.evaluate(() => {
    const c = window.__menpai.ctx;
    return { weapons: c.weapons.list().length, pills: c.pills.list().length, materials: c.materials.list().length,
      talismans: c.talismans.list().length, scripts: c.talismans.listScripts().length,
      stages: c.stages.count(), pools: c.acts.listPools().length, beats: c.acts.listBeats().length };
  });
  out.loadUnload = await page.evaluate(() => {
    const m = window.__menpai; const r = [];
    r.push(m.load('chixia'), !!m.ctx.talismans.get('chixiafu'));
    r.push(m.unload('chixia'), !m.ctx.talismans.get('chixiafu'));
    return r;
  });
  await page.goto(BASE + '?menpai=chixia&hub=1'); await wait(1000);
  out.urlLoaded = await page.evaluate(() => !!window.__menpai.ctx.talismans.get('chixiafu'));
}
await page.goto(BASE + '?autostart=1&god=1'); await wait(800);
for (let i = 0; i < 25; i++) {
  await page.keyboard.down('KeyD'); await page.keyboard.press('KeyJ'); await wait(120);
  await page.keyboard.up('KeyD'); await page.keyboard.press('KeyK'); await wait(80);
}
out.mode = await page.evaluate(() => window.__mode());
out.gameX = await page.evaluate(() => Math.round(window.__game().player.x));
await page.screenshot({ path: process.env.SHOT || '/tmp/menpai-smoke.png' });
out.errors = errors;
console.log(JSON.stringify(out));
await browser.close();
