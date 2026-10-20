/* powerups.js: Grok Bot feature power-ups for the butt (timed, one at a time) */
'use strict';
const PU_DEF = {
  deepsearch: { name: 'DEEPSEARCH', col: '#3b82f6', col2: '#93c5fd', line: 'Butt attacks fire homing seekers.' },
  think:      { name: 'THINK MODE', col: '#8b5cf6', col2: '#c4b5fd', line: 'Slow-mo + 2x charge + 1.5x blast.' },
  imagine:    { name: 'IMAGINE',    col: '#f97316', col2: '#fdba74', line: '2 imagined GROKBUTTs copy you.' },
  voice:      { name: 'VOICE MODE', col: '#14b8a6', col2: '#5eead4', line: 'Every attack = sonic TOOT ring.' },
  fun:        { name: 'FUN MODE',   col: '#eab308', col2: '#fde047', line: 'HOLD = rapid-fire bouncy stars.' },
};
const PU_IDS = Object.keys(PU_DEF);
const PU_TIME = 9;
const PU = { active: null, t: 0, timer: 8, pickups: [], shots: [], last: null, fireT: 0, clones: [] };
function puReset() { PU.active = null; PU.t = 0; PU.timer = 8; PU.pickups = []; PU.shots = []; PU.fireT = 0; PU.clones = []; }
const puOn = id => PU.active === id && PU.t > 0;
function puWorldScale() { return puOn('think') ? 0.5 : 1; }
function puDrop(x, y, id) {
  if (PU.pickups.length >= 1) return false;
  id = id || pick(PU_IDS.filter(k => k !== PU.last && k !== PU.active));
  PU.pickups.push({ id, x: clamp(x, B.l + 30, B.r - 30), y: clamp(y, B.t + 30, B.b - 20), t: 0, life: 12, z: 120 });
  return true;
}
function puGive(id) {
  const d = PU_DEF[id];
  puUses++; PU.active = id; PU.t = PU_TIME; PU.last = id; PU.fireT = 0;
  sysWin('GROK', [d.name + ' ENABLED', d.line], d.col);
  pop(player.x, player.y - 60, d.name + '!', d.col2, 24, 1.1);
  SFX.pickup(); tone(880, 0.12, 'triangle', 0.08, 1760, 0.12);
  if (id === 'imagine') PU.clones = [0, 1].map(i => ({ i, x: player.x, y: player.y }));
}
function puUpdate(dt) {
  const p = player;
  // periodic spawn while fighting (no pickup on the floor, nothing active)
  if (phase === 'fight' && !PU.pickups.length && !PU.active) { PU.timer -= dt; if (PU.timer <= 0) { PU.timer = WAVES[waveIdx].boss ? 15 : 20; let x, y, n = 0; do { x = rnd(B.l + 60, B.r - 60); y = rnd(B.t + 50, B.b - 40); } while (Math.hypot(x - p.x, y - p.y) < 130 && ++n < 10); puDrop(x, y); } }
  for (const k of PU.pickups) {
    k.t += dt; k.z = Math.max(0, k.z - 300 * dt);
    if (k.z === 0 && Math.hypot(k.x - p.x, k.y - p.y) < 34) { k.got = true; puGive(k.id); confetti(k.x, k.y, 10); }
  }
  prune(PU.pickups, k => !k.got && k.t < k.life);
  if (PU.active) { PU.t -= dt; if (PU.t <= 0) { sysWin('GROK', [PU_DEF[PU.active].name + ' OFF'], '#6b7280'); PU.active = null; PU.clones = []; } }
  // imagined clones orbit GROKBUTT
  for (const c of PU.clones) { const a = p.t * 2.4 + c.i * Math.PI; c.x = lerp(c.x, p.x + Math.cos(a) * 54, Math.min(1, dt * 10)); c.y = lerp(c.y, p.y + Math.sin(a) * 40, Math.min(1, dt * 10)); }
  // FUN MODE: holding = rapid fire
  if (puOn('fun') && p.holding && p.hugged <= 0) { PU.fireT -= dt; if (PU.fireT <= 0) { PU.fireT = 0.13; const s = (Math.floor(p.t * 20) % 2 ? 1 : -1) * 0.12; puShot('fun', p.x + Math.cos(p.aim) * p.r, p.y + Math.sin(p.aim) * p.r, p.aim + s); SFX.pit(); } }
  // player projectiles
  const wdt = dt;
  for (const b of PU.shots) {
    b.t += wdt;
    if (b.kind === 'seek') {
      let best = null, bd = 1e9; for (const e of enemies) { if (e.dead || e.z > 40) continue; const d = Math.hypot(e.x - b.x, e.y - b.y); if (d < bd) { bd = d; best = e; } }
      if (best && b.t > 0.12) { const want = Math.atan2(best.y - b.y, best.x - b.x), cur = Math.atan2(b.vy, b.vx), na = cur + clamp(angDiff(cur, want), -8 * wdt, 8 * wdt); b.vx = Math.cos(na) * 400; b.vy = Math.sin(na) * 400; }
    }
    b.x += b.vx * wdt; b.y += b.vy * wdt; b.rot += wdt * 12;
    if (b.kind === 'fun') {
      if (b.x < B.l || b.x > B.r) { b.vx *= -1; b.x = clamp(b.x, B.l, B.r); b.bounces--; }
      if (b.y < B.t || b.y > B.b) { b.vy *= -1; b.y = clamp(b.y, B.t, B.b); b.bounces--; }
      if (b.bounces < 0) b.dead = true;
    } else if (b.x < B.l - 40 || b.x > B.r + 40 || b.y < B.t - 60 || b.y > B.b + 30) b.dead = true;
    if (b.t > b.life) b.dead = true;
    if (b.dead) continue;
    for (const e of enemies) {
      if (e.dead || e.airborne || e.z > 40 || (b.hit && b.hit.has(e))) continue;
      if (Math.hypot(e.x - b.x, e.y - b.y) < e.r + b.r) {
        damageEnemy(e, b.dmg, b.x - b.vx * 0.05, b.y - b.vy * 0.05, b.kind === 'fun' ? 120 : 160, false, 0.5);
        if (b.kind === 'seek') { b.dead = true; burst(b.x, b.y, 6, [PU_DEF.deepsearch.col2, '#fff'], 180, 'neon'); SFX.zap(); }
        else { b.hit = b.hit || new Set(); b.hit.add(e); b.bounces--; const a = Math.atan2(b.y - e.y, b.x - e.x); b.vx = Math.cos(a) * 430; b.vy = Math.sin(a) * 430; SFX.pop(); if (b.bounces < 0) b.dead = true; }
        break;
      }
    }
  }
  prune(PU.shots, b => !b.dead);
}
function puShot(kind, x, y, a) {
  if (PU.shots.length > 60) return;
  const pw = shyPower();
  if (kind === 'seek') PU.shots.push({ kind, x, y, vx: Math.cos(a) * 400, vy: Math.sin(a) * 400, r: 8, t: 0, life: 2.4, dmg: 1.8 * pw, rot: 0 });
  else PU.shots.push({ kind, x, y, vx: Math.cos(a) * 430, vy: Math.sin(a) * 430, r: 9, t: 0, life: 2.2, dmg: 1.2 * pw, rot: rnd(0, TAU), bounces: 3, col: pick(['#fde047', '#b6ff3b', '#3bf0ff', '#ffa51c']) });
}
function puToot(x, y, R, dmg) { // VOICE MODE sonic ring: hits everything around, wipes bullets
  fxRings.push({ x, y, R: 10, t: 0, col: PU_DEF.voice.col2, speed: R * 3.2, maxT: 0.32 });
  fxRings.push({ x, y, R: 2, t: 0, col: PU_DEF.voice.col, speed: R * 2.6, maxT: 0.38 });
  for (const e of enemies) if (!e.dead && Math.hypot(e.x - x, e.y - y) < R + e.r) damageEnemy(e, dmg, x, y, 420, false, 0.5);
  for (const b of ebullets) if (b.kind !== 'ring' && Math.hypot(b.x - x, b.y - y) < R) { b.dead = true; burst(b.x, b.y, 2, [PU_DEF.voice.col2], 100); }
  SFX.toot(); pop(x, y - 50, 'TOOT!', PU_DEF.voice.col2, 22, 0.6);
}
SFX.toot = () => { tone(330, 0.09, 'square', 0.09); tone(250, 0.2, 'square', 0.09, 200, 0.09); fart(0.22, 110, 0.14); };
SFX.pit = () => { tone(rnd(700, 950), 0.04, 'square', 0.04, 300); };
// called by bump()/blast() after the normal attack
function puOnAttack(kind, k) {
  const p = player, pw = shyPower();
  if (puOn('deepsearch')) { const n = kind === 'bump' ? 2 : 3 + Math.round(k * 3); for (let i = 0; i < n; i++) puShot('seek', p.x + Math.cos(p.aim) * p.r, p.y + Math.sin(p.aim) * p.r, p.aim + (i - (n - 1) / 2) * 0.35); SFX.zap(); }
  if (puOn('voice')) puToot(p.x, p.y, kind === 'bump' ? 120 : 140 + 70 * k, (kind === 'bump' ? 1.5 : 2 + 3 * k) * pw);
  if (puOn('imagine')) for (const c of PU.clones) {
    if (kind === 'bump') { const bx = c.x + Math.cos(p.aim) * 26, by = c.y + Math.sin(p.aim) * 26; puff(bx, by, 3, 'rgba(253,186,116,0.5)'); for (const e of enemies) if (!e.dead && Math.hypot(e.x - bx, e.y - by) < e.r + 30) damageEnemy(e, 1.4 * pw, c.x, c.y, 260, false, 0.5); }
    else blastAt(c.x, c.y, p.aim, k, 0.6, false);
  }
}
