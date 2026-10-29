// quick single-page screenshot helper: node scripts/snap.mjs "<query>" out.png [waitMs]
import { chromium } from 'playwright';
const [q = '', out = 'screenshots/snap.png', wait = '800'] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = [];
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
await p.goto('http://localhost:4173/' + q);
await p.waitForTimeout(Number(wait));
await p.screenshot({ path: out });
console.log(errs.join('\n') || 'no console errors');
await b.close();
