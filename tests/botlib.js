/* Bot player for balance testing. Loaded into the page; plays whole runs by stepping the simulation as fast as the CPU allows (no rendering).
   window.__bot.playRun({wizard, len, skill}) -> a result object. skill is 0..1: lower means slower reactions and more mistakes. */
(() => {
  const A = window.__arcana, G = A.G, S = A.S, W = 400, TAU = Math.PI * 2, DT = 1 / 60;
  const rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let skill = 0.8, bot = null;
  const click = sel => { const el = document.querySelector(sel); if (el && !el.disabled) { el.click(); return true; } return false; };

  /* ---------- danger model (used by the three free-roaming arenas) ---------- */
  function riskAt(x, y, tt) {
    let r = 0; const hit = G.P.hit || 5;
    for (const s of G.shots) {
      if (s.seed) continue; const sx = s.x + s.vx * tt, sy = s.y + s.vy * tt, d = Math.hypot(sx - x, sy - y), rad = s.r + hit + 7;
      if (d < rad * 2.4) r += (d < rad ? 6 : 1.2 * (1 - d / (rad * 2.4)));
    }
    for (const c of G.cols) { const t = c.t + tt; if (t >= c.warn && t < c.warn + c.on && Math.abs(x - c.x) < c.w / 2 + 8) r += 7; else if (t > c.warn - 0.45 && t < c.warn && Math.abs(x - c.x) < c.w / 2 + 8) r += 2; }
    for (const g of G.rings) { if (g.mine) continue; const rad = g.rad + g.v * tt, d = Math.hypot(x - g.x, y - g.y); if (Math.abs(d - rad) < g.w / 2 + hit + 4) { const ang = Math.atan2(y - g.y, x - g.x), off = Math.abs(((ang - g.a + Math.PI * 3) % TAU) - Math.PI); if (off > g.gap) r += 6; } }
    return r;
  }
  function pillarHit(x, y) { return G.pillars.some(p => Math.abs(x - p.x) < p.w / 2 + 10 && Math.abs(y - p.y) < p.h / 2 + 10); }

  /* ---------- per-arena movement ---------- */
  function chariot(dt) {
    bot.t -= dt; if (bot.t <= 0) {
      bot.t = 0.04 + (1 - skill) * 0.22; const px = G.P.x, py = G.P.y, step = 58, prefY = G.H - 150, opts = [];
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const nx = clamp(px + dx * step, 18, W - 18), ny = clamp(py + dy * step, G.H * 0.4, G.H - 96);
        opts.push({ dx, dy, v: riskAt(nx, ny, 0.2) + Math.abs(nx - G.B.x) * 0.0016 + Math.abs(ny - prefY) * 0.002 + (dx || dy ? 0.05 : 0) + (dx !== bot.dx || dy !== bot.dy ? 0.3 : 0) });
      }
      opts.sort((a, b) => a.v - b.v); const pick = Math.random() < (1 - skill) * 0.3 ? opts[Math.min(opts.length - 1, 1 + Math.floor(Math.random() * 3))] : opts[0]; bot.dx = pick.dx; bot.dy = pick.dy;
    }
    G.P.x += bot.dx * 300 * dt; G.P.y += bot.dy * 300 * dt;
  }
  function orbit(dt) {
    bot.t -= dt; if (bot.t <= 0) {
      bot.t = 0.04 + (1 - skill) * 0.2; let best = null;
      for (const dir of [-1, 0, 1]) for (const ring of [A.RO, A.RI]) {
        const a = G.P.a - dir * 2.4 * 0.2, x = W / 2 + Math.cos(a) * ring, y = A.CY() + Math.sin(a) * ring; let v = riskAt(x, y, 0.2);
        for (const k of G.bands) { const t = k.t + 0.2; if (t >= k.warn && t < k.warn + k.on && Math.abs(ring - k.r) < k.w / 2 + 6) v += 7; else if (t > k.warn - 0.5 && t < k.warn && Math.abs(ring - k.r) < k.w / 2 + 6) v += 2; }
        v += (ring === A.RI ? -0.35 : 0) + (ring !== G.P.tr ? 0.5 : 0) + (dir ? 0.04 : 0) + (dir !== bot.dir ? 0.3 : 0); if (!best || v < best.v) best = { v, dir, ring };
      }
      if (Math.random() < (1 - skill) * 0.25) best = { dir: Math.floor(rnd(-1, 2)), ring: G.P.tr };
      bot.dir = best.dir; if (best.ring !== G.P.tr) A.swapRing();
    }
    G.P.a -= bot.dir * 2.4 * dt;
  }
  function open(dt) {
    bot.t -= dt; if (bot.t <= 0) {
      bot.t = 0.05 + (1 - skill) * 0.2; const o = G.oa, B = G.B, opts = [];
      for (let i = -1; i < 8; i++) {
        const dx = i < 0 ? 0 : Math.cos(i * TAU / 8), dy = i < 0 ? 0 : Math.sin(i * TAU / 8), nx = clamp(G.P.x + dx * 60, 22, W - 22), ny = clamp(G.P.y + dy * 60, G.H * 0.12, G.H - 96);
        let v = riskAt(nx, ny, 0.25); if (pillarHit(nx, ny)) v += 50;
        const bd = Math.hypot(nx - B.x, ny - B.y); v += bd < 120 ? (120 - bd) * 0.06 : 0; v += Math.abs(bd - 210) * 0.003;
        if (o && (o.state === 'windup' || o.state === 'dash')) { const ang = Math.atan2(o.ty - B.y, o.tx - B.x), ax = Math.cos(ang), ay = Math.sin(ang), t = (nx - B.x) * ax + (ny - B.y) * ay, lx = B.x + ax * t, ly = B.y + ay * t; if (t > -20 && Math.hypot(nx - lx, ny - ly) < 55) v += 8; }
        if (o) for (const p of o.patches) if (Math.hypot(nx - p.x, ny - p.y) < 26) v += p.kind === 'fire' ? 8 : 2;
        v += (i < 0 ? -0.8 : 0) + (dx !== bot.sx || dy !== bot.sy ? 0.3 : 0); opts.push({ dx, dy, v });
      }
      opts.sort((a, b) => a.v - b.v); const pick = Math.random() < (1 - skill) * 0.3 ? opts[Math.floor(rnd(0, 3))] : opts[0]; bot.sx = pick.dx; bot.sy = pick.dy;
    }
    G.stickV = { x: bot.sx, y: bot.sy };
  }
  function runner(dt) {
    const f = G.fo; if (!f) return; bot.t -= dt; if (bot.t > 0) return; bot.t = 0.03 + (1 - skill) * 0.12;
    const sp = f.speed || 400, lane = f.lane;
    const laneRisk = l => { let r = 0; for (const o of f.obs) { if (o.gone || o.lane !== l || o.k === 'pick' || o.d < -20) continue; const tt = o.d / (sp + (o.spd || 0)); if (tt > 1.1) continue; r += o.k === 'block' ? 100 : (tt < 0.7 ? 1.5 : 0.4); } return r; };
    // a lane change when something solid is coming, or to follow safer lanes
    let best = lane, bv = laneRisk(lane) + 0.01; for (const l of [0, 1, 2]) { const v = laneRisk(l) + Math.abs(l - lane) * 0.35; if (v < bv) { bv = v; best = l; } }
    if (best !== lane && bv + 0.3 < laneRisk(lane) && Math.random() > (1 - skill) * 0.25) A.foDodge(Math.sign(best - lane));
    // jump or slide at the right moment
    const jit = (1 - skill) * rnd(-0.12, 0.12);
    for (const o of f.obs) {
      if (o.gone || o.lane !== lane || o.k === 'pick' || o.k === 'block') continue; const tt = o.d / (sp + (o.spd || 0));
      if (o.k === 'low' || o.k === 'shard') { if (tt < 0.22 + jit && tt > 0.02 && f.h < 1) A.foJump(); } else if (tt < 0.2 + jit && tt > 0.0 && f.slide <= 0) A.foSlide();
    }
  }

  /* ---------- spells ---------- */
  function danger() { if (S.fo && G.fo) return G.fo.obs.some(o => !o.gone && o.lane === G.fo.lane && o.d > 0 && o.d < 180 && o.k !== 'pick' && o.k !== 'block'); let n = 0; for (const s of G.shots) if (!s.seed && Math.hypot(s.x - G.P.x, s.y - G.P.y) < 100) n++; return n; }
  function spells() {
    const P = G.P; if (!P.spells.length || P.cd > 0 || P.beam) return;
    for (let i = 0; i < P.spells.length; i++) {
      const s = P.spells[i], c = A.spellCost(s); if (P.mana < c) continue; const d = danger();
      let ok = true; if (s.type === 'ward') ok = d && P.shield <= 0; else if (s.type === 'nova') ok = d >= 3 || P.mana > P.manaMax * 0.85; else if (s.type === 'blink') ok = d >= 2 && P.hp < P.max; else if (s.type === 'orbit') ok = !P.orbit; else if (s.type === 'summon') ok = G.helpers.length < 2; else ok = P.mana >= c + 8;
      if (!ok) continue; A.castSpell(i); if (P.beam) P.beam.auto = 0.7; break;
    }
  }

  /* ---------- the Camp between bosses ---------- */
  const TYPE_SCORE = { bolt: 3, summon: 3, meteor: 3, trap: 2, beam: 2, orbit: 2, nova: 2, ward: 2, blink: 1 };
  function shop(cs) {
    click('#propshop'); const P = G.P;
    for (let guard = 0; guard < 8; guard++) {
      const rows = [...document.querySelectorAll('.sheet .shoprow[data-i]:not([disabled])')]; if (!rows.length) break;
      const items = rows.map(r => ({ r, it: cs.stock[+r.dataset.i] })), want = id => items.find(x => x.it.id === id);
      const pick = (P.slots < 3 && want('tome')) || (P.hp < P.max && want('draught')) || want('locket') || want('crystal') || (!P.wand && items.find(x => x.it.wand)) || items.find(x => !x.it.wand && x.it.icon !== 'potion' && x.it.id !== 'eye') || null;
      if (!pick) break; pick.r.click();
    }
    click('#closesheet');
  }
  function camp() {
    const cs = G.camp, P = G.P; if (!cs) return false;
    if (P.loot.length) { const g = A.gearOf(P.loot[0]), cur = P.gear[g.slot] && A.gearOf(P.gear[g.slot]); click(!cur || (g.value >= cur.value && !g.cursed) ? '#wear' : '#sellg'); return true; }
    if (!cs.claimed) {
      if (cs.sel === null) { let bi = 0, bs = -1; cs.opts.forEach((s, i) => { const sc = (TYPE_SCORE[s.type] || 1) + Math.random(); if (sc > bs) { bs = sc; bi = i; } }); document.querySelectorAll('.rcard')[bi].click(); return true; }
      if (cs.slot === null) {
        const n = cs.opts[cs.sel]; let slot = P.spells.length < P.slots ? P.spells.length : -1;
        if (slot < 0) { const same = P.spells.findIndex(s => s.type === n.type); slot = same >= 0 ? same : P.spells.reduce((bi, s, i, a) => (s.tier + s.els.length < a[bi].tier + a[bi].els.length ? i : bi), 0); }
        document.querySelector(`.slotbtn[data-slot="${slot}"]`).click(); return true;
      }
      const opts = cs.shown || []; let bi = opts.findIndex(o => o.label.startsWith('Fuse')); if (bi < 0) bi = opts.findIndex(o => o.label.startsWith('Keep')); if (bi < 0) bi = 0;
      document.querySelector(`[data-o="${bi}"]`).click(); return true;
    }
    if (!cs.shopped) { cs.shopped = true; shop(cs); return true; }
    click('#campnext'); if (G.camp && G.camp.confirm) click('#campnext'); return true;
  }

  /* ---------- a whole run ---------- */
  function playRun(opts) {
    skill = opts.skill ?? 0.8; A.meta.unlockEverything(); A.S.god = false;
    const res = { wizard: opts.wizard, len: opts.len, skill, fights: [], stalls: 0, won: false, beaten: 0, simSeconds: 0, death: null };
    A.startRun(opts.wizard, opts.len); if (opts.gear) A.equip(A.gearOf(opts.gear)); if (opts.wand) G.P.wand = opts.wand; bot = { t: 0, dx: 0, dy: 0, dir: 0, sx: 0, sy: 0 };
    let cur = null, guard = 0, lastMode = '';
    while (guard++ < 3e6) {
      const m = S.mode;
      if (m === 'draw') { if (G.pull) A.enterArena(); else A.showDraw(); continue; }
      if (m === 'intro' || m === 'fight') {
        if (!cur || cur.pos !== S.pos || cur.stage !== S.stage) { cur = { pos: S.pos, stage: S.stage, boss: A.BOSSES[S.stage].name, elite: !!A.BOSSES[S.stage].elite, arena: S.arena, omen: S.mod && S.mod.id, hpStart: G.P.hp, hits0: S.hits, t: 0, stall: false }; res.fights.push(cur); bot = { t: 0, dx: 0, dy: 0, dir: 0, sx: 0, sy: 0 }; }
        cur.t += DT; res.simSeconds += DT;
        if (m === 'fight') { if (S.orbit) orbit(DT); else if (S.fo) runner(DT); else if (S.open) open(DT); else chariot(DT); spells(); }
        if (cur.t > 240 && !cur.stall) { cur.stall = true; res.stalls++; A.damage(1e12); }
        A.step(DT); continue;
      }
      if (m === 'won' || m === 'dying') { if (cur && m === 'won' && cur.win === undefined) { cur.win = true; cur.hpEnd = G.P.hp; cur.hits = S.hits - cur.hits0; } if (cur && m === 'dying' && cur.win === undefined) { cur.win = false; cur.hpEnd = 0; cur.hits = S.hits - cur.hits0; } A.step(DT); continue; }
      if (m === 'pick') { if (!camp()) A.step(DT); continue; }
      if (m === 'dead' || m === 'victory') break;
      A.step(DT);
    }
    res.won = S.mode === 'victory'; res.beaten = res.won ? S.order.length : S.pos; res.gold = G.P.gold; res.spells = G.P.spells.map(s => A.spellName(s)); res.hpEnd = G.P.hp;
    const last = res.fights[res.fights.length - 1]; if (!res.won && last) res.death = { pos: last.pos, boss: last.boss, arena: last.arena, omen: last.omen, elite: last.elite };
    return res;
  }
  window.__bot = { playRun };
})();
