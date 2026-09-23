// User-made charms: PNGs in userData/charms plus an index.json of names.
const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const log = require('./logger');

const MAX_BYTES = 4 * 1024 * 1024;
const dir = () => path.join(app.getPath('userData'), 'charms');
const indexFile = () => path.join(dir(), 'index.json');

function list() {
  try {
    const items = JSON.parse(fs.readFileSync(indexFile(), 'utf8'));
    return items.filter((c) => fs.existsSync(path.join(dir(), `${c.id}.png`)));
  } catch {
    return [];
  }
}

function writeIndex(items) {
  fs.mkdirSync(dir(), { recursive: true });
  const tmp = `${indexFile()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(items, null, 2));
  fs.renameSync(tmp, indexFile());
}

function add({ name, dataUrl }) {
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
  if (!m) throw new Error('Expected a PNG image');
  const buf = Buffer.from(m[1], 'base64');
  if (buf.length > MAX_BYTES) throw new Error('Image is too large');
  const id = `custom-${Date.now().toString(36)}`;
  fs.mkdirSync(dir(), { recursive: true });
  fs.writeFileSync(path.join(dir(), `${id}.png`), buf);
  const clean = String(name || 'My charm').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 40) || 'My charm';
  writeIndex([...list(), { id, name: clean, created: Date.now() }]);
  log.info('custom charm added', id);
  return id;
}

function remove(id) {
  if (!/^custom-[a-z0-9]+$/.test(id)) return;
  fs.rmSync(path.join(dir(), `${id}.png`), { force: true });
  writeIndex(list().filter((c) => c.id !== id));
}

// Resolves a charmly-media://charm/<file> request to a file path, or null.
function resolveFile(fileName) {
  if (!/^custom-[a-z0-9]+\.png$/.test(fileName)) return null;
  const f = path.join(dir(), fileName);
  return fs.existsSync(f) ? f : null;
}

module.exports = { list, add, remove, resolveFile };
