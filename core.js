/* GROKBUTT: Last Mascot Standing
   Plain Canvas 2D + WebAudio, no libraries, no build step.
   Files (classic scripts sharing one global scope, loaded in order by play.html):
     core.js    engine utils, audio + music, input, GrokButt renderer, rival sprites
     rivals.js  minions, bosses, hazards
     main.js    waves, combat, cut-ins, HUD, title/end screens, loop  */
'use strict';
const W = 640, H = 640;
const cvs = document.getElementById('game');
const ctx = cvs.getContext('2d');
let VIEW = 1, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2.5);
  const s = Math.min(window.innerWidth, window.innerHeight) / W;
  VIEW = s;
  cvs.style.width = Math.floor(W * s) + 'px';
  cvs.style.height = Math.floor(H * s) + 'px';
  cvs.width = Math.max(1, Math.round(W * s * DPR));
  cvs.height = Math.max(1, Math.round(H * s * DPR));
}
window.addEventListener('resize', resize);
resize();

// ---------- utils ----------
const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const lerp = (a, b, t) => a + (b - a) * t;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function angDiff(a, b) { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }
function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function prune(a, keep) { let j = 0; for (let i = 0; i < a.length; i++) if (keep(a[i])) a[j++] = a[i]; a.length = j; return a; }
function makeCanvas(w, h) { const k = document.createElement('canvas'); k.width = w; k.height = h; return k; }
const FONT = '"Arial Black","Arial Bold",Impact,system-ui,sans-serif';
const MONO = '"Courier New",ui-monospace,monospace';
// palette (MASCOT AUDITION stage)
const PAL = { gold: '#ffc94a', gold2: '#ffdf8a', magenta: '#c4237a', magentaD: '#5e0f3c', teal: '#2fe0d0', tealD: '#0d5c66',
  plum: '#1a0f1f', ink: '#0b0710', cream: '#fff4dc', red: '#ff4058', terra: '#DA7758' };

// ---------- audio (synthesized) ----------
let ac = null, master = null, sfxBus = null, musBus = null, noiseBuf = null, muted = false;
function unlockAudio() {
  try {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      master = ac.createGain(); master.gain.value = 0.55;
      const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
      master.connect(comp); comp.connect(ac.destination);
      sfxBus = ac.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
      musBus = ac.createGain(); musBus.gain.value = 0.32; musBus.connect(master);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const o = ac.createOscillator(), g = ac.createGain(); g.gain.value = 0; o.connect(g); g.connect(master); o.start(); o.stop(ac.currentTime + 0.02);
    }
    if (ac.state === 'suspended') ac.resume();
  } catch (e) { /* audio is optional */ }
}
function tone(f, dur, type = 'square', vol = 0.12, f2 = null, delay = 0, bus = null) {
  if (!ac || muted) return;
  const t = ac.currentTime + delay;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g); g.connect(bus || sfxBus); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol = 0.2, freq = 1200, type = 'lowpass', f2 = null, q = 1, delay = 0, bus = null) {
  if (!ac || muted) return;
  const t = ac.currentTime + delay;
  const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const fl = ac.createBiquadFilter(); fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(freq, t);
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  s.connect(fl); fl.connect(g); g.connect(bus || sfxBus); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}
function fart(len = 0.35, pitch = 90, vol = 0.22) {
  if (!ac || muted) return;
  const t = ac.currentTime;
  const o = ac.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(pitch * rnd(0.9, 1.15), t);
  o.frequency.exponentialRampToValueAtTime(pitch * 0.55, t + len);
  const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = rnd(18, 32); lg.gain.value = pitch * 0.45;
  lfo.connect(lg); lg.connect(o.frequency);
  const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 520; fl.Q.value = 4;
  const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0008, t + len);
  o.connect(fl); fl.connect(g); g.connect(sfxBus); o.start(t); lfo.start(t); o.stop(t + len + 0.03); lfo.stop(t + len + 0.03);
  noise(len * 0.8, vol * 0.25, 300, 'lowpass');
}
const SFX = {
  bump() { tone(150, 0.12, 'sine', 0.32, 55); noise(0.07, 0.16, 900); },
  charge(k) { tone(220 + k * 500, 0.05, 'triangle', 0.04); },
  blast(k) { fart(0.3 + k * 0.4, 95 - k * 25, 0.26 + k * 0.1); tone(80, 0.3, 'sine', 0.3, 35); noise(0.25, 0.2, 1400, 'lowpass', 120); },
  hit() { tone(520, 0.06, 'square', 0.07, 240); noise(0.05, 0.14, 2500, 'bandpass', 900, 2); },
  squeak() { tone(rnd(900, 1300), 0.09, 'sine', 0.09, rnd(1500, 1900)); },
  plush() { noise(0.12, 0.2, 700, 'lowpass', 200); tone(220, 0.1, 'sine', 0.12, 160); },
  pixel() { tone(rnd(300, 500), 0.05, 'square', 0.07); tone(rnd(600, 800), 0.05, 'square', 0.05, null, 0.05); },
  hurt() { tone(700, 0.06, 'square', 0.1, 1000); tone(420, 0.2, 'triangle', 0.15, 200, 0.05); },
  hug() { [330, 392, 494].forEach((f, i) => tone(f, 0.12, 'sine', 0.08, null, i * 0.07)); noise(0.3, 0.1, 500); },
  cash() { tone(1568, 0.06, 'square', 0.06); tone(2093, 0.18, 'square', 0.06, null, 0.06); noise(0.08, 0.1, 6000, 'highpass'); },
  type() { tone(rnd(1800, 2400), 0.02, 'square', 0.03); },
  code() { tone(rnd(700, 1000), 0.04, 'square', 0.04, 400); },
  wall() { tone(110, 0.25, 'square', 0.1, 55); noise(0.2, 0.15, 600, 'lowpass', 100); },
  slam() { noise(0.4, 0.38, 900, 'lowpass', 70); tone(70, 0.4, 'sine', 0.35, 32); },
  tel() { tone(880, 0.08, 'square', 0.05); tone(880, 0.08, 'square', 0.05, null, 0.12); },
  pop() { tone(rnd(500, 700), 0.05, 'sine', 0.1, rnd(1100, 1400)); },
  pickup() { [659, 784, 1046].forEach((f, i) => tone(f, 0.08, 'triangle', 0.08, null, i * 0.05)); },
  applause() { for (let i = 0; i < 14; i++) noise(0.05, 0.08, rnd(2000, 5000), 'bandpass', null, 1.5, i * 0.045 + rnd(0, 0.03)); },
  win() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.22, 'triangle', 0.1, null, i * 0.11)); this.applause(); },
  over() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.28, 'triangle', 0.12, null, i * 0.2)); fart(0.9, 70, 0.2); },
  cutin() { noise(0.5, 0.25, 6000, 'highpass', 600); tone(1200, 0.3, 'sawtooth', 0.05, 300); },
  boom() { noise(0.6, 0.4, 1200, 'lowpass', 60); tone(60, 0.6, 'sine', 0.4, 25); },
  round() { [392, 523, 784].forEach((f, i) => tone(f, 0.12, 'square', 0.07, null, i * 0.08)); },
  stare() { tone(1600, 0.03, 'sine', 0.03); },
  zap() { tone(1400, 0.07, 'sawtooth', 0.05, 300); noise(0.08, 0.08, 3000, 'bandpass', 1200, 3); },
  crit() { tone(1800, 0.25, 'sawtooth', 0.06, 200); noise(0.3, 0.2, 5000, 'highpass', 800); },
};

// ---------- music: a tiny stage-show groove (117 BPM, like the MV), scheduled ahead ----------
const MUSIC = { on: false, next: 0, step: 0, intensity: 0, timer: null };
const BPM = 117, SPB = 60 / BPM / 4; // 16th notes
const BASS = [0, 0, 7, 0, 5, 0, 3, 5, 0, 0, 7, 10, 12, 10, 7, 5];
const ROOTS = [45, 45, 41, 43]; // A, A, F, G (midi) per bar
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function kick(t) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12); g.gain.setValueAtTime(0.7, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); o.connect(g); g.connect(musBus); o.start(t); o.stop(t + 0.2); }
function hat(t, v) { const s = ac.createBufferSource(); s.buffer = noiseBuf; const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000; const g = ac.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04); s.connect(f); f.connect(g); g.connect(musBus); s.start(t, Math.random() * 0.5); s.stop(t + 0.05); }
function clap(t) { const s = ac.createBufferSource(); s.buffer = noiseBuf; const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 1; const g = ac.createGain(); g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15); s.connect(f); f.connect(g); g.connect(musBus); s.start(t, Math.random() * 0.5); s.stop(t + 0.16); }
function mnote(t, m, dur, type, vol) { const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter(); o.type = type; o.frequency.value = mtof(m); f.type = 'lowpass'; f.frequency.value = 900 + MUSIC.intensity * 900; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(f); f.connect(g); g.connect(musBus); o.start(t); o.stop(t + dur + 0.02); }
function musicTick() {
  if (!ac || !MUSIC.on) return;
  while (MUSIC.next < ac.currentTime + 0.12) {
    const t = MUSIC.next, s = MUSIC.step % 16, bar = Math.floor(MUSIC.step / 16) % 4, I = MUSIC.intensity;
    if (!muted) {
      if (s % 4 === 0) kick(t);
      if (I > 0.5 && s === 14) kick(t);
      if (s % 2 === 0 || I > 0.3) hat(t, s % 4 === 2 ? 0.12 : 0.05);
      if (s === 4 || s === 12) clap(t);
      mnote(t, ROOTS[bar] - 12 + BASS[s], SPB * 1.6, 'sawtooth', 0.16);
      if (I > 0.6 && s % 4 === 2) mnote(t, ROOTS[bar] + 12 + [0, 3, 7, 10][(s >> 2) % 4], SPB * 2, 'square', 0.035);
      if (s === 0) { [0, 3, 7].forEach(k => mnote(t, ROOTS[bar] + 12 + k, SPB * 7, 'triangle', 0.04)); }
    }
    MUSIC.next += SPB; MUSIC.step++;
  }
}
function startMusic() { if (!ac) return; if (!MUSIC.on) { MUSIC.on = true; MUSIC.next = ac.currentTime + 0.05; MUSIC.step = 0; } if (!MUSIC.timer) MUSIC.timer = setInterval(musicTick, 25); }
function stopMusic() { MUSIC.on = false; }

// ---------- input ----------
const keys = {};
const input = { aimX: W / 2, aimY: 0, mouseDown: false, usingTouch: false, mouseSeen: false, joy: null, fire: null, firePressT: 0, specialTap: false };
function toLogical(cx, cy) { const r = cvs.getBoundingClientRect(); return { x: (cx - r.left) / r.width * W, y: (cy - r.top) / r.height * H }; }
const GAME_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyP', 'KeyM', 'KeyR', 'KeyE', 'KeyJ', 'KeyK', 'ShiftLeft', 'ShiftRight', 'Enter', 'NumpadEnter']);
let hasFocus = true;
try { hasFocus = document.hasFocus(); } catch (_) {}
cvs.tabIndex = 0;
function grabFocus() { try { window.focus(); } catch (_) {} try { cvs.focus({ preventScroll: true }); } catch (_) { try { cvs.focus(); } catch (__) {} } hasFocus = true; }
function swallow(e) { if (GAME_KEYS.has(e.code)) { e.preventDefault(); e.stopPropagation(); } }
// hooks main.js fills in
const HOOK = { start() {}, pauseToggle() {}, special() {}, attackDown() {}, attackUp() {}, tapUI() { return false; } };
window.addEventListener('keypress', swallow);
window.addEventListener('keydown', e => {
  swallow(e); hasFocus = true;
  if (e.repeat) return;
  keys[e.code] = true; unlockAudio();
  if (e.code === 'KeyM') { muted = !muted; return; }
  if (e.code === 'KeyP') { HOOK.pauseToggle(); return; }
  if (e.code === 'Space' || e.code === 'KeyJ') HOOK.attackDown('key');
  if (e.code === 'KeyE' || e.code === 'KeyK' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') HOOK.special();
  if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space' || e.code === 'KeyR') HOOK.start(e.code);
});
window.addEventListener('keyup', e => { swallow(e); keys[e.code] = false; if (e.code === 'Space' || e.code === 'KeyJ') HOOK.attackUp('key'); });
window.addEventListener('blur', () => {
  for (const k in keys) keys[k] = false; input.mouseDown = false; input.joy = null; input.fire = null; HOOK.attackUp('all');
  hasFocus = false; HOOK.pauseToggle(true);
});
window.addEventListener('focus', () => { hasFocus = true; });
cvs.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('pointerdown', e => {
  if (e.target && e.target.tagName === 'A') return;
  e.preventDefault(); unlockAudio(); grabFocus();
  try { cvs.setPointerCapture(e.pointerId); } catch (_) {}
  const p = toLogical(e.clientX, e.clientY);
  const touch = e.pointerType === 'touch' || e.pointerType === 'pen';
  if (HOOK.tapUI(p, touch)) return;
  if (HOOK.start('pointer')) return;
  if (touch) {
    input.usingTouch = true;
    if (p.x < W * 0.5 && !input.joy) input.joy = { id: e.pointerId, ox: p.x, oy: p.y, x: p.x, y: p.y };
    else if (!input.fire) { input.fire = { id: e.pointerId, ox: p.x, oy: p.y, x: p.x, y: p.y, dragged: false }; HOOK.attackDown('touch'); }
  } else {
    input.usingTouch = false; input.mouseSeen = true;
    input.aimX = p.x; input.aimY = p.y; input.mouseDown = true; HOOK.attackDown('mouse');
  }
});
document.addEventListener('pointermove', e => {
  const p = toLogical(e.clientX, e.clientY);
  if (input.joy && input.joy.id === e.pointerId) { input.joy.x = p.x; input.joy.y = p.y; }
  else if (input.fire && input.fire.id === e.pointerId) { input.fire.x = p.x; input.fire.y = p.y; if (Math.hypot(p.x - input.fire.ox, p.y - input.fire.oy) > 16) input.fire.dragged = true; }
  else if (e.pointerType === 'mouse') { input.aimX = p.x; input.aimY = p.y; input.mouseSeen = true; input.usingTouch = false; }
});
function endPointer(e) {
  if (input.joy && input.joy.id === e.pointerId) input.joy = null;
  if (input.fire && input.fire.id === e.pointerId) { HOOK.attackUp('touch'); input.fire = null; }
  if (e.pointerType === 'mouse' && input.mouseDown) { input.mouseDown = false; HOOK.attackUp('mouse'); }
}
document.addEventListener('pointerup', endPointer);
document.addEventListener('pointercancel', endPointer);
['touchstart', 'touchmove', 'gesturestart'].forEach(ev => document.addEventListener(ev, e => { if (ev === 'touchstart') grabFocus(); e.preventDefault(); }, { passive: false }));
['pointerdown', 'mousedown', 'click'].forEach(ev => window.addEventListener(ev, () => grabFocus(), true));
let ctrlMode = (() => { try { return (window.matchMedia && matchMedia('(pointer: coarse)').matches) || (navigator.maxTouchPoints > 0 && !(window.matchMedia && matchMedia('(hover: hover)').matches)) ? 'touch' : 'pc'; } catch (_) { return 'pc'; } })();
window.addEventListener('pointerdown', e => { ctrlMode = (e.pointerType === 'touch' || e.pointerType === 'pen') ? 'touch' : 'pc'; }, true);
window.addEventListener('keydown', () => { ctrlMode = 'pc'; }, true);

// ---------- GrokButt renderer: glossy white ball, two black pill eyes, integrated butt ----------
// Pseudo-3D sphere seen from a camera 55 degrees above the floor. The silhouette is always a perfect circle (never squashed).
const CE = 55 * Math.PI / 180, CY = Math.sin(CE), SZ = Math.cos(CE);
const VY = Math.cos(CE), VZ = Math.sin(CE);
function sph(az, el) { const ce = Math.cos(el); return { x: ce * Math.cos(az), y: ce * Math.sin(az), z: Math.sin(el) }; }
const proj = n => ({ x: n.x, y: CY * n.y - SZ * n.z });
const vis = n => VY * n.y + VZ * n.z;
function surfaceFrame(c, x, y, r, az, el) {
  const n = sph(az, el), p = proj(n);
  const t1 = proj({ x: -Math.sin(az), y: Math.cos(az), z: 0 });
  const t2 = proj({ x: -Math.sin(el) * Math.cos(az), y: -Math.sin(el) * Math.sin(az), z: Math.cos(el) });
  c.translate(x + p.x * r, y + p.y * r);
  c.transform(t1.x, t1.y, t2.x, t2.y, 0, 0);
  return vis(n);
}
function pill(c, w, h) { rr(c, -w, -h, w * 2, h * 2, Math.min(w, h)); }
const towardCam = (a, amt) => a + clamp(angDiff(a, Math.PI / 2), -amt, amt);
// aim = direction the BUTT points. opts.shy (0..1) turns the face further away from the camera and adds sweat.
function drawGrokButt(c, x, y, r, aim, opts = {}) {
  const shy = opts.shy || 0;
  const bias = 0.6 * Math.abs(Math.cos(aim));
  let butt = towardCam(aim, bias);
  // shy: the butt swings toward the camera (the face hides), up to ~50 degrees
  butt = butt + clamp(angDiff(butt, Math.PI / 2), -0.9 * shy, 0.9 * shy);
  const face = butt + Math.PI;
  const bob = opts.bob || 0, cy = y - bob;
  const tremble = shy > 0.55 ? Math.sin((opts.t || 0) * 60) * (shy - 0.55) * 2.2 : 0;
  x += tremble;
  c.save();
  c.globalAlpha = 0.38 * (1 - Math.min(bob, 14) / 34);
  c.fillStyle = '#000'; c.beginPath(); c.ellipse(x + 2, y + r * 0.8, r * 0.95, r * 0.34, 0, 0, TAU); c.fill();
  c.restore();
  c.save();
  if (opts.alpha != null) c.globalAlpha = opts.alpha;
  const g = c.createRadialGradient(x - r * 0.38, cy - r * 0.45, r * 0.08, x, cy, r * 1.02);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, '#f7f8fa'); g.addColorStop(0.82, '#d8dce3'); g.addColorStop(1, '#aab1bd');
  c.fillStyle = g; c.beginPath(); c.arc(x, cy, r, 0, TAU); c.fill();
  c.save(); c.beginPath(); c.arc(x, cy, r, 0, TAU); c.clip();
  // warm gold key from the spotlight above, teal rim from the side lights
  const warm = c.createRadialGradient(x - r * 0.2, cy - r * 0.9, 0, x - r * 0.2, cy - r * 0.9, r * 1.2);
  warm.addColorStop(0, 'rgba(255,214,140,0.22)'); warm.addColorStop(1, 'rgba(255,214,140,0)');
  c.fillStyle = warm; c.fillRect(x - r, cy - r, r * 2, r * 2);
  const rim = c.createLinearGradient(x + r * 0.55, 0, x + r, 0);
  rim.addColorStop(0, 'rgba(47,224,208,0)'); rim.addColorStop(1, 'rgba(47,224,208,0.38)');
  c.fillStyle = rim; c.fillRect(x, cy - r, r, r * 2);
  const bl = c.createLinearGradient(0, cy + r * 0.3, 0, cy + r);
  bl.addColorStop(0, 'rgba(120,90,140,0)'); bl.addColorStop(1, 'rgba(90,70,120,0.3)');
  c.fillStyle = bl; c.fillRect(x - r, cy, r * 2, r);
  const strokeSurf = (fn, w, col) => {
    c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); let on = false;
    for (let i = 0; i <= 24; i++) {
      const [az, el] = fn(i / 24), n = sph(az, el);
      if (vis(n) > 0.03) { const q = proj(n), X = x + q.x * r, Y = cy + q.y * r; on ? c.lineTo(X, Y) : c.moveTo(X, Y); on = true; } else on = false;
    }
    c.stroke();
  };
  const crease = u => [butt, -0.6 + u * 1.22];
  strokeSurf(crease, r * 0.16, 'rgba(110,118,132,0.22)');
  strokeSurf(crease, Math.max(1.6, r * 0.075), 'rgba(78,84,96,0.92)');
  for (const s of [-1, 1]) strokeSurf(u => [butt + s * (0.05 + 0.6 * u), -0.08 - 0.24 * Math.sin(Math.PI * (0.15 + 0.85 * u))], Math.max(1.1, r * 0.05), 'rgba(84,90,104,0.7)');
  for (const s of [-1, 1]) {
    c.save();
    const v = surfaceFrame(c, x, cy, r, butt + s * 0.4, 0.15);
    if (v > 0.05) {
      const hg = c.createRadialGradient(0, 0, 0, 0, 0, r * 0.42);
      const glow = opts.charge || 0;
      hg.addColorStop(0, glow > 0 ? `rgba(255,${220 - glow * 40},${120 - glow * 60},${0.4 + 0.5 * glow * v})` : `rgba(255,255,255,${0.55 * v})`);
      hg.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = hg; c.beginPath(); c.arc(0, 0, r * 0.42, 0, TAU); c.fill();
    }
    c.restore();
  }
  const look = opts.lookAway ? 0.12 : 0; // shy eyes glance sideways
  for (const s of [-1, 1]) {
    c.save();
    const v = surfaceFrame(c, x, cy, r, face + s * 0.3 + look, 0.42);
    if (v > 0.03) {
      c.fillStyle = '#0c0d10';
      if (opts.squint) { c.fillRect(-r * 0.1, -r * 0.03, r * 0.2, r * 0.06); }
      else { pill(c, r * 0.085, r * 0.17 * (opts.blink ? 0.15 : 1)); c.fill(); }
    }
    c.restore();
  }
  c.restore();
  const hl = c.createRadialGradient(x - r * 0.36, cy - r * 0.46, 0, x - r * 0.36, cy - r * 0.46, r * 0.3);
  hl.addColorStop(0, 'rgba(255,255,255,0.95)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = hl; c.beginPath(); c.arc(x - r * 0.36, cy - r * 0.46, r * 0.3, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(40,46,60,0.55)'; c.lineWidth = 1.2; c.beginPath(); c.arc(x, cy, r - 0.5, 0, TAU); c.stroke();
  if (opts.flash > 0) { c.globalAlpha = opts.flash * 0.55; c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x, cy, r, 0, TAU); c.fill(); }
  c.restore();
  // shy sweat drops (blue, never pink)
  if (shy > 0.25) {
    const n = shy > 0.7 ? 3 : shy > 0.45 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const ph = ((opts.t || 0) * 0.9 + i * 0.37) % 1;
      const sx = x + (i % 2 ? 1 : -1) * r * (0.75 + i * 0.12), sy = cy - r * 0.55 + ph * r * 0.6;
      c.save(); c.globalAlpha = 0.85 * (1 - ph);
      c.fillStyle = '#8fe3ff'; c.strokeStyle = '#2a6f9a'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(sx, sy - r * 0.2); c.quadraticCurveTo(sx + r * 0.12, sy, sx, sy + r * 0.08); c.quadraticCurveTo(sx - r * 0.12, sy, sx, sy - r * 0.2); c.fill(); c.stroke();
      c.restore();
    }
  }
}

// ---------- rival sprites (pre-rendered once, fuzzy fur by many tiny strokes) ----------
const SPR = {};
function furStrokes(c, rand, n, inside, col, len, w) {
  c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const p = inside(rand);
    if (!p) continue;
    const a = p.a != null ? p.a + rnd(-0.5, 0.5) : rand() * TAU;
    const l = len * (0.5 + rand());
    c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + Math.cos(a) * l, p.y + Math.sin(a) * l); c.stroke();
  }
}
// Jollybob: beige hooded plush, hood flows into a pear body, peach face window, dot eyes, smile, blush, mitten arms, stubby legs
function buildJolly(S) { // S = sprite height in px; returns canvas, anchor at feet center
  const w = Math.round(S * 1.16), h = Math.round(S * 1.04);
  const k = makeCanvas(w, h), c = k.getContext('2d'), rand = seeded(7);
  const cx = w / 2, u = S / 100;
  const body = new Path2D();
  // pear: head dome + wider belly
  body.ellipse(cx, 36 * u, 30 * u, 30 * u, 0, 0, TAU);
  body.ellipse(cx, 66 * u, 37 * u, 30 * u, 0, 0, TAU);
  body.rect(cx - 30 * u, 36 * u, 60 * u, 30 * u);
  const arms = new Path2D();
  arms.ellipse(cx - 37 * u, 62 * u, 9 * u, 15 * u, 0.25, 0, TAU);
  arms.ellipse(cx + 37 * u, 62 * u, 9 * u, 15 * u, -0.25, 0, TAU);
  const legs = new Path2D();
  legs.ellipse(cx - 15 * u, 93 * u, 11 * u, 9 * u, 0, 0, TAU);
  legs.ellipse(cx + 15 * u, 93 * u, 11 * u, 9 * u, 0, 0, TAU);
  const shapes = [legs, arms, body];
  for (const p of shapes) {
    const g = c.createLinearGradient(0, 4 * u, 0, 100 * u);
    g.addColorStop(0, '#e9d7bb'); g.addColorStop(0.6, '#d8c09d'); g.addColorStop(1, '#b49a78');
    c.fillStyle = g; c.fill(p);
  }
  // fur
  const inAny = rand => { for (let t = 0; t < 6; t++) { const x = rand() * w, y = rand() * h; for (const p of shapes) if (c.isPointInPath(p, x, y)) return { x, y }; } return null; };
  furStrokes(c, rand, 2600 * (S / 140), inAny, 'rgba(255,245,225,0.35)', 2.2 * u, Math.max(0.7, 0.55 * u));
  furStrokes(c, rand, 1600 * (S / 140), inAny, 'rgba(120,95,70,0.25)', 2 * u, Math.max(0.6, 0.5 * u));
  // fuzzy outline hairs
  c.lineCap = 'round';
  for (const p of shapes) {
    for (let i = 0; i < 900 * (S / 140); i++) {
      const x = rand() * w, y = rand() * h;
      if (c.isPointInPath(p, x, y) && !c.isPointInPath(p, x + 3 * u * (rand() - 0.5) * 2, y + 3 * u * (rand() - 0.5) * 2)) {
        const a = Math.atan2(y - 60 * u, x - cx) + rnd(-0.6, 0.6);
        c.strokeStyle = rand() < 0.5 ? 'rgba(232,214,186,0.9)' : 'rgba(200,178,146,0.9)'; c.lineWidth = Math.max(0.7, 0.6 * u);
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 3 * u, y + Math.sin(a) * 3 * u); c.stroke();
      }
    }
  }
  // soft shading: bottom-right shadow, top-left warm light
  c.save(); c.clip(body);
  const sh = c.createRadialGradient(cx - 14 * u, 22 * u, 4 * u, cx, 60 * u, 50 * u);
  sh.addColorStop(0, 'rgba(255,236,200,0.35)'); sh.addColorStop(0.6, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(60,35,20,0.35)');
  c.fillStyle = sh; c.fillRect(0, 0, w, h); c.restore();
  // face window
  c.save();
  const fw = new Path2D(); fw.ellipse(cx, 37 * u, 20 * u, 15 * u, 0, 0, TAU);
  c.shadowColor = 'rgba(90,60,40,0.5)'; c.shadowBlur = 3 * u;
  const fg = c.createRadialGradient(cx - 5 * u, 31 * u, 2 * u, cx, 37 * u, 20 * u);
  fg.addColorStop(0, '#fde4cc'); fg.addColorStop(1, '#efc8a6');
  c.fillStyle = fg; c.fill(fw); c.restore();
  c.fillStyle = 'rgba(255,140,140,0.45)';
  c.beginPath(); c.ellipse(cx - 11 * u, 41 * u, 4.5 * u, 3 * u, 0, 0, TAU); c.ellipse(cx + 11 * u, 41 * u, 4.5 * u, 3 * u, 0, 0, TAU); c.fill();
  c.fillStyle = '#111';
  c.beginPath(); c.arc(cx - 8 * u, 35 * u, 2.4 * u, 0, TAU); c.arc(cx + 8 * u, 35 * u, 2.4 * u, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.arc(cx - 8.7 * u, 34.2 * u, 0.8 * u, 0, TAU); c.arc(cx + 7.3 * u, 34.2 * u, 0.8 * u, 0, TAU); c.fill();
  c.strokeStyle = '#2a1a12'; c.lineWidth = Math.max(1, 1.1 * u); c.beginPath(); c.arc(cx, 39 * u, 3.4 * u, 0.3, Math.PI - 0.3); c.stroke();
  // $49.99/hug price tag hanging from the right mitten (cream rectangle + string)
  if (S >= 90) {
    c.strokeStyle = '#7a6a55'; c.lineWidth = 0.8 * u; c.beginPath(); c.moveTo(cx + 41 * u, 72 * u); c.lineTo(cx + 44 * u, 78 * u); c.stroke();
    c.save(); c.translate(cx + 45 * u, 84 * u); c.rotate(0.12);
    c.fillStyle = '#fff1d6'; rr(c, -9 * u, -5 * u, 18 * u, 10 * u, 1.5 * u); c.fill(); c.strokeStyle = '#b08a5a'; c.lineWidth = 0.6 * u; c.stroke();
    c.fillStyle = '#c0392b'; c.font = `bold ${3.6 * u}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('$49.99/hug', 0, 0.2 * u);
    c.restore();
  }
  return { k, w, h, ax: w / 2, ay: 99 * u };
}
// a Dotz blob: neon fuzzy sphere with two round eyes
function buildDot(col, R) {
  const s = Math.ceil(R * 2.7), k = makeCanvas(s, s), c = k.getContext('2d'), cx = s / 2, rand = seeded(col.length * 31 + R);
  const g = c.createRadialGradient(cx - R * 0.35, cx - R * 0.4, R * 0.1, cx, cx, R * 1.05);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.18, col); g.addColorStop(1, shade(col, -0.45));
  c.fillStyle = g; c.beginPath(); c.arc(cx, cx, R, 0, TAU); c.fill();
  c.lineCap = 'round';
  for (let i = 0; i < R * 40; i++) { // fur
    const a = rand() * TAU, d = Math.sqrt(rand()) * R * 1.02, x = cx + Math.cos(a) * d, y = cx + Math.sin(a) * d;
    const l = R * (d > R * 0.8 ? 0.22 : 0.12) * (0.5 + rand());
    c.strokeStyle = rand() < 0.5 ? shade(col, 0.35) + 'aa' : shade(col, -0.3) + '99'; c.lineWidth = Math.max(0.7, R * 0.045);
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
  }
  for (const sx of [-1, 1]) {
    c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(cx + sx * R * 0.3, cx - R * 0.08, R * 0.2, R * 0.24, 0, 0, TAU); c.fill();
    c.fillStyle = '#120a18'; c.beginPath(); c.arc(cx + sx * R * 0.3 + R * 0.04, cx - R * 0.04, R * 0.11, 0, TAU); c.fill();
  }
  return { k, s };
}
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (k > 0) { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; } else { r *= 1 + k; g *= 1 + k; b *= 1 + k; }
  return '#' + [r, g, b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
}
const DOTCOLS = ['#b6ff3b', '#3bf0ff', '#ff3bd4', '#ffa51c', '#9b6cff'];
function initSprites() {
  SPR.jollyBig = buildJolly(150);
  SPR.jollySmall = buildJolly(64);
  SPR.dots = {};
  for (const c of DOTCOLS) SPR.dots[c] = { big: buildDot(c, 34), small: buildDot(c, 14) };
}
// Clawdeth: flat terracotta pixel block, two square black eyes, side arms, four stubby legs (voxel-shaded, drawn live)
function drawClawdeth(c, x, y, u, t, opts = {}) { // u = pixel size; x,y = feet center
  const step = opts.walk ? Math.floor(t * 8) % 2 : 0;
  const bw = 8 * u, bh = 5 * u; // body 8x5 "pixels"
  const top = y - 2 * u - bh - (opts.hop || 0);
  const L = x - bw / 2;
  c.save();
  if (!opts.noShadow) { c.globalAlpha = 0.4; c.fillStyle = '#000'; c.beginPath(); c.ellipse(x, y + u * 0.2, bw * 0.65 * Math.max(0.4, 1 - (opts.hop || 0) / 400), u * 1.3, 0, 0, TAU); c.fill(); c.globalAlpha = 1; }
  const front = opts.flash > 0 ? '#ffd9c8' : PAL.terra, side = '#a9553c', topc = '#ee9a7e', dark = '#7f3a27';
  const depth = u * 0.9;
  const box = (bx, by, bwid, bht) => { // voxel box with a top face and right side face
    c.fillStyle = side; c.beginPath(); c.moveTo(bx + bwid, by); c.lineTo(bx + bwid + depth, by - depth); c.lineTo(bx + bwid + depth, by + bht - depth); c.lineTo(bx + bwid, by + bht); c.fill();
    c.fillStyle = topc; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + depth, by - depth); c.lineTo(bx + bwid + depth, by - depth); c.lineTo(bx + bwid, by); c.fill();
    c.fillStyle = front; c.fillRect(bx, by, bwid, bht);
  };
  // legs (4 stubs), alternating while walking
  const legX = [0.5, 2.5, 4.5, 6.5];
  legX.forEach((lx, i) => { const lift = (i % 2 === step) && opts.walk ? u * 0.6 : 0; box(L + lx * u, top + bh, u, 2 * u - lift); });
  box(L, top, bw, bh);
  const armY = top + 1.5 * u + Math.sin(t * 6) * (opts.wave ? u * 0.6 : 0);
  box(L - 1.5 * u, armY, 1.5 * u, 1.8 * u); box(L + bw, armY, 1.5 * u, 1.8 * u);
  // eyes
  c.fillStyle = '#0b0b0b';
  const blink = (Math.floor(t * 10) % 37 === 0) ? 0.25 : 1;
  const eh = u * blink;
  c.fillRect(L + 1.4 * u, top + 1 * u + (u - eh) / 2, u, eh); c.fillRect(L + 5.6 * u, top + 1 * u + (u - eh) / 2, u, eh);
  if (opts.angry) { c.fillStyle = dark; c.fillRect(L + 1.1 * u, top + 0.55 * u, 1.6 * u, 0.3 * u); c.fillRect(L + 5.3 * u, top + 0.55 * u, 1.6 * u, 0.3 * u); }
  // subtle pixel grid texture
  c.globalAlpha = 0.07; c.fillStyle = '#000';
  for (let i = 1; i < 8; i++) c.fillRect(L + i * u, top, 1, bh);
  for (let j = 1; j < 5; j++) c.fillRect(L, top + j * u, bw, 1);
  c.restore();
}
