import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:4173/?autostart=1');
await p.waitForTimeout(400);
await p.keyboard.down('KeyD'); await p.waitForTimeout(2200); await p.keyboard.up('KeyD');
// log every frame state near the attack
await p.evaluate(() => {
  window.__log = [];
  const send = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code }));
  let down = false;
  const loop = () => {
    requestAnimationFrame(loop);
    const g = window.__game(), pl = g.player;
    for (const e of g.targets()) {
      const a = e.atk;
      if (a && a.def.parryable) {
        const left = a.def.startup - a.f;
        window.__log.push(`${g.tick} e.f=${a.f} left=${left} dist=${Math.round(Math.abs(e.x - pl.x))} p=${pl.state} gT=${pl.guardT} face=${pl.facing} ex>px=${e.x > pl.x}`);
        if (!down && left > 0 && left <= 5 && Math.abs(e.x - pl.x) < 170) {
          down = true;
          const dirKey = e.x > pl.x ? 'ArrowRight' : 'ArrowLeft';
          send('keydown', dirKey); send('keydown', 'KeyK');
          setTimeout(() => send('keyup', dirKey), 50);
          setTimeout(() => { send('keyup', 'KeyK'); down = false; }, 320);
        }
      }
    }
  };
  loop();
});
await p.waitForTimeout(9000);
const r = await p.evaluate(() => ({ parries: window.__game().stats.parries, hp: window.__game().player.hp, log: window.__log.slice(-40) }));
console.log(r.parries, r.hp); console.log(r.log.join('\n')); console.log(errs);
await b.close();
