// Plays Ridgeline (prototypes/trail) in headless Chrome with a pacing bot and reports medals, bonks and DNFs. Also saves screenshots with --shots dir.
// usage: node tests/trail-bot.mjs [runsPerRace] [--shots dir] [--effort e]   (e = fixed effort instead of the pacing bot)
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const RUNS = +process.argv[2] || 4;
const MISS = process.argv.includes('--miss') ? +process.argv[process.argv.indexOf('--miss') + 1] : .12;
const shotDir = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : '';
const fixed = process.argv.includes('--effort') ? +process.argv[process.argv.indexOf('--effort') + 1] : null;
const root = path.resolve('prototypes/trail');
const srv = http.createServer((q, s) => { s.setHeader('Content-Type', 'text/html'); s.end(fs.readFileSync(path.join(root, 'index.html'))); }).listen(0);
const port = srv.address().port;
const browser = await chromium.launch({ channel: 'chrome' }), errs = new Set(), out = [];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(0);
  page.on('pageerror', e => errs.add('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.add('console: ' + m.text().slice(0, 160)); });
  await page.goto(`http://localhost:${port}/`); await page.waitForTimeout(800);
  if (shotDir) await page.screenshot({ path: shotDir + '/trail_map.png' });
  for (let ri = 0; ri < 3; ri++) {
    const res = [];
    for (let k = 0; k < RUNS; k++) {
      const o = await page.evaluate(([ri, fixed, shotDir, k, MISS]) => {
        const T = window.__trail; T.startRace(ri); let guard = 0, shots = 0;
        while (guard++ < 400000) {
          const st = T.state(), sc = st.scene;
          if (sc === 'result' || sc === 'dnf') break;
          if (sc === 'draft' || sc === 'aid') { T.draft(Math.floor(Math.random() * 3)); continue; }
          if (sc === 'event') { T.choose(Math.random() < .35 ? 1 : 0); continue; }
          if (sc === 'run') {
            const P = st.P, g = T.seg().g;
            if (fixed != null) T.setEffort(fixed); else T.setEffort(T.sweet(g, st.S.heat) + (.74 - P.hr) * 1.3);
            if (P.water < 45) T.drink(); if (P.fuel < 45) T.gel();
            const ob = st.S.obs.find(o => !o.done && o.x > P.x);
            if (ob) { if (ob.__skip === undefined) ob.__skip = Math.random() < MISS; const tt = (ob.x - P.x) / Math.max(P.speed, 1); if (!ob.__skip && tt < .3 && tt > .04) { if (ob.k === 'branch') { if (P.duck <= 0) T.duck(); } else if (P.jy === 0) T.jump(); } }
          }
          T.step(1 / 30);
        }
        const st = T.state(); return { hits: 0, sc: st.scene, medal: st.R_.res && st.R_.res.medal, bonks: st.R_.bonks, total: Math.round(st.R_.total), why: st.R_.why, gear: st.R_.gear.join(',') };
      }, [ri, fixed, shotDir, k, MISS]);
      res.push(o);
    }
    out.push([ri, res]);
    console.log(['Pine', 'Canyon', 'Sky'][ri], res.map(r => r.sc === 'result' ? `${r.medal}(${r.total}s,${r.bonks}b)` : `DNF:${r.why}`).join('  '));
  }
} finally { await browser.close(); srv.close(); }
console.log(errs.size ? 'ERRORS:\n' + [...errs].join('\n') : 'no page errors');
process.exit(errs.size ? 1 : 0);
