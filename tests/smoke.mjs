// Smoke test: boots the built game in system Chrome, plays through the title, draw and a fight; fails on any console/page error.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';

const port = 4173;
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
  await page.click('#ov .go');                 // Begin a run
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
  const modes = [await page.evaluate(() => window.__arcana.S.mode)];
  await page.screenshot({ path: process.argv[2] || 'tests/last.png' });
  console.log('fights started:', fights, '| final mode:', modes.join(','));
} finally {
  await browser?.close();
  srv.kill();
}
if (errors.length) { console.error('FAIL\n' + [...new Set(errors)].join('\n')); process.exit(1); }
console.log('OK: no console or page errors');
