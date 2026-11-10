// Feature test for Hot & Hangry's town fun layer: loot, drive-by customers, nitro, ramps, smashable stalls, weapon pickups.
//   node tests/foodtruck-fun.mjs [--shots dir]
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const shotDir = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : '';
const root = path.resolve('prototypes/foodtruck');
const MIME = { '.html': 'text/html', '.png': 'image/png', '.js': 'text/javascript' };
const srv = http.createServer((q, s) => { const p = q.url.split('?')[0], f = path.join(root, p === '/' ? 'index.html' : p.split('..').join('')); try { s.setHeader('Content-Type', MIME[path.extname(f)] || 'text/plain'); s.end(fs.readFileSync(f)); } catch (e) { s.statusCode = 404; s.end('nf'); } }).listen(0);
await new Promise(r => srv.on('listening', r));
const port = srv.address().port, errs = new Set();
const browser = await chromium.launch({ channel: 'chrome' });
let fails = 0;
const ok = (n, v, extra = '') => { console.log((v ? 'PASS ' : 'FAIL ') + n + (extra ? '  ' + extra : '')); if (!v) fails++; };
try {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
  page.setDefaultTimeout(0);
  page.on('pageerror', e => errs.add('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.add('console: ' + m.text().slice(0, 200)); });
  await page.goto(`http://localhost:${port}/`); await page.waitForTimeout(1500);
  const shot = async (name) => { if (shotDir) { await page.waitForTimeout(250); await page.screenshot({ path: shotDir + '/fun_' + name + '.png' }); } };
  const r = await page.evaluate(() => {
    const F = window.__ft, out = {}; F.newRun(0); F.startTrip(); const st = () => F.state(); const S = st().S, w = S.city, tr = S.truck, RUN = st().RUN;
    const step = n => { for (let i = 0; i < n; i++) F.step(1 / 30); };
    w.grace = 99; RUN.insp = 0; w.mins = []; w.cops = []; w.rivals = []; w.lots.forEach(l => { l.used = true; });
    out.counts = { pads: w.pads.length, ramps: w.pads.filter(p => p.k === 'ramp').length, boost: w.pads.filter(p => p.k === 'boost').length, stalls: w.stalls.length, crates: w.crates.length };
    // ramp
    const ramp = w.pads.find(p => p.k === 'ramp'); tr.x = ramp.x - (ramp.h2 ? 60 : 0); tr.y = ramp.y - (ramp.h2 ? 0 : 60); F.setKey(ramp.h2 ? 'r' : 'd', 1); let maxZ = 0; for (let i = 0; i < 60; i++) { F.step(1 / 30); maxZ = Math.max(maxZ, tr.z || 0); } F.setKey('r', 0); F.setKey('d', 0);
    out.ramp = { maxZ: Math.round(maxZ), landed: tr.z === 0, streak: S.streak };
    // stall smash
    step(30); const stall = w.stalls.find(s => !s.dead); tr.x = stall.x - 70; tr.y = stall.y; tr.vx = 0; tr.vy = 0; F.setKey('r', 1); const bldBefore = w.bld.length; step(50); F.setKey('r', 0);
    out.stall = { dead: stall.dead, bldDelta: bldBefore - w.bld.length, loot: w.loot.length };
    // collect loot
    const cash0 = RUN.cash; for (const l of w.loot.filter(l => l.k === 'coin').slice()) { tr.x = l.x; tr.y = l.y; tr.vx = tr.vy = 0; step(25); } out.loot = { cashGain: +(RUN.cash - cash0).toFixed(2), left: w.loot.length };
    // crate
    const crate = w.crates.find(c => !c.dead); tr.x = crate.x - 30; tr.y = crate.y; tr.vx = 0; F.setKey('r', 1); step(30); F.setKey('r', 0); out.crate = { dead: crate.dead };
    // fan
    w.fans = []; tr.x = 600; tr.y = CITY_Y(w); const fan = { x: tr.x + 10, y: tr.y, t: 26, ph: 0, hold: 0, hop: 0, spr: 'pr0', want: RUN.dishes[0].k, h: true, side: 1 }; w.fans.push(fan); tr.vx = tr.vy = 0; const cash1 = RUN.cash; step(30); out.fan = { sold: fan.sold, gain: Math.round(RUN.cash - cash1) };
    function CITY_Y(w) { return w.rd.hy[1]; }
    // nitro
    S.nitro = 1; window.__nitroBefore = S.nitro; return out;
  });
  console.log(JSON.stringify(r));
  ok('has ramps', r.counts.ramps > 0, JSON.stringify(r.counts)); ok('has boost pads', r.counts.boost > 0); ok('has stalls', r.counts.stalls > 0); ok('has crates', r.counts.crates > 0);
  ok('ramp launches truck', r.ramp.maxZ > 15, JSON.stringify(r.ramp)); ok('truck lands again', r.ramp.landed);
  ok('stall smashed at speed', r.stall.dead && r.stall.bldDelta >= 1, JSON.stringify(r.stall));
  ok('loot collected', r.loot.cashGain > 0, JSON.stringify(r.loot)); ok('crate smashed', r.crate.dead); ok('drive-by sale paid', r.fan.sold && r.fan.gain > 0, JSON.stringify(r.fan));
  const n = await page.evaluate(() => {
    const F = window.__ft, S = F.state().S, w = S.city, tr = S.truck, RUN = F.state().RUN, out = {}; const step = k => { for (let i = 0; i < k; i++) F.step(1 / 30); };
    w.lots.forEach(l => { l.used = true; }); w.grace = 0; RUN.insp = 0; RUN.hp = RUN.hpMax; S.nitro = 1; S.boost = false; w.bld = []; w.stalls = []; w.cars = []; w.pads = [];
    // nitro toggle through the keyboard path and speed check
    tr.x = 800; tr.y = 800; tr.vx = tr.vy = 0; F.setKey("r", 1); step(40); const s0 = Math.hypot(tr.vx, tr.vy); window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); out.boostOn = S.boost; step(40); const s1 = Math.hypot(tr.vx, tr.vy); F.setKey('r', 0); out.speeds = [Math.round(s0), Math.round(s1)]; out.nitroLeft = +S.nitro.toFixed(2);
    // weapons
    out.weaps = {};
    for (const k of ['ketchup', 'flame', 'ice', 'pie']) {
      w.mins = []; S.weap = { k, t: 16, cd: 0 }; S.boost = false; tr.x = w.rd.vx[1]; tr.y = w.rd.hy[1] + 300; tr.vx = tr.vy = 0; w.fire = []; w.pr = [];
      for (let i = 0; i < 3; i++) w.mins.push({ k: 'sedan', D: { hp: 16, spd: 0, dmg: 0, w: 26, h: 14, xp: .5, cash: .7 }, x: tr.x + 90 + i * 20, y: tr.y + i * 14, vx: 0, vy: 0, hp: 40, max: 40, stun: 0, slow: 0, burn: 0, flash: 0, ang: 0, hit: 0, col: '#fff', dash: 0, dcd: 9, hue: 0 });
      F.setKey('u', k === 'flame' || k === 'ice' ? 1 : 0); let shots = 0; for (let i = 0; i < 90; i++) { F.step(1 / 30); shots = Math.max(shots, w.pr.filter(p => p.sp).length); } F.setKey('u', 0);
      out.weaps[k] = { shots, fire: w.fire.length, hpLeft: w.mins.reduce((a, m) => a + m.hp, 0), alive: w.mins.length };
    }
    return out;
  });
  console.log(JSON.stringify(n));
  ok('nitro speeds truck up', n.boostOn && n.speeds[1] > n.speeds[0] * 1.3, JSON.stringify(n.speeds));
  ok('ketchup shoots', n.weaps.ketchup.shots > 0 || n.weaps.ketchup.hpLeft < 120); ok('pie shoots', n.weaps.pie.shots > 0 || n.weaps.pie.hpLeft < 120);
  ok('flame trail drops fire', n.weaps.flame.fire > 0); ok('ice trail drops ice', n.weaps.ice.fire > 0);
  const cc = await page.evaluate(() => {
    const F = window.__ft, S = F.state().S, w = S.city, tr = S.truck, RUN = F.state().RUN, out = {}; const step = k => { for (let i = 0; i < k; i++) F.step(1 / 30); };
    w.lots.forEach(l => { l.used = true; }); w.grace = 99; w.mins = []; w.cops = []; w.rivals = []; w.pads = []; w.stalls = []; w.bld = []; S.boost = false;
    const run = boost => { let cr = w.cars.find(c => c.h); if (!cr) { cr = { h: true, dir: 1, f: 1, x: 0, y: 0, spd: 0, hue: 0 }; w.cars.push(cr); } cr.x = 1200; cr.y = cr.ly = 1000; cr.dir = 1; cr.spd = 0; cr.stun = 0; cr.kx = cr.ky = 0; tr.x = 1100; tr.y = 1000; tr.vx = tr.vy = 0; tr.hit = 0; RUN.hp = RUN.hpMax; S.boost = boost; S.nitro = 1; F.setKey('r', 1); let minGap = 1e9, hp0 = RUN.hp; for (let i = 0; i < 45; i++) { F.step(1 / 30); minGap = Math.min(minGap, cr.x - tr.x); } F.setKey('r', 0); S.boost = false; return { passedThrough: tr.x > cr.x, gap: Math.round(minGap), hpLost: Math.round(hp0 - RUN.hp), carMoved: Math.round(cr.x - 1200) }; };
    out.normal = run(false); out.boost = run(true); return out;
  });
  console.log(JSON.stringify(cc));
  ok('cannot drive through a car', !cc.normal.passedThrough && cc.normal.gap > 10 && cc.normal.hpLost > 0, JSON.stringify(cc.normal));
  ok('nitro bowls a car aside', cc.boost.carMoved > 40 && cc.boost.hpLost <= 2, JSON.stringify(cc.boost));
  if (shotDir) {
    await page.evaluate(() => { const F = window.__ft, S = F.state().S, w = S.city, tr = S.truck, RUN = F.state().RUN; w.mins = []; w.cops = []; w.rivals = []; w.grace = 99; S.weap = { k: 'flame', t: 12, cd: 0 }; S.nitro = .8; S.streak = 9; S.streakT = 4;
      const rp = w.pads.find(p => p.k === 'ramp'); tr.x = rp.x - 90; tr.y = rp.y; tr.vx = tr.vy = 0; w.fans = []; w.fans.push({ x: tr.x + 40, y: tr.y - 60, t: 20, ph: 0, hold: 0, hop: 0, spr: 'pr0', want: RUN.dishes[0].k, h: true, side: -1 }); for (let i = 0; i < 6; i++) w.loot.push({ k: 'coin', x: tr.x + 30 + i * 20, y: tr.y + 20, vx: 0, vy: 0, z: 0, vz: 0, v: 1, age: 1, ph: i, life: 99 });
      w.loot.push({ k: 'weap', wk: 'ketchup', x: tr.x + 60, y: tr.y + 40, vx: 0, vy: 0, z: 0, vz: 0, v: 0, age: 1, ph: 1, life: 99 }, { k: 'fuel', x: tr.x + 90, y: tr.y + 30, vx: 0, vy: 0, z: 0, vz: 0, v: 7, age: 1, ph: 2, life: 99 }, { k: 'nitro', x: tr.x + 100, y: tr.y + 40, vx: 0, vy: 0, z: 0, vz: 0, v: .4, age: 1, ph: 3, life: 99 }, { k: 'gem', x: tr.x + 110, y: tr.y + 30, vx: 0, vy: 0, z: 0, vz: 0, v: .5, age: 1, ph: 4, life: 99 }, { k: 'kit', x: tr.x + 120, y: tr.y + 40, vx: 0, vy: 0, z: 0, vz: 0, v: 4, age: 1, ph: 5, life: 99 });
      F.step(1 / 30); });
    await shot('ramp');
    await page.evaluate(() => { const F = window.__ft, S = F.state().S, w = S.city, tr = S.truck; const st = w.stalls.find(s => !s.dead); tr.x = st.x - 40; tr.y = st.y + 6; tr.vx = tr.vy = 0; S.boost = true; F.step(1 / 30); });
    await shot('stall');
    await page.evaluate(() => { const F = window.__ft, S = F.state().S, w = S.city, tr = S.truck; const rp = w.pads.find(p => p.k === 'ramp'); tr.x = rp.x; tr.y = rp.y; tr.vx = rp.h2 ? 120 : 0; tr.vy = rp.h2 ? 0 : 120; S.truck.z = 0; for (let i = 0; i < 6; i++) { F.setKey(rp.h2 ? 'r' : 'd', 1); F.step(1 / 30); } });
    await shot('air');
  }
  console.log('page errors:', errs.size ? [...errs].join(' | ') : 'none');
  if (errs.size) fails++;
} finally { await browser.close(); srv.close(); }
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
