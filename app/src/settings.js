// Settings: defaults, validation, migration and atomic saves.
const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const log = require('./logger');

const VERSION = 3;
const MAX_HUNG = 5;
const ROPES = [
  'thread', 'leather', 'gold-chain', 'silver-chain', 'neon',
  'spider-silk', 'midnight-cord', 'temple-thread', 'pearl-strand',
];
const REMINDER_KINDS = ['water', 'stretch', 'eyes', 'breathe'];

const DEFAULTS = {
  version: VERSION,
  visible: true,
  hung: [{ uid: 'h1', charmId: 'mochi-kitty', anchorX: 0.8, length: 260 }],
  favorites: ['mochi-kitty', 'golden-retriever', 'airliner', 'nazar'],
  rope: 'neon',
  ropeColor: '#5fe3ff',
  size: 110,
  opacity: 1,
  breeze: true,
  cursorWind: false,
  sound: true,
  volume: 0.4,
  displayId: null,
  reminders: { enabled: false, minutes: 45, kinds: ['water', 'stretch', 'eyes'] },
  onboarded: false,
};

const file = () => path.join(app.getPath('userData'), 'settings.json');

const num = (v, min, max, d) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d);
const bool = (v, d) => (typeof v === 'boolean' ? v : d);
const str = (v, re, d) => (typeof v === 'string' && re.test(v) ? v : d);
const ID = /^[a-z0-9-]{1,64}$/;

function sanitize(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  const hung = Array.isArray(s.hung)
    ? s.hung
        .filter((h) => h && ID.test(h.charmId || '') && ID.test(h.uid || ''))
        .slice(0, MAX_HUNG)
        .map((h) => ({
          uid: h.uid,
          charmId: h.charmId,
          anchorX: num(h.anchorX, 0.02, 0.98, 0.5),
          length: num(h.length, 50, 5000, 260),
        }))
    : DEFAULTS.hung;
  const r = s.reminders && typeof s.reminders === 'object' ? s.reminders : {};
  return {
    version: VERSION,
    visible: bool(s.visible, DEFAULTS.visible),
    hung,
    favorites: Array.isArray(s.favorites) ? [...new Set(s.favorites.filter((f) => ID.test(f)))].slice(0, 30) : DEFAULTS.favorites,
    rope: ROPES.includes(s.rope) ? s.rope : DEFAULTS.rope,
    ropeColor: str(s.ropeColor, /^#[0-9a-f]{6}$/i, DEFAULTS.ropeColor),
    size: num(s.size, 60, 220, DEFAULTS.size),
    opacity: num(s.opacity, 0.25, 1, DEFAULTS.opacity),
    breeze: bool(s.breeze, DEFAULTS.breeze),
    cursorWind: bool(s.cursorWind, DEFAULTS.cursorWind),
    sound: bool(s.sound, DEFAULTS.sound),
    volume: num(s.volume, 0, 1, DEFAULTS.volume),
    displayId: typeof s.displayId === 'number' ? s.displayId : null,
    reminders: {
      enabled: bool(r.enabled, DEFAULTS.reminders.enabled),
      minutes: num(r.minutes, 5, 240, DEFAULTS.reminders.minutes),
      kinds: Array.isArray(r.kinds) ? r.kinds.filter((k) => REMINDER_KINDS.includes(k)) : DEFAULTS.reminders.kinds,
    },
    onboarded: bool(s.onboarded, DEFAULTS.onboarded),
  };
}

// v1 was the single-spider prototype. v3 turned cursor wind off by default.
function migrate(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  if (raw.version === 2) return { ...raw, cursorWind: false };
  if (!raw.version) {
    return {
      visible: raw.visible,
      ropeColor: raw.threadColor,
      hung: raw.rope ? [{ uid: 'h1', charmId: 'mochi-kitty', anchorX: raw.rope.anchorX, length: raw.rope.length }] : undefined,
    };
  }
  return raw;
}

function load() {
  try {
    return sanitize(migrate(JSON.parse(fs.readFileSync(file(), 'utf8'))));
  } catch (err) {
    if (err.code !== 'ENOENT') log.warn('settings unreadable, using defaults:', err.message);
    return sanitize({});
  }
}

let pending = null;
function save(settings) {
  // Coalesce bursts (sliders, drags) into one write.
  clearTimeout(pending);
  pending = setTimeout(() => saveNow(settings), 250);
}

function saveNow(settings) {
  clearTimeout(pending);
  try {
    const f = file();
    fs.mkdirSync(path.dirname(f), { recursive: true });
    const tmp = `${f}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(settings, null, 2));
    fs.renameSync(tmp, f);
  } catch (err) {
    log.error('could not save settings', err);
  }
}

module.exports = { load, save, saveNow, sanitize, DEFAULTS, MAX_HUNG, ROPES };
