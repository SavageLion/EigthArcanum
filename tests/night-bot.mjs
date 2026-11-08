// Plays whole night-mode runs in headless Chrome with a scavenging, light-keeping bot and reports how many nights it survives.
// usage: node tests/night-bot.mjs [runs]
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
const RUNS = +process.argv[2] || 6;
const port = 4700 + Math.floor(Math.random() * 90);
const srv = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2500));
const browser = await chromium.launch({ channel: 'chrome' }), errs = new Set(), res = [];
try {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
  page.setDefaultTimeout(0);
  page.on('pageerror', e => errs.add('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.add('console: ' + m.text().slice(0, 160)); });
  await page.goto(`http://localhost:${port}/?night`); await page.waitForTimeout(1500);
  for (let r = 0; r < RUNS; r++) {
    await page.evaluate(() => window.__night.start());
    const o = await page.evaluate(() => {
      const D = window.__night; let guard = 0; const causes = {};
      while (guard++ < 200000) {
        const st = D.state(), sc = st.scene;
        if (sc === 'end' || sc === 'dead') break;
        if (sc === 'reading') { D.step(4); D.begin(); continue; }
        if (sc === 'boon') { D.boon(Math.floor(Math.random() * 3)); continue; }
        if (sc === 'dawn') { D.step(.5); continue; }
        if (sc !== 'night') { D.step(.2); continue; }
        const { N, P } = st; let tx = 0, ty = 0;
        const lit = N.lanterns.filter(l => l.fuel > 2), unlit = N.lanterns.filter(l => l.fuel <= 0);
        const goto = (x, y, w = 1) => { const d = Math.hypot(x - P.x, y - P.y) || 1; tx += (x - P.x) / d * w; ty += (y - P.y) / d * w; };
        const stubs = N.picks.filter(p => !p.got).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y));
        if (N.wax < N.maxWax * .55 && stubs.length) goto(stubs[0].x, stubs[0].y, 1.2);
        else if (N.wax > 40 && unlit.length && lit.length < 2) { unlit.sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y)); goto(unlit[0].x, unlit[0].y, 1.2); }
        else if (N.san < 60 && lit.length) { lit.sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y)); if (Math.hypot(lit[0].x - P.x, lit[0].y - P.y) > 25) goto(lit[0].x, lit[0].y, 1); }
        else if (stubs.length) goto(stubs[0].x, stubs[0].y, .6);
        let near = 0;
        for (const m of N.mons) { const d = Math.hypot(m.x - P.x, m.y - P.y); if (m.k === 'angel') { if (d < 40) { tx -= (m.x - P.x) / d * 1.2; ty -= (m.y - P.y) / d * 1.2; } continue; } if (d < 70) near++; if (m.k === 'hunter' && d < 110) { const w = (110 - d) / 110 * 3; tx -= (m.x - P.x) / d * w; ty -= (m.y - P.y) / d * w; } else if (m.k === 'whisper' && d < 150) { tx += (m.x - P.x) / d * .5; ty += (m.y - P.y) / d * .5; } }
        const whisperNear = N.mons.some(m => m.k === 'whisper' && Math.hypot(m.x - P.x, m.y - P.y) < 95); const hunterNear = N.mons.some(m => m.k === 'hunter' && Math.hypot(m.x - P.x, m.y - P.y) < 60);
        if ((near >= 3 || hunterNear || whisperNear) && N.flareCd <= 0 && N.wax > 14) D.flare();
        const l = Math.hypot(tx, ty); if (l > 1) { tx /= l; ty /= l; }
        D.bot(tx, ty); D.step(1 / 30);
      }
      const f = D.state(); return { nights: f.run.night, win: f.run.night >= 7, hurt: f.run.hurt, t: Math.round(f.N.t), len: f.N.len, san: Math.round(f.N.san), wax: Math.round(f.N.wax), spread: f.spread.map(s => s.id + (s.rev ? 'R' : '')).join('/') };
    });
    res.push(o); console.log('run', r + 1, JSON.stringify(o));
  }
} finally { await browser.close(); srv.kill(); }
const w = res.filter(r => r.win).length;
console.log(`\nsurvived all 7: ${w}/${res.length}; avg nights ${(res.reduce((a, r) => a + r.nights, 0) / res.length).toFixed(1)}`);
console.log(errs.size ? 'ERRORS:\n' + [...errs].join('\n') : 'no page errors');
process.exit(errs.size ? 1 : 0);
