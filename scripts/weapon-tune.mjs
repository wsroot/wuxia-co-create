/**
 * Weapon feel / balance harness.
 * Paper TTK from scaled ground chains + live shield/boss hit checks + screenshots.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:4173/';
const OUT = 'screenshots';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
const notes = [];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(BASE + '?resetmeta=1');
await sleep(300);
await page.goto(BASE + '?hub=1');
await sleep(600);

const paper = await page.evaluate(() => {
  const { scaleAttack, loadout, WEAPONS, GROUND_CHAIN, PM } = window.__wep;
  const SHIELD_HP = 80;
  const BOSS_HP = 900;

  function chainStats(id, level, { affinityMul = 1, trashMul = 1 } = {}) {
    const w = loadout(id, level);
    let dmg = 0;
    let frames = 0;
    let hitstop = 0;
    const moves = [];
    for (const base of GROUND_CHAIN) {
      const s = scaleAttack(base, w);
      const hit = Math.max(1, Math.round(s.damage * affinityMul * trashMul));
      dmg += hit;
      // cancel into next at chainCancel-ish: use startup+active (optimistic skilled cancel)
      const cancelAt = s.startup + s.active;
      frames += cancelAt;
      hitstop += s.hitstop;
      moves.push({
        name: s.name,
        dmg: hit,
        su: s.startup,
        ac: s.active,
        re: s.recovery,
        reach: s.box.w,
        hs: s.hitstop,
        sh: s.shake,
      });
    }
    const dash = scaleAttack(PM.dashKick, w);
    return {
      id,
      level,
      name: w.def.name,
      weight: w.def.weight,
      chainDmg: dmg,
      chainFrames: frames,
      dps: +(dmg / (frames / 60)).toFixed(2),
      shieldTTKsec: +((SHIELD_HP / (dmg / (frames / 60)))).toFixed(2),
      bossChains: +((BOSS_HP / dmg)).toFixed(1),
      bossTTKsec: +(((BOSS_HP / dmg) * (frames / 60)).toFixed(1)),
      dashDmg: Math.max(1, Math.round(dash.damage * affinityMul * trashMul)),
      dashReach: dash.box.w,
      dashHs: dash.hitstop,
      slash1: moves[0],
      finisher: moves[3],
      aff: w.def.affinityBonus,
      rage: w.def.rage,
      poise: w.def.poise,
      air: w.def.airHover,
    };
  }

  const rows = [];
  for (const w of WEAPONS) {
    rows.push(chainStats(w.id, 1));
    rows.push(chainStats(w.id, 5));
  }
  // Affinity cases
  const axeBoss = chainStats('axe', 1, { affinityMul: 1 + WEAPONS.find((x) => x.id === 'axe').affinityBonus });
  const bellBoss = chainStats('bell', 1, {
    affinityMul: 1 + WEAPONS.find((x) => x.id === 'bell').affinityBonus,
    // bell trash damp already inside scaleAttack (0.9); affinity applies on top in resolver
  });
  const spearShield = chainStats('spear', 1, {
    affinityMul: 1 + WEAPONS.find((x) => x.id === 'spear').affinityBonus,
  });
  const silver = chainStats('silver', 1);

  return {
    catalog: WEAPONS.map((w) => ({
      id: w.id,
      name: w.name,
      dmg: w.damage,
      spd: w.speed,
      reach: w.reach,
      poise: w.poise,
      rage: w.rage,
      air: w.airHover,
      weight: w.weight,
      aff: w.affinityBonus,
      unlock: w.unlock,
    })),
    rows,
    compare: {
      silverLv1: silver,
      spearShieldAff: spearShield,
      axeBossAff: axeBoss,
      bellBossAff: bellBoss,
      twinDashLv1: chainStats('twin', 1),
      thornLv1: chainStats('thorn', 1),
    },
  };
});

notes.push('=== Paper stats (optimistic cancel into next @ active end) ===');
for (const r of paper.rows.filter((x) => x.level === 1)) {
  notes.push(
    `${r.id.padEnd(7)} Lv1 ${r.weight.padEnd(6)} chain=${r.chainDmg} dmg / ${r.chainFrames}f  dps=${r.dps}  shieldTTK≈${r.shieldTTKsec}s  bossChains≈${r.bossChains}  dash=${r.dashDmg}`,
  );
}
notes.push('--- Lv5 ---');
for (const r of paper.rows.filter((x) => x.level === 5)) {
  notes.push(
    `${r.id.padEnd(7)} Lv5          chain=${r.chainDmg}  dps=${r.dps}  bossChains≈${r.bossChains}  bossTTK≈${r.bossTTKsec}s`,
  );
}
const c = paper.compare;
notes.push('--- Affinity / identity ---');
notes.push(`silver slash1 reach=${c.silverLv1.slash1.reach} hs=${c.silverLv1.slash1.hs}`);
notes.push(`thorn  slash1 reach=${c.thornLv1.slash1.reach} hs=${c.thornLv1.slash1.hs} (light, snappy)`);
notes.push(`spear  shieldAff chain=${c.spearShieldAff.chainDmg} reach=${c.spearShieldAff.slash1.reach}`);
notes.push(`axe    bossAff chain=${c.axeBossAff.chainDmg} finisher hs=${c.axeBossAff.finisher.hs}`);
notes.push(`twin   dash=${c.twinDashLv1.dashDmg} reach=${c.twinDashLv1.dashReach} hs=${c.twinDashLv1.dashHs}`);
notes.push(`bell   bossAff chain=${c.bellBossAff.chainDmg} bossChains≈${c.bellBossAff.bossChains}`);

// Guardrails
const silverBoss = paper.rows.find((r) => r.id === 'silver' && r.level === 1).bossChains;
const bellAffChains = c.bellBossAff.bossChains;
const axeLv5 = paper.rows.find((r) => r.id === 'axe' && r.level === 5).bossChains;
if (bellAffChains < 8) throw new Error(`bell affinity too strong: ${bellAffChains} chains to kill boss`);
if (silverBoss < 15) throw new Error(`silver too strong vs boss: ${silverBoss}`);
if (axeLv5 < 10) throw new Error(`maxed axe trivializes boss: ${axeLv5}`);

// Live: equip spear, fight a shield; equip axe then bell vs boss for affinity flash
await page.evaluate(() => {
  const p = window.__prog();
  p.data.crystals = 9999;
  for (const id of ['thorn', 'spear', 'axe', 'twin', 'bell']) {
    if (!p.owns(id)) {
      if (id === 'bell') p.unlockWeapon(id);
      else { p.grantBlueprint(id); p.data.crystals += 300; p.data.materials = { iron:30,bone:30,cinnabar:20,herb:20,xuaniron:10,yaohe:5 }; p.craftWeapon(id); }
    }
  }
  p.equipWeapon('spear');
});
await page.click('text=返回标题');
await sleep(250);
await page.click('text=养成');
await sleep(700);
await page.screenshot({ path: `${OUT}/tune-01-arsenal.png` });

await page.click('text=拔剑夜行');
await sleep(700);
const liveSpear = await page.evaluate(() => {
  const g = window.__game();
  const w = g.player.weapon;
  const s1 = window.__wep.scaleAttack(window.__wep.PM.slash1, w);
  return { id: w.id, reach: s1.box.w, tipX: s1.box.x, pierce: !!s1.pierce, dmg: s1.damage };
});
notes.push(`live spear slash1: ${JSON.stringify(liveSpear)}`);
if (liveSpear.id !== 'spear' || !liveSpear.pierce) throw new Error('spear not applied');
await page.keyboard.down('KeyD'); await sleep(1600); await page.keyboard.up('KeyD');
for (let i = 0; i < 6; i++) { await page.keyboard.press('KeyJ'); await sleep(100); }
await sleep(200);
await page.screenshot({ path: `${OUT}/tune-02-spear-combat.png` });

// Boss axe affinity
await page.goto(BASE + '?hub=1');
await sleep(400);
await page.evaluate(() => window.__prog().equipWeapon('axe'));
await page.click('text=挑战镇山石兽');
await sleep(2000);
await page.evaluate(() => {
  const g = window.__game();
  const b = g.boss;
  if (b) { g.player.body.x = b.body.x - 95; g.player.facing = 1; }
});
for (let i = 0; i < 8; i++) {
  await page.keyboard.press('KeyJ');
  await sleep(140);
  await page.evaluate(() => {
    const g = window.__game();
    const b = g.boss;
    if (b && !b.dead && Math.abs(b.body.x - g.player.body.x) > 130) {
      g.player.body.x = b.body.x - 95;
      g.player.facing = 1;
    }
  });
}
const axeLive = await page.evaluate(() => ({
  flash: window.__game().player.affinityFlash,
  weapon: window.__game().player.weapon.id,
  hs: window.__wep.scaleAttack(window.__wep.PM.finisher, window.__game().player.weapon).hitstop,
}));
notes.push(`live axe boss: ${JSON.stringify(axeLive)}`);
if (!(axeLive.flash > 0)) throw new Error('axe affinity flash missing');
await page.screenshot({ path: `${OUT}/tune-03-axe-boss.png` });

// Bell
await page.goto(BASE + '?hub=1');
await sleep(400);
await page.evaluate(() => window.__prog().equipWeapon('bell'));
await page.click('text=挑战镇山石兽');
await sleep(2000);
await page.evaluate(() => {
  const g = window.__game();
  const b = g.boss;
  if (b) { g.player.body.x = b.body.x - 95; g.player.facing = 1; }
});
for (let i = 0; i < 8; i++) {
  await page.keyboard.press('KeyJ');
  await sleep(140);
  await page.evaluate(() => {
    const g = window.__game();
    const b = g.boss;
    if (b && !b.dead && Math.abs(b.body.x - g.player.body.x) > 130) {
      g.player.body.x = b.body.x - 95;
      g.player.facing = 1;
    }
  });
}
const bellLive = await page.evaluate(() => ({
  flash: window.__game().player.affinityFlash,
  weapon: window.__game().player.weapon.id,
  bossHp: window.__game().boss?.hp,
}));
notes.push(`live bell boss: ${JSON.stringify(bellLive)}`);
if (!(bellLive.flash > 0)) throw new Error('bell affinity flash missing');
await page.screenshot({ path: `${OUT}/tune-04-bell-boss.png` });

// Twin dash visual
await page.goto(BASE + '?hub=1');
await sleep(400);
await page.evaluate(() => window.__prog().equipWeapon('twin'));
await page.click('text=拔剑夜行');
await sleep(800);
await page.keyboard.down('KeyD'); await sleep(400); await page.keyboard.up('KeyD');
await page.keyboard.press('KeyL');
await sleep(80);
await page.keyboard.press('KeyJ');
await sleep(250);
const twinLive = await page.evaluate(() => {
  const w = window.__game().player.weapon;
  const d = window.__wep.scaleAttack(window.__wep.PM.dashKick, w);
  return { id: w.id, dashDmg: d.damage, reach: d.box.w, hs: d.hitstop };
});
notes.push(`live twin dash: ${JSON.stringify(twinLive)}`);
if (twinLive.dashDmg < 16) throw new Error('twin dash not punched up enough');
await page.screenshot({ path: `${OUT}/tune-05-twin-dash.png` });

writeFileSync('screenshots/tune-notes.txt', notes.join('\n') + '\n');
console.log(notes.join('\n'));

await browser.close();
if (errors.length) {
  console.error('errors', errors);
  process.exit(1);
}
console.log('tune harness ok');
