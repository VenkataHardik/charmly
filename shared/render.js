// Draws a world of hanging charms: ropes, jump rings, the charm art with a
// soft shadow, a twist squash, and optional speech bubbles.

import { drawRope, ropeStyle } from './ropes.js';

const RING = 0.1; // jump-ring height as a fraction of charm size

export function drawWorld(ctx, world, images, opts = {}) {
  const { rope = 'thread', ropeColor, opacity = 1 } = opts;
  const style = ropeStyle(rope);

  ctx.save();
  ctx.globalAlpha = opacity;
  for (const c of world.charms) {
    const slack = c.length - Math.hypot(c.p.x - c.anchor.x, c.p.y - c.anchor.y);
    drawRope(ctx, style.id, c.anchor, c.p, slack, { color: ropeColor, time: world.time });
  }
  for (const c of world.charms) drawCharm(ctx, c, images[c.def?.id], style.metal, c.def?.hook);
  ctx.restore();

  for (const c of world.charms) if (c.bubble && c.bubble.until > world.time) drawBubble(ctx, c, c.bubble.text, world.width);
}

export function drawCharm(ctx, c, img, metal = 'gold', hook = 0) {
  const s = c.size;
  const ring = s * RING;
  ctx.save();
  ctx.translate(c.p.x, c.p.y);
  ctx.rotate(-c.angle);

  // Jump ring.
  ctx.lineWidth = Math.max(1.4, s * 0.022);
  ctx.strokeStyle = metal === 'gold' ? '#c9982e' : '#aeb5c0';
  ctx.beginPath();
  ctx.ellipse(0, ring * 0.5, ring * 0.32, ring * 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = metal === 'gold' ? 'rgba(255,240,190,0.9)' : 'rgba(255,255,255,0.9)';
  ctx.lineWidth *= 0.45;
  ctx.beginPath();
  ctx.ellipse(0, ring * 0.5, ring * 0.32, ring * 0.5, 0, Math.PI * 1.1, Math.PI * 1.6);
  ctx.stroke();

  if (img && img.complete && img.naturalWidth) {
    const face = Math.cos(c.spin);
    const sx = Math.sign(face || 1) * Math.max(0.06, Math.abs(face));
    const h = s - ring;
    const w = img.naturalWidth && img.naturalHeight ? Math.min(h * 1.4, (img.naturalWidth / img.naturalHeight) * h) : h;
    ctx.translate(0, ring * 0.85);
    if (hook) {
      // Link from the ring down to where the art begins.
      ctx.strokeStyle = metal === 'gold' ? '#c9982e' : '#aeb5c0';
      ctx.lineWidth = Math.max(1.4, s * 0.02);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, (h * hook) / 200 + 2);
      ctx.stroke();
    }
    ctx.scale(sx, 1);
    ctx.shadowColor = 'rgba(0,0,0,0.38)';
    ctx.shadowBlur = s * 0.14;
    ctx.shadowOffsetY = s * 0.07;
    // The back of a charm is a touch darker.
    if (face < 0) ctx.filter = `brightness(${0.62 + 0.3 * (1 + face)})`;
    ctx.drawImage(img, -w / 2, 0, w, h);
  }
  ctx.restore();
}

function drawBubble(ctx, c, text, worldWidth) {
  const s = c.size;
  const x = c.p.x + s * 0.55;
  const y = c.p.y + s * 0.2;
  ctx.save();
  ctx.font = '600 14px -apple-system, "Segoe UI", system-ui, sans-serif';
  const w = ctx.measureText(text).width + 24;
  const h = 32;
  const left = x + w > worldWidth - 10 ? c.p.x - s * 0.55 - w : x;
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = 'rgba(255,255,255,0.97)';
  roundRect(ctx, left, y - h / 2, w, h, 16);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#1d1a2b';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, left + 12, y + 1);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Loads charm images keyed by charm id. Resolves once all have settled.
export function loadImages(defs, baseUrl) {
  const images = {};
  return Promise.all(
    defs.map(
      (d) =>
        new Promise((resolve) => {
          const img = new Image();
          img.decoding = 'async';
          img.onload = img.onerror = () => resolve();
          img.src = d.src || `${baseUrl}/${d.file}`;
          images[d.id] = img;
        }),
    ),
  ).then(() => images);
}
