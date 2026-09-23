const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  screen,
  ipcMain,
  shell,
  globalShortcut,
  protocol,
  net,
  Notification,
} = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

const brand = require('./brand.json');
const log = require('./src/logger');
const store = require('./src/settings');
const customs = require('./src/customs');
const { makeTrayIcon } = require('./src/tray-icon');
const { startUpdater } = require('./src/updater');

const isMac = process.platform === 'darwin';
const MEDIA_SCHEME = 'charmly-media';
const SHOW_SHORTCUT = 'CommandOrControl+Shift+O';

// Built-in charm names for the tray menu, generated from shared/charms.js by
// scripts/sync-shared.mjs.
const CHARM_NAMES = require('./src/charm-names.json');

const ROPE_NAMES = {
  thread: 'Thread', leather: 'Leather', 'gold-chain': 'Gold Chain', 'silver-chain': 'Silver Chain', neon: 'Neon',
  'spider-silk': 'Spider Silk', 'midnight-cord': 'Midnight Cord', 'temple-thread': 'Temple Thread',
  'pearl-strand': 'Pearl Strand',
};

const REMINDERS = {
  water: ['Sip some water 💧', 'Hydration check! 💧', 'Water break? 🥤'],
  stretch: ['Stretch those shoulders 🙆', 'Stand up and wiggle 🕺', 'Roll your neck, slowly 🌀'],
  eyes: ['Look 20 ft away for 20s 👀', 'Blink break 👁️', 'Rest your eyes a moment 🌙'],
  breathe: ['Three deep breaths 🌬️', 'Unclench your jaw 😌', 'Breathe in… and out 🍃'],
};

let settings;
let overlay = null;
let customize = null;
let tray = null;
let updater = null;
let updateStatus = { state: 'idle' };
let reminderTimer = null;
let lastReminder = Date.now();

protocol.registerSchemesAsPrivileged([
  { scheme: MEDIA_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

process.on('uncaughtException', (err) => log.error('uncaught', err));
process.on('unhandledRejection', (err) => log.error('unhandled rejection', err));

// ---------- state ----------
function publicState() {
  return {
    settings,
    custom: customs.list().map((c) => ({ ...c, src: `${MEDIA_SCHEME}://charm/${c.id}.png` })),
    version: app.getVersion(),
    platform: process.platform,
    brand,
    launchAtLogin: app.getLoginItemSettings().openAtLogin,
    displays: screen.getAllDisplays().map((d, i) => ({
      id: d.id,
      label: `${d.label || `Display ${i + 1}`} (${d.size.width}×${d.size.height})`,
      primary: d.id === screen.getPrimaryDisplay().id,
    })),
    update: updateStatus,
  };
}

function broadcast() {
  const state = publicState();
  for (const w of [overlay, customize]) if (w && !w.isDestroyed()) w.webContents.send('state', state);
}

function update(patch, { rebuildMenu = true } = {}) {
  const before = settings;
  settings = store.sanitize({ ...settings, ...patch });
  store.save(settings);
  if (before.visible !== settings.visible) applyVisibility();
  if (before.displayId !== settings.displayId) fitOverlay();
  if (JSON.stringify(before.reminders) !== JSON.stringify(settings.reminders)) scheduleReminders(true);
  broadcast();
  if (rebuildMenu) buildTrayMenu();
}

let uidCounter = 0;
function newUid() {
  uidCounter += 1;
  return `h${Date.now().toString(36)}${uidCounter}`;
}

function hang(charmId, mode = 'replace') {
  if (!/^[a-z0-9-]{1,64}$/.test(charmId)) return;
  let hung;
  if (mode === 'add' && settings.hung.length < store.MAX_HUNG) {
    // Spread new charms out across the top of the screen.
    const taken = settings.hung.map((h) => h.anchorX);
    const spots = [0.8, 0.62, 0.44, 0.26, 0.9, 0.7, 0.52, 0.34];
    const anchorX = spots.find((s) => taken.every((t) => Math.abs(t - s) > 0.07)) ?? Math.random() * 0.8 + 0.1;
    hung = [...settings.hung, { uid: newUid(), charmId, anchorX, length: 180 + Math.random() * 140 }];
  } else if (settings.hung.length) {
    // Replace the most recently added charm, keeping its place on screen.
    hung = settings.hung.slice();
    const last = hung[hung.length - 1];
    hung[hung.length - 1] = { ...last, uid: newUid(), charmId };
  } else {
    hung = [{ uid: newUid(), charmId, anchorX: 0.8, length: 260 }];
  }
  update({ hung, visible: true });
}

function toggleFavorite(charmId) {
  const favorites = settings.favorites.includes(charmId)
    ? settings.favorites.filter((f) => f !== charmId)
    : [...settings.favorites, charmId];
  update({ favorites });
}

// ---------- overlay ----------
function targetDisplay() {
  const all = screen.getAllDisplays();
  return all.find((d) => d.id === settings.displayId) || screen.getPrimaryDisplay();
}

function createOverlay() {
  const { bounds } = targetDisplay();
  overlay = new BrowserWindow({
    ...bounds,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    focusable: false,
    hasShadow: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    fullscreenable: false,
    enableLargerThanScreen: true,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      autoplayPolicy: 'no-user-gesture-required',
      backgroundThrottling: false,
    },
  });

  overlay.setAlwaysOnTop(true, 'screen-saver');
  if (isMac) overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true });
  overlay.setIgnoreMouseEvents(true, { forward: true });
  lockDown(overlay);

  overlay.loadFile(path.join(__dirname, 'renderer', 'overlay.html'));
  overlay.once('ready-to-show', applyVisibility);
  overlay.webContents.on('render-process-gone', (_e, details) => {
    log.error('overlay renderer gone', details);
    if (details.reason !== 'clean-exit') setTimeout(() => overlay && !overlay.isDestroyed() && overlay.reload(), 1000);
  });
  overlay.on('closed', () => {
    overlay = null;
  });
}

function fitOverlay() {
  if (!overlay || overlay.isDestroyed()) return;
  overlay.setBounds(targetDisplay().bounds);
}

function applyVisibility() {
  if (!overlay || overlay.isDestroyed()) return;
  if (settings.visible) overlay.showInactive();
  else overlay.hide();
}

// ---------- customize window ----------
function openCustomize(tab) {
  if (customize && !customize.isDestroyed()) {
    if (tab) customize.webContents.send('open-tab', tab);
    customize.show();
    customize.focus();
    return;
  }
  customize = new BrowserWindow({
    width: 1040,
    height: 720,
    minWidth: 820,
    minHeight: 560,
    title: `Customize ${brand.name}`,
    show: false,
    backgroundColor: '#15131c',
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  lockDown(customize);
  customize.loadFile(path.join(__dirname, 'renderer', 'customize.html'), { hash: tab || '' });
  customize.once('ready-to-show', () => {
    customize.show();
    if (isMac) app.focus({ steal: true });
  });
  customize.on('closed', () => {
    customize = null;
  });
}

// No navigation, no popups: external links open in the browser.
function lockDown(win) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) {
      e.preventDefault();
      openExternal(url);
    }
  });
}

function openExternal(url) {
  try {
    const u = new URL(url);
    if (u.protocol === 'https:' || u.protocol === 'mailto:') shell.openExternal(u.toString());
  } catch {
    // ignore malformed URLs
  }
}

function downloadPage() {
  return brand.website ? `${brand.website.replace(/\/$/, '')}/download` : brand.githubRepo ? `https://github.com/${brand.githubRepo}/releases/latest` : null;
}

// ---------- tray ----------
function buildTrayMenu() {
  if (!tray) return;
  const primary = settings.hung[settings.hung.length - 1];
  const favorites = settings.favorites.filter((id) => CHARM_NAMES[id] || id.startsWith('custom-'));
  const customNames = Object.fromEntries(customs.list().map((c) => [c.id, c.name]));

  const updateItems = [];
  if (updateStatus.state === 'ready') {
    updateItems.push({ label: `Restart to Update (v${updateStatus.version})`, click: () => updater && updater.install() });
  } else if (updateStatus.state === 'available' && downloadPage()) {
    updateItems.push({ label: `Download v${updateStatus.version}…`, click: () => openExternal(downloadPage()) });
  }

  const menu = Menu.buildFromTemplate([
    {
      label: `Show ${brand.name}`,
      type: 'checkbox',
      checked: settings.visible,
      accelerator: SHOW_SHORTCUT,
      registerAccelerator: false,
      click: () => update({ visible: !settings.visible }),
    },
    {
      label: 'Charm',
      submenu: [
        ...(favorites.length
          ? favorites.map((id) => ({
              label: CHARM_NAMES[id] || customNames[id] || id,
              type: 'radio',
              checked: primary && primary.charmId === id,
              click: () => hang(id, 'replace'),
            }))
          : [{ label: 'Star a charm to keep it here', enabled: false }]),
        { type: 'separator' },
        { label: 'Browse Library…', click: () => openCustomize('library') },
      ],
    },
    {
      label: 'Rope',
      submenu: Object.entries(ROPE_NAMES).map(([id, label]) => ({
        label,
        type: 'radio',
        checked: settings.rope === id,
        click: () => update({ rope: id }),
      })),
    },
    { label: 'Give Them a Swing', click: () => sendOverlay('command', { type: 'swing' }), enabled: settings.hung.length > 0 },
    { type: 'separator' },
    { label: 'Customize…', accelerator: 'CommandOrControl+,', registerAccelerator: false, click: () => openCustomize() },
    ...(updateItems.length ? [{ type: 'separator' }, ...updateItems] : []),
    { type: 'separator' },
    { label: `Quit ${brand.name}`, accelerator: 'CommandOrControl+Q', registerAccelerator: false, click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
}

function sendOverlay(channel, payload) {
  if (overlay && !overlay.isDestroyed()) overlay.webContents.send(channel, payload);
}

// ---------- reminders ----------
function scheduleReminders(reset) {
  clearInterval(reminderTimer);
  reminderTimer = null;
  if (reset) lastReminder = Date.now();
  const r = settings.reminders;
  if (!r.enabled || !r.kinds.length) return;
  reminderTimer = setInterval(() => {
    if (Date.now() - lastReminder < r.minutes * 60_000) return;
    lastReminder = Date.now();
    const kind = r.kinds[Math.floor(Math.random() * r.kinds.length)];
    const pool = REMINDERS[kind];
    const text = pool[Math.floor(Math.random() * pool.length)];
    if (settings.visible && settings.hung.length) sendOverlay('command', { type: 'reminder', text });
    else if (Notification.isSupported()) new Notification({ title: brand.name, body: text, silent: true }).show();
  }, 30_000);
}

// ---------- IPC ----------
function fromOurWindow(e) {
  const w = BrowserWindow.fromWebContents(e.sender);
  return w && (w === overlay || w === customize);
}

function handle(channel, fn) {
  ipcMain.handle(channel, async (e, ...args) => {
    if (!fromOurWindow(e)) throw new Error('forbidden');
    return fn(e, ...args);
  });
}

function on(channel, fn) {
  ipcMain.on(channel, (e, ...args) => {
    if (!fromOurWindow(e)) return;
    try {
      fn(e, ...args);
    } catch (err) {
      log.error(`ipc ${channel}`, err);
    }
  });
}

function registerIpc() {
  handle('get-state', () => publicState());

  on('set-interactive', (e, interactive) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (w !== overlay) return;
    if (interactive) overlay.setIgnoreMouseEvents(false);
    else overlay.setIgnoreMouseEvents(true, { forward: true });
  });

  on('save-ropes', (_e, ropes) => {
    if (!Array.isArray(ropes)) return;
    const byUid = new Map(ropes.map((r) => [r && r.uid, r]));
    const hung = settings.hung.map((h) => {
      const r = byUid.get(h.uid);
      return r ? { ...h, anchorX: r.anchorX, length: r.length } : h;
    });
    // Positions only: save quietly without re-sending state.
    settings = store.sanitize({ ...settings, hung });
    store.save(settings);
  });

  on('update-settings', (_e, patch) => {
    if (!patch || typeof patch !== 'object') return;
    const allowed = ['visible', 'rope', 'ropeColor', 'size', 'opacity', 'breeze', 'cursorWind', 'sound', 'volume', 'displayId', 'reminders', 'onboarded'];
    const clean = Object.fromEntries(Object.entries(patch).filter(([k]) => allowed.includes(k)));
    update(clean);
  });

  on('hang', (_e, charmId, mode) => hang(String(charmId), mode === 'add' ? 'add' : 'replace'));

  on('unhang', (_e, uid) => update({ hung: settings.hung.filter((h) => h.uid !== uid) }));

  on('toggle-favorite', (_e, charmId) => toggleFavorite(String(charmId)));

  handle('save-custom', (_e, payload) => {
    const id = customs.add(payload || {});
    broadcast();
    buildTrayMenu();
    return id;
  });

  on('delete-custom', (_e, id) => {
    customs.remove(String(id));
    update({
      hung: settings.hung.filter((h) => h.charmId !== id),
      favorites: settings.favorites.filter((f) => f !== id),
    });
  });

  on('set-launch-at-login', (_e, enabled) => {
    app.setLoginItemSettings({ openAtLogin: !!enabled, openAsHidden: true });
    broadcast();
  });

  on('swing', () => sendOverlay('command', { type: 'swing' }));
  on('open-customize', (_e, tab) => openCustomize(typeof tab === 'string' ? tab : undefined));
  on('open-external', (_e, url) => openExternal(String(url)));
  on('check-updates', () => updater && updater.check());
  on('install-update', () => updater && updater.install());
  on('show-logs', () => shell.showItemInFolder(log.path()));

  on('charm-menu', (_e, uid) => {
    const h = settings.hung.find((x) => x.uid === uid);
    if (!h) return;
    const favorite = settings.favorites.includes(h.charmId);
    Menu.buildFromTemplate([
      { label: 'Climb Up / Down', click: () => sendOverlay('command', { type: 'climb', uid }) },
      { label: favorite ? 'Unstar' : 'Star', click: () => toggleFavorite(h.charmId) },
      { label: 'Change Charm…', click: () => openCustomize('library') },
      { type: 'separator' },
      { label: 'Take Down', click: () => update({ hung: settings.hung.filter((x) => x.uid !== uid) }) },
    ]).popup();
  });

  on('reset', () => {
    update({ ...store.DEFAULTS, favorites: settings.favorites });
    sendOverlay('command', { type: 'reset' });
  });
}

// ---------- lifecycle ----------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => openCustomize());

  app.whenReady().then(() => {
    if (isMac && app.dock) app.dock.hide();
    settings = store.load();
    log.info(`${brand.name} ${app.getVersion()} starting on ${process.platform}`);

    protocol.handle(MEDIA_SCHEME, (req) => {
      const { host, pathname } = new URL(req.url);
      const file = host === 'charm' ? customs.resolveFile(path.basename(pathname)) : null;
      if (!file) return new Response('Not found', { status: 404 });
      return net.fetch(pathToFileURL(file).toString());
    });

    registerIpc();
    createOverlay();

    tray = new Tray(makeTrayIcon(isMac));
    tray.setToolTip(brand.name);
    if (!isMac) tray.on('click', () => tray.popUpContextMenu());
    buildTrayMenu();

    if (!globalShortcut.register(SHOW_SHORTCUT, () => update({ visible: !settings.visible }))) {
      log.warn('could not register global shortcut', SHOW_SHORTCUT);
    }

    const refit = () => {
      fitOverlay();
      broadcast();
    };
    screen.on('display-metrics-changed', refit);
    screen.on('display-added', refit);
    screen.on('display-removed', refit);

    scheduleReminders(true);

    updater = startUpdater({
      onStatus: (status) => {
        const changed = status.state !== updateStatus.state || status.version !== updateStatus.version;
        updateStatus = status;
        if (!changed) return;
        broadcast();
        buildTrayMenu();
        if ((status.state === 'available' || status.state === 'ready') && Notification.isSupported()) {
          new Notification({
            title: `${brand.name} ${status.version} is here`,
            body: status.state === 'ready' ? 'Restart from the menu bar to update.' : 'Grab it from the download page.',
            silent: true,
          }).show();
        }
      },
    });

    if (!settings.onboarded) {
      openCustomize('library');
      update({ onboarded: true });
    }
  });

  // Lives in the tray; only Quit exits.
  app.on('window-all-closed', () => {});
  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    store.saveNow(settings);
  });
}
