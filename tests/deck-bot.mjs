// Plays whole deck-mode runs in headless Chrome with a dodging, card-playing bot and reports how far it gets.
// usage: node tests/deck-bot.mjs [runs] [--shots dir]
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
const RUNS = +process.argv[2] || 5;
const shotDir = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : '';
const port = 4900 + Math.floor(Math.random() * 90);
const srv = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2500));
const browser = await chromium.launch({ channel: 'chrome' }), errs = new Set(), res = [];
try {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
  page.setDefaultTimeout(0);
  page.on('pageerror', e => errs.add('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.add('console: ' + m.text().slice(0, 160)); });
  await page.goto(`http://localhost:${port}/?deck`); await page.waitForTimeout(1500);
  if (shotDir) await page.screenshot({ path: shotDir + '/deck_title.png' });
  for (let r = 0; r < RUNS; r++) {
    await page.evaluate(() => window.__deck.start());
    const o = await page.evaluate(async (shotDir) => {
      const D = window.__deck; let guard = 0, fights = 0, secs = 0;
      const PRI = ['sun', 'tower', 'death', 'meteor', 'moon', 'blizzard', 'volley', 'chain', 'pyre', 'nova', 'magician', 'wheel', 'bulwark', 'thorns', 'ward', 'shard', 'ember', 'bolt', 'star', 'mend', 'fool'];
      while (guard++ < 400000) {
        const st = D.state();
        if (st.scene === 'end') break;
        if (st.scene === 'reward') {
          const off = D.offer(); let bi = 0, bs = -1;
          off.forEach((c, i) => { const sc = (PRI.length - PRI.indexOf(c.d)) + (c.rev ? -6 : 0); if (sc > bs) { bs = sc; bi = i; } });
          D.step(1.3); D.pick(bi); fights++; continue;
        }
        if (st.scene === 'fight') {
          const P = st.P; let bb = [0, 0], bsc = -1e9;
          for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a), nx = P.x + dx * 30, ny = P.y + dy * 30; let sc = 0;
            for (const q of D.sh()) { const d = Math.hypot(q.x + q.vx * .25 - nx, q.y + q.vy * .25 - ny); sc -= d < 26 ? (26 - d) * (26 - d) : 0; }
            for (const z of D.zn()) { const d = Math.hypot(z.x - nx, z.y - ny); sc -= d < z.r + 12 ? (z.r + 12 - d) * 8 : 0; }
            sc -= Math.max(0, 30 - nx, nx - 450, 90 - ny, ny - 168) * 3; sc -= Math.abs(nx - st.boss.x) * .01; if (sc > bsc) { bsc = sc; bb = [dx, dy]; } }
          D.bot(bb[0], bb[1]);
          if (guard % 3 === 0) { // play the best affordable card
            const h = st.hand; let bi = -1, bs = -1;
            h.forEach((c, i) => { if (!c) return; const d = D.cards[c.d]; if (st.mana < d.cost) return; let sc = PRI.length - PRI.indexOf(c.d); if (c.d === 'mend' && st.P.hp >= st.run.max) sc = -5; if ((c.d === 'ward' || c.d === 'thorns' || c.d === 'bulwark') && st.P.ward > 1) sc = -5; if (c.d === 'star' && st.mana > 6) sc = -5; if (sc > bs) { bs = sc; bi = i; } });
            if (bi >= 0 && bs > -3) D.play(bi);
          }
        }
        D.step(1 / 30); secs += 1 / 30;
      }
      const f = D.state(); return { kills: f.run.kills, win: f.run.kills >= 7, secs: Math.round(secs), deck: f.run.deck.length, hp: f.P && f.P.hp };
    }, shotDir);
    res.push(o); console.log('run', r + 1, JSON.stringify(o));
    if (shotDir && r === 0) await page.screenshot({ path: shotDir + '/deck_end.png' });
  }
} finally { await browser.close(); srv.kill(); }
const w = res.filter(r => r.win).length;
console.log(`\nwon ${w}/${res.length}; avg bosses ${(res.reduce((a, r) => a + r.kills, 0) / res.length).toFixed(1)}; avg run ${Math.round(res.reduce((a, r) => a + r.secs, 0) / res.length)}s`);
console.log(errs.size ? 'ERRORS:\n' + [...errs].join('\n') : 'no page errors');
process.exit(errs.size ? 1 : 0);
