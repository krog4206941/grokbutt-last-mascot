/* render.js: the MASCOT AUDITION stage, entities, HUD, cut-ins and screens */
'use strict';
// ---------- pre-rendered stage (matte floor, velvet curtains, LED board) ----------
const BGS = 2;
let bgCanvas = null, fgCanvas = null;
function buildStage() {
  const k = makeCanvas(W * BGS, H * BGS), c = k.getContext('2d'); c.scale(BGS, BGS);
  const rand = seeded(42);
  c.fillStyle = '#140a17'; c.fillRect(0, 0, W, H);
  // back wall
  let g = c.createLinearGradient(0, 0, 0, 180); g.addColorStop(0, '#2b0e2c'); g.addColorStop(1, '#1b0a1d');
  c.fillStyle = g; c.fillRect(0, 0, W, 180);
  // floor: matte stage boards in perspective (no reflections)
  const FT = 168, FB = 600;
  g = c.createLinearGradient(0, FT, 0, FB); g.addColorStop(0, '#2c1826'); g.addColorStop(0.5, '#43263a'); g.addColorStop(1, '#55313f');
  c.fillStyle = g; c.fillRect(0, FT, W, FB - FT);
  let y = FT, row = 0;
  while (y < FB) {
    const h = 14 + (y - FT) * 0.07;
    c.fillStyle = row % 2 ? 'rgba(255,220,200,0.025)' : 'rgba(0,0,0,0.05)'; c.fillRect(0, y, W, h);
    c.fillStyle = 'rgba(0,0,0,0.28)'; c.fillRect(0, y, W, 1.2);
    // staggered seams, converge slightly toward the back
    const off = (row * 97) % 160;
    for (let x = -off; x < W + 160; x += 160) { const px = W / 2 + (x - W / 2) * (0.85 + 0.15 * (y - FT) / (FB - FT)); c.fillRect(px, y, 1.2, h); }
    y += h; row++;
  }
  for (let i = 0; i < 2600; i++) { c.fillStyle = rand() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,230,210,0.03)'; c.fillRect(rand() * W, FT + rand() * (FB - FT), rand() * 6 + 1, 1); }
  // painted light pools (soft, diffuse = matte)
  const pool = (x, y, rx, ry, col, a) => { c.save(); c.translate(x, y); c.scale(1, ry / rx); const gg = c.createRadialGradient(0, 0, 0, 0, 0, rx); gg.addColorStop(0, col.replace('A', a)); gg.addColorStop(1, col.replace('A', 0)); c.fillStyle = gg; c.globalCompositeOperation = 'lighter'; c.beginPath(); c.arc(0, 0, rx, 0, TAU); c.fill(); c.restore(); };
  pool(320, 400, 300, 170, 'rgba(255,180,80,A)', 0.2);
  pool(40, 380, 200, 230, 'rgba(47,224,208,A)', 0.14);
  pool(600, 380, 200, 230, 'rgba(47,224,208,A)', 0.14);
  pool(320, 185, 360, 60, 'rgba(196,35,122,A)', 0.22);
  // curtains
  const curtain = (x0, x1, flip) => {
    const n = 7, w = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * w;
      const cg = c.createLinearGradient(x, 0, x + w, 0);
      cg.addColorStop(0, '#3d0723'); cg.addColorStop(0.35, '#c4237a'); cg.addColorStop(0.55, '#e0479a'); cg.addColorStop(0.8, '#7a0f45'); cg.addColorStop(1, '#3d0723');
      c.fillStyle = cg;
      const bot = 176 + Math.sin((i + (flip ? 3 : 0)) * 1.3) * 5;
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x + w + 0.5, 0); c.lineTo(x + w + 0.5, bot - 4); c.quadraticCurveTo(x + w / 2, bot + 8, x, bot - 4); c.fill();
    }
    // teal rim light on the inner edge
    const ex = flip ? x0 : x1, rg = c.createLinearGradient(ex - (flip ? -18 : 18), 0, ex, 0);
    rg.addColorStop(0, 'rgba(47,224,208,0)'); rg.addColorStop(1, 'rgba(47,224,208,0.35)');
    c.fillStyle = rg; c.fillRect(Math.min(ex, ex - (flip ? -18 : 18)), 0, 18, 180);
    const sh = c.createLinearGradient(0, 120, 0, 180); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.4)');
    c.fillStyle = sh; c.fillRect(x0, 120, x1 - x0, 62);
  };
  curtain(0, 150, false); curtain(490, 640, true);
  // LED board
  const bx = 190, by = 58, bw = 260, bh = 84;
  c.save(); c.shadowColor = 'rgba(255,201,74,0.6)'; c.shadowBlur = 24; c.fillStyle = '#0f0712'; rr(c, bx, by, bw, bh, 10); c.fill(); c.restore();
  c.strokeStyle = '#b8862b'; c.lineWidth = 3; rr(c, bx, by, bw, bh, 10); c.stroke();
  for (let i = 0; i < 26; i++) { const t = i / 26; const px = bx + 8 + t * (bw - 16); c.fillStyle = i % 2 ? '#ffd36b' : '#ff9f43'; c.beginPath(); c.arc(px, by + 6, 2, 0, TAU); c.arc(px, by + bh - 6, 2, 0, TAU); c.fill(); }
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.save(); c.shadowColor = '#ffc94a'; c.shadowBlur = 14; c.fillStyle = '#ffe08a'; c.font = `900 26px ${FONT}`; c.fillText('OFFICIAL MASCOT', 320, by + 36); c.restore();
  c.save(); c.shadowColor = '#2fe0d0'; c.shadowBlur = 10; c.fillStyle = '#9ffcf2'; c.font = `bold 12px ${FONT}`; c.fillText('★ FINAL AUDITION · NOW CASTING ★', 320, by + 62); c.restore();
  // valance with gold fringe
  for (let i = 0; i < 16; i++) {
    const x = i * 40, vg = c.createLinearGradient(0, 0, 0, 38); vg.addColorStop(0, '#5e0f3c'); vg.addColorStop(1, '#a51c66');
    c.fillStyle = vg; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 40, 0); c.lineTo(x + 40, 26); c.quadraticCurveTo(x + 20, 44, x, 26); c.fill();
    c.strokeStyle = '#e0a93a'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x + 40, 27); c.quadraticCurveTo(x + 20, 45, x, 27); c.stroke();
  }
  // stage lip
  g = c.createLinearGradient(0, 596, 0, 610); g.addColorStop(0, '#f0c25a'); g.addColorStop(0.4, '#9a6a1e'); g.addColorStop(1, '#2a1608');
  c.fillStyle = g; c.fillRect(0, 597, W, 12);
  c.fillStyle = '#07040a'; c.fillRect(0, 609, W, 31);
  // vignette
  const vg = c.createRadialGradient(320, 380, 220, 320, 360, 520); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  c.fillStyle = vg; c.fillRect(0, 0, W, H);
  bgCanvas = k;
  // foreground: audience heads with teal rim light
  const f = makeCanvas(W * BGS, 60 * BGS), fc = f.getContext('2d'); fc.scale(BGS, BGS);
  for (let i = 0; i < 24; i++) {
    const x = i * 28 + rand() * 10 - 6, r = 15 + rand() * 6, yy = 36 + rand() * 10;
    fc.fillStyle = '#05030a'; fc.beginPath(); fc.ellipse(x, yy + r * 1.6, r * 1.35, r * 1.1, 0, 0, TAU); fc.fill();
    fc.beginPath(); fc.arc(x, yy, r * 0.82, 0, TAU); fc.fill();
    fc.strokeStyle = 'rgba(47,224,208,0.45)'; fc.lineWidth = 1.6; fc.beginPath(); fc.arc(x, yy, r * 0.82, Math.PI * 1.1, Math.PI * 1.75); fc.stroke();
  }
  fgCanvas = f;
}
// ---------- dynamic light ----------
function drawBeams(c, t, follow) {
  c.save(); c.globalCompositeOperation = 'lighter';
  const beam = (sx, tx, ty, w, col, a) => {
    const g = c.createLinearGradient(sx, 0, tx, ty); g.addColorStop(0, col.replace('A', a)); g.addColorStop(1, col.replace('A', a * 0.25));
    c.fillStyle = g; c.beginPath(); c.moveTo(sx - 6, 0); c.lineTo(sx + 6, 0); c.lineTo(tx + w, ty); c.lineTo(tx - w, ty); c.closePath(); c.fill();
    c.save(); c.translate(tx, ty); c.scale(1, 0.42); const pg = c.createRadialGradient(0, 0, 0, 0, 0, w * 1.3); pg.addColorStop(0, col.replace('A', a * 2.2)); pg.addColorStop(1, col.replace('A', 0)); c.fillStyle = pg; c.beginPath(); c.arc(0, 0, w * 1.3, 0, TAU); c.fill(); c.restore();
  };
  beam(120, 260 + Math.sin(t * 0.5) * 170, 420 + Math.cos(t * 0.4) * 60, 70, 'rgba(255,190,90,A)', 0.07);
  beam(520, 380 - Math.sin(t * 0.45 + 1) * 170, 420 + Math.sin(t * 0.37) * 60, 70, 'rgba(47,224,208,A)', 0.06);
  if (follow) beam(320, follow.x, follow.y + 8, 58, 'rgba(255,214,140,A)', 0.09);
  c.restore();
}
function lighten(c, col, a) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = a; c.fillStyle = col; c.fillRect(0, 0, W, H); c.restore(); }

// ---------- world ----------
function drawTele(c) {
  for (const t of tele) {
    const k = t.t / t.life, blink = 0.5 + 0.5 * Math.sin(t.t * 30);
    c.save();
    if (t.kind === 'lane') { c.fillStyle = `rgba(255,64,88,${0.12 + 0.12 * blink})`; c.fillRect(B.l, t.y - t.h / 2, B.r - B.l, t.h); c.strokeStyle = 'rgba(255,64,88,0.8)'; c.setLineDash([12, 8]); c.lineWidth = 2; c.strokeRect(B.l, t.y - t.h / 2, B.r - B.l, t.h); }
    else if (t.kind === 'circle') { c.strokeStyle = t.col; c.globalAlpha = 0.5 + 0.4 * blink; c.lineWidth = 3; c.beginPath(); c.ellipse(t.x, t.y, t.R, t.R * 0.5, 0, 0, TAU); c.stroke(); c.fillStyle = t.col; c.globalAlpha = 0.15 * k + 0.05; c.beginPath(); c.ellipse(t.x, t.y, t.R * k, t.R * 0.5 * k, 0, 0, TAU); c.fill(); }
    else if (t.kind === 'dash') { c.translate(t.x, t.y); c.rotate(t.a); c.fillStyle = `rgba(255,64,88,${0.1 + 0.14 * blink})`; c.fillRect(0, -t.w / 2, t.len, t.w); c.strokeStyle = 'rgba(255,107,138,0.85)'; c.setLineDash([14, 10]); c.lineWidth = 2; c.strokeRect(0, -t.w / 2, t.len, t.w); }
    c.restore();
  }
  for (const s of spawns) { // entrance sparkle where a rival is about to appear
    const k = s.t / 0.7; c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.6 * (1 - k * 0.5);
    const g = c.createRadialGradient(s.x, s.y, 0, s.x, s.y, 34); g.addColorStop(0, 'rgba(255,220,150,0.8)'); g.addColorStop(1, 'rgba(255,220,150,0)'); c.fillStyle = g; c.beginPath(); c.arc(s.x, s.y, 34, 0, TAU); c.fill(); c.restore();
  }
}
function drawForm(c, h) { // the "PAYMENT REQUIRED FOR HUG" window falling onto the stage
  const k = clamp(h.t / h.tel, 0, 1);
  c.save();
  if (!h.slammed) {
    c.fillStyle = `rgba(255,64,88,${0.12 + 0.2 * k})`; rr(c, h.x - h.w / 2, h.y - h.h / 2, h.w, h.h, 6); c.fill();
    c.strokeStyle = 'rgba(255,107,138,0.9)'; c.setLineDash([8, 6]); c.lineWidth = 2; c.stroke(); c.setLineDash([]);
    const yOff = -(1 - k) * 360; c.globalAlpha = 0.25 + 0.75 * k; formWindow(c, h.x, h.y - 6 + yOff, h.w, h.h);
  } else { c.globalAlpha = clamp(1 - (h.t - h.tel) / 0.8, 0, 1); formWindow(c, h.x, h.y - 6, h.w, h.h); }
  c.restore();
}
function formWindow(c, x, y, w, h) {
  c.fillStyle = '#fff4dc'; rr(c, x - w / 2, y - h / 2, w, h, 6); c.fill();
  c.fillStyle = '#e7a35c'; rr(c, x - w / 2, y - h / 2, w, 16, 6); c.fill(); c.fillRect(x - w / 2, y - h / 2 + 8, w, 8);
  c.fillStyle = '#3a2416'; c.font = `bold 8px ${FONT}`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('JOLLYBOB+ CHECKOUT', x - w / 2 + 6, y - h / 2 + 8);
  c.textAlign = 'center'; c.font = `bold 10px ${FONT}`; c.fillStyle = '#c0392b'; c.fillText('PAYMENT REQUIRED', x, y - h / 2 + 28); c.fillText('FOR HUG', x, y - h / 2 + 40);
  c.fillStyle = '#d8c3a0'; c.fillRect(x - w / 2 + 10, y - h / 2 + 50, w - 20, 9); c.fillStyle = '#3a2416'; c.font = `bold 7px ${MONO}`; c.fillText('CARD NO. •••• ••••', x, y - h / 2 + 55);
  c.fillStyle = '#e7a35c'; rr(c, x - 26, y + h / 2 - 16, 52, 11, 3); c.fill(); c.fillStyle = '#fff'; c.font = `bold 7px ${FONT}`; c.fillText('PAY $49.99', x, y + h / 2 - 10.5);
}
function drawBlock(c, b) {
  const k = clamp(b.t / b.rise, 0, 1), fade = clamp((b.life - b.t) / 0.4, 0, 1);
  c.save(); c.globalAlpha = fade;
  if (k < 1) { c.strokeStyle = `rgba(218,119,88,${0.4 + 0.5 * Math.sin(b.t * 30) ** 2})`; c.lineWidth = 2; c.strokeRect(b.x + 2, b.y + 2, b.s - 4, b.s - 4); }
  const hgt = 18 * k, d = 6;
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(b.x + 3, b.y + 4, b.s, b.s - 2);
  if (k > 0) {
    c.fillStyle = '#a9553c'; c.fillRect(b.x, b.y + b.s - hgt, b.s, hgt); // front face
    c.fillStyle = b.hp < 2 ? '#c5694f' : PAL.terra; c.fillRect(b.x, b.y - hgt, b.s, b.s); // top face (seen from above)
    c.fillStyle = '#ee9a7e'; c.fillRect(b.x, b.y - hgt, b.s, 3);
    c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(b.x + b.s - 3, b.y - hgt, 3, b.s);
    if (b.hp < 2) { c.strokeStyle = 'rgba(40,10,0,0.5)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(b.x + 6, b.y - hgt + 6); c.lineTo(b.x + 18, b.y - hgt + 16); c.lineTo(b.x + 12, b.y - hgt + 26); c.stroke(); }
  }
  void d; c.restore();
}
function drawBullet(c, b) {
  c.save();
  if (b.kind === 'ring') {
    const a = clamp(1 - b.R / b.maxR, 0, 1);
    c.strokeStyle = b.col; c.globalAlpha = 0.85 * a + 0.15; c.lineWidth = 7; c.beginPath(); c.ellipse(b.x, b.y, b.R, b.R * 0.5, 0, 0, TAU); c.stroke();
    c.strokeStyle = '#fff'; c.globalAlpha = 0.5 * a; c.lineWidth = 2; c.beginPath(); c.ellipse(b.x, b.y, b.R, b.R * 0.5, 0, 0, TAU); c.stroke();
  } else if (b.kind === 'card') {
    c.translate(b.x, b.y - 16); c.rotate(Math.sin(b.rot) * 0.5);
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(-15, 14, 30, 6);
    c.fillStyle = '#fff1d6'; rr(c, -17, -10, 34, 20, 3); c.fill(); c.strokeStyle = '#e7a35c'; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = '#c0392b'; c.font = `bold 6.5px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('FREE HUG', 0, -3); c.fillText('TRIAL*', 0, 5);
  } else if (b.kind === 'code') {
    c.translate(b.x, b.y - 16); c.font = `bold 12px ${MONO}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    const w = c.measureText(b.text).width + 10;
    c.fillStyle = 'rgba(12,6,10,0.85)'; rr(c, -w / 2, -9, w, 18, 4); c.fill(); c.strokeStyle = PAL.terra; c.lineWidth = 1.2; c.stroke();
    c.fillStyle = '#ffb08f'; c.fillText(b.text, 0, 0.5);
  } else if (b.kind === 'spark') {
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(b.x, b.y - 16, 0, b.x, b.y - 16, 14); g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, b.col); g.addColorStop(1, b.col + '00');
    c.fillStyle = g; c.beginPath(); c.arc(b.x, b.y - 16, 14, 0, TAU); c.fill();
  }
  c.restore();
}
function drawLoot(c, l) {
  const y = l.y - 14 - Math.abs(Math.sin(l.t * 4)) * 8, blink = l.life - l.t < 2 && Math.floor(l.t * 8) % 2;
  if (blink) return;
  c.save(); c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(l.x, l.y, 16, 5, 0, 0, TAU); c.fill();
  c.translate(l.x, y); c.rotate(Math.sin(l.t * 3) * 0.15);
  c.shadowColor = PAL.gold; c.shadowBlur = 12; c.fillStyle = PAL.gold; rr(c, -22, -11, 44, 22, 4); c.fill(); c.shadowBlur = 0;
  c.fillStyle = '#5e3a08'; c.font = `bold 8px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('APPLAUSE', 0, -2); c.font = `bold 6px ${FONT}`; c.fillText('-10% SHY', 0, 6);
  c.restore();
}
function drawBlastFx(c, b) {
  const k = b.t / 0.35, R = b.range * (0.35 + 0.65 * Math.min(1, k * 2.2));
  c.save(); c.globalAlpha = (1 - k) * (0.55 + 0.35 * b.k); c.globalCompositeOperation = 'lighter';
  c.translate(b.x, b.y); c.scale(1, 0.75);
  const g = c.createRadialGradient(0, 0, 10, 0, 0, R); g.addColorStop(0, 'rgba(255,240,200,0.9)'); g.addColorStop(0.6, 'rgba(255,190,90,0.55)'); g.addColorStop(1, 'rgba(255,150,60,0)');
  c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, R, b.a - 0.62, b.a + 0.62); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 3 + 4 * b.k; c.beginPath(); c.arc(0, 0, R, b.a - 0.55, b.a + 0.55); c.stroke();
  for (let i = 0; i < 5; i++) { const a = b.a + (i - 2) * 0.22, r = R * (0.5 + 0.1 * i); c.fillStyle = 'rgba(255,230,170,0.35)'; c.beginPath(); c.arc(Math.cos(a) * r, Math.sin(a) * r, 8 + 10 * b.k, 0, TAU); c.fill(); }
  c.restore();
}
function drawEnemyShadowInfo(c, e) { // eyes icon over rivals who can see GrokButt's face
  if (!e.staring) return;
  const y = e.y - (e.boss ? (e.type === 'jolly' ? 175 : e.type === 'claw' ? 120 : 90) : e.r * 2 + 34) - e.z;
  c.save(); c.translate(e.x, y); const s = 1 + 0.1 * Math.sin(e.t * 12);
  c.scale(s, s); c.fillStyle = 'rgba(10,8,14,0.75)'; rr(c, -17, -9, 34, 18, 8); c.fill();
  for (const sx of [-7, 7]) { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(sx, 0, 5.5, 6.5, 0, 0, TAU); c.fill(); c.fillStyle = '#111'; c.beginPath(); c.arc(sx + Math.cos(e.t * 2) * 1.5, 1, 2.6, 0, TAU); c.fill(); }
  c.restore();
}
function drawPlayer(c) {
  const p = player;
  if (p.inv > 0 && p.dash <= 0 && Math.floor(p.inv * 14) % 2 === 0) return;
  const bob = Math.abs(Math.sin(p.t * 9)) * (Math.hypot(p.mvx || 0, p.mvy || 0) > 0.1 ? 4 : 1.2);
  // charge aura
  if (p.holding && p.charge > 0) {
    c.save(); c.globalCompositeOperation = 'lighter';
    const bx = p.x + Math.cos(p.aim) * p.r, by = p.y - bob + Math.sin(p.aim) * p.r * 0.6;
    const R = 16 + 30 * p.charge, g = c.createRadialGradient(bx, by, 0, bx, by, R); g.addColorStop(0, `rgba(255,220,140,${0.5 + 0.4 * p.charge})`); g.addColorStop(1, 'rgba(255,170,60,0)');
    c.fillStyle = g; c.beginPath(); c.arc(bx, by, R, 0, TAU); c.fill();
    if (p.charge >= 1) { c.strokeStyle = 'rgba(255,240,200,0.8)'; c.lineWidth = 2; c.beginPath(); c.arc(p.x, p.y - bob, p.r + 8 + Math.sin(p.t * 30) * 2, 0, TAU); c.stroke(); }
    c.restore();
    // aim cone preview
    c.save(); c.globalAlpha = 0.18 + 0.12 * p.charge; c.fillStyle = PAL.gold; c.translate(p.x, p.y); c.scale(1, 0.75);
    c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 105 + 125 * p.charge, p.aim - 0.62, p.aim + 0.62); c.closePath(); c.fill(); c.restore();
  } else { // small aim marker on the floor
    c.save(); c.globalAlpha = 0.5; c.fillStyle = PAL.gold; const mx = p.x + Math.cos(p.aim) * (p.r + 16), my = p.y + Math.sin(p.aim) * (p.r + 16) * 0.75;
    c.translate(mx, my); c.rotate(p.aim); c.beginPath(); c.moveTo(6, 0); c.lineTo(-4, -5); c.lineTo(-4, 5); c.fill(); c.restore();
  }
  if (p.dash > 0) { c.save(); c.globalAlpha = 0.35; for (let i = 1; i <= 3; i++) { c.fillStyle = '#fff'; c.beginPath(); c.arc(p.x - Math.cos(p.dashA) * i * 12, p.y - bob - Math.sin(p.dashA) * i * 12, p.r * (1 - i * 0.15), 0, TAU); c.fill(); } c.restore(); }
  p.blink = (p.t % 3.2) < 0.1;
  drawGrokButt(c, p.x, p.y, p.r, p.aim, { bob, shy: p.shy / 100, t: p.t, flash: p.flash, charge: p.holding ? p.charge : 0, lookAway: p.stare > 0, blink: p.blink, squint: p.hugged > 0 });
  if (p.hugged > 0) bubble(c, p.x, p.y - 48, 'WIGGLE OUT!', '#3b8fd1');
}
function drawWorld(c) {
  c.drawImage(bgCanvas, 0, 0, W, H);
  drawBeams(c, stateT, player);
  drawTele(c);
  for (const h of hazards) if (!h.slammed) drawForm(c, h);
  for (const l of loot) drawLoot(c, l);
  for (const b of ebullets) if (b.kind === 'ring') drawBullet(c, b);
  // y-sorted actors
  const list = [];
  for (const e of enemies) list.push({ y: e.y, f: () => DRAW[e.type](c, e) });
  for (const b of blocks) list.push({ y: b.y + b.s, f: () => drawBlock(c, b) });
  for (const h of hazards) if (h.slammed) list.push({ y: h.y + h.h / 2, f: () => drawForm(c, h) });
  if (player) list.push({ y: player.y, f: () => drawPlayer(c) });
  list.sort((a, b) => a.y - b.y);
  for (const o of list) o.f();
  for (const b of blasts) drawBlastFx(c, b);
  for (const b of ebullets) if (b.kind !== 'ring') drawBullet(c, b);
  for (const e of enemies) drawEnemyShadowInfo(c, e);
  drawParts(c);
  for (const r of fxRings) { c.save(); c.globalAlpha = 1 - r.t / 0.8; c.strokeStyle = PAL.gold; c.lineWidth = 16; c.beginPath(); c.ellipse(r.x, r.y, r.R, r.R * 0.6, 0, 0, TAU); c.stroke(); c.restore(); }
  drawPops(c);
  c.drawImage(fgCanvas, 0, H - 60, W, 60);
}
function drawParts(c) {
  for (const q of parts) {
    const a = 1 - q.t / q.life;
    c.save(); c.globalAlpha = Math.max(0, a);
    if (q.kind === 'spark' || q.kind === 'neon') { if (q.kind === 'neon') c.globalCompositeOperation = 'lighter'; c.strokeStyle = q.col; c.lineWidth = q.sz * 0.8; c.lineCap = 'round'; c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(q.x - q.vx * 0.04, q.y - q.vy * 0.04); c.stroke(); }
    else if (q.kind === 'puff') { c.fillStyle = q.col; c.beginPath(); c.arc(q.x, q.y, q.sz * (1 + q.t), 0, TAU); c.fill(); }
    else if (q.kind === 'pixel') { c.fillStyle = q.col; c.fillRect(q.x - q.sz / 2, q.y - q.sz / 2, q.sz, q.sz); }
    else if (q.kind === 'confetti' || q.kind === 'fur') { c.translate(q.x, q.y); c.rotate(q.rot); c.fillStyle = q.col; if (q.kind === 'fur') { c.beginPath(); c.ellipse(0, 0, q.sz, q.sz * 0.45, 0, 0, TAU); c.fill(); } else c.fillRect(-q.sz / 2, -q.sz / 4, q.sz, q.sz / 2); }
    c.restore();
  }
}
function strokeText(c, txt, x, y, size, fill, stroke = '#120712', lw = 6) {
  c.font = `900 ${size}px ${FONT}`; c.lineJoin = 'round'; c.strokeStyle = stroke; c.lineWidth = lw; c.strokeText(txt, x, y); c.fillStyle = fill; c.fillText(txt, x, y);
}
function drawPops(c) {
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const q of pops) {
    const k = q.t / q.life, s = k < 0.15 ? 0.6 + k / 0.15 * 0.6 : 1.2 - Math.min(0.2, (k - 0.15));
    c.save(); c.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1; c.translate(q.x, q.y - k * 30); c.rotate(q.rot); c.scale(s, s);
    strokeText(c, q.text, 0, 0, q.size, q.color, '#120712', Math.max(3, q.size / 4)); c.restore();
  }
}
// ---------- HUD ----------
function panel(c, x, y, w, h, a = 0.72) { c.fillStyle = `rgba(12,6,16,${a})`; rr(c, x, y, w, h, 10); c.fill(); c.strokeStyle = 'rgba(255,201,74,0.35)'; c.lineWidth = 1; c.stroke(); }
function drawHUD(c) {
  const p = player, shy = p.shy / 100;
  // SHY meter
  panel(c, 10, 10, 236, 50);
  drawGrokButt(c, 34, 36, 13, Math.PI / 2 - 0.6 + shy * 0.6, { shy: shy * 0.8, t: p.t });
  c.textAlign = 'left'; c.textBaseline = 'middle';
  c.font = `900 13px ${FONT}`; c.fillStyle = shy > 0.7 ? (Math.floor(stateT * 6) % 2 ? '#ff4058' : '#ffd0d6') : '#e9f6ff';
  c.fillText(shy > 0.7 ? 'STAGE FRIGHT!' : 'SHY', 56, 22);
  c.textAlign = 'right'; c.fillStyle = '#e9f6ff'; c.fillText(Math.floor(p.shy) + '%', 236, 22);
  const bx = 56, by = 32, bw = 180, bh = 10;
  c.fillStyle = 'rgba(255,255,255,0.1)'; rr(c, bx, by, bw, bh, 5); c.fill();
  const g = c.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, '#2fe0d0'); g.addColorStop(0.55, '#ffc94a'); g.addColorStop(1, '#ff4058');
  if (shy > 0.01) { c.fillStyle = g; rr(c, bx, by, Math.max(10, bw * shy), bh, 5); c.fill(); }
  c.textAlign = 'left'; c.font = `bold 9px ${FONT}`; c.fillStyle = PAL.gold2;
  c.fillText('SHY POWER x' + shyPower().toFixed(1) + '   SPEED ' + Math.round(100 - 50 * shy) + '%', 56, 51);
  // FULL MOON meter
  const mfull = p.moon >= 100;
  panel(c, 10, 64, 186, 26);
  moonIcon(c, 26, 77, 9, mfull ? 1 : 0.6);
  c.fillStyle = 'rgba(255,255,255,0.1)'; rr(c, 40, 72, 146, 10, 5); c.fill();
  c.fillStyle = mfull ? (Math.floor(stateT * 8) % 2 ? '#fff4dc' : PAL.gold) : PAL.gold; if (p.moon > 2) { rr(c, 40, 72, Math.max(10, 146 * p.moon / 100), 10, 5); c.fill(); }
  if (mfull) { c.font = `900 9px ${FONT}`; c.fillStyle = '#3a2406'; c.textAlign = 'center'; c.fillText(ctrlMode === 'touch' ? 'FULL MOON · TAP THE BUTTON' : 'FULL MOON READY · PRESS E', 113, 77.5); }
  else { c.font = `bold 8px ${FONT}`; c.fillStyle = '#fff4dc'; c.textAlign = 'center'; c.fillText('FULL MOON', 113, 77.5); }
  // round + score
  panel(c, W - 196, 10, 186, 50);
  c.textAlign = 'right'; c.font = `900 15px ${FONT}`; c.fillStyle = PAL.gold;
  const w = WAVES[waveIdx];
  c.fillText((w.boss ? (w.boss === 'all' ? 'FINAL' : 'BOSS') : 'ROUND') + ' ' + (waveIdx + 1) + '/' + WAVES.length, W - 20, 27);
  c.font = `bold 12px ${FONT}`; c.fillStyle = '#fff4dc'; c.fillText(String(score).padStart(7, '0'), W - 20, 46);
  if (combo >= 2) { c.textAlign = 'left'; c.fillStyle = PAL.teal; c.font = `900 12px ${FONT}`; c.fillText(combo + 'x', W - 186, 46); }
  // touch pause button
  if (ctrlMode === 'touch') { panel(c, W - 44, 64, 34, 34); c.fillStyle = '#fff4dc'; c.fillRect(W - 33, 73, 4, 16); c.fillRect(W - 25, 73, 4, 16); }
  drawBossBar(c);
  drawWins(c);
}
function moonIcon(c, x, y, r, a) { // a gold "full moon" = two round cheeks (gold, never white)
  c.save(); c.globalAlpha = a; c.fillStyle = PAL.gold; c.beginPath(); c.arc(x - r * 0.45, y, r * 0.7, 0, TAU); c.arc(x + r * 0.45, y, r * 0.7, 0, TAU); c.fill();
  c.strokeStyle = '#7a4b0c'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x, y - r * 0.5); c.lineTo(x, y + r * 0.6); c.stroke(); c.restore();
}
function drawBossBar(c) {
  const bosses = [];
  const crew = enemies.filter(e => e.type === 'bigdot');
  if (crew.length) bosses.push({ id: 'dotz', hp: crew.reduce((s, e) => s + Math.max(0, e.hp), 0), max: crew.reduce((s, e) => s + e.maxhp, 0) + (DZ && DZ.lostMax || 0) });
  for (const e of enemies) if (e.type === 'jolly' || e.type === 'claw') bosses.push({ id: e.boss, hp: Math.max(0, e.hp), max: e.maxhp, weak: e.weak });
  if (!bosses.length) return;
  const n = bosses.length, gap = 8, tw = 440, bw = (tw - gap * (n - 1)) / n, x0 = (W - tw) / 2, y = 612;
  bosses.forEach((b, i) => {
    const x = x0 + i * (bw + gap);
    panel(c, x, y, bw, 22, 0.85);
    c.fillStyle = 'rgba(255,255,255,0.08)'; rr(c, x + 4, y + 13, bw - 8, 6, 3); c.fill();
    c.fillStyle = RIVAL_COL[b.id]; rr(c, x + 4, y + 13, Math.max(6, (bw - 8) * b.hp / b.max), 6, 3); c.fill();
    c.font = `900 9px ${FONT}`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = '#fff4dc'; c.fillText(RIVAL_NAME[b.id], x + 6, y + 7);
    if (b.weak) { c.textAlign = 'right'; c.fillStyle = PAL.gold; c.fillText('x2 DMG!', x + bw - 6, y + 7); }
  });
}
function drawWins(c) { // system window pop-ups
  let y = 104;
  for (const w of wins) {
    const k = w.t, a = k < 0.12 ? k / 0.12 : w.life - k < 0.3 ? (w.life - k) / 0.3 : 1, s = k < 0.12 ? 0.8 + 0.2 * k / 0.12 : 1;
    const ww = 206, hh = 22 + w.lines.length * 14, x = W - ww - 10;
    c.save(); c.globalAlpha = a; c.translate(x + ww / 2, y + hh / 2); c.scale(s, s); c.translate(-ww / 2, -hh / 2);
    c.fillStyle = 'rgba(14,8,18,0.92)'; rr(c, 0, 0, ww, hh, 7); c.fill(); c.strokeStyle = w.col; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = w.col; rr(c, 0, 0, ww, 15, 7); c.fill(); c.fillRect(0, 8, ww, 7);
    for (let i = 0; i < 3; i++) { c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.arc(ww - 10 - i * 9, 7.5, 3, 0, TAU); c.fill(); }
    c.fillStyle = '#120712'; c.font = `900 8.5px ${FONT}`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(w.title, 7, 8);
    c.fillStyle = '#f4ecff'; c.font = `bold 10px ${MONO}`;
    w.lines.forEach((l, i) => c.fillText(l, 8, 24 + i * 14));
    c.restore();
    y += hh + 6;
  }
}
function drawBanner(c) {
  if (!banner) return;
  const k = banner.t / banner.life, inK = Math.min(1, banner.t / 0.18), out = k > 0.8 ? (1 - k) / 0.2 : 1;
  c.save(); c.globalAlpha = out; c.textAlign = 'center'; c.textBaseline = 'middle';
  const y = 196;
  c.fillStyle = 'rgba(10,4,14,0.5)'; c.fillRect(0, y - 26, W, 52);
  c.fillStyle = banner.col; c.fillRect(0, y - 26, W, 2); c.fillRect(0, y + 24, W, 2);
  const x = W / 2 + (1 - inK) * 300;
  strokeText(c, banner.big, x, y - 5, 28, banner.col, '#120712', 6);
  c.font = `bold 12px ${FONT}`; c.fillStyle = '#fff4dc'; c.fillText(banner.small, W / 2 - (1 - inK) * 300, y + 15);
  c.restore();
}
function drawTouchUI(c) {
  if (ctrlMode !== 'touch' || state !== 'play') return;
  c.save();
  if (input.joy) {
    c.globalAlpha = 0.35; c.strokeStyle = '#fff4dc'; c.lineWidth = 3; c.beginPath(); c.arc(input.joy.ox, input.joy.oy, 48, 0, TAU); c.stroke();
    const dx = input.joy.x - input.joy.ox, dy = input.joy.y - input.joy.oy, d = Math.hypot(dx, dy), m = Math.min(d, 48);
    c.globalAlpha = 0.5; c.fillStyle = '#fff4dc'; c.beginPath(); c.arc(input.joy.ox + (d ? dx / d * m : 0), input.joy.oy + (d ? dy / d * m : 0), 20, 0, TAU); c.fill();
  } else if (stateT < 12) { c.globalAlpha = 0.5; c.font = `bold 11px ${FONT}`; c.fillStyle = '#fff4dc'; c.textAlign = 'center'; c.fillText('◀ DRAG TO MOVE', 110, H - 76); c.fillText('TAP = BUMP · HOLD = BLAST ▶', 500, H - 76); }
  if (input.fire) { c.globalAlpha = 0.35; c.strokeStyle = PAL.gold; c.lineWidth = 3; c.beginPath(); c.arc(input.fire.ox, input.fire.oy, 34 + (player ? player.charge * 16 : 0), 0, TAU); c.stroke(); }
  if (player && player.moon >= 100) {
    const s = 1 + 0.08 * Math.sin(stateT * 10);
    c.globalAlpha = 0.95; c.translate(MOONBTN.x, MOONBTN.y); c.scale(s, s);
    c.fillStyle = 'rgba(12,6,16,0.85)'; c.beginPath(); c.arc(0, 0, MOONBTN.r, 0, TAU); c.fill(); c.strokeStyle = PAL.gold; c.lineWidth = 3; c.stroke();
    moonIcon(c, 0, -4, 18, 1); c.font = `900 8px ${FONT}`; c.fillStyle = PAL.gold; c.textAlign = 'center'; c.fillText('FULL MOON', 0, 22);
  }
  c.restore();
}
function drawMute(c) {
  c.save(); c.globalAlpha = 0.75; c.fillStyle = 'rgba(12,6,16,0.7)'; rr(c, W - 40, H - 40, 32, 32, 8); c.fill();
  c.fillStyle = '#fff4dc'; c.beginPath(); c.moveTo(W - 33, H - 28); c.lineTo(W - 28, H - 28); c.lineTo(W - 22, H - 33); c.lineTo(W - 22, H - 15); c.lineTo(W - 28, H - 20); c.lineTo(W - 33, H - 20); c.fill();
  c.strokeStyle = '#fff4dc'; c.lineWidth = 2;
  if (muted) { c.beginPath(); c.moveTo(W - 19, H - 29); c.lineTo(W - 12, H - 19); c.moveTo(W - 12, H - 29); c.lineTo(W - 19, H - 19); c.stroke(); }
  else { c.beginPath(); c.arc(W - 22, H - 24, 6, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(W - 22, H - 24, 10, -0.9, 0.9); c.stroke(); }
  c.restore();
}
// ---------- freeze-frame cut-ins (anime style) ----------
function speedLines(c, cx, cy, t, col, n = 70, inner = 140) {
  const r = seeded(Math.floor(t * 20) + 3);
  c.save(); c.strokeStyle = col; c.lineCap = 'round';
  for (let i = 0; i < n; i++) { const a = r() * TAU, r0 = inner + r() * 120, r1 = 900; c.globalAlpha = 0.25 + r() * 0.5; c.lineWidth = 1 + r() * 4; c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); c.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); c.stroke(); }
  c.restore();
}
function drawPortrait(c, who, x, y, s, t) {
  if (who === 'jolly') { const sp = SPR.jollyBig; c.save(); c.translate(x, y + 110 * s); c.scale(1.5 * s, 1.5 * s); c.drawImage(sp.k, -sp.ax, -sp.ay); c.restore(); }
  else if (who === 'claw') drawClawdeth(c, x, y + 80 * s, 24 * s, t, { angry: true });
  else if (who === 'dotz') { DOTCOLS.forEach((col, i) => { const sp = SPR.dots[col].big, a = i / 5 * TAU + t * 2, sz = 120 * s; c.drawImage(sp.k, x + Math.cos(a) * 80 * s - sz / 2, y + Math.sin(a) * 40 * s - sz / 2 - Math.abs(Math.sin(t * 8 + i)) * 20, sz, sz); }); }
  else if (who === 'all') { drawPortrait(c, 'jolly', x - 150 * s, y + 10, s * 0.6, t); drawPortrait(c, 'claw', x + 150 * s, y + 10, s * 0.6, t); const sp = SPR.dots[DOTCOLS[2]].big; c.drawImage(sp.k, x - 50 * s, y - 40 * s, 100 * s, 100 * s); }
  else if (who === 'grok') drawGrokButt(c, x, y, 120 * s, Math.PI / 2, { t, charge: 1 });
  else if (who === 'grokshy') drawGrokButt(c, x + Math.sin(t * 50) * 3, y, 110 * s, Math.PI / 2 - 0.3, { t, shy: 1 });
}
function drawCutin(c) {
  const k = cutin.t / cutin.dur, inK = Math.min(1, cutin.t / 0.16), outK = k > 0.85 ? (1 - k) / 0.15 : 1;
  c.save();
  c.fillStyle = `rgba(6,2,10,${0.62 * outK})`; c.fillRect(0, 0, W, H);
  c.globalAlpha = outK;
  // diagonal band
  c.save(); c.translate(W / 2, H / 2); c.rotate(-0.12); c.scale(1, inK);
  const g = c.createLinearGradient(-W, 0, W, 0); g.addColorStop(0, '#120712'); g.addColorStop(0.5, cutin.col); g.addColorStop(1, '#120712');
  c.globalAlpha = outK * 0.9; c.fillStyle = g; c.fillRect(-W, -150, W * 2, 300);
  c.globalAlpha = outK; c.fillStyle = '#120712'; c.fillRect(-W, -156, W * 2, 6); c.fillRect(-W, 150, W * 2, 6);
  c.restore();
  speedLines(c, W / 2, H / 2 - 20, cutin.t, '#fff4dc', 80, 170);
  // portrait slides in
  const px = W / 2 + (1 - inK) * -260;
  c.save(); c.beginPath(); c.save(); c.translate(W / 2, H / 2); c.rotate(-0.12); c.rect(-W, -150, W * 2, 300); c.restore(); c.clip();
  drawPortrait(c, cutin.who, px, H / 2 - 30, 1, cutin.t);
  c.restore();
  c.textAlign = 'center'; c.textBaseline = 'middle';
  const tx = W / 2 + (1 - inK) * 300, sz = cutin.title.length > 18 ? 34 : 46;
  c.save(); c.translate(tx, H / 2 + 110); c.rotate(-0.12);
  const kind = cutin.kind === 'boss' ? 'RIVAL APPEARS' : cutin.kind === 'ko' ? 'K.O.' : cutin.kind === 'moon' ? 'SPECIAL' : cutin.kind === 'lose' ? 'OH NO' : 'VICTORY';
  c.font = `900 13px ${FONT}`; c.fillStyle = '#120712'; rr(c, -70, -62, 140, 20, 4); c.fill(); c.fillStyle = cutin.col; c.fillText(kind, 0, -51.5);
  strokeText(c, cutin.title, 0, -20, sz, '#fff4dc', '#120712', 9);
  c.font = `bold 15px ${FONT}`; c.fillStyle = '#120712'; c.fillText(cutin.sub, 1, 17); c.fillStyle = '#fff4dc'; c.fillText(cutin.sub, 0, 16);
  c.restore();
  c.restore();
}
function drawFreeze(c) { // tiny freeze on a critical full-charge hit
  c.save(); c.globalAlpha = 0.6; speedLines(c, player.x, player.y, stateT, '#fff4dc', 50, 80); c.restore();
  c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.12; c.fillStyle = PAL.gold; c.fillRect(0, 0, W, H); c.restore();
}

// ---------- screens ----------
function drawTitleScene(c, t, forCard) {
  c.drawImage(bgCanvas, 0, 0, W, H);
  drawBeams(c, t, { x: 320, y: 470 });
  // rivals looming
  const sp = SPR.jollyBig;
  c.save(); c.translate(118, 520 + Math.sin(t * 2) * 3); c.rotate(Math.sin(t * 1.6) * 0.05); c.scale(0.9, 0.9); c.drawImage(sp.k, -sp.ax, -sp.ay); c.restore();
  drawClawdeth(c, 528, 525, 10.5, t, { walk: true, angry: true });
  DOTCOLS.forEach((col, i) => { const s = SPR.dots[col].big, x = 215 + i * 52, hop = Math.abs(Math.sin(t * 4 + i * 1.1)) * 18, sz = 56; c.save(); c.globalAlpha = 0.35; c.fillStyle = '#000'; c.beginPath(); c.ellipse(x, 590, 18, 5, 0, 0, TAU); c.fill(); c.restore(); c.drawImage(s.k, x - sz / 2, 590 - sz / 2 - 16 - hop, sz, sz); });
  // GrokButt center, facing away (butt to camera), peeking
  const peek = Math.sin(t * 0.9) * 0.5;
  drawGrokButt(c, 320, 488, 44, Math.PI / 2 + peek, { t, bob: Math.abs(Math.sin(t * 3)) * 4, shy: 0.35 });
  c.textAlign = 'center'; c.textBaseline = 'middle';
  const s = 1 + 0.02 * Math.sin(t * 3);
  c.save(); c.translate(320, 228); c.scale(s, s);
  c.font = `900 82px ${FONT}`; c.lineJoin = 'round';
  c.strokeStyle = '#120712'; c.lineWidth = 14; c.strokeText('GROKBUTT', 0, 0);
  const g = c.createLinearGradient(0, -36, 0, 36); g.addColorStop(0, '#fff4c2'); g.addColorStop(0.45, '#ffc94a'); g.addColorStop(1, '#c97a12');
  c.save(); c.shadowColor = 'rgba(255,201,74,0.7)'; c.shadowBlur = 24; c.fillStyle = g; c.fillText('GROKBUTT', 0, 0); c.restore();
  c.restore();
  c.save(); c.translate(320, 290); c.rotate(-0.03);
  c.fillStyle = PAL.magenta; rr(c, -205, -22, 410, 44, 8); c.fill(); c.strokeStyle = '#120712'; c.lineWidth = 4; c.stroke();
  strokeText(c, 'LAST MASCOT STANDING', 0, 1, 30, '#fff4dc', '#120712', 6);
  c.restore();
  c.font = `bold 14px ${FONT}`; c.fillStyle = '#9ffcf2';
  c.fillText('3 rival mascots. 1 shy butt. Don\'t let them see your face.', 320, 336);
  if (!forCard) {
    const pulse = 1 + 0.06 * Math.sin(t * 6);
    c.save(); c.translate(320, 380); c.scale(pulse, pulse); strokeText(c, ctrlMode === 'touch' ? 'TAP TO AUDITION' : 'CLICK / SPACE TO AUDITION', 0, 0, 26, PAL.gold, '#120712', 6); c.restore();
    c.fillStyle = 'rgba(12,6,16,0.78)'; rr(c, 40, 404, 560, 38, 9); c.fill();
    c.font = `bold 10.5px ${FONT}`; c.fillStyle = '#fff4dc';
    c.fillText(ctrlMode === 'touch' ? 'LEFT: drag to move · RIGHT: tap = BUTT BUMP, hold = BUTT BLAST' : 'WASD move · MOUSE aims your butt · CLICK/SPACE: tap = BUMP, hold = BLAST · E = FULL MOON', 320, 416);
    c.fillStyle = '#9ffcf2'; c.fillText('Every hit makes GROKBUTT shyer: slower, but its butt hits HARDER.', 320, 431);
    if (best) { c.font = `bold 11px ${FONT}`; c.fillStyle = PAL.gold2; c.fillText('BEST ' + best, 320, 168); }
  }
  c.drawImage(fgCanvas, 0, H - 60, W, 60);
}
function drawOver(c) {
  for (const e of enemies) e.flash = 0;
  drawWorld(c);
  c.fillStyle = 'rgba(6,2,10,0.72)'; c.fillRect(0, 0, W, H);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  drawGrokButt(c, 320 + Math.sin(stateT * 40) * 2, 210, 54, Math.PI / 2 - 0.2, { t: stateT, shy: 1 });
  strokeText(c, 'TOO SHY TO PERFORM', 320, 312, 38, '#8fe3ff', '#120712', 8);
  c.font = `bold 14px ${FONT}`; c.fillStyle = '#fff4dc';
  c.fillText('Reached ' + (WAVES[waveIdx].boss ? WAVES[waveIdx].title : WAVES[waveIdx].name) + ' · Rivals eliminated: ' + eliminated.length + '/3', 320, 352);
  strokeText(c, 'SCORE ' + score, 320, 392, 28, PAL.gold, '#120712', 6);
  c.font = `bold 12px ${FONT}`; c.fillStyle = PAL.gold2; c.fillText('BEST ' + best, 320, 422);
  c.font = `bold 12px ${FONT}`; c.fillStyle = '#9ffcf2'; c.fillText('Tip: keep your butt pointed at them. Faces make GROKBUTT shy.', 320, 452);
  if (stateT > 0.9 && Math.floor(stateT * 2.2) % 2 === 0) strokeText(c, ctrlMode === 'touch' ? 'TAP TO TRY AGAIN' : 'CLICK / SPACE TO TRY AGAIN', 320, 500, 24, PAL.gold, '#120712', 6);
}
function drawWin(c) {
  c.drawImage(bgCanvas, 0, 0, W, H);
  drawBeams(c, stateT, { x: 320, y: 470 });
  // defeated rivals, flopped around the podium
  const sp = SPR.jollyBig;
  c.save(); c.translate(130, 560); c.rotate(-1.45); c.scale(0.75, 0.75); c.globalAlpha = 0.9; c.drawImage(sp.k, -sp.ax, -sp.ay); c.restore();
  c.save(); c.translate(520, 575); c.rotate(-0.55); drawClawdeth(c, 0, 0, 8, 0, { noShadow: true }); c.restore(); stars(c, 520, 500, stateT);
  DOTCOLS.forEach((col, i) => { const s = SPR.dots[col].small; c.save(); c.globalAlpha = 0.85; c.translate(210 + i * 55, 584); c.rotate(1.2 + i); c.drawImage(s.k, -19, -19, 38, 38); c.restore(); });
  // gold podium + star
  const g = c.createLinearGradient(0, 470, 0, 560); g.addColorStop(0, '#ffe08a'); g.addColorStop(1, '#9a6a1e');
  c.fillStyle = g; c.fillRect(250, 480, 140, 80); c.fillStyle = '#ffeeb0'; c.fillRect(250, 474, 140, 8);
  c.fillStyle = '#5e3a08'; c.font = `900 22px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('#1', 320, 522);
  c.save(); c.translate(320, 360); c.rotate(stateT * 0.4); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 12; i++) { c.rotate(TAU / 12); c.fillStyle = 'rgba(255,201,74,0.12)'; c.beginPath(); c.moveTo(0, 0); c.lineTo(-20, -260); c.lineTo(20, -260); c.fill(); }
  c.restore();
  drawGrokButt(c, 320, 456, 40, Math.PI / 2 + Math.sin(stateT * 2) * 0.4, { t: stateT, bob: Math.abs(Math.sin(stateT * 5)) * 10 });
  drawParts(c);
  c.textAlign = 'center';
  strokeText(c, 'YOU GOT THE PART!', 320, 196, 46, PAL.gold, '#120712', 10);
  c.font = `bold 15px ${FONT}`; c.fillStyle = '#fff4dc'; c.fillText('GROKBUTT is the LAST MASCOT STANDING', 320, 238);
  c.font = `bold 12px ${FONT}`; c.fillStyle = '#9ffcf2'; c.fillText('It never once showed its face.', 320, 260);
  strokeText(c, 'SCORE ' + score, 320, 300, 28, '#fff4dc', '#120712', 6);
  c.font = `bold 12px ${FONT}`; c.fillStyle = PAL.gold2; c.fillText('TIME ' + Math.floor(timeAlive / 60) + ':' + String(Math.floor(timeAlive % 60)).padStart(2, '0') + ' · BEST ' + best, 320, 326);
  if (stateT > 0.9 && Math.floor(stateT * 2.2) % 2 === 0) strokeText(c, ctrlMode === 'touch' ? 'TAP TO PLAY AGAIN' : 'CLICK / SPACE TO PLAY AGAIN', 320, 620 - 18, 18, PAL.gold, '#120712', 5);
  c.drawImage(fgCanvas, 0, H - 60, W, 60);
}
function drawCard(c) { // share image
  drawTitleScene(c, 1.3, true);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.save(); c.translate(320, 392); c.fillStyle = PAL.gold; rr(c, -120, -20, 240, 40, 20); c.fill(); c.strokeStyle = '#120712'; c.lineWidth = 4; c.stroke();
  c.fillStyle = '#120712'; c.beginPath(); c.moveTo(-92, -10); c.lineTo(-92, 10); c.lineTo(-76, 0); c.fill();
  c.font = `900 17px ${FONT}`; c.fillText('PLAY FREE NOW', 12, 1); c.restore();
  c.font = `bold 12px ${FONT}`; c.fillStyle = '#fff4dc'; c.fillText('Made by Grok Bot for @krog_420', 320, 428);
}
function drawPause(c) {
  c.fillStyle = 'rgba(6,2,10,0.75)'; c.fillRect(0, 0, W, H);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  strokeText(c, 'PAUSED', 320, 200, 48, PAL.gold, '#120712', 9);
  c.font = `bold 13px ${FONT}`; c.fillStyle = '#fff4dc';
  const L = ['PHONE: drag the left side to move', 'Right side: TAP = BUTT BUMP (dash), HOLD + release = BUTT BLAST', 'PC: WASD/arrows move · mouse aims the butt', 'Click / Space: tap = BUMP, hold = BLAST · E or Shift = FULL MOON', 'P pause · M mute', '', 'Keep your butt toward rivals: faces make GROKBUTT shy.', 'Shyer = slower, but SHY POWER makes the butt hit harder.'];
  L.forEach((l, i) => c.fillText(l, 320, 260 + i * 22));
  if (!hasFocus) { c.fillStyle = PAL.teal; c.fillText('Click the game to use the keyboard', 320, 460); }
  strokeText(c, ctrlMode === 'touch' ? 'TAP TO RESUME' : 'CLICK / P TO RESUME', 320, 500, 22, PAL.gold, '#120712', 5);
}
function render() {
  const s = VIEW * DPR;
  ctx.setTransform(s, 0, 0, s, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (state === 'title') { drawTitleScene(ctx, titleT, false); drawMute(ctx); return; }
  if (state === 'card') { drawCard(ctx); return; }
  if (state === 'over') { drawOver(ctx); drawMute(ctx); return; }
  if (state === 'win') { drawWin(ctx); drawMute(ctx); return; }
  ctx.save();
  if (shake > 0 && !paused) ctx.translate(rnd(-shake, shake) * 0.6, rnd(-shake, shake) * 0.6);
  drawWorld(ctx);
  ctx.restore();
  if (flashT > 0) lighten(ctx, '#fff4dc', flashT * 0.5);
  if (freezeT > 0) drawFreeze(ctx);
  drawHUD(ctx);
  drawBanner(ctx);
  drawTouchUI(ctx);
  drawMute(ctx);
  if (cutin) drawCutin(ctx);
  if (paused) drawPause(ctx);
}

// ---------- boot ----------
initSprites(); buildStage();
if (/[?&]card\b/.test(location.search)) state = 'card';
// test hooks (used by tools/*.py; harmless for players)
window.__gb = {
  get state() { return state; }, get player() { return player; }, get wave() { return waveIdx; }, get enemies() { return enemies; },
  get counts() { return { enemies: enemies.length, bullets: ebullets.length, parts: parts.length, wave: waveIdx, phase, shy: player && Math.round(player.shy), score }; },
  start() { startGame(); }, god(on = true) { god = on; },
  toWave(i) { resetWorld(); startWave(i); }, skipCutin() { if (cutin) { cutin.t = cutin.dur; } },
  spawn(t, x, y, o) { return spawnEnemy(t, x, y, o); }, setShy(v) { player.shy = v; }, setMoon(v) { player.moon = v; },
  quiet() { resetWorld(); spawns = []; phase = 'hold'; }, lose() { player.shy = 100; loseGame(); }, win() { winGame(); },
  set timeScale(v) { timeScale = v; }, moon() { tryFullMoon(); }, blast(k) { blast(k); },
  aim(a) { player.aim = a; }, boss(id) { spawnBoss(id); }, banner: showBanner,
};
requestAnimationFrame(frame);
