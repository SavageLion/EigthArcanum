// Plays whole reading-mode runs in headless Chrome with a greedy bot (best hand by brute force, simple shopping) and reports how far it gets.
// usage: node tests/reading-bot.mjs [runs] [--shots dir]
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
const RUNS = +process.argv[2] || 6;
const shotDir = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : '';
const port = 4800 + Math.floor(Math.random() * 90);
const srv = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2500));
const browser = await chromium.launch({ channel: 'chrome' }), errs = new Set(), res = [];
try {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
  page.setDefaultTimeout(0);
  page.on('pageerror', e => errs.add('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.add('console: ' + m.text().slice(0, 160)); });
  await page.goto(`http://localhost:${port}/?reading`); await page.waitForTimeout(1500);
  for (let r = 0; r < RUNS; r++) {
    await page.evaluate(() => window.__reading.start());
    const o = await page.evaluate(async () => {
      const D = window.__reading; let guard = 0, hands = {}, bought = 0;
      const PRI = ['ember', 'ouroboros', 'twinflame', 'wandwright', 'cupbearer', 'swordsman', 'potter', 'crystal', 'rabbit', 'hourglass', 'jester', 'oldmoon', 'coin', 'mirror'];
      while (guard++ < 5000) {
        const st = D.state(); const sc = st.scene;
        if (sc === 'end') break;
        if (sc === 'shuffle' || sc === 'won' || sc === 'lost') { D.step(.5); continue; }
        if (sc === 'shop') {
          const sh = D.shop(); let moved = true, n = 0;
          while (moved && n++ < 8) { moved = false; const gold = D.state().run.gold;
            const items = sh.items.map((it, i) => ({ it, i })).filter(x => !x.it.sold && x.it.cost <= gold);
            const score = x => x.it.k === 'charm' ? 10 - PRI.indexOf(x.it.ch) * .3 : x.it.k === 'study' ? 6 : x.it.k === 'major' ? (['emperor', 'world', 'magician', 'sun'].includes(x.it.m) ? 8 : 5) : 3;
            items.sort((a, b) => score(b) - score(a)); const x = items[0];
            if (x && !(x.it.k === 'charm' && D.state().run.charms.length >= 4)) { D.buy(x.i); bought++; moved = true; } }
          D.next(); continue;
        }
        if (sc === 'round') {
          const rd = st.rd;
          if (rd.anim) { D.step(.3); continue; }
          if (st.turns >= 2) { const a = D.best(); D.turn('present'); const b = D.best(); if (!(b && a && b.total > a.total)) { D.turn('present'); } }
          const b = D.best();
          if (!b) { D.step(.2); continue; }
          const left = st.target - rd.score;
          if (st.discs > 0 && b.total * st.plays < left * .8 && rd.hand.length) {
            const keep = new Set(b.idx), dis = rd.hand.map((_, i) => i).filter(i => !keep.has(i)).slice(0, 5);
            if (dis.length) { D.select(dis); D.discard(); continue; }
          }
          D.select(b.idx); D.play(); hands[b.idx.length] = (hands[b.idx.length] || 0) + 1; continue;
        }
        D.step(.2);
      }
      const f = D.state(); return { rounds: f.run.rounds, win: f.run.rounds >= 8 || (f.run.round === 7 && f.run.hearts > 0), hearts: f.run.hearts, gold: f.run.gold, charms: f.run.charms.length, deck: f.run.deck.length };
    });
    res.push(o); console.log('run', r + 1, JSON.stringify(o));
  }
} finally { await browser.close(); srv.kill(); }
const w = res.filter(r => r.win).length;
console.log(`\nwon ${w}/${res.length}; avg rounds cleared ${(res.reduce((a, r) => a + r.rounds, 0) / res.length).toFixed(1)}`);
console.log(errs.size ? 'ERRORS:\n' + [...errs].join('\n') : 'no page errors');
process.exit(errs.size ? 1 : 0);
