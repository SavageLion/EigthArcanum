// Plays Hot & Hangry (prototypes/foodtruck) in headless Chrome: an autoplay bot runs whole games and reports how they go.
//   node tests/foodtruck-bot.mjs [runs] [--shots dir]
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const RUNS = +process.argv[2] || 3, shotDir = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : '';
const root = path.resolve('prototypes/foodtruck');
const MIME = { '.html': 'text/html', '.png': 'image/png', '.js': 'text/javascript' };
const srv = http.createServer((q, s) => { const p = q.url.split('?')[0], f = path.join(root, p === '/' ? 'index.html' : p.split('..').join('')); try { s.setHeader('Content-Type', MIME[path.extname(f)] || 'text/plain'); s.end(fs.readFileSync(f)); } catch (e) { s.statusCode = 404; s.end(); } }).listen(0);
await new Promise(r => srv.on('listening', r));
const port = srv.address().port;
const browser = await chromium.launch({ channel: 'chrome' }), errs = new Set();
try {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
  page.setDefaultTimeout(0);
  page.on('pageerror', e => errs.add('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.add('console: ' + m.text().slice(0, 200)); });
  await page.goto(`http://localhost:${port}/`); await page.waitForTimeout(1200);
  for (let i = 0; i < RUNS; i++) {
    const r = await page.evaluate(() => {
      const F = window.__ft; F.auto(true); let g = 0, maxShift = 0, lv = 0;
      while (g++ < 400000) { F.step(1 / 30); const st = F.state(); if (st.RUN) { maxShift = Math.max(maxShift, st.RUN.shift); lv = st.RUN.lv; } if (st.scene === 'over' || st.scene === 'win') break; }
      const st = F.state(); F.auto(false);
      return { scene: st.scene, shifts: st.RUN.shift, fed: st.RUN.fed, lv: st.RUN.lv, cash: Math.round(st.RUN.cash), dishes: st.RUN.dishes.map(d => d.k + d.lv + (d.fl.length ? '+' + d.fl.join('+') : '') + (d.recipe ? '[' + d.recipe + ']' : '')).join(' '), relics: st.RUN.relics.join(','), steps: g };
    });
    console.log(`run ${i + 1}: ${r.scene} after ${r.shifts} shifts, fed ${r.fed}, level ${r.lv}, cash ${r.cash}   menu: ${r.dishes}   relics: ${r.relics}   (${r.steps} steps)`);
  }
  if (shotDir) {
    const shot = async (name, fn, wait = 400) => { await page.evaluate(fn); await page.waitForTimeout(wait); await page.screenshot({ path: shotDir + '/ft_' + name + '.png' }); };
    await shot('title', () => { const F = window.__ft; F.goto('title'); });
    await shot('drive', () => { const F = window.__ft; F.newRun(0); F.startDrive(); for (let i = 0; i < 60; i++) { F.setKey('r', 1); F.step(1 / 30); } F.setKey('r', 0); });
    await shot('shift', () => { const F = window.__ft; F.startShift('stadium'); F.auto(true); for (let i = 0; i < 420; i++) F.step(1 / 30); F.auto(false); });
    await shot('levelup', () => { const F = window.__ft; const S = F.state(); S.RUN.xp = 999; F.step(1 / 30); });
    await shot('results', () => { const F = window.__ft; F.pick(0); F.state().S.fedThis = 31; F.state().S.tipsThis = 44; F.goto('shift'); F.state().S.shiftT = 999; F.step(1 / 30); });
  }
  const pp = await browser.newPage({ viewport: { width: 390, height: 844 } });
  pp.on('pageerror', e => errs.add('portrait pageerror: ' + e.message));
  await pp.goto(`http://localhost:${port}/`); await pp.waitForTimeout(800);
  const rot = await pp.evaluate(() => window.__ft.rot());
  console.log('portrait phone rotates the game:', rot);
  if (shotDir) { await pp.evaluate(() => { const F = window.__ft; F.newRun(1); F.startShift('beach'); F.auto(true); for (let i = 0; i < 400; i++) F.step(1 / 30); F.auto(false); }); await pp.waitForTimeout(300); await pp.screenshot({ path: shotDir + '/ft_portrait.png' }); }
} finally { await browser.close(); srv.close(); }
console.log(errs.size ? 'ERRORS:\n' + [...errs].join('\n') : 'no page errors');
process.exit(errs.size ? 1 : 0);
