// Auto-update from GitHub Releases.
// Windows installs updates silently. macOS can only auto-install when the app
// is signed with a Developer ID; unsigned builds just announce the update and
// link to the download page.
const { app } = require('electron');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const log = require('./logger');

const SIX_HOURS = 6 * 60 * 60 * 1000;

function isDeveloperSigned() {
  if (process.platform !== 'darwin') return true;
  try {
    const bundle = app.getPath('exe').replace(/\/Contents\/MacOS\/[^/]+$/, '');
    const out = execFileSync('codesign', ['-dv', '--verbose=2', bundle], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return /TeamIdentifier=(?!not set)/.test(out);
  } catch (err) {
    // codesign prints details to stderr
    return /TeamIdentifier=(?!not set)/.test(String(err.stderr || ''));
  }
}

function startUpdater({ onStatus }) {
  if (!app.isPackaged) return { check: async () => onStatus({ state: 'dev' }) };
  // Builds made without a GitHub publish target (local builds) have no feed.
  if (!fs.existsSync(path.join(process.resourcesPath, 'app-update.yml'))) {
    log.info('no app-update.yml; auto-update disabled for this build');
    return { check: async () => onStatus({ state: 'dev' }) };
  }

  let autoUpdater;
  try {
    ({ autoUpdater } = require('electron-updater'));
  } catch (err) {
    log.error('electron-updater unavailable', err);
    return { check: async () => onStatus({ state: 'error', message: 'Updater unavailable' }) };
  }

  const canInstall = isDeveloperSigned();
  autoUpdater.logger = { info: log.info, warn: log.warn, error: log.error, debug: () => {} };
  autoUpdater.autoDownload = canInstall;
  autoUpdater.autoInstallOnAppQuit = canInstall;

  autoUpdater.on('checking-for-update', () => onStatus({ state: 'checking' }));
  autoUpdater.on('update-not-available', () => onStatus({ state: 'current' }));
  autoUpdater.on('update-available', (info) =>
    onStatus({ state: canInstall ? 'downloading' : 'available', version: info.version }),
  );
  autoUpdater.on('update-downloaded', (info) => onStatus({ state: 'ready', version: info.version }));
  autoUpdater.on('error', (err) => {
    log.warn('update check failed', err && err.message);
    onStatus({ state: 'error', message: 'Could not check for updates' });
  });

  const check = async () => {
    try {
      await autoUpdater.checkForUpdates();
    } catch (err) {
      log.warn('update check threw', err && err.message);
    }
  };

  setTimeout(check, 15_000);
  setInterval(check, SIX_HOURS).unref?.();

  return { check, install: () => autoUpdater.quitAndInstall() };
}

module.exports = { startUpdater };
