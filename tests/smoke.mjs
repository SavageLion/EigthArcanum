// Smoke test: boots the built game in system Chrome, plays through the title, draw and a fight; fails on any console/page error.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';

const NL = String.fromCharCode(10);
const port = 4300 + Math.floor(Math.random() * 500);
const srv = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2500));
const errors = [];
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 400, height: 760 }, hasTouch: true });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(`http://localhost:${port}/`);
  await page.waitForSelector('#ov .go');
  await page.click('#ov .go');                 // Begin a run (title) -> the Sanctum
  await page.waitForTimeout(600);
  await page.evaluate(() => { const A = window.__arcana; A.G.P.x = 200; A.G.P.y = A.G.H * 0.19 + 72; });   // walk onto the Door
  await page.waitForSelector('#start', { timeout: 8000 }); await page.click('#start');   // setup screen: Begin the run
  await page.waitForTimeout(600);
  // every boss x every arena type, run for a couple of simulated seconds
  const arenas = ['chariot', 'wheel', 'justice', 'strength'];
  let fights = 0;
  for (let stage = 0; stage < 16; stage++) {
    for (const arena of arenas) {
      await page.evaluate(([st, ar]) => {
        const a = window.__arcana;
        a.startRun(); a.S.stage = st; a.S.pos = st;
        a.quickPull('magician', ar);
      }, [stage, arena]).catch(e => errors.push(`fight ${stage}/${arena}: ${e.message}`));
      await page.waitForTimeout(250);
      fights++;
    }
  }
  // deeper pass: real play-through. Fight with god mode, deal lethal damage, then click through reward, shop and loot like a player.
  const flows = [];
  const waitMode = (m, ms) => page.waitForFunction(x => window.__arcana.S.mode === x, m, { timeout: ms });
  for (const [stage, arena] of [[0,'chariot'],[3,'wheel'],[5,'justice'],[7,'strength'],[11,'justice'],[13,'strength'],[15,'wheel']]) {
    try {
      await page.evaluate(([st, ar]) => { const a = window.__arcana; a.startRun(); a.S.stage = st; a.S.pos = st === 7 ? 15 : st; a.quickPull("magician", ar); a.S.god = true; }, [stage, arena]);
      await waitMode('fight', 5000);
      await page.waitForTimeout(2500);               // let the boss attack for a while
      const shots = await page.evaluate(() => { const a = window.__arcana; a.spawnChest(); return a.counts().shots; });
      await page.waitForTimeout(400);
      await page.evaluate(() => window.__arcana.damage(1e9));
      // click through whatever the game shows until the next fight (or victory) begins
      const trail = [];
      for (let i = 0; i < 14; i++) {
        await page.waitForTimeout(350);
        const mode = await page.evaluate(() => window.__arcana.S.mode);
        if (mode === 'fight' || mode === 'intro' || mode === 'victory') { trail.push(mode); break; }
        const sel = ['#ov .card', '#ov #sell', '#ov .shoprow .buy', '#ov .go', '#ov button'];
        let clicked = null;
        for (const q of sel) { const el = await page.$(q); if (el && await el.isVisible()) { await el.click({ timeout: 1000 }).catch(() => {}); clicked = q; break; } }
        trail.push(mode + (clicked ? '>' + clicked.replace('#ov ', '') : ''));
      }
      flows.push('boss ' + stage + ' (' + arena + '): ' + shots + ' shots | ' + trail.join(' , '));
    } catch (e) { errors.push('flow ' + stage + '/' + arena + ': ' + e.message.split(NL)[0]); }
  }
  console.log(flows.join(NL));
  const modes = [await page.evaluate(() => window.__arcana.S.mode)];
  await page.screenshot({ path: process.argv[2] || 'tests/last.png' });
  console.log('fights started:', fights, '| final mode:', modes.join(','));
} finally {
  await browser?.close();
  srv.kill();
}
if (errors.length) { console.error('FAIL\n' + [...new Set(errors)].join('\n')); process.exit(1); }
console.log('OK: no console or page errors');
