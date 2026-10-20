/* main.js: waves, combat, cut-ins, HUD, screens, main loop */
'use strict';
let state = 'title', stateT = 0, paused = false, god = false;
let player = null, enemies = [], ebullets = [], hazards = [], blocks = [], tele = [], parts = [], pops = [], wins = [], spawns = [], loot = [], blasts = [], fxRings = [];
let shake = 0, hitstop = 0, flashT = 0, freezeT = 0, critCd = 0, cutin = null, banner = null;
let waveIdx = -1, waveT = 0, scriptI = 0, phase = 'fight', clearT = 0, bossSpawned = false;
let score = 0, combo = 0, comboT = 0, kills = 0, timeAlive = 0, eliminated = [], best = 0, firstHurt = true, firstStare = true;
let spot = { x: 320, y: 400 };
const MAX_PARTS = 220, MAX_POPS = 26;
try { best = +localStorage.getItem('gb_lms_best') || 0; } catch (_) {}
const notDead = o => !o.dead;

const WAVES = [
  { name: 'ROUND 1', sub: 'The Dotz Crew wants your spot', script: [[0, 'dot', 4], [3.5, 'dot', 4], [7, 'dot', 5]] },
  { name: 'ROUND 2', sub: 'Merch attack: hugs and pixels', script: [[0, 'dot', 3], [1, 'plush', 2], [5, 'clawdlet', 2], [8, 'dot', 4], [11, 'plush', 2]] },
  { name: 'BOSS', boss: 'dotz', title: 'DOTZ CREW', quote: '"We are many. We are cute. We are NEON."' },
  { name: 'ROUND 4', sub: 'Everyone wants the mascot job', script: [[0, 'plush', 3], [2, 'dot', 5], [6, 'clawdlet', 2], [9, 'plush', 3], [12, 'dot', 6]] },
  { name: 'BOSS', boss: 'jolly', title: 'JOLLYBOB', quote: '"First hug is FREE*.   *$49.99/hug after."' },
  { name: 'ROUND 6', sub: 'The audition gets loud', script: [[0, 'clawdlet', 3], [2, 'dot', 6], [5, 'plush', 3], [9, 'clawdlet', 3], [12, 'dot', 6]] },
  { name: 'BOSS', boss: 'claw', title: 'CLAWDETH', quote: '"> sudo make grokbutt --turn-around"' },
  { name: 'FINAL', boss: 'all', title: 'LAST MASCOT STANDING', quote: 'All three rivals. One stage. One mascot.' },
];

// ---------- fx helpers ----------
function pop(x, y, text, color = '#fff', size = 20, life = 0.9) { if (pops.length >= MAX_POPS) pops.shift(); pops.push({ x, y, text, color, size, life, t: 0, rot: rnd(-0.15, 0.15) }); }
function burst(x, y, n, cols, sp = 240, kind = 'spark') { n = Math.min(n, MAX_PARTS - parts.length); for (let i = 0; i < n; i++) { const a = rnd(0, TAU), v = rnd(sp * 0.3, sp); parts.push({ kind, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: rnd(0.35, 0.8), t: 0, col: pick(cols), sz: rnd(2, 5) }); } }
function confetti(x, y, n) { n = Math.min(n, MAX_PARTS - parts.length); for (let i = 0; i < n; i++) parts.push({ kind: 'confetti', x, y, vx: rnd(-220, 220), vy: rnd(-420, -120), g: 380, life: rnd(1.2, 2.2), t: 0, col: pick([PAL.gold, PAL.teal, '#ff3bd4', '#fff4dc', '#b6ff3b']), sz: rnd(4, 8), rot: rnd(0, TAU), vr: rnd(-12, 12) }); }
function puff(x, y, n, col) { n = Math.min(n, MAX_PARTS - parts.length); for (let i = 0; i < n; i++) parts.push({ kind: 'puff', x: x + rnd(-6, 6), y: y + rnd(-6, 6), vx: rnd(-30, 30), vy: rnd(-40, 0), life: rnd(0.5, 0.9), t: 0, col, sz: rnd(6, 11) }); }
function fur(x, y, n) { n = Math.min(n, MAX_PARTS - parts.length); for (let i = 0; i < n; i++) parts.push({ kind: 'fur', x, y, vx: rnd(-150, 150), vy: rnd(-200, -40), g: 220, life: rnd(0.8, 1.4), t: 0, col: pick(['#e9d7bb', '#d8c09d', '#fff1d6']), sz: rnd(3, 6), rot: rnd(0, TAU), vr: rnd(-6, 6) }); }
const addShake = s => { shake = Math.max(shake, s); };
function sysWin(title, lines, col = PAL.teal) { if (wins.length >= 3) wins.shift(); wins.push({ title, lines, col, t: 0, life: 2.6 }); SFX.ping && SFX.ping(); }
SFX.ping = () => { tone(1318, 0.08, 'sine', 0.05); tone(1760, 0.14, 'sine', 0.04, null, 0.07); };
function showBanner(big, small, col = PAL.gold, life = 1.4) { banner = { big, small, col, t: 0, life }; }
function startCutin(o) { cutin = Object.assign({ t: 0, dur: 1.6, col: PAL.gold }, o); SFX.cutin(); }

// ---------- game flow ----------
function newPlayer() { return { x: ARENA_C.x, y: ARENA_C.y + 60, r: 19, vx: 0, vy: 0, aim: -Math.PI / 2, shy: 0, moon: 0, inv: 0, flash: 0, t: 0, holding: false, holdT: 0, charge: 0, cd: 0, dash: 0, dashA: 0, hitSet: null, hugged: 0, lastHit: 99, stare: 0, bob: 0, blink: 0 }; }
function resetWorld() { enemies = []; ebullets = []; hazards = []; blocks = []; tele = []; spawns = []; loot = []; blasts = []; fxRings = []; DZ = null; }
function startGame() {
  unlockAudio(); startMusic();
  player = newPlayer(); resetWorld(); parts = []; pops = []; wins = [];
  score = 0; combo = 0; comboT = 0; kills = 0; timeAlive = 0; eliminated = []; firstHurt = true; firstStare = true;
  state = 'play'; stateT = 0; paused = false; cutin = null; freezeT = 0;
  startWave(0);
}
function startWave(i) {
  waveIdx = i; waveT = 0; scriptI = 0; phase = 'fight'; clearT = 0; bossSpawned = false;
  const w = WAVES[i];
  MUSIC.intensity = w.boss ? (w.boss === 'all' ? 1 : 0.8) : 0.25 + i * 0.06;
  if (w.boss) startCutin({ kind: 'boss', who: w.boss, title: w.title, sub: w.quote, dur: 1.9, col: RIVAL_COL[w.boss] || PAL.gold, after: () => spawnBoss(w.boss) });
  else showBanner(w.name + ' · FIGHT!', w.sub);
}
function spawnBoss(id) {
  bossSpawned = true;
  if (id === 'dotz') spawnDotz(5, 1);
  if (id === 'jolly') spawnEnemy('jolly', ARENA_C.x, B.t + 70, { z: 420 });
  if (id === 'claw') spawnEnemy('claw', ARENA_C.x, B.t + 80, { z: 420 });
  if (id === 'all') {
    spawnDotz(3, 0.7);
    spawnEnemy('jolly', B.l + 120, B.t + 90, { z: 420, hp: 100, maxhp: 100, slow: 1.35 });
    spawnEnemy('claw', B.r - 120, B.t + 90, { z: 420, hp: 110, maxhp: 110, slow: 1.35 });
  }
  showBanner(id === 'all' ? 'SURVIVE THEM ALL' : 'BOSS FIGHT', id === 'all' ? 'Be the last mascot standing' : RIVAL_NAME[id] + ' takes the stage', RIVAL_COL[id] || PAL.gold, 1.3);
}
function queueSpawn(type) {
  let x, y, tries = 0;
  do {
    const side = Math.random();
    if (side < 0.5) { x = rnd(B.l + 40, B.r - 40); y = B.t + 16; } else if (side < 0.75) { x = B.l + 18; y = rnd(B.t + 30, B.b - 30); } else { x = B.r - 18; y = rnd(B.t + 30, B.b - 30); }
  } while (player && Math.hypot(x - player.x, y - player.y) < 170 && ++tries < 10);
  spawns.push({ type, x, y, t: 0 });
}
function bossesAlive() { return enemies.some(e => e.boss && !e.dead); }
function updateWave(dt) {
  const w = WAVES[waveIdx];
  waveT += dt;
  if (phase === 'fight') {
    if (!w.boss) {
      while (scriptI < w.script.length && waveT >= w.script[scriptI][0]) { const [, type, n] = w.script[scriptI]; for (let i = 0; i < n; i++) queueSpawn(type); scriptI++; }
      if (scriptI >= w.script.length && !spawns.length && !enemies.length) roundClear();
    } else if (bossSpawned && !bossesAlive()) {
      for (const e of enemies) if (!e.dead) { e.dead = true; confetti(e.x, e.y - 10, 6); }
      ebullets = []; hazards = [];
      roundClear();
    }
  } else if (phase === 'clear') {
    clearT -= dt;
    if (clearT <= 0) { if (waveIdx + 1 < WAVES.length) startWave(waveIdx + 1); else winGame(); }
  }
}
function roundClear() {
  phase = 'clear'; clearT = WAVES[waveIdx].boss ? 1.4 : 1.8;
  const heal = 20;
  player.shy = Math.max(0, player.shy - heal);
  score += 500 + waveIdx * 150;
  if (waveIdx + 1 < WAVES.length) { showBanner('ROUND CLEAR', 'The crowd applauds · shyness -' + heal + '%', PAL.teal, 1.6); SFX.applause(); confetti(ARENA_C.x, B.t + 30, 30); }
}
function bossDown(id, e) {
  if (eliminated.includes(id)) return;
  eliminated.push(id);
  score += 3000;
  player.shy = Math.max(0, player.shy - 25);
  const lines = { dotz: 'The crew is now a solo act.', jolly: 'Hug subscription cancelled.', claw: 'Process terminated (exit 0).' };
  confetti(e.x, e.y - 40, 50); SFX.boom(); addShake(18); flashT = 0.6;
  const last = WAVES[waveIdx].boss === 'all' && ['dotz', 'jolly', 'claw'].every(k => eliminated.filter(x => x === k).length >= (k === id ? 1 : 0) && (eliminated.includes(k)));
  if (WAVES[waveIdx].boss === 'all') {
    if (!bossesAlive()) startCutin({ kind: 'win', who: 'grok', title: 'LAST MASCOT STANDING!', sub: 'GROKBUTT is the official mascot.', dur: 2.0, col: PAL.gold });
    else startCutin({ kind: 'ko', who: id, title: RIVAL_NAME[id] + ' ELIMINATED', sub: lines[id], dur: 1.2, col: RIVAL_COL[id] });
  } else startCutin({ kind: 'ko', who: id, title: RIVAL_NAME[id] + ' ELIMINATED', sub: lines[id], dur: 1.6, col: RIVAL_COL[id] });
  void last;
}
function winGame() {
  state = 'win'; stateT = 0; MUSIC.intensity = 0.4;
  score += Math.max(0, 15000 - Math.floor(timeAlive) * 20) + Math.round((100 - player.shy) * 30);
  saveBest(); SFX.win();
}
function loseGame() {
  if (state !== 'play' || (cutin && cutin.kind === 'lose')) return;
  startCutin({ kind: 'lose', who: 'grokshy', title: 'STAGE FRIGHT!', sub: 'GROKBUTT is too shy to perform…', dur: 1.6, col: '#8fe3ff', after: () => { state = 'over'; stateT = 0; saveBest(); SFX.over(); MUSIC.intensity = 0; } });
}
function saveBest() { if (score > best) { best = score; try { localStorage.setItem('gb_lms_best', String(best)); } catch (_) {} } }

// ---------- combat ----------
const shyPower = () => 1 + 0.9 * (player.shy / 100);
function hurtPlayer(dmg, fx, fy, why) {
  const p = player;
  if (god || p.inv > 0 || p.dash > 0 || state !== 'play') return false;
  p.shy = Math.min(100, p.shy + dmg); p.inv = 1.0; p.flash = 1; p.lastHit = 0;
  const a = Math.atan2(p.y - fy, p.x - fx); p.vx += Math.cos(a) * 260; p.vy += Math.sin(a) * 260;
  addShake(9); hitstop = Math.max(hitstop, 0.07); SFX.hurt();
  pop(p.x, p.y - 44, '+' + Math.round(dmg) + '% SHY', '#8fe3ff', 20);
  if (firstHurt) { firstHurt = false; sysWin('SYSTEM', ['SHYNESS +' + Math.round(dmg) + '%', 'Slower… but the butt hits HARDER.'], PAL.teal); }
  else if (why) sysWin('SYSTEM', [why, 'SHYNESS ' + Math.round(p.shy) + '%'], PAL.teal);
  if (p.shy >= 100) loseGame();
  return true;
}
function hugPlayer(e, dmg) {
  if (hurtPlayer(dmg, e.x, e.y, null)) {
    player.hugged = e.boss ? 1.1 : 0.75; player.hugBy = e;
    SFX.hug(); SFX.cash();
    pop(e.x, e.y - (e.boss ? 170 : 70), 'HUGGED! -$49.99', '#ffb36b', 22, 1.2);
    if (e.boss) sysWin('JOLLYBOB+', ['Hug processed.', '$49.99 charged to your butt.'], '#e7a35c');
    e.grabby = false; if (e.st === 'hugrush') { e.st = 'walk'; e.stT = 0; } if (e.st === 'lunge') { e.st = 'rest'; e.stT = 0; }
  }
}
function damageEnemy(e, dmg, fx, fy, kb, force) {
  if (e.dead || (e.airborne && !force) || (e.z > 60 && !force)) return false;
  const mult = e.weak ? 2 : 1, d = dmg * mult;
  e.hp -= d; e.flash = 1;
  const a = Math.atan2(e.y - fy, e.x - fx);
  if (!e.boss) { e.kx += Math.cos(a) * kb; e.ky += Math.sin(a) * kb; } else { e.kx += Math.cos(a) * kb * 0.12; e.ky += Math.sin(a) * kb * 0.12; }
  player.moon = Math.min(100, player.moon + d * (e.boss ? 1.1 : 2.2));
  score += Math.round(d * 10);
  pop(e.x + rnd(-8, 8), e.y - e.r * 2 - 10, (mult > 1 ? 'x2 ' : '') + Math.round(d * 10) / 10, mult > 1 ? '#ff9f43' : PAL.gold, mult > 1 ? 24 : 18, 0.7);
  if (e.type === 'jolly' || e.type === 'plush') fur(e.x, e.y - e.r, e.boss ? 6 : 4);
  else if (e.type === 'claw' || e.type === 'clawdlet') for (let i = 0; i < (e.boss ? 6 : 3); i++) pixelBit(e.x + rnd(-12, 12), e.y - e.r);
  else burst(e.x, e.y - e.r, 6, [e.col, '#ffffff'], 200, 'neon');
  if (e.hp <= 0) killEnemy(e);
  return true;
}
function killEnemy(e) {
  e.dead = true; kills++;
  combo = comboT > 0 ? combo + 1 : 1; comboT = 2.2;
  score += EDEF[e.type].score * Math.min(combo, 8);
  if (combo >= 3) { prune(pops, q => !q.combo); pop(e.x, e.y - 60, combo + 'x COMBO', PAL.teal, 22 + Math.min(combo, 8), 0.9); pops[pops.length - 1].combo = true; }
  if (e.type === 'dot' || e.type === 'dotS' || e.type === 'bigdot') {
    if (e.type === 'bigdot' && DZ) DZ.lostMax = (DZ.lostMax || 0) + e.maxhp;
    burst(e.x, e.y - e.r, e.type === 'bigdot' ? 30 : 12, [e.col, '#fff'], 300, 'neon'); SFX.pop();
    if (e.type === 'dot' && enemies.length < 28) for (let i = 0; i < 2; i++) spawnEnemy('dotS', e.x + rnd(-10, 10), e.y + rnd(-6, 6), { col: e.col, kx: rnd(-200, 200), ky: rnd(-200, 200) });
    if (e.type === 'bigdot' && !dotzCrew().length) bossDown('dotz', e);
    else if (e.type === 'bigdot') pop(e.x, e.y - 80, 'DOT DOWN!', e.col, 24);
  } else if (e.type === 'plush' || e.type === 'jolly') {
    fur(e.x, e.y - 20, e.boss ? 40 : 14); SFX.plush();
    if (!e.boss) pop(e.x, e.y - 50, pick(['REFUNDED!', 'UNSUBSCRIBED', 'HUG DECLINED']), '#ffb36b', 18);
    else bossDown('jolly', e);
  } else if (e.type === 'clawdlet' || e.type === 'claw') {
    for (let i = 0; i < (e.boss ? 40 : 12); i++) pixelBit(e.x + rnd(-20, 20), e.y - rnd(0, 30)); SFX.pixel();
    if (!e.boss) pop(e.x, e.y - 40, pick(['SEGFAULT', 'exit 1', 'KILLED']), PAL.terra, 18);
    else bossDown('claw', e);
  }
  if (!e.boss && Math.random() < 0.13 && loot.length < 4) loot.push({ x: clamp(e.x, B.l + 20, B.r - 20), y: clamp(e.y, B.t + 20, B.b - 10), t: 0, life: 9 });
}
function bump() {
  const p = player;
  if (p.cd > 0) return;
  p.dash = 0.15; p.dashA = p.aim; p.cd = 0.3; p.hitSet = new Set(); p.inv = Math.max(p.inv, 0.16);
  SFX.bump(); puff(p.x, p.y + 10, 3, 'rgba(255,255,255,0.25)');
}
function blast(k) {
  const p = player, a = p.aim, range = 105 + 125 * k, dmg = (3 + 7 * k) * shyPower();
  p.cd = 0.25;
  blasts.push({ x: p.x, y: p.y, a, range, k, t: 0 });
  SFX.blast(k); addShake(4 + 9 * k); hitstop = Math.max(hitstop, 0.03 + 0.05 * k);
  p.vx -= Math.cos(a) * 140 * k; p.vy -= Math.sin(a) * 140 * k;
  let hits = 0, bossHit = false;
  const inCone = (x, y, r) => { const d = Math.hypot(x - p.x, y - p.y); return d < range + r && Math.abs(angDiff(a, Math.atan2(y - p.y, x - p.x))) < 0.62 + r / Math.max(d, 1) * 0.6; };
  for (const e of enemies) if (!e.dead && inCone(e.x, e.y, e.r)) { if (damageEnemy(e, dmg, p.x, p.y, 320 + 340 * k)) { hits++; if (e.boss) bossHit = true; } }
  for (const b of ebullets) if (b.kind !== 'ring' && inCone(b.x, b.y, b.r)) { b.dead = true; burst(b.x, b.y, 3, ['#fff4dc', PAL.gold], 120); }
  for (const b of blocks) if (b.t >= b.rise && inCone(b.x + b.s / 2, b.y + b.s / 2, b.s / 2)) { b.hp -= k > 0.6 ? 2 : 1; if (b.hp <= 0) for (let i = 0; i < 4; i++) pixelBit(b.x + b.s / 2, b.y + b.s / 2); }
  if (k >= 0.95 && hits && critCd <= 0) { critCd = 3.5; freezeT = 0.3; SFX.crit(); pop(p.x, p.y - 70, bossHit ? 'CRITICAL CHEEKS!' : 'FULL CHEEKS!', PAL.gold, 30, 1.1); }
  else if (k >= 0.95) pop(p.x, p.y - 56, 'FULL CHEEKS!', PAL.gold, 22, 0.8);
}
function tryFullMoon() {
  if (state !== 'play' || paused || cutin || !player || player.moon < 100) return;
  startCutin({ kind: 'moon', who: 'grok', title: 'FULL MOON!', sub: 'GROKBUTT turns its back on ALL of them.', dur: 1.25, col: PAL.gold, after: fullMoon });
}
function fullMoon() {
  const p = player; p.moon = 0; p.inv = 1.2;
  flashT = 1; addShake(22); SFX.boom(); SFX.blast(1); SFX.applause();
  fxRings.push({ x: p.x, y: p.y, R: 10, t: 0 });
  for (const b of ebullets) burst(b.x, b.y, 2, [PAL.gold], 100);
  ebullets = []; hazards = []; tele = [];
  for (const b of blocks) for (let i = 0; i < 2; i++) pixelBit(b.x + b.s / 2, b.y + b.s / 2);
  blocks = [];
  for (const e of enemies.slice()) if (!e.dead) damageEnemy(e, e.boss ? 30 : 99, p.x, p.y, 600, true);
  p.shy = Math.max(0, p.shy - 20);
  pop(p.x, p.y - 70, '-20% SHY', '#8fe3ff', 24, 1.2);
}

// ---------- hooks from input ----------
HOOK.start = src => {
  if (state === 'title') { startGame(); return true; }
  if ((state === 'over' || state === 'win') && stateT > 0.9) { startGame(); return true; }
  if (state === 'over' || state === 'win') return true;
  if (state === 'play' && paused && (src === 'pointer' || src === 'Enter')) { paused = false; return true; }
  return false;
};
HOOK.pauseToggle = force => { if (state !== 'play') return; paused = force === true ? true : !paused; if (player) { player.holding = false; player.charge = 0; } };
HOOK.special = () => tryFullMoon();
HOOK.attackDown = src => {
  if (state !== 'play' || paused || !player) return;
  const p = player;
  if (p.hugged > 0) { p.hugged -= 0.22; puff(p.x, p.y, 2, 'rgba(255,255,255,0.3)'); pop(p.x, p.y - 40, 'WIGGLE!', '#fff4dc', 16, 0.4); return; }
  p.holding = true; p.holdT = 0; p.holdSrc = src;
};
HOOK.attackUp = src => {
  const p = player;
  if (!p || !p.holding) return;
  if (src !== 'all' && p.holdSrc && src !== p.holdSrc) return;
  p.holding = false;
  if (state !== 'play' || paused || cutin) { p.charge = 0; return; }
  if (p.holdT < 0.2) bump(); else blast(p.charge);
  p.charge = 0;
};
HOOK.tapUI = (pt, touch) => {
  if (pt.x > W - 46 && pt.y > H - 46) { unlockAudio(); muted = !muted; return true; }
  if (state === 'play' && pt.x > W - 46 && pt.y > 62 && pt.y < 100) { HOOK.pauseToggle(); return true; }
  if (state === 'play' && !paused && player && player.moon >= 100 && Math.hypot(pt.x - MOONBTN.x, pt.y - MOONBTN.y) < MOONBTN.r + 6) { tryFullMoon(); return true; }
  return false;
};
const MOONBTN = { x: W - 74, y: H - 128, r: 34 };

// ---------- update ----------
function nearestEnemy() { let best = null, bd = 1e9; for (const e of enemies) { if (e.dead || e.z > 60) continue; const d = dist(e, player); if (d < bd) { bd = d; best = e; } } return best; }
function circleRect(o, r, b) { // push circle out of a square block; returns true if overlapping
  const cx = clamp(o.x, b.x, b.x + b.s), cy = clamp(o.y, b.y, b.y + b.s), dx = o.x - cx, dy = o.y - cy, d = Math.hypot(dx, dy);
  if (d >= r) return false;
  if (d > 0.001) { o.x = cx + dx / d * r; o.y = cy + dy / d * r; }
  else { const l = o.x - b.x, rr2 = b.x + b.s - o.x, t = o.y - b.y, bb = b.y + b.s - o.y, m = Math.min(l, rr2, t, bb); if (m === l) o.x = b.x - r; else if (m === rr2) o.x = b.x + b.s + r; else if (m === t) o.y = b.y - r; else o.y = b.y + b.s + r; }
  return true;
}
function update(dt) {
  const p = player; p.t += dt; timeAlive += dt;
  // ---- movement
  let mx = 0, my = 0;
  if (keys.KeyA || keys.ArrowLeft) mx -= 1; if (keys.KeyD || keys.ArrowRight) mx += 1;
  if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1;
  if (input.joy) { const dx = input.joy.x - input.joy.ox, dy = input.joy.y - input.joy.oy, d = Math.hypot(dx, dy); if (d > 6) { const k = Math.min(1, d / 48); mx = dx / d * k; my = dy / d * k; } }
  const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
  const shy01 = p.shy / 100;
  let speed = 225 * (1 - 0.5 * shy01) * (p.holding && p.holdT > 0.2 ? 0.6 : 1);
  if (p.hugged > 0) { p.hugged -= dt; speed = 0; const h = p.hugBy; if (h && !h.dead) { p.x = lerp(p.x, h.x + (p.x > h.x ? 1 : -1) * h.r * 0.7, 0.2); p.y = lerp(p.y, h.y + 4, 0.2); } }
  if (p.dash > 0) { p.dash -= dt; p.x += Math.cos(p.dashA) * 620 * dt; p.y += Math.sin(p.dashA) * 620 * dt; }
  else { p.x += mx * speed * dt; p.y += my * speed * dt; }
  p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.pow(0.002, dt); p.vy *= Math.pow(0.002, dt);
  p.mvx = mx; p.mvy = my;
  p.x = clamp(p.x, B.l + p.r, B.r - p.r); p.y = clamp(p.y, B.t + p.r * 0.5, B.b - p.r * 0.4);
  for (const b of blocks) if (b.t >= b.rise) circleRect(p, p.r, b);
  p.vxs = mx * speed; p.vys = my * speed; p.vx_ = p.vx; // for hazard leading
  player.vx = player.vx; // (knockback velocity stays separate)
  // ---- aim: the butt points at the target (so the face looks away)
  let ta = null;
  if (input.usingTouch) { if (input.fire && input.fire.dragged) ta = Math.atan2(input.fire.y - input.fire.oy, input.fire.x - input.fire.ox); }
  else if (input.mouseSeen) ta = Math.atan2(input.aimY - p.y, input.aimX - p.x);
  if (ta == null) { const n = nearestEnemy(); if (n) ta = Math.atan2(n.y - p.y, n.x - p.x); else if (ml > 0.1) ta = Math.atan2(my, mx); }
  if (ta != null && p.dash <= 0) p.aim += clamp(angDiff(p.aim, ta), -16 * dt, 16 * dt);
  // ---- charge
  if (p.holding) { p.holdT += dt; if (p.holdT > 0.2) { const pk = p.charge; p.charge = Math.min(1, (p.holdT - 0.2) / 0.8); if (Math.floor(pk * 8) !== Math.floor(p.charge * 8)) SFX.charge(p.charge); } }
  p.cd -= dt; p.inv -= dt; p.flash = Math.max(0, p.flash - dt * 4); p.lastHit += dt; critCd -= dt;
  // bump hits
  if (p.dash > 0) {
    const bx = p.x + Math.cos(p.dashA) * (p.r + 6), by = p.y + Math.sin(p.dashA) * (p.r + 6);
    for (const e of enemies) if (!e.dead && !p.hitSet.has(e) && Math.hypot(e.x - bx, e.y - by) < e.r + 22) { p.hitSet.add(e); if (damageEnemy(e, 2 * shyPower(), p.x, p.y, 300)) { SFX.hit(); hitstop = Math.max(hitstop, 0.035); addShake(4); burst(bx, by, 5, ['#fff', PAL.gold], 180); } }
    for (const b of ebullets) if (b.kind !== 'ring' && Math.hypot(b.x - bx, b.y - by) < b.r + 20) { b.dead = true; pop(b.x, b.y - 10, 'BLOCKED', '#fff4dc', 14, 0.5); }
    for (const b of blocks) if (b.t >= b.rise && !p.hitSet.has(b) && Math.abs(bx - (b.x + b.s / 2)) < b.s / 2 + 14 && Math.abs(by - (b.y + b.s / 2)) < b.s / 2 + 14) { p.hitSet.add(b); b.hp--; SFX.pixel(); if (b.hp <= 0) for (let i = 0; i < 4; i++) pixelBit(b.x + b.s / 2, b.y + b.s / 2); }
  }
  // ---- spawns
  for (const s of spawns) { s.t += dt; if (s.t > 0.7 && !s.done) { s.done = true; spawnEnemy(s.type, s.x, s.y); puff(s.x, s.y, 6, 'rgba(255,220,150,0.35)'); } }
  prune(spawns, s => !s.done);
  // ---- enemies
  updateDotz(dt);
  let staring = 0; const face = p.aim + Math.PI;
  for (const e of enemies) {
    if (e.dead) continue;
    e.t += dt; e.flash = Math.max(0, e.flash - dt * 5);
    AI[e.type](e, dt);
    e.x += e.kx * dt; e.y += e.ky * dt; e.kx *= Math.pow(0.004, dt); e.ky *= Math.pow(0.004, dt);
    if (!(e.type === 'bigdot' && e.dashing)) { e.x = clamp(e.x, B.l + e.r * 0.6, B.r - e.r * 0.6); e.y = clamp(e.y, B.t + 4, B.b - 2); }
    if (!e.boss) for (const b of blocks) if (b.t >= b.rise) circleRect(e, e.r, b);
    const d = dist(e, p);
    if (!e.airborne && e.z < 30 && d < e.r + p.r * 0.85) { if (e.grabby) hugPlayer(e, e.boss ? 18 : 11); else hurtPlayer(e.contact, e.x, e.y, null); }
    e.staring = false;
    if (!e.airborne && e.z < 30 && d < 185 && Math.abs(angDiff(face, Math.atan2(e.y - p.y, e.x - p.x))) < 0.55) { e.staring = true; staring++; }
  }
  // minion separation
  for (let i = 0; i < enemies.length; i++) { const a = enemies[i]; if (a.boss || a.dead) continue; for (let j = i + 1; j < enemies.length; j++) { const b = enemies[j]; if (b.boss || b.dead) continue; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = (a.r + b.r) * 0.9; if (d > 0.01 && d < m) { const k = (m - d) / d * 0.5; a.x -= dx * k; a.y -= dy * k; b.x += dx * k; b.y += dy * k; } } }
  prune(enemies, notDead);
  // eye contact: being looked at in the face makes GrokButt shy
  p.stare = staring;
  if (staring && p.shy < 95 && !god) { p.shy = Math.min(95, p.shy + Math.min(6, 2.5 * staring) * dt); if (firstStare) { firstStare = false; sysWin('SYSTEM', ['Someone is looking at your FACE.', 'Point your butt at them!'], PAL.teal); } if (Math.random() < dt * 3) SFX.stare(); }
  else if (p.lastHit > 2 && !staring) p.shy = Math.max(0, p.shy - 5 * dt);
  // ---- enemy bullets
  for (const b of ebullets) {
    b.t += dt;
    if (b.kind === 'ring') { b.R += b.sp * dt; if (!b.hitDone && Math.abs(dist(b, p) - b.R) < 13) { b.hitDone = true; hurtPlayer(b.dmg, b.x, b.y, 'SHOCKWAVE!'); } if (b.R > b.maxR) b.dead = true; continue; }
    b.x += b.vx * dt; b.y += b.vy * dt; b.rot += dt * 6;
    if (b.t > b.life || b.x < B.l - 30 || b.x > B.r + 30 || b.y < B.t - 40 || b.y > B.b + 20) b.dead = true;
    if (!b.dead && Math.hypot(b.x - p.x, b.y - p.y) < b.r + p.r * 0.8) { b.dead = true; hurtPlayer(b.dmg, b.x - b.vx, b.y - b.vy, b.kind === 'card' ? 'FREE HUG TRIAL* accepted' : b.kind === 'code' ? 'Hit by ' + (b.text || 'code') : null); }
    if (!b.dead && b.kind === 'code') for (const k of blocks) if (k.t >= k.rise && b.x > k.x && b.x < k.x + k.s && b.y > k.y && b.y < k.y + k.s) { b.dead = true; break; }
  }
  prune(ebullets, notDead);
  // ---- hazards
  for (const h of hazards) {
    h.t += dt;
    if (h.kind === 'form' && h.t >= h.tel && !h.slammed) {
      h.slammed = true; SFX.slam(); addShake(8); burst(h.x, h.y, 10, ['#fff4dc', '#e7a35c'], 200);
      if (Math.abs(p.x - h.x) < h.w / 2 + p.r * 0.5 && Math.abs(p.y - h.y) < h.h / 2 + p.r * 0.5) hurtPlayer(h.dmg, h.x, h.y - 40, 'PAYMENT FORM to the face');
    }
  }
  prune(hazards, h => h.t < h.tel + 0.8);
  for (const t of tele) t.t += dt;
  prune(tele, t => t.t < t.life);
  for (const b of blocks) { const was = b.t >= b.rise; b.t += dt; if (!was && b.t >= b.rise) { if (circleRect(p, p.r, b)) hurtPlayer(6, b.x + b.s / 2, b.y + b.s / 2, 'PIXEL WALL'); } }
  prune(blocks, b => b.t < b.life && b.hp > 0);
  // ---- loot (applause tickets)
  for (const l of loot) { l.t += dt; if (Math.hypot(l.x - p.x, l.y - p.y) < 32) { l.got = true; p.shy = Math.max(0, p.shy - 10); SFX.applause(); pop(l.x, l.y - 30, 'APPLAUSE! -10% SHY', PAL.teal, 18, 1); confetti(l.x, l.y, 10); } }
  prune(loot, l => !l.got && l.t < l.life);
  comboT -= dt; if (comboT <= 0) combo = 0;
  updateWave(dt);
  updateFx(dt);
}
function updateFx(dt) {
  shake = Math.max(0, shake - dt * 40); flashT = Math.max(0, flashT - dt * 2.5);
  for (const q of parts) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.g) q.vy += q.g * dt; else { q.vx *= Math.pow(0.05, dt); q.vy *= Math.pow(0.05, dt); } if (q.vr) q.rot += q.vr * dt; if (q.floor && q.y > q.floor) { q.y = q.floor; q.vy *= -0.3; q.vx *= 0.6; } }
  prune(parts, q => q.t < q.life);
  for (const q of pops) q.t += dt; prune(pops, q => q.t < q.life);
  for (const w of wins) w.t += dt; prune(wins, w => w.t < w.life);
  for (const b of blasts) b.t += dt; prune(blasts, b => b.t < 0.35);
  for (const r of fxRings) { r.t += dt; r.R += 1300 * dt; } prune(fxRings, r => r.t < 0.8);
  if (banner) { banner.t += dt; if (banner.t > banner.life) banner = null; }
  if (player) { spot.x = lerp(spot.x, player.x, Math.min(1, dt * 4)); spot.y = lerp(spot.y, player.y, Math.min(1, dt * 4)); }
}

// ---------- loop ----------
let last = performance.now(), timeScale = 1;
function frame(now) {
  const dt = Math.min(0.033, Math.max(0, (now - last) / 1000)); last = now;
  stateT += dt;
  if (state === 'play' && !paused) {
    if (cutin) { cutin.t += dt; if (cutin.t >= cutin.dur) { const f = cutin.after; cutin = null; if (f) f(); } }
    else if (freezeT > 0) freezeT -= dt;
    else if (hitstop > 0) hitstop -= dt;
    else for (let i = 0; i < timeScale && state === 'play' && !cutin; i++) update(dt);
  } else if (state !== 'play') { updateFx(dt); if (state === 'win' && Math.random() < dt * 5) confetti(rnd(100, 540), 200, 4); }
  if (state === 'title' || state === 'card') titleT += dt;
  render();
  musicTick();
  requestAnimationFrame(frame);
}
let titleT = 0;
