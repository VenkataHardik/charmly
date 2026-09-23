// Rope styles for the canvas. Each style draws a rope from the anchor (a) to
// the charm's attach point (b); a slack rope sags along a quadratic curve.

export const ROPE_STYLES = [
  { id: 'thread', name: 'Thread', metal: 'gold' },
  { id: 'leather', name: 'Leather', metal: 'gold' },
  { id: 'gold-chain', name: 'Gold Chain', metal: 'gold' },
  { id: 'silver-chain', name: 'Silver Chain', metal: 'silver' },
  { id: 'neon', name: 'Neon', metal: 'silver' },
  { id: 'spider-silk', name: 'Spider Silk', metal: 'silver' },
  { id: 'midnight-cord', name: 'Midnight Cord', metal: 'silver' },
  { id: 'temple-thread', name: 'Temple Thread', metal: 'gold' },
  { id: 'pearl-strand', name: 'Pearl Strand', metal: 'silver' },
];

export const NEON_COLORS = ['#5fe3ff', '#ff6fd8', '#ffd35f', '#8dff7a', '#b18cff', '#ffffff'];

export function ropeStyle(id) {
  return ROPE_STYLES.find((s) => s.id === id) || ROPE_STYLES[0];
}

export function drawRope(ctx, styleId, a, b, slack, opts = {}) {
  const ctrl = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + Math.max(0, slack) * 0.7 };
  const fn = DRAW[styleId] || DRAW.thread;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  fn(ctx, a, ctrl, b, opts);
  ctx.restore();
}

function path(ctx, a, c, b) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.quadraticCurveTo(c.x, c.y, b.x, b.y);
}

// Points spaced ~`gap` px apart along the curve, with the local direction.
function sample(a, c, b, gap) {
  const approx = Math.hypot(c.x - a.x, c.y - a.y) + Math.hypot(b.x - c.x, b.y - c.y);
  const n = Math.max(2, Math.round(approx / gap));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    const x = u * u * a.x + 2 * u * t * c.x + t * t * b.x;
    const y = u * u * a.y + 2 * u * t * c.y + t * t * b.y;
    const dx = 2 * u * (c.x - a.x) + 2 * t * (b.x - c.x);
    const dy = 2 * u * (c.y - a.y) + 2 * t * (b.y - c.y);
    pts.push({ x, y, ang: Math.atan2(dy, dx) });
  }
  return pts;
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function chain(ctx, a, c, b, fill, edge, shine) {
  const pts = sample(a, c, b, 6.5);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.ang);
    if (i % 2 === 0) {
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, 2.8, 0, 0, Math.PI * 2);
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = edge;
      ctx.stroke();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = fill;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, -0.8, 3.2, 1.2, 0, Math.PI * 1.1, Math.PI * 1.9);
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = shine;
      ctx.stroke();
    } else {
      ctx.fillStyle = edge;
      ctx.fillRect(-5, -1.3, 10, 2.6);
      ctx.fillStyle = fill;
      ctx.fillRect(-4.5, -0.7, 9, 1.4);
    }
    ctx.restore();
  }
}

const DRAW = {
  thread(ctx, a, c, b) {
    path(ctx, a, c, b);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.strokeStyle = '#dcc8a3';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  },

  leather(ctx, a, c, b) {
    path(ctx, a, c, b);
    ctx.strokeStyle = '#3b2213';
    ctx.lineWidth = 5.2;
    ctx.stroke();
    ctx.strokeStyle = '#7a4a2a';
    ctx.lineWidth = 3.8;
    ctx.stroke();
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = 'rgba(240,205,160,0.75)';
    ctx.lineWidth = 0.9;
    ctx.stroke();
  },

  'gold-chain'(ctx, a, c, b) {
    chain(ctx, a, c, b, '#e8bf5a', '#7a5413', 'rgba(255,248,220,0.9)');
  },

  'silver-chain'(ctx, a, c, b) {
    chain(ctx, a, c, b, '#d8dde5', '#5d6470', 'rgba(255,255,255,0.95)');
  },

  neon(ctx, a, c, b, { color = '#5fe3ff' }) {
    path(ctx, a, c, b);
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.strokeStyle = hexA(color, 0.35);
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.shadowBlur = 8;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 0.9;
    ctx.stroke();
  },

  'spider-silk'(ctx, a, c, b, { time = 0 }) {
    path(ctx, a, c, b);
    ctx.shadowColor = 'rgba(255,255,255,0.8)';
    ctx.shadowBlur = 6;
    ctx.strokeStyle = 'rgba(245,248,255,0.9)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.shadowBlur = 0;
    const pts = sample(a, c, b, 46);
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i];
      const r = 1.6 + ((i * 7) % 3) * 0.5;
      const g = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, 0.2, p.x, p.y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.6, 'rgba(190,225,255,0.55)');
      g.addColorStop(1, 'rgba(150,200,255,0.15)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y + 1.5 + Math.sin(time * 2 + i) * 0.4, r, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  'midnight-cord'(ctx, a, c, b) {
    path(ctx, a, c, b);
    ctx.strokeStyle = '#0c1330';
    ctx.lineWidth = 4.6;
    ctx.stroke();
    ctx.strokeStyle = '#26356e';
    ctx.lineWidth = 3.2;
    ctx.stroke();
    twist(ctx, a, c, b, 'rgba(140,160,255,0.55)', 4.5);
  },

  'temple-thread'(ctx, a, c, b) {
    path(ctx, a, c, b);
    ctx.strokeStyle = '#7d0d0d';
    ctx.lineWidth = 4.4;
    ctx.stroke();
    ctx.strokeStyle = '#d4161b';
    ctx.lineWidth = 3.2;
    ctx.stroke();
    twist(ctx, a, c, b, '#ffc928', 5);
  },

  'pearl-strand'(ctx, a, c, b) {
    path(ctx, a, c, b);
    ctx.strokeStyle = 'rgba(200,200,200,0.5)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    for (const p of sample(a, c, b, 7)) {
      const g = ctx.createRadialGradient(p.x - 1, p.y - 1.2, 0.3, p.x, p.y, 3.3);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.55, '#f1e9e0');
      g.addColorStop(1, '#b7aa9c');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.1, 0, Math.PI * 2);
      ctx.fill();
    }
  },
};

function twist(ctx, a, c, b, color, gap) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.1;
  for (const p of sample(a, c, b, gap)) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.ang + 0.9);
    ctx.beginPath();
    ctx.moveTo(-1.8, 0);
    ctx.lineTo(1.8, 0);
    ctx.stroke();
    ctx.restore();
  }
}
