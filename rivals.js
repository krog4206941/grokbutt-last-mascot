/* rivals.js: the three rival mascots, their minions, bosses and hazards.
   Uses globals from main.js at call time (player, enemies, ebullets, hazards, blocks, fx helpers). */
'use strict';
const B = { l: 30, r: 610, t: 172, b: 590 }; // stage floor bounds
const ARENA_C = { x: (B.l + B.r) / 2, y: (B.t + B.b) / 2 + 10 };
const EDEF = {
  dot:      { r: 13, hp: 2,  spd: 105, score: 60,  contact: 8 },
  dotS:     { r: 8,  hp: 1,  spd: 140, score: 25,  contact: 6 },
  plush:    { r: 17, hp: 5,  spd: 64,  score: 140, contact: 6 },
  clawdlet: { r: 15, hp: 4,  spd: 72,  score: 140, contact: 7 },
  bigdot:   { r: 30, hp: 28, spd: 0,   score: 900, contact: 12, boss: 'dotz' },
  jolly:    { r: 46, hp: 185, spd: 58, score: 3000, contact: 12, boss: 'jolly' },
  claw:     { r: 50, hp: 205, spd: 60, score: 3000, contact: 14, boss: 'claw' },
};
const RIVAL_NAME = { dotz: 'DOTZ CREW', jolly: 'JOLLYBOB', claw: 'CLAWDETH' };
const RIVAL_COL = { dotz: '#b6ff3b', jolly: '#e7cfa8', claw: PAL.terra, grok: PAL.gold };
function spawnEnemy(type, x, y, extra = {}) {
  const d = EDEF[type];
  const e = Object.assign({ type, x, y, r: d.r, hp: d.hp, maxhp: d.hp, spd: d.spd, t: rnd(0, 3), kx: 0, ky: 0, flash: 0, z: 0, dead: false,
    st: 'walk', stT: 0, cd: rnd(0.6, 1.6), boss: d.boss || null, hitBy: -1, contact: d.contact, col: pick(DOTCOLS), dir: 1 }, extra);
  enemies.push(e);
  return e;
}
const AI = {}, DRAW = {};
const toward = (e, tx, ty, sp, dt) => { const a = Math.atan2(ty - e.y, tx - e.x); e.x += Math.cos(a) * sp * dt; e.y += Math.sin(a) * sp * dt; e.dir = Math.cos(a) >= 0 ? 1 : -1; return a; };
function shoot(kind, x, y, a, sp, extra = {}) {
  if (ebullets.length > 90) return;
  ebullets.push(Object.assign({ kind, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 8, t: 0, life: 4, dmg: 9, rot: rnd(0, TAU) }, extra));
}
function ring(x, y, maxR, sp, dmg = 12, col = PAL.gold) { ebullets.push({ kind: 'ring', x, y, R: 6, maxR, sp, r: 12, t: 0, life: maxR / sp, dmg, col, hitDone: false }); }
const CODE_BITS = ['rm -rf /butt', 'sudo turn_around', '403', '{ }', '>_', 'git push --force', 'NaN', '0xDEAD', 'face.reveal()', ';;', 'ERR'];

// ----- Dotz Crew minions: hop toward you; big ones split -----
AI.dot = AI.dotS = (e, dt) => {
  e.hop = (e.hop || rnd(0, 1)) + dt * (e.type === 'dot' ? 1.9 : 2.6);
  const ph = e.hop % 1;
  e.z = Math.sin(ph * Math.PI) * (e.type === 'dot' ? 16 : 10);
  if (ph > 0.08 && ph < 0.92) toward(e, player.x, player.y, e.spd * (1 + (e.rage || 0)), dt);
  if (ph < e.lastPh) { SFX.squeak(); parts.length < MAX_PARTS && puff(e.x, e.y, 2, 'rgba(255,255,255,0.18)'); }
  e.lastPh = ph;
};
DRAW.dot = DRAW.dotS = (c, e) => {
  const spr = SPR.dots[e.col][e.type === 'dot' || e.type === 'bigdot' ? 'big' : 'small'];
  const R = e.r * 1.25;
  // neon floor glow + shadow
  c.save(); c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(e.x, e.y, 0, e.x, e.y, R * 1.9); g.addColorStop(0, e.col + '55'); g.addColorStop(1, e.col + '00');
  c.fillStyle = g; c.beginPath(); c.ellipse(e.x, e.y, R * 1.9, R * 1.0, 0, 0, TAU); c.fill(); c.restore();
  c.save(); c.globalAlpha = 0.35; c.fillStyle = '#000'; c.beginPath(); c.ellipse(e.x, e.y, R * 0.8 * Math.max(0.3, 1 - e.z / 300), R * 0.3 * Math.max(0.3, 1 - e.z / 300), 0, 0, TAU); c.fill(); c.restore();
  const s = spr.s * (R / (e.type === 'dotS' ? 14 : 34)) * (e.type === 'dotS' ? 1 : 1);
  const scale = R / (spr.s / 2.7);
  const sz = spr.s * scale;
  const wob = Math.sin(e.t * 9) * 0.08;
  c.save(); c.translate(e.x, e.y - R - e.z); c.rotate(wob);
  c.drawImage(spr.k, -sz / 2, -sz / 2, sz, sz);
  if (e.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = e.flash; c.drawImage(spr.k, -sz / 2, -sz / 2, sz, sz); }
  c.restore();
  void s;
};
// ----- Jollybob merch: "Jolly Jr." plush fans that wind up and hug-lunge -----
AI.plush = (e, dt) => {
  e.stT += dt; e.cd -= dt;
  const d = dist(e, player);
  if (e.st === 'walk') { toward(e, player.x, player.y, e.spd, dt); if (d < 110 && e.cd <= 0) { e.st = 'wind'; e.stT = 0; SFX.tel(); } }
  else if (e.st === 'wind') { if (e.stT > 0.5) { e.st = 'lunge'; e.stT = 0; e.la = Math.atan2(player.y - e.y, player.x - e.x); SFX.plush(); } }
  else if (e.st === 'lunge') { e.x += Math.cos(e.la) * 380 * dt; e.y += Math.sin(e.la) * 380 * dt; if (e.stT > 0.32) { e.st = 'rest'; e.stT = 0; } }
  else if (e.st === 'rest') { if (e.stT > 0.9) { e.st = 'walk'; e.cd = rnd(0.8, 1.6); } }
  e.grabby = e.st === 'lunge';
};
DRAW.plush = (c, e) => {
  const s = SPR.jollySmall, k = 0.78;
  c.save(); c.globalAlpha = 0.35; c.fillStyle = '#000'; c.beginPath(); c.ellipse(e.x, e.y, 15, 5, 0, 0, TAU); c.fill(); c.restore();
  const shakeX = e.st === 'wind' ? Math.sin(e.t * 70) * 2 : 0;
  c.save(); c.translate(e.x + shakeX, e.y); c.rotate(Math.sin(e.t * 7) * 0.07 + (e.st === 'lunge' ? 0.3 * Math.cos(e.la) : 0)); c.scale(e.dir * k, k);
  c.drawImage(s.k, -s.ax, -s.ay);
  if (e.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = e.flash * 0.8; c.drawImage(s.k, -s.ax, -s.ay); }
  c.restore();
  if (e.st === 'wind') bubble(c, e.x, e.y - 62, 'HUG?', '#ff6b8a');
};
// ----- Clawdeth's little pixel crabs: keep distance, shoot terminal code -----
AI.clawdlet = (e, dt) => {
  e.stT += dt; e.cd -= dt;
  const d = dist(e, player), a = Math.atan2(player.y - e.y, player.x - e.x);
  const want = d > 260 ? 1 : d < 190 ? -1 : 0;
  e.str = e.str || (Math.random() < 0.5 ? 1 : -1);
  e.x += (Math.cos(a) * want * e.spd + Math.cos(a + Math.PI / 2) * e.str * e.spd * 0.6) * dt;
  e.y += (Math.sin(a) * want * e.spd + Math.sin(a + Math.PI / 2) * e.str * e.spd * 0.6) * dt;
  if (Math.random() < dt * 0.4) e.str *= -1;
  e.dir = Math.cos(a) >= 0 ? 1 : -1;
  if (e.cd <= 0) { e.cd = rnd(1.9, 2.6); shoot('code', e.x, e.y - 14, a, 175, { text: pick(CODE_BITS), dmg: 7 }); SFX.code(); }
};
DRAW.clawdlet = (c, e) => drawClawdeth(c, e.x, e.y, 3.6, e.t, { walk: true, flash: e.flash });

// =============== BOSS 1: DOTZ CREW (five big neon blobs moving as one crew) ===============
let DZ = null; // crew controller
function spawnDotz(n = 5, hpMul = 1) {
  DZ = { st: 'orbit', t: 0, ang: 0, cycle: 0, slow: hpMul < 1 ? 1.35 : 1 };
  const cols = DOTCOLS.slice(0, n);
  cols.forEach((col, i) => {
    const e = spawnEnemy('bigdot', ARENA_C.x + Math.cos(i / n * TAU) * 160, B.t + 10, { col, idx: i, z: 260, hp: Math.round(28 * hpMul), maxhp: Math.round(28 * hpMul) });
    e.tx = e.x; e.ty = e.y;
  });
}
function dotzCrew() { return enemies.filter(e => e.type === 'bigdot' && !e.dead); }
function updateDotz(dt) {
  if (!DZ) return;
  const crew = dotzCrew();
  if (!crew.length) { DZ = null; return; }
  const rage = 1 + (5 - crew.length) * 0.12;
  DZ.t += dt * rage / DZ.slow; DZ.ang += dt * 0.9 * rage;
  const n = crew.length;
  if (DZ.st === 'orbit') {
    crew.forEach((e, i) => { e.tx = ARENA_C.x + Math.cos(DZ.ang + i / n * TAU) * 175; e.ty = ARENA_C.y + Math.sin(DZ.ang + i / n * TAU) * 120; });
    if (DZ.t > 1.2 && Math.floor(DZ.t / 1.1) !== Math.floor((DZ.t - dt * rage / DZ.slow) / 1.1)) {
      const e = pick(crew), a = Math.atan2(player.y - e.y, player.x - e.x);
      for (let k = -1; k <= 1; k++) shoot('spark', e.x, e.y - 20, a + k * 0.25, 200, { col: e.col, r: 7, dmg: 8 });
      SFX.zap && SFX.zap();
    }
    if (DZ.t > 4.2) { DZ.cycle++; DZ.st = ['conga', 'bounce', 'multiply'][(DZ.cycle - 1) % 3]; DZ.t = 0; if (DZ.st === 'conga') setupConga(crew); if (DZ.st === 'bounce') setupBounce(crew); }
  } else if (DZ.st === 'conga') {
    // line up off one side, flash a lane, then dash across one after another
    crew.forEach((e, i) => {
      if (DZ.t < 1.1) { e.tx = DZ.side < 0 ? B.l + 20 + i * 4 : B.r - 20 - i * 4; e.ty = DZ.laneY; }
      else { const go = DZ.t - 1.1 - i * 0.16; if (go > 0) { e.tx = DZ.side < 0 ? B.r + 80 : B.l - 80; e.ty = DZ.laneY; e.dashing = true; } }
    });
    if (DZ.t > 1.1 && !DZ.sfx) { DZ.sfx = 1; SFX.plush(); }
    if (DZ.t > 3.0) { crew.forEach(e => { e.dashing = false; e.x = clamp(e.x, B.l, B.r); }); DZ.st = 'orbit'; DZ.t = 0; }
  } else if (DZ.st === 'bounce') {
    crew.forEach((e, i) => {
      const k = clamp(DZ.t / 1.0, 0, 1);
      e.z = Math.sin(k * Math.PI) * 190; e.tx = e.landX; e.ty = e.landY;
      if (k >= 1 && !e.landed) { e.landed = true; ring(e.x, e.y, 95, 260, 11, e.col); SFX.slam(); addShake(7); }
    });
    if (DZ.t > 1.7) { DZ.st = 'orbit'; DZ.t = 0; }
  } else if (DZ.st === 'multiply') {
    if (!DZ.done) { DZ.done = 1; crew.forEach(e => { if (enemies.length < 26) { spawnEnemy('dotS', e.x, e.y, { col: e.col }); spawnEnemy('dotS', e.x, e.y, { col: e.col }); } burst(e.x, e.y - 30, 10, [e.col, '#fff']); }); pop(ARENA_C.x, B.t + 40, 'MULTIPLY!', '#b6ff3b', 30); SFX.pop(); }
    if (DZ.t > 1.2) { DZ.done = 0; DZ.st = 'orbit'; DZ.t = 0; }
  }
}
function setupConga(crew) { DZ.side = player.x > ARENA_C.x ? -1 : 1; DZ.laneY = clamp(player.y, B.t + 30, B.b - 20); DZ.sfx = 0; tele.push({ kind: 'lane', y: DZ.laneY, h: 70, t: 0, life: 1.25 }); SFX.tel(); }
function setupBounce(crew) { crew.forEach((e, i) => { const a = i / crew.length * TAU; const o = i === 0 ? 0 : 75; e.landX = clamp(player.x + Math.cos(a) * o, B.l + 30, B.r - 30); e.landY = clamp(player.y + Math.sin(a) * o * 0.7, B.t + 20, B.b - 10); e.landed = false; tele.push({ kind: 'circle', x: e.landX, y: e.landY, R: 50, t: 0, life: 1.0, col: e.col }); }); SFX.tel(); }
AI.bigdot = (e, dt) => {
  if (e.z > 0 && DZ && DZ.st !== 'bounce') e.z = Math.max(0, e.z - 520 * dt); // drop-in entrance
  const sp = e.dashing ? 620 : DZ && DZ.st === 'bounce' ? 280 : 240;
  const d = Math.hypot(e.tx - e.x, e.ty - e.y);
  if (d > 2) { const m = Math.min(d, sp * dt); e.x += (e.tx - e.x) / d * m; e.y += (e.ty - e.y) / d * m; }
  e.airborne = e.z > 30;
};
DRAW.bigdot = (c, e) => {
  DRAW.dot(c, e);
  if (e.dashing) { c.save(); c.globalAlpha = 0.5; c.strokeStyle = e.col; c.lineWidth = 6; c.beginPath(); c.moveTo(e.x - (DZ && DZ.side < 0 ? 60 : -60), e.y - 36); c.lineTo(e.x, e.y - 36); c.stroke(); c.restore(); }
};

// =============== BOSS 2: JOLLYBOB ===============
AI.jolly = (e, dt) => {
  e.stT += dt * (e.slow ? 1 / e.slow : 1); e.cd -= dt;
  const d = dist(e, player), a = Math.atan2(player.y - e.y, player.x - e.x);
  if (e.z > 0) { e.z = Math.max(0, e.z - 600 * dt); if (e.z === 0) { SFX.slam(); addShake(12); ring(e.x, e.y, 120, 300, 10, '#e7cfa8'); } return; }
  const low = e.hp < e.maxhp * 0.5;
  if (e.st === 'walk') {
    toward(e, player.x, player.y, e.spd * (low ? 1.3 : 1), dt);
    if (e.stT > 1.6) {
      const opts = ['hugrush', 'cards', 'forms', 'hugrush'];
      if (low && !e.subbed) opts.push('subscribe', 'subscribe');
      e.st = pick(opts); e.stT = 0; e.n = 0;
      if (e.st === 'hugrush') { e.la = a; tele.push({ kind: 'dash', x: e.x, y: e.y, a, len: 700, w: 80, t: 0, life: 0.85 }); SFX.tel(); }
      if (e.st === 'subscribe') { e.subbed = true; sysWin('JOLLYBOB+', ['AUTO-RENEW ENABLED', 'Your hugs will now multiply.'], '#e7a35c'); }
    }
  } else if (e.st === 'hugrush') {
    if (e.stT < 0.85) { e.dir = Math.cos(e.la) >= 0 ? 1 : -1; }
    else {
      e.grabby = true;
      e.x += Math.cos(e.la) * 560 * dt; e.y += Math.sin(e.la) * 560 * dt;
      if (Math.random() < 0.5) puff(e.x, e.y, 1, 'rgba(230,210,180,0.4)');
      if (e.x < B.l + e.r || e.x > B.r - e.r || e.y < B.t + 8 || e.y > B.b - 4) {
        e.x = clamp(e.x, B.l + e.r, B.r - e.r); e.y = clamp(e.y, B.t + 8, B.b - 4);
        e.grabby = false; e.st = 'dizzy'; e.stT = 0; SFX.slam(); addShake(14); burst(e.x, e.y - 40, 16, ['#e7cfa8', '#fff4dc']); pop(e.x, e.y - 110, 'DIZZY! x2 DMG', PAL.gold, 24, 1.4);
      }
      if (e.stT > 2.5) { e.grabby = false; e.st = 'walk'; e.stT = 0; }
    }
  } else if (e.st === 'dizzy') { e.weak = true; if (e.stT > 2.0) { e.weak = false; e.st = 'walk'; e.stT = 0; } }
  else if (e.st === 'cards') {
    if (e.stT > 0.35 + e.n * 0.7 && e.n < (low ? 3 : 2)) {
      e.n++; const k = low ? 9 : 7;
      for (let i = 0; i < k; i++) shoot('card', e.x, e.y - 50, a + (i - (k - 1) / 2) * 0.17, 190, { dmg: 8, r: 11 });
      SFX.cash();
    }
    if (e.stT > 2.4) { e.st = 'walk'; e.stT = 0; }
  } else if (e.st === 'forms') {
    if (e.stT > 0.2 + e.n * 0.55 && e.n < (low ? 4 : 3)) {
      e.n++;
      hazards.push({ kind: 'form', x: clamp(player.x + (player.vxs || 0) * 0.45, B.l + 60, B.r - 60), y: clamp(player.y + (player.vys || 0) * 0.45, B.t + 40, B.b - 30), w: 120, h: 78, t: 0, tel: 0.95, dmg: 13 });
      SFX.tel();
      if (e.n === 1) sysWin('CHECKOUT', ['PAYMENT REQUIRED FOR HUG', '$49.99 · Card declined? Try face.'], '#e7a35c');
    }
    if (e.stT > 2.8) { e.st = 'walk'; e.stT = 0; }
  } else if (e.st === 'subscribe') {
    if (e.stT > 0.4 && !e.spawned) { e.spawned = 1; for (let i = 0; i < 3; i++) spawnEnemy('plush', e.x + rnd(-60, 60), e.y + rnd(-10, 30)); SFX.hug(); }
    if (e.stT > 1.3) { e.spawned = 0; e.st = 'walk'; e.stT = 0; }
  }
};
DRAW.jolly = (c, e) => {
  const s = SPR.jollyBig;
  c.save(); c.globalAlpha = 0.42; c.fillStyle = '#000'; c.beginPath(); c.ellipse(e.x, e.y + 2, 52 * Math.max(0.3, 1 - e.z / 900), 15, 0, 0, TAU); c.fill(); c.restore();
  const rush = e.st === 'hugrush' && e.stT > 0.85;
  const wind = e.st === 'hugrush' && e.stT <= 0.85;
  let rot = Math.sin(e.t * 3) * 0.04;
  if (rush) rot = 0.22 * Math.cos(e.la);
  if (e.st === 'dizzy') rot = Math.sin(e.t * 10) * 0.12;
  const sx = wind ? Math.sin(e.t * 60) * 3 : 0;
  c.save(); c.translate(e.x + sx, e.y - e.z); c.rotate(rot); c.scale(e.dir, 1);
  c.drawImage(s.k, -s.ax, -s.ay);
  if (e.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = e.flash * 0.7; c.drawImage(s.k, -s.ax, -s.ay); }
  c.restore();
  if (wind) bubble(c, e.x, e.y - 168, 'FREE HUG!', '#ff6b8a');
  if (e.st === 'dizzy') stars(c, e.x, e.y - 150, e.t);
};

// =============== BOSS 3: CLAWDETH ===============
const CU = 12.5; // Clawdeth boss pixel size
AI.claw = (e, dt) => {
  e.stT += dt * (e.slow ? 1 / e.slow : 1);
  const d = dist(e, player), a = Math.atan2(player.y - e.y, player.x - e.x);
  if (e.z > 0 && e.st !== 'stomp') { e.z = Math.max(0, e.z - 600 * dt); if (e.z === 0) { SFX.slam(); addShake(12); ring(e.x, e.y, 130, 300, 10, PAL.terra); } return; }
  const low = e.hp < e.maxhp * 0.5;
  e.walking = false;
  if (e.st === 'walk') {
    if (d > 170) { toward(e, player.x, player.y, e.spd, dt); e.walking = true; }
    if (e.stT > 1.5) {
      const opts = ['walls', 'terminal', 'stomp', 'compile'];
      if (low && !e.forked) opts.push('fork', 'fork');
      e.st = pick(opts.filter(o => o !== e.lastSt)); e.lastSt = e.st; e.stT = 0; e.n = 0;
      if (e.st === 'walls') { buildWalls(low); sysWin('clawdeth.exe', ['Clawdeth is building…', '> placing pixels ▮'], PAL.terra); }
      if (e.st === 'compile') { e.prog = 0; sysWin('TERMINAL', ['compiling patch.exe', 'HIT IT NOW: x2 DMG'], PAL.terra); }
      if (e.st === 'stomp') { e.jx = e.x; e.jy = e.y; SFX.tel(); }
      if (e.st === 'fork') { e.forked = true; sysWin('TERMINAL', ['$ fork --children 3', 'spawning helpers…'], PAL.terra); }
    }
  } else if (e.st === 'walls') { if (e.stT > 1.4) { e.st = 'walk'; e.stT = 0; } }
  else if (e.st === 'terminal') {
    const N = low ? 22 : 16;
    if (e.stT > 0.4 + e.n * 0.1 && e.n < N) { e.n++; const sa = a + Math.sin(e.n * 0.7) * 0.9; shoot('code', e.x, e.y - 50, sa, 200, { text: pick(CODE_BITS), dmg: 9 }); SFX.type(); }
    if (e.stT > 0.4 + N * 0.1 + 0.6) { e.st = 'walk'; e.stT = 0; }
  } else if (e.st === 'stomp') {
    const T = 1.15;
    if (e.stT < T) {
      const k = e.stT / T; e.z = Math.sin(k * Math.PI) * 230;
      e.jx = lerp(e.jx, player.x, Math.min(1, dt * 2.2)); e.jy = lerp(e.jy, player.y, Math.min(1, dt * 2.2));
      e.x = lerp(e.x, e.jx, Math.min(1, dt * 4)); e.y = lerp(e.y, e.jy, Math.min(1, dt * 4));
      e.airborne = e.z > 40;
    } else if (!e.landed) { e.landed = true; e.z = 0; e.airborne = false; SFX.slam(); addShake(16); hitstop = Math.max(hitstop, 0.06); ring(e.x, e.y, 170, 330, 14, PAL.terra); for (let i = 0; i < 18; i++) pixelBit(e.x + rnd(-40, 40), e.y - rnd(0, 20)); }
    if (e.stT > T + 0.9) { e.landed = false; e.st = 'walk'; e.stT = 0; }
  } else if (e.st === 'compile') {
    e.weak = true; e.prog = Math.min(100, e.stT / 2.8 * 100);
    if (Math.random() < dt * 8) SFX.type();
    if (e.stT > 2.8) { e.weak = false; e.hp = Math.min(e.maxhp, e.hp + 12); pop(e.x, e.y - 120, 'PATCH APPLIED +12', PAL.terra, 22, 1.4); e.st = 'walk'; e.stT = 0; }
  } else if (e.st === 'fork') {
    if (e.stT > 0.5 && !e.spawned) { e.spawned = 1; for (let i = 0; i < 3; i++) spawnEnemy('clawdlet', e.x + rnd(-70, 70), e.y + rnd(-10, 40)); SFX.pixel(); }
    if (e.stT > 1.2) { e.spawned = 0; e.st = 'walk'; e.stT = 0; }
  }
};
function buildWalls(low) {
  const S = 34;
  const hz = () => { const y = clamp(Math.round(player.y / S) * S + (Math.random() < 0.5 ? -S : S), B.t + S, B.b - S); const cols = Math.floor((B.r - B.l) / S); const gap = Math.floor(rnd(1, cols - 4)); for (let i = 0; i < cols; i++) if (i < gap || i > gap + 2) blocks.push({ x: B.l + i * S, y: y - S / 2, s: S, t: 0, rise: 0.8, life: 5.2, hp: 2 }); };
  const vt = () => { const x = clamp(player.x + (Math.random() < 0.5 ? -1 : 1) * rnd(70, 130), B.l + S * 2, B.r - S * 3); const rows = Math.floor((B.b - B.t) / S); const gap = Math.floor(rnd(1, rows - 3)); for (let j = 0; j < rows; j++) if (j < gap || j > gap + 2) blocks.push({ x: x - S / 2, y: B.t + j * S, s: S, t: 0, rise: 0.8, life: 5.2, hp: 2 }); };
  hz(); vt(); if (low) (Math.random() < 0.5 ? hz : vt)();
  SFX.wall();
}
DRAW.claw = (c, e) => {
  drawClawdeth(c, e.x, e.y, CU, e.t, { walk: e.walking, flash: e.flash, hop: e.z, angry: e.st === 'terminal' || e.st === 'stomp', wave: e.st === 'terminal' });
  if (e.st === 'compile') {
    const w = 120, x = e.x - w / 2, y = e.y - 135 - e.z;
    c.save(); c.fillStyle = 'rgba(10,8,12,0.9)'; rr(c, x, y, w, 26, 5); c.fill(); c.strokeStyle = PAL.terra; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = PAL.terra; c.fillRect(x + 6, y + 15, (w - 12) * e.prog / 100, 6);
    c.fillStyle = '#ffd7a8'; c.font = `bold 9px ${MONO}`; c.textAlign = 'left'; c.fillText('compiling… ' + Math.floor(e.prog) + '%', x + 6, y + 11); c.restore();
  }
  if (e.st === 'stomp' && e.stT < 1.15) { // landing marker
    c.save(); c.strokeStyle = 'rgba(255,90,70,0.85)'; c.lineWidth = 3; c.setLineDash([8, 6]); c.beginPath(); c.ellipse(e.jx, e.jy, 70, 30, 0, 0, TAU); c.stroke(); c.restore();
  }
};
function pixelBit(x, y) { if (parts.length >= MAX_PARTS) return; parts.push({ kind: 'pixel', x, y, vx: rnd(-160, 160), vy: rnd(-260, -80), g: 600, life: rnd(0.6, 1.1), t: 0, col: pick([PAL.terra, '#ee9a7e', '#a9553c']), sz: rnd(4, 8), floor: y + rnd(0, 20) }); }

// =============== shared draw helpers ===============
function bubble(c, x, y, text, col) {
  c.save(); c.font = `bold 14px ${FONT}`; const w = c.measureText(text).width + 16;
  c.fillStyle = '#fff4dc'; rr(c, x - w / 2, y - 13, w, 24, 10); c.fill();
  c.beginPath(); c.moveTo(x - 5, y + 10); c.lineTo(x + 5, y + 10); c.lineTo(x, y + 18); c.fill();
  c.fillStyle = col; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, x, y); c.restore();
}
function stars(c, x, y, t) {
  for (let i = 0; i < 4; i++) {
    const a = t * 4 + i / 4 * TAU, sx = x + Math.cos(a) * 36, sy = y + Math.sin(a) * 10;
    c.save(); c.translate(sx, sy); c.rotate(t * 5); c.fillStyle = PAL.gold;
    c.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 3 : 8, aa = k / 10 * TAU; c.lineTo(Math.cos(aa) * r, Math.sin(aa) * r); } c.fill(); c.restore();
  }
}
