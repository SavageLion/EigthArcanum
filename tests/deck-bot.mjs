// Plays whole turn-based deck runs in headless Chrome with a greedy bot and reports how far it gets.
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
    const o = await page.evaluate(async () => {
      const D = window.__deck; let guard = 0, turns = 0, tarotUsed = 0, reacts = 0;
      const wait = () => { let g = 0; while (g++ < 600) { const s = D.state(); if (s.scene !== 'fight' || (s.phase === 'player' && s.busy <= 0)) return; D.step(1 / 30); } };
      while (guard++ < 20000) {
        let st = D.state();
        if (st.scene === 'end') break;
        if (st.scene === 'shuffle' || st.scene === 'won') { D.step(0.5); continue; }
        if (st.scene === 'reward') {
          const off = st.offer; let bi = 0, bs = -1;
          off.forEach((o, i) => { const sc = o.spell ? D.cards[o.spell.d].pw / D.cards[o.spell.d].cost + (D.cards[o.spell.d].kind === 'def' ? 1 : 2) : 3; if (sc > bs) { bs = sc; bi = i; } });
          D.step(1.3); D.pick(bi); continue;
        }
        // player turn
        turns++;
        for (let k = 0; k < 12; k++) {
          wait(); st = D.state(); if (st.scene !== 'fight') break;
          const P = st.P, B = st.boss, it = B.intents[0], inc = it && !it.cancel ? (['guard', 'enrage'].includes(it.k) ? 0 : (it.v + B.str) * (it.n || 1)) : 0;
          // tarot
          if (st.run.tarot.length) {
            const id = st.run.tarot[0];
            if ((id === 'empress' || id === 'sun') && P.hp < 24) { D.tarot(0, false); tarotUsed++; continue; }
            if (['death', 'tower', 'justice', 'strength', 'devil'].includes(id) && B.hp < B.max * .6) { D.tarot(0, false); tarotUsed++; continue; }
            if (['priestess', 'emperor'].includes(id) && inc >= 14 && P.ward < inc) { D.tarot(0, false); tarotUsed++; continue; }
          }
          let bi = -1, bs = 1.5;
          st.hand.forEach((cd, i) => {
            const d = D.cards[cd.d], cost = st.cost(i); if (st.mana < cost) return;
            let v = d.pw + (st.react(i) ? 9 : 0);
            if (d.kind === 'def') v += P.ward < inc ? 8 : -6;
            if (cd.d === 'mend' || cd.d === 'verdant') v += P.hp < P.max - 10 ? 6 : -10;
            if (cd.d === 'meditate') v += st.hand.length < 5 ? 3 : -3;
            if (cd.d === 'moonwell') v += st.mana < 3 ? 3 : -4;
            const sc = v / Math.max(1, cost) + (cost >= 3 ? 1 : 0);
            if (sc > bs) { bs = sc; bi = i; }
          });
          if (bi < 0) break;
          if (st.react(bi)) reacts++;
          D.cast(bi); D.step(0.6);
        }
        wait(); st = D.state(); if (st.scene === 'fight') { D.end(); let g = 0; while (g++ < 900) { D.step(1 / 30); const s = D.state(); if (s.scene !== 'fight' || (s.phase === 'player' && s.busy <= 0)) break; } }
      }
      const f = D.state(); return { kills: f.run.kills, win: f.run.kills >= 7, turns, tarotUsed, reacts, deck: f.run.deck.length, hp: f.P && f.P.hp };
    });
    res.push(o); console.log('run', r + 1, JSON.stringify(o));
    if (shotDir && r === 0) await page.screenshot({ path: shotDir + '/deck_end.png' });
  }
} finally { await browser.close(); srv.kill(); }
const w = res.filter(r => r.win).length;
console.log(`\nwon ${w}/${res.length}; avg bosses ${(res.reduce((a, r) => a + r.kills, 0) / res.length).toFixed(1)}; avg turns ${Math.round(res.reduce((a, r) => a + r.turns, 0) / res.length)}`);
console.log(errs.size ? 'ERRORS:\n' + [...errs].join('\n') : 'no page errors');
process.exit(errs.size ? 1 : 0);
