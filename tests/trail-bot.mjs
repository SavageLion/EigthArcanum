// Plays Ridgeline (prototypes/trail) in headless Chrome.
//   node tests/trail-bot.mjs [runsPerRace]     pacing bot on a FRESH save for every race and training trail
//   node tests/trail-bot.mjs --season [N]      a management bot plays N seasons (train, rest, physio, shop, race) and logs how it goes
//   --shots dir   saves screenshots of the main screens      --effort e   fixed effort instead of the pacing bot
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const arg = (n, d) => process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d;
const RUNS = +process.argv[2] || 3, SEASON = process.argv.includes('--season'), SEASONS = +arg('--season', 1) || 1;
const shotDir = arg('--shots', ''), fixed = process.argv.includes('--effort') ? +arg('--effort') : null;
const root = path.resolve('prototypes/trail');
const MIME = { '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, s) => { const p = q.url.split('?')[0], f = path.join(root, p === '/' ? 'index.html' : p.split('..').join('')); try { s.setHeader('Content-Type', MIME[path.extname(f)] || 'text/plain'); s.end(fs.readFileSync(f)); } catch (e) { s.statusCode = 404; s.end(); } }).listen(0);
const port = srv.address().port;
const browser = await chromium.launch({ channel: 'chrome' }), errs = new Set();
const NAMES = ['Pine', 'Canyon', 'Sky', 'Summit', 'Hills', 'Long', 'Heat', 'Recovery'];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(0);
  page.on('pageerror', e => errs.add('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.add('console: ' + m.text().slice(0, 160)); });
  await page.goto(`http://localhost:${port}/`); await page.waitForTimeout(800);
  await page.evaluate(() => {
    const T = window.__trail;
    const tri = x => { x = ((x % 2) + 2) % 2; return x < 1 ? x : 2 - x; };
    // solves the open physio game; acc = chance each press is aimed at the zone
    window.__solve = acc => {
      let g = 0;
      while (T.state().PH && T.state().PH.mode === 'play' && g++ < 20000) {
        const PH = T.state().PH, pos = tri(PH.t * PH.speed);
        if (PH.aim == null || PH.aimN !== PH.n) { PH.aimN = PH.n; PH.aim = Math.random() < acc ? PH.zc : (Math.random() < .5 ? 0.02 : 0.98); }
        if (Math.abs(pos - PH.aim) < .03) T.press(); else T.step(1 / 60);
      }
      const ok = T.state().PH && T.state().PH.res && T.state().PH.res.ok; T.leave(); return !!ok;
    };
    // plays the open bear fight like a human: reacts to the swipe telegraph after rt seconds, punches when the bear is open
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
    // trail view: 'trail' follows the marked course, 'direct' heads straight for the finish
    window.__navBot = mode => {
      T.reset(); T.navStart(); let g = 0, idx = 0, slow = 0, rnd = 0; const nrm = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
      while (T.state().scene === 'nav' && g++ < 120000) {
        const n = T.nav(), st = T.state(), P = st.P, W_ = n.W; let tx, ty;
        if (mode === 'trail') { while (idx < W_.pts.length - 1 && Math.hypot(W_.pts[idx].x - n.px, W_.pts[idx].y - n.py) < 18) idx++; const q = W_.pts[Math.min(idx + 2, W_.pts.length - 1)]; tx = q.x; ty = q.y; }
        else { tx = (W_.fin.x + .5) * 8; ty = (W_.fin.y + .5) * 8; }
        let steer = Math.max(-1, Math.min(1, nrm(Math.atan2(ty - n.py, tx - n.px) - n.hd) * 3));
        if (mode !== 'trail') { if (P.speed < 3) slow++; else slow = 0; if (slow > 25) { rnd = 40; slow = 0; steer = Math.random() < .5 ? -1 : 1; n.__r = steer; } if (rnd > 0) { rnd--; steer = n.__r; } }
        T.steer(steer);
        T.setEffort(T.sweet(n.seg.g, st.S.heat) + (.74 - P.hr) * 1.3);
        if (P.water < 45) T.drink(); if (P.fuel < 45) T.gel();
        T.step(1 / 30);
      }
      const st = T.state(); return { sc: st.scene, medal: st.R_.res && st.R_.res.medal, total: Math.round(st.R_.total), why: st.R_.why, dist: Math.round(st.NAV ? st.NAV.dist : 0) };
    };
    const nrm = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
    window.__ctl = fixed => {
      const n = T.nav(), st = T.state(), P = st.P, W_ = n.W; n.__idx = n.__idx || 0;
      while (n.__idx < W_.pts.length - 1 && Math.hypot(W_.pts[n.__idx].x - n.px, W_.pts[n.__idx].y - n.py) < 18) n.__idx++;
      const q = W_.pts[Math.min(n.__idx + 2, W_.pts.length - 1)];
      T.steer(Math.max(-1, Math.min(1, nrm(Math.atan2(q.y - n.py, q.x - n.px) - n.hd) * 3)));
      if (fixed != null) T.setEffort(fixed); else T.setEffort(T.sweet(n.seg.g, st.S.heat) + (.74 - P.hr) * 1.3);
      if (P.water < 45) T.drink(); if (P.fuel < 45) T.gel();
    };
    window.__run = (idx, fixed, acc) => {
      T.start(idx); let guard = 0, treated = 0;
      while (guard++ < 400000) {
        const st = T.state(), sc = st.scene;
        if (sc === 'result' || sc === 'dnf') break;
        if (sc === 'aid') {
          if (!st.R_.tentUsed && st.save.inj.length) { T.treat('tent', st.save.inj[0].k); window.__solve(acc); treated++; continue; }
          if (st.R_.draft.length) T.draft(Math.floor(Math.random() * st.R_.draft.length)); else T.cont(); continue;
        }
        if (sc === 'bear') { window.__bear(.3, .9); T.bearEnd(); continue; }
        if (sc === 'event') { T.choose(st.P.ev.k === 'bear' ? (Math.random() < .5 ? 0 : 1) : Math.random() < .35 ? 1 : 0); continue; }
        if (sc === 'nav') window.__ctl(fixed);
        T.step(1 / 30);
      }
      const st = T.state();
      return { sc: st.scene, medal: st.R_.res && st.R_.res.medal, bonks: st.R_.bonks, total: Math.round(st.R_.total), why: st.R_.why, inj: st.R_.newInj.length, treated, coins: st.R_.coins };
    };
  });
  if (!SEASON) {
    for (let ri = 0; ri < 8; ri++) {
      const res = [];
      for (let k = 0; k < RUNS; k++) res.push(await page.evaluate(([ri, fixed]) => { window.__trail.reset(); return window.__run(ri, fixed, .8); }, [ri, fixed]));
      console.log(NAMES[ri].padEnd(9), res.map(r => r.sc === 'result' ? `${r.medal || 'ok'}(${r.total}s,${r.bonks}b,${r.inj}inj,${r.treated}tx)` : `DNF:${r.why}`).join('  '));
    }
  } else {
    for (let s = 0; s < SEASONS; s++) {
      const log = await page.evaluate(() => {
        const T = window.__trail; T.reset(); const out = [], St = () => T.state().save;
        const PRICE = { shoes: 60, flask: 30, sleeves: 60, watch: 70, roller: 55, poles: 80, gels: 30, buff: 45, tape: 25, hat: 30 };
        const WANT = ['shoes', 'flask', 'sleeves', 'watch', 'roller', 'poles', 'gels', 'buff', 'tape'];
        for (let step = 0; step < 120; step++) {
          let sv = St(); if (sv.medals.summit === 'silver' || sv.medals.summit === 'gold') { out.push(`day ${sv.day}: SUMMIT cleared (${sv.medals.summit})`); break; }
          for (const id of WANT) { sv = St(); if (!sv.owned.includes(id) && sv.coins >= PRICE[id] + 20) { if (sv.load.length >= sv.cap && sv.cap < 5 && sv.coins >= [60, 110, 180][sv.cap - 2] + PRICE[id] + 20) T.buyCap(); T.buy(id); } }
          sv = St();
          const pref = ['shoes', 'watch', 'sleeves', 'poles', 'flask', 'roller', 'hat', 'buff', 'gels', 'tape'];
          sv.load.slice().forEach(g => T.toggle(g)); pref.filter(g => sv.owned.includes(g)).slice(0, sv.cap).forEach(g => T.toggle(g));
          sv = St();
          const injSev = sv.inj.reduce((a, i) => a + i.s, 0);
          if (sv.fatigue > 55 || injSev >= 3) {
            let guard = 0; while (St().inj.length && St().coins >= 15 && guard++ < 4) { T.treat('base', St().inj[0].k); window.__solve(.8); }
            T.rest(); if (St().day > 300) break; continue;
          }
          const lvs = sv.stats, tot = lvs.end.l + lvs.clm.l + lvs.heat.l + lvs.rec.l;
          const nextRace = ['pine', 'canyon', 'sky', 'summit'].findIndex(id => !['silver', 'gold'].includes(sv.medals[id]));
          const need = [0, 3, 6, 9][nextRace];
          let idx; if (nextRace >= 0 && tot >= need) idx = nextRace; else { const ks = ['clm', 'end', 'heat', 'rec']; const k = ks.reduce((a, b) => lvs[a].l <= lvs[b].l ? a : b); idx = 4 + ks.indexOf(k); }
          const r = window.__run(idx, null, .8);
          sv = St();
          out.push(`day ${sv.day} ${['Pine', 'Canyon', 'Sky', 'Summit', 'Hills', 'Long', 'Heat', 'Recov'][idx]}: ${r.sc === 'result' ? (r.medal || 'ok') : 'DNF ' + r.why} coins=${sv.coins} fat=${Math.round(sv.fatigue)} stats=${lvs.end.l}${lvs.clm.l}${lvs.heat.l}${lvs.rec.l} inj=${sv.inj.map(i => i.k + i.s).join(',')}`);
        }
        return out;
      });
      console.log('--- season', s + 1); console.log(log.join('\n'));
    }
  }
  if (process.argv.includes('--nav')) {
    for (const mode of ['trail', 'direct']) {
      const res = []; for (let i = 0; i < 6; i++) res.push(await page.evaluate(m => window.__navBot(m), mode));
      console.log('nav', mode.padEnd(6), res.map(r => r.sc === 'result' ? `${r.medal}(${r.total}s)` : 'DNF:' + r.why).join('  '));
    }
  }
  if (process.argv.includes('--bear')) {
    for (const [rt, acc] of [[.2, .95], [.35, .9], [.5, .8], [.7, .7]]) {
      const res = await page.evaluate(([rt, acc]) => { const T = window.__trail, o = { win: 0, lose: 0, hits: 0, secs: 0 }; for (let i = 0; i < 20; i++) { T.reset(); T.bearStart('test'); const r = window.__bear(rt, acc), B = T.state().BR; o[r]++; o.hits += B.hits; o.secs += B.t; T.bearEnd(); } return o; }, [rt, acc]);
      console.log(`bear reaction ${rt}s aim ${acc}: wins ${res.win}/20  avg hits ${(res.hits / 20).toFixed(1)}  avg fight ${(res.secs / 20).toFixed(0)}s`);
    }
  }
  if (shotDir) {
    const shot = async (name, fn) => { await page.evaluate(fn); await page.waitForTimeout(250); await page.screenshot({ path: `${shotDir}/trail_${name}.png` }); };
    await shot('map', () => { const T = window.__trail; T.reset(); T.goto('map'); });
    await shot('base', () => { const T = window.__trail; T.give(120); T.setSave({ fatigue: 48, inj: [{ k: 'knee', s: 2 }, { k: 'calf', s: 1 }] }); T.goto('base'); });
    await shot('shop', () => window.__trail.goto('shop'));
    await shot('pick', () => { const T = window.__trail; T.goto('base'); T.state(); T.goto('physio'); });
    await shot('brief', () => { window.__trail.open(1); });
    await shot('run', () => { const T = window.__trail; T.start(0); for (let i = 0; i < 300; i++) { window.__ctl(.5); if (T.state().scene === 'event') T.choose(0); T.step(1 / 30); } });
    await shot('physio', () => { const T = window.__trail; T.goto('base'); T.treat('base', 'knee'); T.step(.4); });
    await shot('aid', () => { const T = window.__trail; T.start(1); let g = 0; while (T.state().scene !== 'aid' && g++ < 90000) { const st = T.state(); if (st.scene === 'event') T.choose(0); else if (st.scene === 'bear') { window.__bear(.3, .9); T.bearEnd(); } else { window.__ctl(); T.step(1 / 30); } } });
    await shot('bear', () => { const T = window.__trail; T.reset(); T.bearStart('test'); for (let i = 0; i < 110; i++) T.step(1 / 60); });
    await shot('nav', () => { const T = window.__trail; T.reset(); T.navStart(); for (let i = 0; i < 240; i++) { const n = T.nav(), P = T.state().P; T.setEffort(.5); T.steer(Math.sin(i / 40) * .3); T.step(1 / 30); } });
    await shot('navmap', () => { window.__trail.nav().map = true; window.__trail.step(.1); });
    await shot('result', () => { window.__run(0, null, .8); });
  }
} finally { await browser.close(); srv.close(); }
console.log(errs.size ? 'ERRORS:\n' + [...errs].join('\n') : 'no page errors');
process.exit(errs.size ? 1 : 0);
