// Plays whole hunts in headless Chrome with a dodging bot (landscape viewport) and reports win rates and errors.
// usage: node tests/hunt-bot.mjs [runs] [boss index,...] [--shots dir]
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
const RUNS = +process.argv[2] || 6, BOSSES = (process.argv[3] || '').split(',').filter(Boolean).map(Number);
const shotDir = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : '';
const port = 4700 + Math.floor(Math.random() * 200);
const srv = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2500));
const browser = await chromium.launch({ channel: 'chrome' }), errs = new Set(), res = [];
try {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
  page.setDefaultTimeout(0);
  page.on('pageerror', e => errs.add('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.add('console: ' + m.text().slice(0, 160)); });
  await page.goto(`http://localhost:${port}/`); await page.waitForSelector('#ov .go'); await page.click('#ov .go'); await page.waitForTimeout(800);
  await page.evaluate(() => window.__hunt.open()); await page.waitForTimeout(600);
  if (shotDir) await page.screenshot({ path: shotDir + '/hunt_board.png' });
  for (let r = 0; r < RUNS; r++) {
    const bi = BOSSES.length ? BOSSES[r % BOSSES.length] : [0, 7, 14, 21, 30, 42, 55, 63][r % 8];
    await page.evaluate(bi => window.__hunt.start(bi), bi);
    const o = await page.evaluate(async () => {
      const S = window.__hunt; let guard = 0;
      const click = sel => { const el = document.querySelector(sel); if (el && !el.disabled) { el.click(); return true; } return false; };
      const best = (sel, pri) => { const els = [...document.querySelectorAll(sel)].filter(e => !e.disabled); if (!els.length) return false; els.sort((a, b) => pri.indexOf(a.dataset.sp || a.dataset.mod) - pri.indexOf(b.dataset.sp || b.dataset.mod)); els[0].click(); return true; };
      const prefSp = ['chain', 'nova', 'orbit', 'meteor', 'ward', 'familiar', 'thorns', 'blink', 'gust'];
      const plan = st => { const w = st.world, cells = w.cells, from = st.room; const goal = c0 => st.keys < 3 ? (c0.kind === 'guard' && !c0.cleared) : (c0.kind === 'boss');
        const prev = { [from.id]: null }, q = [from], dirOf = {}; let found = null;
        for (let i = 0; i < q.length && !found; i++) { const c0 = q[i]; for (const d in c0.link) { const n = cells[c0.link[d]]; if (prev[n.id] !== undefined) continue; prev[n.id] = c0.id; dirOf[n.id] = d; q.push(n); if (goal(n)) { found = n; break; } } }
        if (!found) return null; let c0 = found; while (prev[c0.id] !== from.id) c0 = cells[prev[c0.id]]; return dirOf[c0.id]; };
      while (guard++ < 900000) { const st = S.state();
        if (st.scene === 'wave') {
          if (guard % 2 === 0) { const P = st.P; let bb = null, bs = -1e9; const walk = !st.locked ? plan(st) : null;
            if (walk) { const T = { N: [240, 20], S: [240, 262], W: [8, 140], E: [472, 140] }[walk]; const dx = T[0] - P.x, dy = T[1] - P.y, l = Math.hypot(dx, dy) || 1; bb = [dx / l, dy / l]; }
            else for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a); const nx = P.x + dx * 34, ny = P.y + dy * 34; let sc = 0;
              for (const e of st.E) { const d = Math.hypot(e.x - nx, e.y - ny) - e.r; sc -= d < 60 ? (60 - d) * (60 - d) / (e.isBoss ? 30 : 20) : 0; }
              for (const q of st.ES) { const d = Math.hypot(q.x + q.vx * .3 - nx, q.y + q.vy * .3 - ny) - q.r; sc -= d < 26 ? (26 - d) * (26 - d) / 2 : 0; }
              sc -= Math.max(0, (nx < 40 ? 40 - nx : 0) + (nx > 440 ? nx - 440 : 0) + (ny < 50 ? 50 - ny : 0) + (ny > 236 ? ny - 236 : 0)) * 3; sc -= Math.hypot(nx - 240, ny - 150) * .03;
              if (sc > bs) { bs = sc; bb = [dx, dy]; } }
            S.bot(bb[0], bb[1]); }
          S.step(1 / 30); }
        else if (st.scene === 'panel') { S.bot(0, 0); const ok = best('.card[data-sp]', prefSp) || best('.card[data-mod]', ['multi', 'power', 'haste', 'pierce', 'split', 'bounce', 'echo', 'size', 'frost', 'burn']) || click('.card[data-i]:not([disabled])') || click('#geq') || click('#r2') || click('#g1') || click('#g3') || click('#leave'); if (!ok) S.step(.1); }
        else if (st.scene === 'dead' || st.scene === 'won') return { res: st.scene, keys: st.keys, spells: st.spells.length, rooms: st.stats.rooms, dark: st.dark };
        else S.step(.05);
      } return { res: 'timeout' }; });
    res.push(o); console.log(r + 1, 'boss', bi, JSON.stringify(o));
    await page.evaluate(() => { const b = document.getElementById('hback'); b && b.click(); });
  }
} finally { await browser.close(); srv.kill(); }
console.log('won', res.filter(r => r.res === 'won').length + '/' + RUNS, '| page errors:', errs.size); if (errs.size) console.log([...errs].slice(0, 6).join('\n'));
