// Plays the Ridgeline Team Manager (prototypes/trail) in headless Chrome.
//   node tests/trail-team-bot.mjs [seasons] [--pol naive|opt] [--shots dir]
// naive: default plan, no staff.  opt: searches the plan with the solo predictor, trains the weakest stat, buys staff and gear.
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const arg = (n, d) => process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d;
const SEASONS = +process.argv[2] || 1, POL = arg('--pol', 'opt'), shotDir = arg('--shots', '');
const root = path.resolve('prototypes/trail');
const MIME = { '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.js': 'text/javascript' };
const srv = http.createServer((q, s) => { const p = q.url.split('?')[0], f = path.join(root, p === '/' ? 'index.html' : p.split('..').join('')); try { s.setHeader('Content-Type', MIME[path.extname(f)] || 'text/plain'); s.end(fs.readFileSync(f)); } catch (e) { s.statusCode = 404; s.end(); } }).listen(0);
await new Promise(r => srv.on('listening', r));
const port = srv.address().port;
const browser = await chromium.launch({ channel: 'chrome' }), errs = new Set();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(0);
  page.on('pageerror', e => errs.add('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.add('console: ' + m.text().slice(0, 200)); });
  await page.goto(`http://localhost:${port}/`); await page.waitForTimeout(800);
  await page.evaluate(() => {
    const T = window.__trail;
    window.__tmSeason = (pol, withLive) => {
      const out = [], TM = () => T.tm.get();
      for (let guard = 0; guard < 60; guard++) {
        const tm = TM(); if (tm.idx >= 7) break;
        // training and spending
        if (pol === 'opt') {
          for (const k of ['coach', 'phy', 'nut']) { const cost = [[200, 350, 550], [150, 260, 400], [150, 260, 400]][['coach', 'phy', 'nut'].indexOf(k)][tm.staff[k]]; if (cost != null && tm.money >= cost + 60) T.tm.buyStaff(k); }
          for (const g of ['shoes', 'sleeves', 'poles', 'hat', 'flask', 'gels', 'buff']) if (!tm.inv.includes(g) && tm.money >= 100) T.tm.buyGear(g);
          tm.rn.forEach(q => { const ks = ['pow', 'end', 'clm', 'heat', 'rec']; q.focus = q.fat > 75 ? 'rest' : ks.reduce((a, b) => q.st[a] <= q.st[b] ? a : b); q.gear = []; });
          const used = new Set();
          tm.rn.forEach(q => { for (const g of tm.inv) if (q.gear.length < 2 && !used.has(g)) { q.gear.push(g); used.add(g); } });
        } else tm.rn.forEach(q => { q.focus = 'end'; });
        T.tm.skip();
        const r = TM().idx, race = r;
        // plan
        tm.rn.forEach(q => {
          q.enter = !(q.fat > 85 || q.inj.reduce((a, i) => a + i.s, 0) >= 4);
          if (pol === 'opt') {
            const wxk = T.tm.wx(); let best = null;
            for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) for (let c = 0; c < 4; c++) for (let d = 0; d < 4; d++) {
              q.plan = [a, b, c, d]; const p = T.tm.predict(q, race, wxk);
              const score = p.t + (p.bonks ? 200 : 0) + (p.lmin < 6 ? 30 : 0);
              if (!best || score < best.s) best = { s: score, plan: [a, b, c, d] };
            }
            q.plan = best.plan;
          } else q.plan = [1, 1, 1, 2];
        });
        if (tm.rn.filter(q => q.enter).length < 2) tm.rn.forEach(q => q.enter = true);
        T.tm.start();
        const tr = T.tm.tr();
        if (!tr) { out.push('start failed'); break; }
        if (withLive) { for (let i = 0; i < 900 && !tr.done; i++) { T.step(1 / 30); } }
        T.tm.finish();
        const res = T.tm.tr().res;
        out.push(`${['Pine', 'Lakeside', 'Canyon', 'Fogbank', 'Skyline', 'Glacier', 'Summit'][res.idx]} [${T.tm.tr().wxk}] places ${res.rows.map(o => o.place).join(',')}  team ${res.teamRank}  $${res.prize}  money ${TM().money}  stats ${TM().rn.map(q => Object.values(q.st).reduce((a, b) => a + b, 0)).join('/')}  ${res.notes.map(n => n.inj.length).join('')}`);
        T.goto('team');
      }
      return out;
    };
  });
  for (let s = 0; s < SEASONS; s++) {
    await page.evaluate(() => { const T = window.__trail; T.reset(); T.tm.new(); });
    const out = await page.evaluate(pol => window.__tmSeason(pol, false), POL);
    console.log(`--- season ${s + 1} (${POL})`); console.log(out.join('\n'));
    const f = await page.evaluate(() => { const tm = window.__trail.tm.get(); return { pts: tm.pts, money: tm.money }; });
    console.log('points', JSON.stringify(f.pts), 'money', f.money);
  }
  if (shotDir) {
    const shot = async (name, fn) => { await page.evaluate(fn); await page.waitForTimeout(500); await page.screenshot({ path: shotDir + '/tm_' + name + '.png' }); };
    await shot('home', () => { const T = window.__trail; T.reset(); T.goto('home'); });
    await shot('team', () => { const T = window.__trail; T.reset(); T.tm.new(); T.tm.week(); T.goto('team'); });
    await shot('plan', () => { const T = window.__trail; T.goto('tplan'); });
    await shot('race', () => { const T = window.__trail; T.tm.start(); T.tm.speed(4); for (let i = 0; i < 160; i++) T.step(1 / 30); });
    await shot('race2', () => { const T = window.__trail; T.tm.sel(1); T.tm.surge(T.tm.tr().mine[1]); for (let i = 0; i < 260; i++) T.step(1 / 30); });
    await shot('res', () => { const T = window.__trail; T.tm.finish(); });
    await shot('shop', () => { const T = window.__trail; T.goto('tshop'); });
    await shot('recruit', () => { const T = window.__trail; T.tm.get().money = 800; T.goto('team'); T.step(.1); });
  }
} finally { await browser.close(); srv.close(); }
console.log(errs.size ? 'ERRORS:\n' + [...errs].join('\n') : 'no page errors');
process.exit(errs.size ? 1 : 0);
