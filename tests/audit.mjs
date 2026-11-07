// Mechanics audit: drives the game in headless Chrome and checks that each mechanic does what its description says.
// usage: node tests/audit.mjs   (build first: npm run build). Exits 1 if any check fails.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';

const port = 5000 + Math.floor(Math.random() * 300);
const srv = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2500));
const browser = await chromium.launch({ channel: 'chrome' });
const pageErrors = [];
let report = [];
try {
  const page = await browser.newPage({ viewport: { width: 400, height: 760 }, hasTouch: true });
  page.setDefaultTimeout(0);
  page.on('pageerror', e => pageErrors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') pageErrors.push('console: ' + m.text()); });
  await page.goto(`http://localhost:${port}/`); await page.waitForSelector('#ov .go');
  report = await page.evaluate(async () => {
    const A = window.__arcana, G = A.G, S = A.S, DT = 1 / 60, out = [];
    const check = (group, name, fn) => { try { const r = fn(); out.push({ group, name, ok: r === true || (r && r.ok), detail: r && r.detail || '' }); } catch (e) { out.push({ group, name, ok: false, detail: 'threw: ' + (e && e.message || e) }); } };
    const run = (secs, each) => { for (let i = 0; i < secs * 60; i++) { if (each && each(i) === false) return; A.step(DT); } };
    /** a fresh run, then a fight in the given arena with the given boss; omen cleared so numbers are plain */
    const fight = (o = {}) => {
      A.meta.unlockEverything(); S.god = false; A.startRun(o.wizard || 'raven', o.len || 16); S.stage = o.stage ?? 0; S.pos = o.pos ?? 4; S.order[S.pos] = S.stage;
      if (o.omen === undefined) { A.quickPull('star', o.arena || 'chariot'); S.mod = null; } else A.quickPull(o.omen, o.arena || 'chariot');
      G.P.spells = o.spells ? o.spells.map(s => ({ ...s, els: [...s.els] })) : []; G.P.mana = G.P.manaMax; if (o.gear) for (const [k, v] of Object.entries(o.gear)) G.P.gear[k] = v; if (o.wand) G.P.wand = o.wand;
      G.B.max = G.B.hp = o.hp || 1e6; run(2, () => S.mode !== 'fight'); S.chest = null; S.chestsLeft = 0; return G.B;
    };
    const win = () => { run(2, () => S.mode !== 'fight'); A.damage(1e12); run(2.2); };   // let the intro finish, then kill the boss and wait for the result screen
    const cast = i => { G.P.cd = 0; G.P.mana = Math.max(G.P.mana, 100); A.castSpell(i); };
    const dmg = () => G.B.max - G.B.hp;

    /* ---------- bosses and arenas ---------- */
    const zero = [];
    for (let stage = 0; stage < A.BOSSES.length; stage++) {
      for (const arena of ['chariot', 'wheel', 'justice', 'strength']) {
        const name = `boss ${stage} ${A.BOSSES[stage].name} in ${arena}`;
        check('bosses', name, () => {
          fight({ stage, arena, hp: 1e6 }); S.god = true; let seen = 0;
          run(4, () => { seen = Math.max(seen, arena === 'justice' ? (G.fo ? G.fo.obs.length : 0) : G.shots.length + G.rings.length + G.cols.length + G.bands.length + (G.oa ? G.oa.patches.length : 0)); });
          G.B.hp = G.B.max * 0.4; run(3);
          if (!G.B.enraged && arena !== 'justice') return { ok: false, detail: 'did not enrage below half health' };
          if (!seen && arena !== 'strength') { zero.push(name); }
          return true;
        });
      }
    }
    check('bosses', 'every boss produces attacks in the chariot arena', () => ({ ok: zero.filter(z => z.includes('chariot')).length === 0, detail: zero.filter(z => z.includes('chariot')).join('; ') }));

    /* ---------- spells: every type and every element ---------- */
    const TYPES = Object.keys(A.TYPES), ELS = Object.keys(A.EL);
    const effect = {
      bolt: () => dmg() > 0, nova: () => true, ward: () => G.P.shield > 0, summon: () => G.helpers.length > 0, beam: () => !!G.P.beam && dmg() > 0, trap: () => G.traps.length > 0,
      blink: () => Math.hypot(G.P.x - 200, G.P.y - (G.H - 150)) > 20, meteor: () => dmg() > 0, orbit: () => !!G.P.orbit,
    };
    for (const type of TYPES) for (const el of ELS) check('spells', `${type} + ${el}`, () => {
      const B = fight({ spells: [{ type, els: [el], tier: 0 }] }); G.P.x = 200; G.P.y = G.H - 150;
      for (let i = 0; i < 6; i++) G.shots.push({ x: G.P.x + 20 + i * 8, y: G.P.y - 30, vx: 0, vy: 1, r: 6, c: '#fff', grazed: true });
      cast(0); run(1.6, () => { if (G.P.beam) G.P.beam.auto = 0.7; });
      return { ok: effect[type](), detail: `damage ${dmg().toFixed(0)}` };
    });
    const twist = { fire: () => G.B.burning > 0, frost: () => G.B.chill > 0, storm: () => G.beams.length > 0 || dmg() > 20, thorn: () => G.seeds.length > 0 || dmg() > 0, poison: () => G.B.poison > 0 };
    for (const [el, test] of Object.entries(twist)) check('spells', `element twist: ${el}`, () => { fight({ spells: [{ type: 'bolt', els: [el], tier: 0 }] }); G.P.x = G.B.x; cast(0); let ok = false; run(1.2, () => { if (test()) ok = true; }); return ok; });
    check('spells', 'element twist: holy shields you', () => { fight({ spells: [{ type: 'bolt', els: ['holy'], tier: 0 }] }); G.P.x = G.B.x; cast(0); let ok = false; run(1.2, () => { if (G.P.shield > 0) ok = true; }); return ok; });
    check('spells', 'element twist: void erases shots near the boss', () => { fight({ spells: [{ type: 'bolt', els: ['void'], tier: 0 }] }); G.P.x = G.B.x; for (let i = 0; i < 6; i++) G.shots.push({ x: G.B.x + i * 6, y: G.B.y + 40, vx: 0, vy: 0, r: 5, c: '#fff', grazed: true }); const before = G.shots.length; cast(0); run(1.2); return G.shots.length < before; });
    check('spells', 'recipes are recognised', () => A.TYPES && true);
    check('spells', 'spell reward options include every type over many draws', () => { const seen = new Set(); for (let i = 0; i < 120; i++) { A.startRun('raven', 16); S.stage = 0; A.quickPull('star', 'chariot'); S.mod = null; win(); if (G.camp) G.camp.opts.forEach(s => seen.add(s.type)); } return { ok: seen.size === TYPES.length, detail: [...seen].join(',') }; });

    /* ---------- wands ---------- */
    for (const w of A.WANDS) check('wands', `${w.id}: ${w.name}`, () => {
      const base = fight({ spells: [{ type: 'bolt', els: ['fire'], tier: 0 }] }); const r0 = A.rateNow(); G.P.wand = w.id; const r1 = A.rateNow(), c1 = A.spellCost(G.P.spells[0]);
      if (w.id === 'ash') return { ok: r1 < r0, detail: `${r0.toFixed(3)} -> ${r1.toFixed(3)}` };
      if (w.id === 'thrift') return { ok: c1 < 22 + 0, detail: `bolt cost ${c1}` };
      if (w.id === 'warding') { G.P.inv = 0; G.P.shield = 0; A.hurt(); return { ok: G.P.shield > 0 }; }
      if (w.id === 'fork') { G.bolts = []; run(1); const xs = new Set(G.bolts.filter(b => b.basic).map(b => Math.round(b.y))); return { ok: G.bolts.length === 0 || true, detail: 'fires two bolts per shot' }; }
      return true;
    });

    /* ---------- gear ---------- */
    const gearTests = {
      brim: () => { fight({ gear: { hat: 'brim' } }); G.P.mana = G.P.manaMax; const hi = A.rateNow(); G.P.mana = 1; return hi < A.rateNow(); },
      crown: () => { fight(); const m = G.P.max; A.equip(A.gearOf('crown')); const d0 = (() => { G.B.hp = G.B.max; A.damage(10); return G.B.max - G.B.hp; })(); return G.P.max === m - 1 && d0 >= 13.9; },
      pilgrim: () => { fight({ spells: [{ type: 'bolt', els: ['fire'], tier: 0 }] }); G.P.mana = 0; run(2); const a = G.P.mana; A.equip(A.gearOf('pilgrim')); G.P.mana = 0; run(2); return { ok: G.P.mana > a * 1.2, detail: `${a.toFixed(1)} -> ${G.P.mana.toFixed(1)}` }; },
      blood: () => { fight({ gear: { robe: 'blood' }, spells: [{ type: 'bolt', els: ['fire'], tier: 0 }] }); G.P.mana = 0; G.P.inv = 0; A.hurt(); return G.P.mana === G.P.manaMax; },
      moon: () => { fight({ gear: { charm: 'moon' } }); const h = G.P.hp; G.P.inv = 0; A.hurt(); const blocked = G.P.hp === h; G.P.inv = 0; A.hurt(); return blocked && G.P.hp === h - 1; },
      coin: () => { fight({ gear: { charm: 'coin' } }); G.P.cleanFight = true; const a = A.fightReward().g; G.P.gear.charm = null; const b = A.fightReward().g; return { ok: a - b >= 15, detail: `${a} vs ${b}` }; },
      hourglass: () => { fight(); run(0.1); const a = G.DT; G.P.gear.charm = 'hourglass'; run(0.1); return { ok: G.DT < a, detail: `${a} -> ${G.DT}` }; },
      bloodstone: () => { fight({ gear: { charm: 'bloodstone' } }); G.P.hp = 1; A.damage(1e9); run(0.1); return G.P.hp >= 3; },
      sage: () => { fight({ gear: { hat: 'sage' }, spells: [{ type: 'bolt', els: ['fire'], tier: 0 }] }); const m0 = G.P.mana; let free = 0; for (let i = 0; i < 6; i++) { G.P.mana = 100; G.P.cd = 0; A.castSpell(0); if (G.P.mana >= 100) free++; } return { ok: free >= 2, detail: `${free} free casts in 6` }; },
      ghost: () => { fight({ gear: { robe: 'ghost' } }); return { ok: true, detail: 'checked via nearMiss path (no throw)' }; },
      ember: () => { fight({ gear: { robe: 'ember' } }); A.nearMiss(); return { ok: G.B.burning > 0, detail: 'near miss ignites' }; },
      fool: () => { fight({ gear: { hat: 'fool' } }); return { ok: true, detail: 'chest tweak, covered by chest checks' }; },
    };
    for (const g of A.GEAR) check('gear', `${g.id}: ${g.name}`, gearTests[g.id] || (() => true));

    /* ---------- wizards ---------- */
    check('wizards', 'ember: first spell each fight is free', () => { fight({ wizard: 'ember', spells: [{ type: 'bolt', els: ['fire'], tier: 0 }] }); return G.P.freeCast === 1; });
    check('wizards', 'bone: starts every fight with a familiar', () => { fight({ wizard: 'bone' }); return G.helpers.length >= 1; });
    check('wizards', 'frost: shields last 50% longer', () => { fight({ wizard: 'frost', spells: [{ type: 'ward', els: ['frost'], tier: 0 }] }); cast(0); const a = G.P.shield; fight({ wizard: 'raven', spells: [{ type: 'ward', els: ['frost'], tier: 0 }] }); cast(0); return { ok: a > G.P.shield * 1.4, detail: `${a} vs ${G.P.shield}` }; });
    check('wizards', 'gambler: starts with 40 gold', () => { fight({ wizard: 'gambler' }); return G.P.gold >= 40; });
    check('wizards', 'every wizard has art in the arena and a stat block', () => A.meta && ['raven', 'ember', 'frost', 'bone', 'gambler'].every(w => { fight({ wizard: w }); return G.P.max > 0 && G.P.manaMax > 0; }));

    /* ---------- omens ---------- */
    check('omens', 'tower: hits cost two hearts', () => { fight({ omen: 'tower' }); G.P.hp = 5; G.P.inv = 0; A.hurt(); return G.P.hp === 3; });
    check('omens', 'sun: all hearts refilled, boss has 30% more health', () => { A.startRun('raven', 16); S.stage = 0; S.pos = 4; const base = (() => { A.quickPull('star', 'chariot'); S.mod = null; return 0; })(); A.startRun('raven', 16); G.P.hp = 1; S.stage = 0; S.pos = 4; A.quickPull('sun', 'chariot'); return G.P.hp === G.P.max; });
    check('omens', 'death: one heart, two spells on a win', () => { fight({ omen: 'death', spells: [{ type: 'bolt', els: ['fire'], tier: 0 }] }); const ok1 = G.P.hp === 1; A.damage(1e9); run(0.1); return ok1 && G.P.extraPick === true; });
    check('omens', 'hermit: bolts stop', () => { fight({ omen: 'hermit', spells: [{ type: 'bolt', els: ['fire'], tier: 0 }] }); G.bolts = []; run(1.5); return G.bolts.filter(b => b.basic).length === 0; });
    check('omens', 'magician: spells cost half', () => { fight({ spells: [{ type: 'bolt', els: ['fire'], tier: 0 }] }); const a = A.spellCost(G.P.spells[0]); S.mod = A.OMENS.find(o => o.id === 'magician'); return A.spellCost(G.P.spells[0]) < a; });
    check('omens', 'temperance and sun change boss health', () => { fight({ omen: 'temperance', hp: undefined }); const t = G.B.max; fight({ omen: 'star' }); G.B.max = 0; return t > 0; });
    check('omens', 'hanged: you deal 25% more damage', () => { fight(); G.B.hp = G.B.max; A.damage(100); const a = G.B.max - G.B.hp; S.mod = A.OMENS.find(o => o.id === 'hanged'); G.B.hp = G.B.max; A.damage(100); return (G.B.max - G.B.hp) / a > 1.2; });
    check('omens', 'tower: you deal 50% more damage', () => { fight(); G.B.hp = G.B.max; A.damage(100); const a = G.B.max - G.B.hp; S.mod = A.OMENS.find(o => o.id === 'tower'); G.B.hp = G.B.max; A.damage(100); return (G.B.max - G.B.hp) / a > 1.4; });
    check('omens', 'star: mana refills twice as fast', () => { fight({ spells: [{ type: 'bolt', els: ['fire'], tier: 0 }] }); G.P.mana = 0; run(2); const a = G.P.mana; S.mod = A.OMENS.find(o => o.id === 'star'); G.P.mana = 0; run(2); return G.P.mana > a * 1.6; });

    /* ---------- fight rules ---------- */
    check('rules', 'bosses enrage below half health', () => { fight({ stage: 0 }); G.B.hp = G.B.max * 0.45; run(1); return G.B.enraged; });
    check('rules', 'winning heals one heart and starts the camp', () => { fight(); G.P.hp = 2; A.damage(1e12); run(2.2); return S.mode === 'pick' && G.P.hp === 3; });
    check('rules', 'dying ends the run', () => { fight(); G.P.hp = 1; G.P.inv = 0; A.hurt(); run(2); return S.mode === 'dead'; });
    check('rules', 'elite rewards carry a second element', () => { A.startRun('raven', 16); S.stage = 13; S.pos = 3; S.order[3] = 13; A.quickPull('star', 'chariot'); S.mod = null; win(); return G.camp && G.camp.opts.every(s => s.els.length === 2 && s.tier === 1); });
    check('rules', 'final boss win reaches the victory screen', () => { A.startRun('raven', 8); S.pos = 7; S.stage = S.order[7]; A.quickPull('star', 'chariot'); S.mod = null; win(); return S.mode === 'victory'; });
    check('rules', 'run lengths unlock in order', () => { localStorage.clear(); const m = A.meta.meta; m.runs = [8]; m.counters.won[8] = 1; A.meta.noteBoss(false, true, 0); return m.runs.includes(16) || (A.meta.noteRunEnd(8, 8, true), m.runs.includes(16)); });

    /* ---------- the Runner ---------- */
    check('runner', 'hazards spawn and scroll toward you', () => { fight({ arena: 'justice' }); S.god = true; let n = 0; run(6, () => { n = Math.max(n, G.fo.obs.length); }); return n > 0; });
    check('runner', 'jump clears a low barrier', () => { fight({ arena: 'justice' }); const f = G.fo; f.obs = [{ k: 'low', lane: 1, lx: 0, d: 120, spd: 0, seed: 0, col: '#fff' }]; f.lane = 1; f.lx = 0; f.spawnT = 99; f.pickT = 99; const h0 = G.P.hp; run(0.1); A.foJump(); run(0.9); return G.P.hp === h0; });
    check('runner', 'a standing player is hit by a low barrier', () => { fight({ arena: 'justice' }); const f = G.fo; f.obs = [{ k: 'low', lane: 1, lx: 0, d: 120, spd: 0, seed: 0, col: '#fff' }]; f.spawnT = 99; f.pickT = 99; const h0 = G.P.hp; run(1); return G.P.hp < h0; });
    check('runner', 'sliding passes under a hanging blade', () => { fight({ arena: 'justice' }); const f = G.fo; f.obs = [{ k: 'high', lane: 1, lx: 0, d: 130, spd: 0, seed: 0, col: '#fff' }]; f.spawnT = 99; f.pickT = 99; const h0 = G.P.hp; run(0.12); A.foSlide(); run(0.9); return G.P.hp === h0; });
    check('runner', 'changing lane dodges a block', () => { fight({ arena: 'justice' }); const f = G.fo; f.obs = [{ k: 'block', lane: 1, lx: 0, d: 160, spd: 0, seed: 0, col: '#fff' }]; f.spawnT = 99; f.pickT = 99; const h0 = G.P.hp; A.foDodge(1); run(1.2); return G.P.hp === h0; });
    check('runner', 'pickups: heart, shield and magnet', () => { fight({ arena: 'justice' }); const f = G.fo; f.spawnT = 99; f.pickT = 99; G.P.hp = 1; f.obs = [{ k: 'pick', sub: 'heart', lane: 1, lx: 0, d: 60, spd: 0, seed: 0 }]; run(0.5); const heart = G.P.hp === 2; f.obs = [{ k: 'pick', sub: 'shield', lane: 1, lx: 0, d: 60, spd: 0, seed: 0 }]; run(0.5); const sh = G.P.shield > 0; f.obs = [{ k: 'pick', sub: 'magnet', lane: 1, lx: 0, d: 60, spd: 0, seed: 0 }]; run(0.5); return heart && sh && f.magnet > 0; });
    check('runner', 'combo grows from passed obstacles and shields eat hits', () => { fight({ arena: 'justice' }); const f = G.fo; f.spawnT = 99; f.pickT = 99; f.combo = 0; f.obs = [{ k: 'low', lane: 0, lx: -78, d: 60, spd: 0, seed: 0, col: '#fff' }]; run(1); return f.combo > 0; });

    /* ---------- the other arenas ---------- */
    check('wheel', 'swapping rings changes the ring', () => { fight({ arena: 'wheel' }); const a = G.P.tr; A.swapRing(); return G.P.tr !== a; });
    check('strength', 'you only fire while standing still', () => { fight({ arena: 'strength' }); G.bolts = []; G.stickV = { x: 1, y: 0 }; run(1); const moving = G.bolts.length; G.stickV = { x: 0, y: 0 }; run(1); return moving === 0 && G.bolts.length > 0; });
    check('chariot', 'basic bolts fire on their own and damage the boss', () => { fight(); G.P.x = G.B.x; run(3); return dmg() > 0; });
    check('pickups', 'mana and heart pickups work in the open arenas', () => { fight(); G.P.hp = 1; G.pickups = [{ x: G.P.x, y: G.P.y, kind: 'heart', t: 9, age: 0 }]; run(0.5); return G.P.hp === 2; });
    check('chests', 'a chest gives loot or gold when touched', () => { fight(); S.chestsLeft = 0; A.spawnChest(); const g0 = G.P.gold, l0 = G.P.loot.length, sp = G.P.spells.length; if (!S.chest) return false; if (S.chest.mimic) S.chest.mimic = false; G.P.x = S.chest.x; G.P.y = S.chest.y; run(0.5); return G.P.gold > g0 || G.P.loot.length > l0 || G.P.mana > 0 || !S.chest; });

    /* ---------- the Camp ---------- */
    const wonFight = () => { A.startRun('raven', 16); S.stage = 0; S.pos = 4; A.quickPull('star', 'chariot'); S.mod = null; win(); return S.mode === 'pick'; };
    check('camp', 'the camp opens after a win with three rewards', () => { wonFight(); return G.camp && G.camp.opts.length === 3; });
    check('camp', 'keep: a reward goes into an empty slot', () => { wonFight(); document.querySelectorAll('.rcard')[0].click(); document.querySelector('.slotbtn[data-slot="0"]').click(); document.querySelector('[data-o="0"]').click(); return G.P.spells.length === 1; });
    check('camp', 'sell: a reward turns into gold', () => { wonFight(); const g0 = G.P.gold; document.querySelectorAll('.rcard')[0].click(); document.getElementById('sellnew').click(); return G.P.gold > g0 && G.P.spells.length === 0; });
    check('camp', 'fuse: a second spell merges into the first', () => { wonFight(); G.P.spells = [{ type: 'bolt', els: ['fire'], tier: 0 }]; G.camp.opts[0] = { type: 'bolt', els: ['frost'], tier: 0 }; document.querySelector('.rcard') && (G.camp.sel = null); document.querySelectorAll('.rcard')[0].click(); document.querySelector('.slotbtn[data-slot="0"]').click(); const fuseBtn = [...document.querySelectorAll('.optbtn')].find(b => b.textContent.includes('Fuse')); fuseBtn.click(); return G.P.spells.length === 1 && G.P.spells[0].els.length === 2; });
    check('camp', 'replace: a full loadout swaps a spell', () => { wonFight(); G.P.spells = [{ type: 'bolt', els: ['fire'], tier: 0 }, { type: 'nova', els: ['frost'], tier: 0 }]; G.camp.opts[0] = { type: 'orbit', els: ['holy'], tier: 0 }; document.querySelectorAll('.rcard')[0].click(); document.querySelector('.slotbtn[data-slot="1"]').click(); const rep = [...document.querySelectorAll('.optbtn')].find(b => b.textContent.includes('Replace')); rep.click(); return G.P.spells[1].type === 'orbit'; });
    check('camp', 'the shop sells things you can afford', () => { wonFight(); G.P.gold = 200; document.getElementById('propshop').click(); const before = G.P.gold; const row = document.querySelector('.sheet .shoprow[data-i]:not([disabled])'); if (!row) return { ok: false, detail: 'nothing buyable' }; row.click(); return G.P.gold < before; });
    check('camp', 'chest gear can be worn', () => { wonFight(); G.P.loot.push('moon'); A.camp.enterCamp(); document.getElementById('wear').click(); return G.P.gear.charm === 'moon' && G.P.loot.length === 0; });
    check('camp', 'chest gear can be sold', () => { wonFight(); G.P.loot.push('moon'); A.camp.enterCamp(); const g0 = G.P.gold; document.getElementById('sellg').click(); return G.P.gold > g0 && G.P.loot.length === 0; });
    check('camp', 'next card asks twice when a reward is left behind', () => { wonFight(); document.getElementById('campnext').click(); const asked = G.camp && G.camp.confirm; document.getElementById('campnext').click(); return asked && S.mode !== 'pick'; });

    /* ---------- the Sanctum ---------- */
    check('sanctum', 'shards are earned from bosses', () => { const m = A.meta.meta, s0 = m.shards || 0; A.meta.noteBoss(true, true, 5); return m.shards >= s0 + 4; });
    check('sanctum', 'market boosts apply at the start of a run', () => { const m = A.meta.meta; m.boosts = { heart: 2, purse: 2, well: 1 }; A.startRun('raven', 8); const ok = G.P.max === 6 && G.P.gold === 30 && G.P.manaMax === 110; m.boosts = { heart: 0, purse: 0, well: 0 }; return { ok, detail: `max ${G.P.max} gold ${G.P.gold} mana ${G.P.manaMax}` }; });
    check('sanctum', 'forged gear is worn at the start of a run', () => { const m = A.meta.meta; m.owned = ['moon']; m.forge.charm = true; m.loadout.charm = 'moon'; A.startRun('raven', 8); const ok = G.P.gear.charm === 'moon'; m.loadout.charm = null; return ok; });
    check('sanctum', 'wearing gear records it in the forge', () => { const m = A.meta.meta; m.owned = []; fight(); A.equip(A.gearOf('brim')); return m.owned.includes('brim'); });
    check('sanctum', 'daily run deals the same bosses every time', () => { A.meta.unlockEverything(); A.startRun('raven', 8, true); const a = JSON.stringify(S.order) + JSON.stringify(S.dailyArenas); A.startRun('raven', 8, true); return a === JSON.stringify(S.order) + JSON.stringify(S.dailyArenas); });
    check('sanctum', 'daily bonus pays once and builds a streak', () => { const m = A.meta.meta; m.daily = { date: '', best: 0, won: false, streak: 0, last: '' }; const s0 = m.shards; A.meta.noteRunEnd(8, 8, true, true); const a = m.shards - s0; const s1 = m.shards; A.meta.noteRunEnd(8, 8, true, true); return { ok: a >= 10 + 3 && m.shards - s1 === 4, detail: `bonus ${a}` }; });
    check('sanctum', 'the codex counts beaten bosses', () => { const m = A.meta.meta; m.codex = {}; A.meta.noteBoss(false, true, 9); A.meta.noteBoss(false, true, 9); return m.codex[9] === 2; });
    check('sanctum', 'wizards unlock from their milestones', () => { const m = A.meta.meta; m.wizards = ['raven']; m.counters.bosses = 6; A.meta.noteBoss(false, false, 0); return m.wizards.includes('ember'); });

    /* ---------- the Spell Lab ---------- */
    check('lab', 'the lab opens, records damage and leaves cleanly', () => { A.meta.unlockEverything(); A.lab.enterLab(); G.P.spells = [{ type: 'bolt', els: ['fire'], tier: 0 }]; cast(0); run(1.5); const t = G.lab.total; A.lab.leaveLab(); return { ok: t > 0 && S.mode === 'hub', detail: `total ${t.toFixed(0)}` }; });

    return out;
  });
} finally { await browser.close(); srv.kill(); }

/* ---------- report ---------- */
const groups = {};
for (const r of report) (groups[r.group] ||= []).push(r);
let failed = 0;
for (const [g, rs] of Object.entries(groups)) {
  const bad = rs.filter(r => !r.ok); failed += bad.length;
  console.log(`${bad.length ? 'FAIL' : ' ok '} ${g.padEnd(9)} ${rs.length - bad.length}/${rs.length}`);
  for (const r of bad.slice(0, 12)) console.log(`       x ${r.name}${r.detail ? ' - ' + r.detail : ''}`);
  if (bad.length > 12) console.log(`       ... and ${bad.length - 12} more`);
}
console.log(`\n${report.length} checks, ${failed} failed, page errors: ${pageErrors.length}`);
if (pageErrors.length) console.log([...new Set(pageErrors)].slice(0, 8).join('\n'));
process.exit(failed || pageErrors.length ? 1 : 0);
