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

// Seed mid-progress with weapons
await page.goto(BASE + '?resetmeta=1');
await sleep(400);
await page.goto(BASE + '?meta=1&hub=1');
await sleep(900);
await page.screenshot({ path: `${OUT}/weapon-01-arsenal.png` });
console.log('arsenal open');

const before = await page.evaluate(() => {
  const p = window.__prog();
  return {
    eq: p.data.equippedWeapon,
    owned: p.data.ownedWeapons,
    crystals: p.data.crystals,
  };
});
console.log('before', before);

// Buy axe if needed, equip spear for shield affinity demo
await page.evaluate(() => {
  const p = window.__prog();
  if (!p.owns('axe')) { p.grantBlueprint('axe'); p.data.crystals += 200; p.data.materials = { iron:20,bone:20,cinnabar:10,herb:10,xuaniron:5,yaohe:3 }; p.craftWeapon('axe'); }
  if (!p.owns('spear')) { p.grantBlueprint('spear'); p.data.materials = { ...(p.data.materials||{}), iron:20,xuaniron:5,bone:10 }; p.data.crystals += 100; p.craftWeapon('spear'); }
  p.equipWeapon('spear');
  p.upgradeWeapon('spear');
});
await page.click('text=返回标题');
await sleep(300);
await page.click('text=养成');
await sleep(700);
await page.screenshot({ path: `${OUT}/weapon-02-spear-equipped.png` });

const eq = await page.evaluate(() => {
  const p = window.__prog();
  return { eq: p.data.equippedWeapon, lv: p.weaponLevel('spear'), tip: p.equipped().tip };
});
console.log('equipped', eq);
if (eq.eq !== 'spear') throw new Error('spear not equipped');

// Start run — verify weapon on player
await page.click('text=拔剑夜行');
await sleep(800);
const applied = await page.evaluate(() => {
  const g = window.__game();
  return {
    id: g.player.weapon.id,
    name: g.player.weapon.def.name,
    shape: g.player.weapon.def.shape,
    length: g.player.weapon.def.length,
    reach: g.player.weapon.def.reach,
  };
});
console.log('in-run weapon', applied);
if (applied.id !== 'spear') throw new Error('weapon not applied to player');

// Walk + attack for visual
await page.keyboard.down('KeyD'); await sleep(1800); await page.keyboard.up('KeyD');
for (let i = 0; i < 4; i++) { await page.keyboard.press('KeyJ'); await sleep(120); }
await sleep(200);
await page.screenshot({ path: `${OUT}/weapon-03-combat-spear.png` });

// Switch to axe via debug, fight boss for affinity
await page.goto(BASE + '?boss=1&god=1');
await sleep(500);
await page.evaluate(() => {
  const p = window.__prog();
  if (!p.owns('bell')) p.unlockWeapon('bell');
  if (!p.owns('axe')) { p.grantBlueprint('axe'); p.data.crystals += 200; p.data.materials = { iron:20,bone:20,xuaniron:5,cinnabar:5,herb:5,yaohe:2 }; p.craftWeapon('axe'); }
  p.equipWeapon('axe');
});
// restart with axe
await page.goto(BASE + '?boss=1&god=1&autostart=1');
await sleep(400);
await page.evaluate(() => {
  const p = window.__prog();
  p.equipWeapon('axe');
});
// need new run to pick up equip — force remake
await page.goto(BASE + '?hub=1');
await sleep(400);
await page.evaluate(() => { window.__prog().equipWeapon('axe'); });
await page.click('text=挑战镇山石兽');
await sleep(2500);
const bossW = await page.evaluate(() => {
  const g = window.__game();
  return { id: g.player.weapon.id, name: g.player.weapon.def.name };
});
console.log('boss run weapon', bossW);

// Close distance then attack — axe antiArmor vs boss
await page.evaluate(() => { window.__autoParry = false; });
await page.keyboard.down('KeyD'); await sleep(2200); await page.keyboard.up('KeyD');
for (let i = 0; i < 10; i++) { await page.keyboard.press('KeyJ'); await sleep(160); }
await sleep(200);
const affAxe = await page.evaluate(() => window.__game().player.affinityFlash);
console.log('affinityFlash axe', affAxe);
await page.screenshot({ path: `${OUT}/weapon-04-boss-axe.png` });

// Equip bell, restart boss — bossGargoyle affinity
await page.goto(BASE + '?hub=1');
await sleep(400);
await page.evaluate(() => {
  const p = window.__prog();
  if (!p.owns('bell')) p.unlockWeapon('bell');
  p.equipWeapon('bell');
});
await page.click('text=挑战镇山石兽');
await sleep(2000);
const bellInfo = await page.evaluate(() => {
  const g = window.__game();
  const b = g.boss;
  // park hunter in melee range of the gargoyle
  if (b) {
    g.player.body.x = b.body.x - 90;
    g.player.body.y = b.body.y;
    g.player.facing = 1;
  }
  return {
    id: g.player.weapon.id,
    affs: g.player.weapon.def.affinities,
    boss: b ? { name: b.name, x: b.body.x, alive: !b.dead } : null,
  };
});
console.log('bell run', bellInfo);
if (bellInfo.id !== 'bell') throw new Error('bell not equipped in run');
await page.evaluate(() => { window.__autoParry = false; });
for (let i = 0; i < 12; i++) {
  await page.keyboard.press('KeyJ');
  await sleep(120);
  // re-close if knocked back
  await page.evaluate(() => {
    const g = window.__game();
    const b = g.boss;
    if (b && !b.dead) {
      const dx = b.body.x - g.player.body.x;
      if (Math.abs(dx) > 140) {
        g.player.body.x = b.body.x - 90;
        g.player.facing = 1;
      }
    }
  });
}
await sleep(100);
const affBell = await page.evaluate(() => ({
  flash: window.__game().player.affinityFlash,
  weapon: window.__game().player.weapon.id,
  bossHp: window.__game().boss?.hp,
}));
console.log('affinityFlash bell', affBell);
if (!(affBell.flash > 0)) throw new Error('bell affinity not triggered vs boss');
await page.screenshot({ path: `${OUT}/weapon-05-boss-bell.png` });

const persisted = await page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem(window.__SAVE_KEY));
  return { version: raw.version, eq: raw.equippedWeapon, owned: raw.ownedWeapons, levels: raw.weaponLevels };
});
console.log('save', persisted);
if (persisted.version !== 2) throw new Error('save not v2');
if (!persisted.owned.includes('bell')) throw new Error('bell not owned in save');

await browser.close();
console.log('errors:', errors.length ? errors : 'none');
if (errors.length) process.exit(1);
