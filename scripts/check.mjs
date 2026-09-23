// Fast sanity checks for CI: charm art, physics stability, and syntax of the
// Electron main-process files. Run with: npm run check
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { COLLECTIONS, ALL_CHARMS } = await import(join(root, 'shared/charms.js'));
const engine = await import(join(root, 'shared/engine.js'));
const { ROPE_STYLES } = await import(join(root, 'shared/ropes.js'));

let failures = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    failures++;
    console.error(`✗ ${name}\n  ${err.message}`);
  }
}

check('every charm has valid SVG art', () => {
  const ids = new Set();
  for (const c of ALL_CHARMS) {
    assert.ok(!ids.has(c.id), `duplicate charm id ${c.id}`);
    ids.add(c.id);
    const file = join(root, 'shared/charms', c.file);
    assert.ok(existsSync(file), `missing ${c.file}`);
    const svg = readFileSync(file, 'utf8');
    assert.match(svg, /<svg[^>]+viewBox="0 0 200 200"/, `${c.file} needs viewBox 0 0 200 200`);
    assert.doesNotMatch(svg, /<script|on\w+=/i, `${c.file} must not contain scripts`);
  }
  const files = readdirSync(join(root, 'shared/charms')).filter((f) => f.endsWith('.svg'));
  const orphans = files.filter((f) => !ALL_CHARMS.some((c) => c.file === f));
  assert.deepEqual(orphans, [], `SVGs not in the manifest: ${orphans.join(', ')}`);
  assert.ok(COLLECTIONS.length >= 5);
});

check('main process knows every rope', () => {
  const settings = readFileSync(join(root, 'app/src/settings.js'), 'utf8');
  for (const r of ROPE_STYLES) assert.ok(settings.includes(`'${r.id}'`), `settings ROPES missing ${r.id}`);
});

check('physics settles and stays on screen', () => {
  const world = engine.createWorld({ width: 1440, height: 900 });
  const defs = ALL_CHARMS.slice(0, 5);
  defs.forEach((def, i) => engine.addCharm(world, { id: `c${i}`, def, size: 110, anchorX: 0.2 + i * 0.12, length: 250 + i * 20, weight: def.weight }));
  for (const c of world.charms) engine.nudge(c, 14);
  for (let t = 0; t < 60 * 30; t++) engine.stepWorld(world, 1 / 60);
  for (const c of world.charms) {
    for (const v of [c.p.x, c.p.y, c.angle, c.spin]) assert.ok(Number.isFinite(v), `${c.id} has a non-finite value`);
    assert.ok(c.p.x >= 0 && c.p.x <= world.width, `${c.id} left the screen (x=${c.p.x})`);
    assert.ok(c.p.y > 0 && c.p.y < world.height, `${c.id} left the screen (y=${c.p.y})`);
    const speed = Math.hypot(c.p.x - c.p.px, c.p.y - c.p.py);
    assert.ok(speed < 1.5, `${c.id} never settled (speed ${speed.toFixed(2)})`);
  }
});

check('dragging and flinging stays stable', () => {
  const world = engine.createWorld({ width: 1200, height: 800 });
  const c = engine.addCharm(world, { id: 'a', def: ALL_CHARMS[0], size: 100, anchorX: 0.5, length: 300 });
  engine.grab(world, c, c.p.x, c.p.y);
  for (let i = 0; i < 120; i++) {
    engine.setPointer(world, 600 + Math.sin(i / 5) * 500, 400 + Math.cos(i / 7) * 300);
    engine.stepWorld(world, 1 / 60);
  }
  engine.release(world);
  for (let i = 0; i < 600; i++) engine.stepWorld(world, 1 / 60);
  assert.ok(Number.isFinite(c.p.x) && c.p.y > 0 && c.p.y < 800);
});

check('main-process files parse', () => {
  for (const f of ['app/main.js', 'app/preload.js', ...readdirSync(join(root, 'app/src')).filter((f) => f.endsWith('.js')).map((f) => `app/src/${f}`)]) {
    execFileSync(process.execPath, ['--check', join(root, f)]);
  }
});

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nAll checks passed.');
