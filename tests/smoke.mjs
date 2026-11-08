// Smoke test: boots the built game in system Chrome, walks the Sanctum (every station), opens the hunt board and plays a few seconds of
// several hunts (different bosses and wizards). Fails on any console or page error.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';

const port = 4300 + Math.floor(Math.random() * 500);
const srv = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2500));
const errors = [], notes = [];
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(`http://localhost:${port}/`);
  await page.waitForSelector('#ov .go');
  await page.click('#ov .go');                 // title -> the Sanctum
  await page.waitForTimeout(600);
  const mode = () => page.evaluate(() => window.__arcana.S.mode);
  if (await mode() !== 'hub') errors.push('expected the hub after the title, got ' + await mode());
  await page.evaluate(() => window.__arcana.meta.unlockEverything());
  // every station opens an overlay (market, forge, codex, daily board); the door opens deck mode (the older hunt stays reachable through __hunt)
  for (const [name, x, y] of [['market', 225, 474], ['forge', 675, 474], ['codex', 205, 834], ['board', 450, 942]]) {
    await page.evaluate(([x, y]) => { const A = window.__arcana; A.G.P.x = x; A.G.P.y = y; A.G.hub.lock = false; A.G.hub.hold = 0; A.G.hub.near = null; }, [x, y]);
    await page.waitForFunction(() => !document.getElementById('ov').hidden, null, { timeout: 5000 }).catch(() => errors.push('station did not open: ' + name));
    await page.evaluate(() => { document.getElementById('hubback') ? document.getElementById('hubback').click() : (document.getElementById('ov').hidden = true); });
    await page.waitForTimeout(150);
  }
  await page.evaluate(() => { const A = window.__arcana; A.G.P.x = 450; A.G.P.y = 236; A.G.hub.lock = false; A.G.hub.hold = 0; A.G.hub.near = null; });   // walk onto the door
  await page.waitForSelector('#deck:not([hidden])', { timeout: 8000 });
  await page.evaluate(() => { const D = window.__deck; D.start(); D.step(1.5); for (let k = 0; k < 900; k++) { D.step(1 / 30); D.state().hand.forEach((c, i) => c && k % 20 === 0 && D.play(i)); } });
  notes.push('deck mode played: ' + await page.evaluate(() => window.__deck.sceneNow()));
  await page.evaluate(() => window.__hunt.open());
  await page.waitForSelector('#hpanel [data-hunt]', { timeout: 8000 });
  notes.push('hunt board open: ' + await page.evaluate(() => document.querySelectorAll('#hpanel [data-hunt]').length) + ' bosses offered');
  // play a few seconds of several hunts: a spread of bosses and every wizard
  const wizards = ['raven', 'ember', 'frost', 'bone', 'gambler'];
  for (const [i, bi] of [0, 9, 18, 27, 36, 45, 54, 63].entries()) {
    await page.evaluate(([bi, wz]) => { window.__arcana.meta.meta.lastWizard = wz; window.__hunt.start(bi); const S = window.__hunt; for (let k = 0; k < 600; k++) S.step(1 / 60); }, [bi, wizards[i % wizards.length]]);
    const st = await page.evaluate(() => window.__hunt.state());
    if (st.scene !== 'wave' && st.scene !== 'panel') errors.push('hunt ' + bi + ' ended oddly: ' + st.scene);
    // and the boss room
    await page.evaluate(() => { const S = window.__hunt, st = S.state(); st.P.hp = st.P.max = 99; S.enter(st.world.bossCell.id); for (let k = 0; k < 600; k++) S.step(1 / 60); });
  }
  notes.push('hunts played: 8');
  await page.waitForTimeout(300);
} catch (e) { errors.push('exception: ' + e.message.split('\n')[0]); }
finally { if (browser) await browser.close(); srv.kill(); }
for (const n of notes) console.log(n);
if (errors.length) { console.log('FAIL'); for (const e of [...new Set(errors)].slice(0, 12)) console.log(e); process.exit(1); }
console.log('OK: no console or page errors');
