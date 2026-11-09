// Plays the Ridgeline roguelike run (prototypes/trail) in headless Chrome.
//   node tests/trail-run-bot.mjs [runs] [--skill s] [--shots dir]
// The bot paces by the sweet spot, picks nodes by simple rules, takes perks, uses camps and the shop, and logs every leg.
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const arg = (n, d) => process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d;
const RUNS = +process.argv[2] || 5, SKILL = +arg('--skill', 0), shotDir = arg('--shots', '');
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
    const tri = x => { x = ((x % 2) + 2) % 2; return x < 1 ? x : 2 - x; };
    const nrm = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
    window.__solve = acc => {
      let g = 0;
      while (T.state().PH && T.state().PH.mode === 'play' && g++ < 20000) {
        const PH = T.state().PH, pos = tri(PH.t * PH.speed);
        if (PH.aim == null || PH.aimN !== PH.n) { PH.aimN = PH.n; PH.aim = Math.random() < acc ? PH.zc : (Math.random() < .5 ? 0.02 : 0.98); }
        if (Math.abs(pos - PH.aim) < .03) T.press(); else T.step(1 / 60);
      }
      T.leave();
    };
    window.__bear = (rt, acc) => {
      let g = 0, seen = null, wait = 0;
      while (T.state().scene === 'bear' && !T.state().BR.over && g++ < 60000) {
        const B = T.state().BR;
        if (B.state === 'wind') { if (seen !== B.t0) { seen = B.t0 = (B.t0 || B.t); wait = rt + Math.random() * .1; } wait -= 1 / 60; if (wait <= 0 && B.dcd <= 0 && Math.random() < acc) T.dodge(-B.side); }
        else { B.t0 = 0; seen = null; }
        if (B.state === 'open' && B.pcd <= 0 && Math.random() < .8) T.punch();
        T.step(1 / 60);
      }
      return T.state().BR.over;
    };
    const ctl = bias => {
      const n = T.nav(), st = T.state(), P = st.P, W_ = n.W; if (n.brief) T.beginNav(); n.__idx = n.__idx || 0;
      while (n.__idx < W_.pts.length - 1 && Math.hypot(W_.pts[n.__idx].x - n.px, W_.pts[n.__idx].y - n.py) < 18) n.__idx++;
      const q = W_.pts[Math.min(n.__idx + 2, W_.pts.length - 1)];
      T.steer(Math.max(-1, Math.min(1, nrm(Math.atan2(q.y - n.py, q.x - n.px) - n.hd) * 3)));
      T.setEffort(Math.max(0, Math.min(1, T.sweet(n.seg.g, st.S.heat) + (.74 - P.hr) * 1.3 + bias)));
      if (P.water < 45) T.drink(); if (P.fuel < 45) T.gel();
    };
    window.__runBot = (bias, pol) => {
      T.reset(); T.runNew();
      const log = [], used = {}; let guard = 0, legsRun = 0;
      while (T.state().RUN && guard++ < 600000) {
        const st = T.state(), sc = st.scene, R = st.R_, RUN = st.RUN;
        if (sc === 'nav') { ctl(bias); T.step(1 / 30); continue; }
        if (sc === 'event') { T.choose(st.P.ev.k === 'bear' ? 0 : Math.random() < .35 ? 1 : 0); continue; }
        if (sc === 'bear') { window.__bear(.3, .9); T.bearEnd(); continue; }
        if (sc === 'physio') { window.__solve(.8); continue; }
        if (sc === 'runmap') {
          const reach = T.runReach(), inj = st.save.inj.length, hurt = R.legs < 55 || inj;
          let score = n => {
            const k = n.k; let s = Math.random();
            if (k === 'aid' || k === 'tent') s += hurt ? 3 : (R.legs < 75 ? 1.2 : -.5);
            if (k === 'shop') s += RUN.gold >= 45 ? 1.5 : -1;
            if (k === 'event') s += .6;
            if (k === 'flat') s += R.legs < 50 ? 1.5 : 0;
            if (k === 'bear' || k === 'duel') s += R.legs > 70 ? .8 : -1;
            if (k === 'boss') s += 9;
            return s;
          };
          const n = reach.slice().sort((a, b) => score(b) - score(a))[0];
          const before = RUN.legNo;
          T.runEnter(n.L, n.i);
          if (T.state().scene === 'nav') { const t0 = RUN.legNo; n.__t = 1; log.push({ k: n.k, wx: n.wx, start: { legs: Math.round(R.legs), bank: Math.round(RUN.bank) } }); }
          continue;
        }
        if (sc === 'reward') {
          const rp = RUN.rep; if (rp && log.length) { const l = log[log.length - 1]; l.t = Math.round(rp.t); l.par = Math.round(rp.parT); l.gold = rp.gold; l.bank = Math.round(rp.bank); l.duel = rp.duel ? (rp.duel.win ? 'W' : 'L') : ''; l.inj = rp.inj.length; }
          const d = R.draft; const rare = d.find(g => ['goat', 'quads', 'sw', 'kick', 'bank', 'claw', 'metro'].includes(g)) ; T.runPick(rare || d[Math.floor(Math.random() * d.length)] || null); continue;
        }
        if (sc === 'camp') {
          const C = st.CAMP;
          if (C.pick) { T.runCamp.treat(st.save.inj[0].k); continue; }
          if (C.acts > 0) {
            const k = C.node.k;
            if (k === 'aid') { if (st.save.inj.length && RUN.bank > 25 && R.legs > 50) T.runCamp.pick(); else if (R.legs < 45 && RUN.bank > 30) T.runCamp.rest(); else T.runCamp.fuel(); }
            else { if (st.save.inj.length) T.runCamp.pick(); else T.runCamp.massage(); }
            continue;
          }
          T.runDone(C.node); continue;
        }
        if (sc === 'revent') { const E = st.REVT; if (!E.res) T.runEvent(Math.random() < .5 ? 0 : 1); else T.runEventDone(); continue; }
        if (sc === 'rshop') {
          const S = st.SHOPN; let did = false;
          S.stock.forEach((s, i) => { if (!s.sold && RUN.gold >= s.p) { T.runShop.perk(i); did = true; } });
          if (RUN.gold >= 30 && st.save.inj.length && !S.heal) T.runShop.heal();
          T.runDone(S.node); continue;
        }
        if (sc === 'perks' || sc === 'home' || sc === 'physio') { T.goto('runmap'); continue; }
        break;
      }
      const st = T.state();
      return { end: st.END, log, scene: st.scene, guard };
    };
  });
  const summary = { win: 0, legs: [] };
  const byKind = {};
  for (let i = 0; i < RUNS; i++) {
    const r = await page.evaluate(([b]) => window.__runBot(b), [SKILL]);
    const e = r.end;
    console.log(`run ${i + 1}: ${e ? (e.win ? 'SUMMIT' : 'out: ' + e.why) : r.scene + ' (guard ' + r.guard + ')'}  legs ${e ? e.legs : '?'}  gold ${e ? e.gold : '?'}  perks ${e ? e.perks.join(',') : ''}`);
    console.log('   ' + r.log.map(l => `${l.k}[${l.wx}] ${l.t ?? '-'}/${l.par ?? '-'}s b${l.bank ?? '-'}${l.duel || ''}${l.inj ? ' inj' + l.inj : ''} L${l.start.legs}`).join('  |  '));
    if (e && e.win) summary.win++;
    for (const l of r.log) if (l.t) { const o = byKind[l.k] = byKind[l.k] || { n: 0, t: 0, par: 0 }; o.n++; o.t += l.t; o.par += l.par; }
  }
  console.log('summits', summary.win + '/' + RUNS);
  for (const k in byKind) console.log(' ', k.padEnd(6), 'avg time', (byKind[k].t / byKind[k].n).toFixed(1), 'avg par', (byKind[k].par / byKind[k].n).toFixed(1), 'n', byKind[k].n);
  if (shotDir) {
    const shot = async (name, fn) => { await page.evaluate(fn); await page.waitForTimeout(350); await page.screenshot({ path: shotDir + '/run_' + name + '.png' }); };
    await shot('home', () => { const T = window.__trail; T.reset(); T.give(200); T.goto('home'); });
    await shot('map', () => { const T = window.__trail; T.reset(); T.runNew(); const s = T.state(); const n = T.runReach()[1]; s.RUN.sel = { L: n.L, i: n.i }; });
    await shot('nav', () => { const T = window.__trail; const n = T.runReach()[0]; T.runEnter(n.L, n.i); T.beginNav(); for (let i = 0; i < 150; i++) { T.setEffort(.5); T.steer(Math.sin(i / 30) * .2); T.step(1 / 30); } });
    await shot('reward', () => { const T = window.__trail; let g = 0; while (T.state().scene !== 'reward' && g++ < 90000) { const st = T.state(); if (st.scene === 'event') T.choose(0); else if (st.scene === 'bear') { window.__bear(.3, .9); T.bearEnd(); } else if (st.scene === 'nav') { const n = T.nav(), P = st.P, W_ = n.W; n.__idx = n.__idx || 0; while (n.__idx < W_.pts.length - 1 && Math.hypot(W_.pts[n.__idx].x - n.px, W_.pts[n.__idx].y - n.py) < 18) n.__idx++; const q = W_.pts[Math.min(n.__idx + 2, W_.pts.length - 1)]; let a = Math.atan2(q.y - n.py, q.x - n.px) - n.hd; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; T.steer(Math.max(-1, Math.min(1, a * 3))); T.setEffort(T.sweet(n.seg.g, st.S.heat) + (.74 - P.hr) * 1.3); if (P.water < 45) T.drink(); T.step(1 / 30); } else break; } });
    await shot('camp', () => { const T = window.__trail; T.reset(); T.runNew(); const s = T.state(); s.save.inj.push({ k: 'knee', s: 2 }); s.RUN.map[1][0].k = 'aid'; T.runEnter(1, 0); });
    await shot('event', () => { const T = window.__trail; T.reset(); T.runNew(); const s = T.state(); s.RUN.map[1][0].k = 'event'; T.runEnter(1, 0); });
    await shot('shop', () => { const T = window.__trail; T.reset(); T.runNew(); const s = T.state(); s.RUN.gold = 120; s.RUN.map[1][0].k = 'shop'; T.runEnter(1, 0); });
    await shot('end', () => { const T = window.__trail; T.reset(); T.runNew(); T.state().RUN.gold = 90; T.runEnd(true, 'You reached the summit'); });
    await shot('perks', () => { const T = window.__trail; T.reset(); T.runNew(); T.state().R_.gear.push('goat', 'sw', 'caff'); T.goto('perks'); });
  }
} finally { await browser.close(); srv.close(); }
console.log(errs.size ? 'ERRORS:\n' + [...errs].join('\n') : 'no page errors');
process.exit(errs.size ? 1 : 0);
