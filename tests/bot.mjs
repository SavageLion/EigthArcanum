// Balance bots: plays whole runs in headless Chrome by stepping the simulation (see tests/botlib.js) and prints win rates, death hot spots and fight lengths.
// usage: node tests/bot.mjs [--len 8] [--runs 6] [--skills 0.55,0.8,0.95] [--wizards raven,ember] [--out tests/bot-results.json]
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const LENS = String(arg('len', '8')).split(',').map(Number), RUNS = +arg('runs', 6), SKILLS = String(arg('skills', '0.55,0.8,0.95')).split(',').map(Number);
const WIZ = String(arg('wizards', 'raven')).split(','), OUT = arg('out', 'tests/bot-results.json');
const port = 4600 + Math.floor(Math.random() * 300);
const srv = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2500));
const browser = await chromium.launch({ channel: 'chrome' });
const results = [], errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 400, height: 760 }, hasTouch: true });
  page.setDefaultTimeout(0);
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(`http://localhost:${port}/`); await page.waitForSelector('#ov .go');
  await page.addScriptTag({ path: 'tests/botlib.js' });
  for (const len of LENS) for (const skill of SKILLS) for (const wizard of WIZ) for (let i = 0; i < RUNS; i++) {
    const t0 = Date.now();
    const r = await page.evaluate(o => window.__bot.playRun(o), { wizard, len, skill });
    results.push(r);
    console.log(`len ${len} skill ${skill} ${wizard} #${i + 1}: ${r.won ? 'WON' : 'died at ' + r.beaten + '/' + len + (r.death ? ' (' + r.death.boss + ', ' + r.death.arena + ', ' + (r.death.omen || '-') + ')' : '')}  sim ${(r.simSeconds / 60).toFixed(1)} min  stalls ${r.stalls}  ${((Date.now() - t0) / 1000).toFixed(1)}s real`);
  }
} finally { await browser.close(); srv.kill(); }
fs.writeFileSync(OUT, JSON.stringify(results, null, 1));

/* ---------- summary ---------- */
const pct = (a, b) => b ? Math.round(100 * a / b) + '%' : '-';
const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
console.log('\n== win rate by run length and skill ==');
for (const len of LENS) for (const skill of SKILLS) { const rs = results.filter(r => r.len === len && r.skill === skill); console.log(`len ${len} skill ${skill}: ${pct(rs.filter(r => r.won).length, rs.length)} won (${rs.length} runs), mean bosses beaten ${avg(rs.map(r => r.beaten)).toFixed(1)}`); }
if (WIZ.length > 1) { console.log('\n== win rate by wizard =='); for (const w of WIZ) { const rs = results.filter(r => r.wizard === w); console.log(`${w}: ${pct(rs.filter(r => r.won).length, rs.length)} won, mean bosses beaten ${avg(rs.map(r => r.beaten)).toFixed(1)}`); } }
const fights = results.flatMap(r => r.fights.filter(f => f.win !== undefined));
console.log('\n== by arena (all fights) ==');
for (const a of ['chariot', 'wheel', 'justice', 'strength']) { const fs_ = fights.filter(f => f.arena === a); console.log(`${a.padEnd(9)} fights ${String(fs_.length).padStart(4)}  win ${pct(fs_.filter(f => f.win).length, fs_.length).padStart(4)}  mean time ${avg(fs_.filter(f => f.win).map(f => f.t)).toFixed(0)}s  mean hits ${avg(fs_.map(f => f.hits || 0)).toFixed(2)}`); }
console.log('\n== by omen ==');
for (const o of [...new Set(fights.map(f => f.omen))]) { const fs_ = fights.filter(f => f.omen === o); console.log(`${String(o).padEnd(11)} fights ${String(fs_.length).padStart(4)}  win ${pct(fs_.filter(f => f.win).length, fs_.length).padStart(4)}  mean time ${avg(fs_.filter(f => f.win).map(f => f.t)).toFixed(0)}s`); }
console.log('\n== elites vs regular ==');
for (const e of [false, true]) { const fs_ = fights.filter(f => f.elite === e); console.log(`${e ? 'elite  ' : 'regular'} fights ${String(fs_.length).padStart(4)}  win ${pct(fs_.filter(f => f.win).length, fs_.length).padStart(4)}  mean time ${avg(fs_.filter(f => f.win).map(f => f.t)).toFixed(0)}s`); }
console.log('\n== deadliest bosses (min 4 fights) ==');
const byBoss = {}; for (const f of fights) (byBoss[f.boss] ||= []).push(f);
console.log(Object.entries(byBoss).filter(([, v]) => v.length >= 4).map(([k, v]) => ({ k, n: v.length, w: v.filter(f => f.win).length / v.length, t: avg(v.filter(f => f.win).map(f => f.t)) })).sort((a, b) => a.w - b.w).slice(0, 8).map(x => `${x.k}: win ${Math.round(x.w * 100)}% over ${x.n}, ${x.t.toFixed(0)}s`).join('\n'));
console.log('\n== slowest kills ==');
console.log(fights.filter(f => f.win).sort((a, b) => b.t - a.t).slice(0, 5).map(f => `${f.boss} (${f.arena}${f.omen ? ', ' + f.omen : ''}): ${f.t.toFixed(0)}s`).join('\n'));
console.log('\nstalled fights:', results.reduce((s, r) => s + r.stalls, 0), '| page errors:', errors.length); if (errors.length) console.log([...new Set(errors)].slice(0, 6).join('\n'));
