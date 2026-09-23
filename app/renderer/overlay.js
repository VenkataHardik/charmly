// Desktop overlay: every hung charm, simulated with the shared engine.
import {
  createWorld,
  addCharm,
  removeCharm,
  stepWorld,
  hitTest,
  grab,
  release,
  setPointer,
  applyWind,
  toggleClimb,
  nudge,
  wiggle,
  resizeWorld,
  setCharmSize,
  worldBounds,
  ropeSnapshot,
} from './shared/engine.js';
import { drawWorld } from './shared/render.js';
import { findCharm } from './shared/charms.js';
import { createSound } from './sound.js';

const api = window.charmly;
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const sound = createSound();

let settings = null;
let customs = [];
const images = {};
let interactive = false;
let prevBox = null;
let down = null; // { x, y, charm, moved }
let lastMove = { x: 0, y: 0, t: 0 };

const world = createWorld({
  width: window.innerWidth,
  height: window.innerHeight,
  onImpact: (strength, x) => sound.chime(strength, pan(x)),
});

function pan(x) {
  return (x / world.width) * 1.6 - 0.8;
}

// ---------- setup ----------
function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  resizeWorld(world, window.innerWidth, window.innerHeight);
  prevBox = null;
}

function resolveDef(charmId) {
  if (charmId.startsWith('custom-')) {
    const c = customs.find((x) => x.id === charmId);
    return c ? { id: c.id, name: c.name, src: c.src, weight: 1 } : null;
  }
  return findCharm(charmId);
}

function ensureImage(def) {
  const key = def.id;
  const src = def.src || `./shared/charms/${def.file}`;
  if (images[key] && images[key].dataset.src === src) return;
  const img = new Image();
  img.dataset.src = src;
  img.decoding = 'async';
  img.onload = () => {
    prevBox = null;
  };
  img.src = src;
  images[key] = img;
}

function applyState(state) {
  settings = state.settings;
  customs = state.custom;
  sound.configure(settings);
  world.breeze = settings.breeze ? 1 : 0;

  const want = new Map(settings.hung.map((h) => [h.uid, h]));
  for (const c of [...world.charms]) if (!want.has(c.id)) removeCharm(world, c.id);

  for (const h of settings.hung) {
    const def = resolveDef(h.charmId);
    if (!def) continue;
    ensureImage(def);
    const size = settings.size * (def.weight > 1.3 ? 0.9 : 1);
    const existing = world.charms.find((c) => c.id === h.uid);
    if (existing) {
      existing.def = def;
      existing.weight = def.weight || 1;
      setCharmSize(world, existing, size);
    } else {
      const c = addCharm(world, { id: h.uid, def, size, anchorX: h.anchorX, length: h.length, weight: def.weight || 1 });
      // A new charm drops in with a little swing.
      c.p.y = c.p.py = Math.max(20, c.length * 0.4);
      nudge(c, 3);
    }
  }
  prevBox = null;
}

function saveRopes() {
  api.saveRopes(world.charms.map((c) => ({ uid: c.id, ...ropeSnapshot(world, c) })));
}

// ---------- interaction ----------
function setInteractive(on) {
  if (on === interactive) return;
  interactive = on;
  api.setInteractive(on);
  document.body.classList.toggle('grab', on && !world.dragged);
}

window.addEventListener('mousemove', (e) => {
  const now = performance.now();
  const dt = Math.max(1, now - lastMove.t) / 1000;
  const vx = (e.clientX - lastMove.x) / dt;
  const vy = (e.clientY - lastMove.y) / dt;
  if (lastMove.t && settings && settings.cursorWind && !world.dragged && now - lastMove.t < 100) {
    applyWind(world, e.clientX, e.clientY, vx, vy);
  }
  lastMove = { x: e.clientX, y: e.clientY, t: now };

  setPointer(world, e.clientX, e.clientY);
  if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4 && !down.moved) {
    down.moved = true;
    grab(world, down.charm, down.x, down.y);
    document.body.classList.remove('grab');
    document.body.classList.add('grabbing');
  }
  if (!world.dragged) setInteractive(!!hitTest(world, e.clientX, e.clientY));
});

window.addEventListener('mousedown', (e) => {
  const charm = hitTest(world, e.clientX, e.clientY);
  if (!charm) return;
  if (e.button === 2) {
    api.charmMenu(charm.id);
    return;
  }
  if (e.button !== 0) return;
  setPointer(world, e.clientX, e.clientY);
  down = { x: e.clientX, y: e.clientY, charm, moved: false };
});

window.addEventListener('mouseup', (e) => {
  if (!down) return;
  const { charm, moved } = down;
  down = null;
  document.body.classList.remove('grabbing');
  if (moved) {
    const c = release(world);
    if (c) {
      const speed = Math.hypot(c.p.x - c.p.px, c.p.y - c.p.py);
      if (speed > 4) sound.whoosh(Math.min(1, speed / 14), pan(c.p.x));
    }
    saveRopes();
  } else {
    nudge(charm, 5);
    sound.tick(pan(charm.p.x));
  }
  setInteractive(!!hitTest(world, e.clientX, e.clientY));
});

window.addEventListener('dblclick', (e) => {
  const charm = hitTest(world, e.clientX, e.clientY);
  if (!charm) return;
  toggleClimb(world, charm);
  setTimeout(saveRopes, 1500);
});

window.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('mouseleave', () => {
  if (!world.dragged) setInteractive(false);
});

window.addEventListener('resize', resize);

api.onState(applyState);

api.onCommand((cmd) => {
  if (!cmd) return;
  if (cmd.type === 'swing') {
    for (const c of world.charms) nudge(c, 5 + Math.random() * 4);
  } else if (cmd.type === 'climb') {
    const c = world.charms.find((x) => x.id === cmd.uid);
    if (c) {
      toggleClimb(world, c);
      setTimeout(saveRopes, 1500);
    }
  } else if (cmd.type === 'reminder') {
    const c = world.charms[world.charms.length - 1];
    if (!c) return;
    wiggle(c);
    c.bubble = { text: cmd.text, until: world.time + 8 };
    sound.reminder();
  } else if (cmd.type === 'reset') {
    for (const c of [...world.charms]) removeCharm(world, c.id);
  }
});

// ---------- loop ----------
let last = performance.now();

function frame(now) {
  const dt = (now - last) / 1000;
  last = now;
  stepWorld(world, dt);

  // Clear only where we drew last frame; the canvas covers the whole screen.
  const box = worldBounds(world, 60);
  if (prevBox) ctx.clearRect(prevBox.x0, prevBox.y0, prevBox.x1 - prevBox.x0, prevBox.y1 - prevBox.y0);
  else ctx.clearRect(0, 0, world.width, world.height);
  if (box) {
    const hasBubble = world.charms.some((c) => c.bubble && c.bubble.until > world.time);
    if (hasBubble) {
      box.x0 -= 320;
      box.x1 += 320;
    }
  }
  prevBox = box;

  if (settings) {
    drawWorld(ctx, world, images, { rope: settings.rope, ropeColor: settings.ropeColor, opacity: settings.opacity });
  }

  // A charm can swing under a still pointer; keep hover state honest.
  if (!world.dragged && !down) setInteractive(!!hitTest(world, world.pointer.x, world.pointer.y));

  requestAnimationFrame(frame);
}

resize();
api.getState().then((state) => {
  applyState(state);
  requestAnimationFrame(frame);
});
