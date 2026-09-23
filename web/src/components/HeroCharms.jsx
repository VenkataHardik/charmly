'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createWorld,
  addCharm,
  stepWorld,
  hitTest,
  grab,
  release,
  setPointer,
  nudge,
  resizeWorld,
  toggleClimb,
} from '@/shared/engine.js';
import { drawWorld, loadImages } from '@/shared/render.js';
import { findCharm } from '@/shared/charms.js';

const DESKTOP = [
  ['mochi-kitty', 0.56, 0.3],
  ['golden-retriever', 0.67, 0.46],
  ['airliner', 0.78, 0.26],
  ['nazar', 0.88, 0.42],
  ['moon', 0.94, 0.22],
];
// On phones the copy sits below the charms, so ropes use fixed pixel lengths
// that stay inside the space reserved at the top of the hero.
const MOBILE = [
  ['mochi-kitty', 0.2, 200],
  ['golden-retriever', 0.5, 120],
  ['airliner', 0.8, 170],
];

const ROPES = [
  ['neon', 'Neon'],
  ['gold-chain', 'Gold chain'],
  ['pearl-strand', 'Pearls'],
  ['temple-thread', 'Temple thread'],
  ['spider-silk', 'Spider silk'],
];

// The same physics the desktop app uses: drag, fling, double-click to climb.
export default function HeroCharms() {
  const canvasRef = useRef(null);
  const [rope, setRope] = useState('neon');
  const ropeRef = useRef(rope);
  ropeRef.current = rope;

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas.parentElement;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let world = null;
    let images = {};
    let raf = 0;
    let visible = true;
    let down = null;
    let last = performance.now();
    let cancelled = false;

    const layout = () => (host.clientWidth < 900 ? MOBILE : DESKTOP);

    function build() {
      const w = host.clientWidth;
      const h = host.clientHeight;
      const small = w < 900;
      world = createWorld({ width: w, height: h });
      world.breeze = reduced ? 0 : 1;
      for (const [id, ax, len] of layout()) {
        const def = findCharm(id);
        const c = addCharm(world, {
          id,
          def,
          size: small ? 78 : Math.min(120, Math.max(90, w * 0.075)),
          anchorX: ax,
          length: len > 1 ? len : h * len + 60,
          weight: def.weight,
        });
        if (!reduced) nudge(c, 2 + Math.random() * 4);
      }
    }

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(host.clientWidth * dpr);
      canvas.height = Math.round(host.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const wasSmall = world && world.width < 900;
      const isSmall = host.clientWidth < 900;
      if (!world || wasSmall !== isSmall) build();
      else resizeWorld(world, host.clientWidth, host.clientHeight);
    }

    function local(e) {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function onMove(e) {
      if (!world) return;
      const p = local(e);
      setPointer(world, p.x, p.y);
      if (down && !down.moved && Math.hypot(p.x - down.x, p.y - down.y) > 4) {
        down.moved = true;
        grab(world, down.charm, down.x, down.y);
      }
      const over = !!hitTest(world, p.x, p.y);
      document.documentElement.style.cursor = world.dragged ? 'grabbing' : over ? 'grab' : '';
    }

    function onDown(e) {
      if (!world || e.button > 0) return;
      const p = local(e);
      const charm = hitTest(world, p.x, p.y);
      if (!charm) return;
      e.preventDefault();
      setPointer(world, p.x, p.y);
      down = { x: p.x, y: p.y, charm, moved: false };
    }

    function onUp() {
      if (!down) return;
      if (down.moved) release(world);
      else nudge(down.charm, 5);
      down = null;
      document.documentElement.style.cursor = '';
    }

    function onDbl(e) {
      if (!world) return;
      const p = local(e);
      const charm = hitTest(world, p.x, p.y);
      if (charm) toggleClimb(world, charm);
    }

    // Stop the page scrolling when a touch starts on a charm.
    function onTouchStart(e) {
      if (!world) return;
      const t = e.touches[0];
      const r = canvas.getBoundingClientRect();
      if (hitTest(world, t.clientX - r.left, t.clientY - r.top)) e.preventDefault();
    }

    function frame(now) {
      raf = 0;
      const dt = (now - last) / 1000;
      last = now;
      if (world) {
        stepWorld(world, dt);
        ctx.clearRect(0, 0, world.width, world.height);
        drawWorld(ctx, world, images, { rope: ropeRef.current, ropeColor: '#8fe3ff' });
      }
      if (visible) raf = requestAnimationFrame(frame);
    }

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    });

    const ro = new ResizeObserver(resize);
    resize();
    loadImages([...DESKTOP, ...MOBILE].map(([id]) => findCharm(id)), '/charms').then((imgs) => {
      if (cancelled) return;
      images = imgs;
    });

    ro.observe(host);
    io.observe(host);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('dblclick', onDbl);
    host.addEventListener('touchstart', onTouchStart, { passive: false });
    raf = requestAnimationFrame(frame);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('dblclick', onDbl);
      host.removeEventListener('touchstart', onTouchStart);
      document.documentElement.style.cursor = '';
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="hero-canvas" aria-hidden="true" />
      <div className="rope-picker" role="group" aria-label="Try a rope style">
        {ROPES.map(([id, label]) => (
          <button key={id} type="button" aria-pressed={rope === id} onClick={() => setRope(id)}>
            {label}
          </button>
        ))}
      </div>
    </>
  );
}
