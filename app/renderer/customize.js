// Customize window: library, create, appearance, sound, general.
import { COLLECTIONS, findCharm } from './shared/charms.js';
import { ROPE_STYLES, NEON_COLORS, drawRope } from './shared/ropes.js';

const api = window.charmly;
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

let state = null;
let activeCollection = COLLECTIONS[0].id;
const MAX_HUNG = 5;

// ---------- helpers ----------
function charmSrc(id) {
  if (id.startsWith('custom-')) {
    const c = state.custom.find((x) => x.id === id);
    return c ? c.src : '';
  }
  const def = findCharm(id);
  return def ? `./shared/charms/${def.file}` : '';
}

function charmName(id) {
  if (id.startsWith('custom-')) return state.custom.find((x) => x.id === id)?.name || 'My charm';
  return findCharm(id)?.name || id;
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (k === 'style') node.style.cssText = v;
    else if (v !== false && v != null) node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children) if (c != null) node.append(c);
  return node;
}

let toastTimer;
function toast(text) {
  const t = $('#toast');
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 2200);
}

// Sets a control's value unless the user is interacting with it right now.
function setValue(input, value) {
  if (document.activeElement === input && input.type === 'range') return;
  if (input.type === 'checkbox') input.checked = !!value;
  else input.value = value;
}

// ---------- tabs ----------
function openTab(name) {
  if (!document.getElementById(`tab-${name}`)) name = 'library';
  $$('nav button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  $$('.tab').forEach((t) => t.classList.toggle('active', t.id === `tab-${name}`));
  if (name === 'appearance') drawRopePreviews();
}

$$('nav button').forEach((b) => b.addEventListener('click', () => openTab(b.dataset.tab)));
api.onOpenTab(openTab);

// ---------- library ----------
function collections() {
  const starred = { id: 'starred', name: '★ Starred', blurb: 'Your favourites. These also appear in the menu bar.', accent: '#ffd35f' };
  const mine = { id: 'mine', name: 'My Charms', blurb: 'Charms you made in Create.', accent: '#b18cff' };
  return [...COLLECTIONS, mine, starred];
}

function charmsFor(colId) {
  if (colId === 'mine') return state.custom.map((c) => ({ id: c.id, name: c.name, custom: true }));
  if (colId === 'starred') return state.settings.favorites.filter((id) => charmSrc(id)).map((id) => ({ id, name: charmName(id) }));
  return COLLECTIONS.find((c) => c.id === colId)?.charms || [];
}

function renderLibrary() {
  const { settings } = state;

  // Hanging now
  const list = $('#hung-list');
  list.replaceChildren(
    ...(settings.hung.length
      ? settings.hung.map((h) =>
          el(
            'div',
            { class: 'hung-item' },
            el('img', { src: charmSrc(h.charmId), alt: '' }),
            el('span', {}, charmName(h.charmId)),
            el('button', { title: 'Take down', onclick: () => api.unhang(h.uid) }, '×'),
          ),
        )
      : [el('span', { class: 'empty' }, 'Nothing hanging. Pick a charm below.')]),
  );
  $('#hung-count').textContent = `${settings.hung.length}/${MAX_HUNG}`;

  // Collection chips
  const cols = collections();
  $('#collection-tabs').replaceChildren(
    ...cols.map((c) =>
      el(
        'button',
        {
          class: c.id === activeCollection ? 'active' : '',
          style: `--chip:${c.accent}`,
          onclick: () => {
            activeCollection = c.id;
            renderLibrary();
          },
        },
        c.name,
      ),
    ),
  );
  const col = cols.find((c) => c.id === activeCollection);
  $('#collection-blurb').textContent = col ? col.blurb : '';

  // Grid
  const hungIds = new Set(settings.hung.map((h) => h.charmId));
  const full = settings.hung.length >= MAX_HUNG;
  const items = charmsFor(activeCollection);
  const grid = $('#charm-grid');
  if (!items.length) {
    grid.replaceChildren(
      el(
        'p',
        { class: 'empty' },
        activeCollection === 'mine' ? 'No custom charms yet. Make one in Create.' : 'Star a charm to keep it here.',
      ),
    );
    return;
  }
  grid.replaceChildren(
    ...items.map((c) => {
      const fav = settings.favorites.includes(c.id);
      return el(
        'div',
        { class: `card${hungIds.has(c.id) ? ' on' : ''}`, onclick: () => hang(c.id, 'replace') },
        el('span', { class: 'string' }),
        el('button', {
          class: `star${fav ? ' on' : ''}`,
          title: fav ? 'Unstar' : 'Star (shows in the menu bar)',
          onclick: (e) => {
            e.stopPropagation();
            api.toggleFavorite(c.id);
          },
        }, fav ? '★' : '☆'),
        c.custom
          ? el('button', {
              class: 'del',
              title: 'Delete this charm',
              onclick: (e) => {
                e.stopPropagation();
                api.deleteCustom(c.id);
                toast('Charm deleted');
              },
            }, '🗑')
          : null,
        el('img', { src: charmSrc(c.id), alt: c.name, loading: 'lazy' }),
        el('div', { class: 'name' }, c.name),
        el(
          'div',
          { class: 'actions' },
          el('button', { class: 'ghost', onclick: (e) => (e.stopPropagation(), hang(c.id, 'replace')) }, 'Hang'),
          el(
            'button',
            {
              class: 'ghost',
              disabled: full,
              title: full ? `Up to ${MAX_HUNG} at once` : 'Hang alongside the others',
              onclick: (e) => (e.stopPropagation(), hang(c.id, 'add')),
            },
            '+ Add',
          ),
        ),
      );
    }),
  );
}

function hang(id, mode) {
  api.hang(id, mode);
  toast(mode === 'add' ? `${charmName(id)} joined the line-up` : `${charmName(id)} is hanging`);
}

$('#swing-all').addEventListener('click', () => api.swing());

// ---------- create ----------
const drop = $('#drop');
const fileInput = $('#file');
const preview = $('#preview');
let source = null; // ImageBitmap-like canvas of the original, max 1024px

['dragenter', 'dragover'].forEach((t) =>
  drop.addEventListener(t, (e) => {
    e.preventDefault();
    drop.classList.add('over');
  }),
);
['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, () => drop.classList.remove('over')));
drop.addEventListener('drop', (e) => {
  e.preventDefault();
  const f = e.dataTransfer.files[0];
  if (f) loadFile(f);
});
fileInput.addEventListener('change', () => fileInput.files[0] && loadFile(fileInput.files[0]));

async function loadFile(file) {
  if (!file.type.startsWith('image/')) return toast('That isn’t an image');
  if (file.size > 25 * 1024 * 1024) return toast('Please pick an image under 25 MB');
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, 1024 / Math.max(img.naturalWidth, img.naturalHeight));
    source = document.createElement('canvas');
    source.width = Math.max(1, Math.round(img.naturalWidth * scale));
    source.height = Math.max(1, Math.round(img.naturalHeight * scale));
    source.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0, source.width, source.height);
    URL.revokeObjectURL(url);
    $('#custom-name').value = file.name.replace(/\.[^.]+$/, '').slice(0, 40);
    $('#remove-bg').checked = !hasTransparency(source);
    drop.hidden = true;
    $('#editor').hidden = false;
    $('#create-status').textContent = '';
    processImage();
  } catch {
    toast('Could not read that image');
  }
}

function hasTransparency(canvas) {
  const d = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 3; i < d.length; i += 16) if (d[i] < 250) return true;
  return false;
}

// Flood-fills the background from the image border, then crops to content.
function processImage() {
  if (!source) return null;
  const w = source.width;
  const h = source.height;
  const img = source.getContext('2d').getImageData(0, 0, w, h);
  const d = img.data;

  if ($('#remove-bg').checked) {
    const tol = Number($('#tolerance').value);
    const seen = new Uint8Array(w * h);
    const stack = [];
    const push = (x, y, ref) => {
      const i = y * w + x;
      if (seen[i]) return;
      const o = i * 4;
      const dist = Math.abs(d[o] - ref[0]) + Math.abs(d[o + 1] - ref[1]) + Math.abs(d[o + 2] - ref[2]);
      if (dist > tol * 3) return;
      seen[i] = 1;
      stack.push(i);
    };
    // Every filled pixel is compared with the border colour it started from,
    // so the fill can't creep through soft edges into the subject.
    const seed = (x, y) => {
      if (seen[y * w + x]) return;
      const o = (y * w + x) * 4;
      const ref = [d[o], d[o + 1], d[o + 2]];
      push(x, y, ref);
      while (stack.length) {
        const i = stack.pop();
        const x0 = i % w;
        const y0 = (i / w) | 0;
        if (x0 > 0) push(x0 - 1, y0, ref);
        if (x0 < w - 1) push(x0 + 1, y0, ref);
        if (y0 > 0) push(x0, y0 - 1, ref);
        if (y0 < h - 1) push(x0, y0 + 1, ref);
      }
    };
    for (let x = 0; x < w; x += 4) {
      seed(x, 0);
      seed(x, h - 1);
    }
    for (let y = 0; y < h; y += 4) {
      seed(0, y);
      seed(w - 1, y);
    }
    // Clear the background, softening a 1px edge.
    for (let i = 0; i < w * h; i++) {
      if (seen[i]) d[i * 4 + 3] = 0;
    }
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (seen[i]) continue;
        const n = seen[i - 1] + seen[i + 1] + seen[i - w] + seen[i + w];
        if (n) d[i * 4 + 3] = Math.min(d[i * 4 + 3], 255 - n * 45);
      }
    }
  }

  // Crop to visible pixels.
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 12) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) {
    $('#create-status').textContent = 'Everything was removed. Lower the tolerance.';
    preview.getContext('2d').clearRect(0, 0, preview.width, preview.height);
    return null;
  }
  $('#create-status').textContent = '';

  const work = document.createElement('canvas');
  work.width = w;
  work.height = h;
  work.getContext('2d').putImageData(img, 0, 0);

  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  const scale = Math.min(1, 512 / Math.max(cw, ch));
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(cw * scale));
  out.height = Math.max(1, Math.round(ch * scale));
  const octx = out.getContext('2d');
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(work, x0, y0, cw, ch, 0, 0, out.width, out.height);

  const pctx = preview.getContext('2d');
  pctx.clearRect(0, 0, preview.width, preview.height);
  const ps = Math.min((preview.width - 40) / out.width, (preview.height - 40) / out.height);
  pctx.drawImage(out, (preview.width - out.width * ps) / 2, (preview.height - out.height * ps) / 2, out.width * ps, out.height * ps);
  return out;
}

let processTimer;
$('#tolerance').addEventListener('input', () => {
  clearTimeout(processTimer);
  processTimer = setTimeout(processImage, 60);
});
$('#remove-bg').addEventListener('change', processImage);

$('#create-cancel').addEventListener('click', resetCreate);
function resetCreate() {
  source = null;
  fileInput.value = '';
  $('#editor').hidden = true;
  drop.hidden = false;
}

$('#create-save').addEventListener('click', async () => {
  const out = processImage();
  if (!out) return;
  const btn = $('#create-save');
  btn.disabled = true;
  try {
    const id = await api.saveCustom({ name: $('#custom-name').value, dataUrl: out.toDataURL('image/png') });
    api.hang(id, 'replace');
    toast('Your charm is hanging ✨');
    resetCreate();
    activeCollection = 'mine';
    openTab('library');
  } catch (err) {
    $('#create-status').textContent = 'Could not save that charm. Try a smaller image.';
  } finally {
    btn.disabled = false;
  }
});

// ---------- appearance ----------
function buildRopeGrid() {
  $('#rope-grid').replaceChildren(
    ...ROPE_STYLES.map((r) =>
      el(
        'div',
        { class: 'rope', 'data-rope': r.id, onclick: () => api.updateSettings({ rope: r.id }) },
        el('canvas', { width: 220, height: 140 }),
        el('div', {}, r.name),
      ),
    ),
  );
  $('#neon-colors').replaceChildren(
    ...NEON_COLORS.map((c) =>
      el('button', { style: `--c:${c}`, 'data-color': c, title: c, onclick: () => api.updateSettings({ ropeColor: c }) }),
    ),
  );
}

function drawRopePreviews() {
  if (!state) return;
  for (const node of $$('.rope')) {
    const canvas = node.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(2, 2);
    drawRope(ctx, node.dataset.rope, { x: 10, y: 20 }, { x: 100, y: 50 }, 26, { color: state.settings.ropeColor, time: 0 });
    ctx.restore();
  }
}

function renderAppearance() {
  const s = state.settings;
  $$('.rope').forEach((n) => n.classList.toggle('on', n.dataset.rope === s.rope));
  $('#neon-colors').hidden = s.rope !== 'neon';
  $$('#neon-colors button').forEach((b) => b.classList.toggle('on', b.dataset.color === s.ropeColor));
  setValue($('#size'), s.size);
  setValue($('#opacity'), Math.round(s.opacity * 100));
  setValue($('#breeze'), s.breeze);
  setValue($('#cursorWind'), s.cursorWind);

  const displays = state.displays;
  $('#display-field').hidden = displays.length < 2;
  const sel = $('#display');
  sel.replaceChildren(
    ...displays.map((d) => el('option', { value: d.id }, `${d.label}${d.primary ? ' · main' : ''}`)),
  );
  sel.value = String(s.displayId ?? displays.find((d) => d.primary)?.id ?? '');
  if ($('.tab.active')?.id === 'tab-appearance') drawRopePreviews();
}

$('#size').addEventListener('input', (e) => api.updateSettings({ size: Number(e.target.value) }));
$('#opacity').addEventListener('input', (e) => api.updateSettings({ opacity: Number(e.target.value) / 100 }));
$('#breeze').addEventListener('change', (e) => api.updateSettings({ breeze: e.target.checked }));
$('#cursorWind').addEventListener('change', (e) => api.updateSettings({ cursorWind: e.target.checked }));
$('#display').addEventListener('change', (e) => api.updateSettings({ displayId: Number(e.target.value) }));

// ---------- sound & reminders ----------
function renderSound() {
  const s = state.settings;
  setValue($('#sound'), s.sound);
  setValue($('#volume'), Math.round(s.volume * 100));
  setValue($('#rem-enabled'), s.reminders.enabled);
  $('#rem-minutes').value = String(s.reminders.minutes);
  if (![...$('#rem-minutes').options].some((o) => o.value === String(s.reminders.minutes))) $('#rem-minutes').value = '45';
  $$('#rem-kinds input').forEach((i) => (i.checked = s.reminders.kinds.includes(i.value)));
}

$('#sound').addEventListener('change', (e) => api.updateSettings({ sound: e.target.checked }));
$('#volume').addEventListener('input', (e) => api.updateSettings({ volume: Number(e.target.value) / 100 }));

function saveReminders() {
  api.updateSettings({
    reminders: {
      enabled: $('#rem-enabled').checked,
      minutes: Number($('#rem-minutes').value),
      kinds: $$('#rem-kinds input:checked').map((i) => i.value),
    },
  });
}
$('#rem-enabled').addEventListener('change', saveReminders);
$('#rem-minutes').addEventListener('change', saveReminders);
$$('#rem-kinds input').forEach((i) => i.addEventListener('change', saveReminders));

// ---------- general ----------
const UPDATE_TEXT = {
  idle: 'Updates are checked automatically.',
  dev: 'Automatic updates are off for this build.',
  checking: 'Checking for updates…',
  current: 'You’re on the latest version.',
  downloading: (v) => `Downloading ${v}…`,
  available: (v) => `Version ${v} is available.`,
  ready: (v) => `Version ${v} is ready to install.`,
  error: 'Couldn’t check for updates right now.',
};

function renderGeneral() {
  const { settings: s, update: u, brand, version } = state;
  setValue($('#visible'), s.visible);
  setValue($('#visible-quick'), s.visible);
  setValue($('#login'), state.launchAtLogin);
  $('#about-line').textContent = `${brand.name} ${version}: ${brand.tagline}`;
  const t = UPDATE_TEXT[u.state] || UPDATE_TEXT.idle;
  $('#update-text').textContent = typeof t === 'function' ? t(u.version) : t;
  $('#update-install').hidden = u.state !== 'ready';
  $('#open-site').hidden = !brand.website;
  if (u.state === 'available') {
    $('#update-install').hidden = false;
    $('#update-install').textContent = 'Download';
  } else {
    $('#update-install').textContent = 'Restart & update';
  }
}

$('#visible').addEventListener('change', (e) => api.updateSettings({ visible: e.target.checked }));
$('#visible-quick').addEventListener('change', (e) => api.updateSettings({ visible: e.target.checked }));
$('#login').addEventListener('change', (e) => api.setLaunchAtLogin(e.target.checked));
$('#update-check').addEventListener('click', () => api.checkUpdates());
$('#update-install').addEventListener('click', () => {
  if (state.update.state === 'ready') api.installUpdate();
  else if (state.brand.website) api.openExternal(`${state.brand.website.replace(/\/$/, '')}/download`);
  else if (state.brand.githubRepo) api.openExternal(`https://github.com/${state.brand.githubRepo}/releases/latest`);
});
$('#open-site').addEventListener('click', () => api.openExternal(state.brand.website));
$('#show-logs').addEventListener('click', () => api.showLogs());

let resetArmed = false;
$('#reset').addEventListener('click', () => {
  if (!resetArmed) {
    resetArmed = true;
    $('#reset-confirm').hidden = false;
    setTimeout(() => {
      resetArmed = false;
      $('#reset-confirm').hidden = true;
    }, 5000);
    return;
  }
  resetArmed = false;
  $('#reset-confirm').hidden = true;
  api.reset();
  toast('Back to fresh');
});

// ---------- boot ----------
function render(next) {
  state = next;
  document.body.classList.toggle('win', state.platform !== 'darwin');
  $('#brand-name').textContent = state.brand.name;
  document.title = `Customize ${state.brand.name}`;
  $('#shortcut-hint').textContent = `${state.platform === 'darwin' ? '⇧⌘O' : 'Ctrl+Shift+O'} shows or hides charms`;
  renderLibrary();
  renderAppearance();
  renderSound();
  renderGeneral();
}

buildRopeGrid();
api.onState(render);
api.getState().then((s) => {
  render(s);
  openTab(location.hash.slice(1) || 'library');
});
