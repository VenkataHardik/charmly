// Charm physics shared by the desktop overlay and the website hero.
//
// Each charm is a Verlet point (the attach point) on a rope that only pulls,
// plus two secondary motions that make it feel like a real object:
//   angle - the charm's tilt lags the rope and springs back (wobble)
//   spin  - twist around the rope, drawn as a horizontal squash (cos(spin))

export const STEP = 1 / 120;

const GRAVITY = 2200; // px/s²
const DAMPING = 0.996; // per step
const MAX_V = 14; // px per step; stops flings looping over the top
const MIN_LENGTH = 50;
const TILT_K = 140; // tilt spring stiffness (1/s²)
const TILT_C = 5.5; // tilt damping (1/s)
const SPIN_K = 3.2; // twist spring (the rope unwinding)
const SPIN_C = 0.55;

export function createWorld({ width, height, onImpact } = {}) {
  const world = {
    width,
    height,
    charms: [],
    time: 0,
    breeze: 0, // 0..1 idle sway strength
    onImpact: onImpact || null,
    dragged: null,
    pointer: { x: -1e4, y: -1e4 },
    acc: 0,
  };
  return world;
}

// size = visual height of the charm in px (ring included).
export function addCharm(world, { id, def, size, anchorX, length, weight = 1 }) {
  const ax = clamp(anchorX ?? 0.5, 0.02, 0.98) * world.width;
  const len = clamp(length ?? world.height * 0.3, MIN_LENGTH, maxLength(world, size));
  const charm = {
    id,
    def,
    size,
    weight,
    anchor: { x: ax, y: -4 },
    p: { x: ax, y: len - 4, px: ax, py: len - 4 },
    length: len,
    restLength: len,
    targetLength: null,
    angle: 0,
    angVel: 0,
    spin: 0,
    spinVel: 0,
    seed: Math.random() * 1000,
    lastImpact: 0,
    grab: { x: 0, y: 0 },
  };
  world.charms.push(charm);
  return charm;
}

export function removeCharm(world, id) {
  world.charms = world.charms.filter((c) => c.id !== id);
  if (world.dragged && world.dragged.id === id) world.dragged = null;
}

export function resizeWorld(world, width, height) {
  for (const c of world.charms) {
    const fx = c.anchor.x / world.width;
    c.anchor.x = fx * width;
    c.p.x = c.p.px = c.anchor.x + (c.p.x - c.anchor.x);
  }
  world.width = width;
  world.height = height;
  for (const c of world.charms) {
    c.length = clamp(c.length, MIN_LENGTH, maxLength(world, c.size));
    c.restLength = clamp(c.restLength, MIN_LENGTH, maxLength(world, c.size));
  }
}

export function setCharmSize(world, charm, size) {
  charm.size = size;
  charm.length = clamp(charm.length, MIN_LENGTH, maxLength(world, size));
  charm.restLength = clamp(charm.restLength, MIN_LENGTH, maxLength(world, size));
}

// Where the charm's body is, in screen space.
export function charmCenter(c) {
  const d = c.size * 0.55;
  return { x: c.p.x + Math.sin(c.angle) * d, y: c.p.y + Math.cos(c.angle) * d, r: c.size * 0.46 };
}

export function hitTest(world, x, y) {
  for (let i = world.charms.length - 1; i >= 0; i--) {
    const c = world.charms[i];
    const cc = charmCenter(c);
    if (Math.hypot(x - cc.x, y - cc.y) <= cc.r) return c;
  }
  return null;
}

// ---------- interaction ----------
export function grab(world, charm, x, y) {
  world.dragged = charm;
  charm.targetLength = null;
  charm.grab = { x: charm.p.x - x, y: charm.p.y - y };
  // Bring to front.
  world.charms = world.charms.filter((c) => c !== charm).concat(charm);
}

export function release(world) {
  const c = world.dragged;
  world.dragged = null;
  if (!c) return null;
  const vx = c.p.x - c.p.px;
  c.spinVel += clamp(vx, -MAX_V, MAX_V) * 0.9; // a sideways fling twists the rope
  return c;
}

export function setPointer(world, x, y) {
  world.pointer.x = x;
  world.pointer.y = y;
}

export function nudge(charm, strength = 7) {
  const dir = Math.random() < 0.5 ? -1 : 1;
  charm.p.px -= dir * strength;
  charm.spinVel += dir * strength * 0.5;
}

export function wiggle(charm) {
  charm.angVel += (Math.random() < 0.5 ? -1 : 1) * 9;
  charm.spinVel += 6;
}

// Climb toward the top, or drop back down.
export function toggleClimb(world, charm) {
  const climb = Math.max(MIN_LENGTH, charm.size * 0.9);
  if (charm.length > climb + 5) {
    charm.restLength = charm.length;
    charm.targetLength = climb;
  } else {
    charm.targetLength = clamp(Math.max(charm.restLength, climb + 120), MIN_LENGTH, maxLength(world, charm.size));
    charm.restLength = charm.targetLength;
  }
}

// Pointer motion as wind: a fast pass near a charm pushes it.
export function applyWind(world, x, y, vx, vy) {
  const R = 170;
  for (const c of world.charms) {
    if (c === world.dragged) continue;
    const cc = charmCenter(c);
    const d = Math.hypot(x - cc.x, y - cc.y);
    if (d > R) continue;
    const f = (1 - d / R) * 0.0035 / c.weight;
    c.p.px -= clamp(vx * f, -3, 3);
    c.p.py -= clamp(vy * f * 0.4, -2, 2);
    c.spinVel += clamp(vx * f * 0.25, -2, 2);
  }
}

// ---------- simulation ----------
export function stepWorld(world, dt) {
  world.acc += Math.min(dt, 0.1);
  while (world.acc >= STEP) {
    world.time += STEP;
    for (const c of world.charms) stepCharm(world, c);
    collide(world);
    world.acc -= STEP;
  }
}

function stepCharm(world, c) {
  const p = c.p;

  if (c === world.dragged) {
    const tx = world.pointer.x + c.grab.x;
    const ty = Math.max(c.anchor.y + MIN_LENGTH, world.pointer.y + c.grab.y);
    p.px = p.x;
    p.py = p.y;
    p.x += (tx - p.x) * 0.5;
    p.y += (ty - p.y) * 0.5;
    // The anchor glides along the top edge so the charm can be moved anywhere.
    c.anchor.x += (p.x - c.anchor.x) * 0.02;
    c.length = clamp(Math.hypot(p.x - c.anchor.x, p.y - c.anchor.y), MIN_LENGTH, maxLength(world, c.size));
    c.restLength = c.length;
  } else {
    if (c.targetLength !== null) {
      c.length += (c.targetLength - c.length) * 0.04;
      if (Math.abs(c.targetLength - c.length) < 0.5) {
        c.length = c.targetLength;
        c.targetLength = null;
      }
    }

    let vx = (p.x - p.px) * DAMPING;
    let vy = (p.y - p.py) * DAMPING;
    const v = Math.hypot(vx, vy);
    if (v > MAX_V) {
      vx *= MAX_V / v;
      vy *= MAX_V / v;
    }
    if (world.breeze > 0) {
      const t = world.time * 0.6 + c.seed;
      vx += (Math.sin(t) * 0.6 + Math.sin(t * 2.3) * 0.4) * 0.0035 * world.breeze;
    }
    p.px = p.x;
    p.py = p.y;
    p.x += vx;
    p.y += vy + GRAVITY * STEP * STEP;

    const dx = p.x - c.anchor.x;
    const dy = p.y - c.anchor.y;
    const d = Math.hypot(dx, dy);
    if (d > c.length) {
      p.x = c.anchor.x + (dx / d) * c.length;
      p.y = c.anchor.y + (dy / d) * c.length;
    }

    const margin = c.size * 0.4;
    if (p.x < margin || p.x > world.width - margin) {
      p.x = clamp(p.x, margin, world.width - margin);
      p.px = p.x + (p.x - p.px) * 0.4;
    }
    if (p.y < 8) {
      p.y = 8;
      p.py = p.y;
    }
  }

  // Tilt: spring toward the rope direction, with a little lag.
  const ropeAngle = Math.atan2(p.x - c.anchor.x, p.y - c.anchor.y);
  c.angVel += (-(c.angle - ropeAngle) * TILT_K - c.angVel * TILT_C) * STEP;
  c.angle += c.angVel * STEP;

  // Twist: the rope winds up and slowly unwinds.
  c.spinVel += (-c.spin * SPIN_K - c.spinVel * SPIN_C) * STEP;
  c.spinVel = clamp(c.spinVel, -40, 40);
  c.spin += c.spinVel * STEP;
}

function collide(world) {
  const cs = world.charms;
  for (let i = 0; i < cs.length; i++) {
    for (let j = i + 1; j < cs.length; j++) {
      const a = cs[i];
      const b = cs[j];
      const ca = charmCenter(a);
      const cb = charmCenter(b);
      const dx = cb.x - ca.x;
      const dy = cb.y - ca.y;
      const d = Math.hypot(dx, dy) || 0.001;
      const min = (ca.r + cb.r) * 0.85;
      if (d >= min) continue;

      const nx = dx / d;
      const ny = dy / d;
      const overlap = min - d;
      const aFixed = a === world.dragged;
      const bFixed = b === world.dragged;
      const wa = aFixed ? 0 : bFixed ? 1 : b.weight / (a.weight + b.weight);
      const wb = bFixed ? 0 : aFixed ? 1 : a.weight / (a.weight + b.weight);

      // Relative velocity along the normal, for the impact sound.
      const rv = (b.p.x - b.p.px - (a.p.x - a.p.px)) * nx + (b.p.y - b.p.py - (a.p.y - a.p.py)) * ny;

      a.p.x -= nx * overlap * wa;
      a.p.y -= ny * overlap * wa;
      b.p.x += nx * overlap * wb;
      b.p.y += ny * overlap * wb;
      a.angVel -= nx * overlap * 0.6 * wa;
      b.angVel += nx * overlap * 0.6 * wb;

      const strength = Math.min(1, Math.max(0, -rv) / 8);
      if (strength > 0.12 && world.onImpact && world.time - Math.max(a.lastImpact, b.lastImpact) > 0.12) {
        a.lastImpact = b.lastImpact = world.time;
        world.onImpact(strength, (ca.x + cb.x) / 2, (ca.y + cb.y) / 2);
      }
    }
  }
}

// Bounding box of everything drawn, for partial canvas clears.
export function worldBounds(world, pad = 40) {
  if (!world.charms.length) return null;
  let x0 = Infinity;
  let y0 = 0;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const c of world.charms) {
    const r = c.size * 1.2 + pad;
    x0 = Math.min(x0, c.anchor.x - pad, c.p.x - r);
    x1 = Math.max(x1, c.anchor.x + pad, c.p.x + r);
    y1 = Math.max(y1, c.p.y + r * 1.3);
  }
  return { x0, y0, x1, y1 };
}

export function ropeSnapshot(world, c) {
  return { anchorX: c.anchor.x / world.width, length: c.restLength };
}

function maxLength(world, size) {
  return Math.max(MIN_LENGTH + 10, world.height - size * 1.2 - 30);
}

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
