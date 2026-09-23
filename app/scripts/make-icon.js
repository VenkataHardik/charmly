// Renders the app icon (build/icon.png, 1024px) and the website icons from
// the Mochi Kitty charm. Run with: npm run icon -w app
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const kitty = fs.readFileSync(path.join(root, 'shared/charms/mochi-kitty.svg'), 'base64');

const html = `<!doctype html><html><body style="margin:0;background:transparent">
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="#2b2150"/><stop offset=".6" stop-color="#1a1433"/><stop offset="1" stop-color="#120e24"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="62%" r="45%">
      <stop offset="0" stop-color="#ff8fbf" stop-opacity=".45"/><stop offset="1" stop-color="#ff8fbf" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="thread" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffe8a8" stop-opacity=".2"/><stop offset="1" stop-color="#ffd27a"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="24" stdDeviation="22" flood-color="#000" flood-opacity=".45"/>
    </filter>
  </defs>
  <rect x="100" y="100" width="824" height="824" rx="185" fill="url(#bg)"/>
  <rect x="100" y="100" width="824" height="824" rx="185" fill="url(#glow)"/>
  <g fill="#fff" opacity=".7"><circle cx="250" cy="260" r="6"/><circle cx="790" cy="230" r="5"/><circle cx="820" cy="420" r="4"/><circle cx="210" cy="520" r="4"/></g>
  <path d="M512 108 L512 392" stroke="#ffd27a" stroke-width="9" stroke-linecap="butt"/>
  <ellipse cx="512" cy="412" rx="16" ry="24" fill="none" stroke="#e7b84e" stroke-width="10"/>
  <image href="data:image/svg+xml;base64,${kitty}" x="262" y="400" width="500" height="500" filter="url(#shadow)"/>
</svg></body></html>`;

app.whenReady().then(async () => {
  const tmp = path.join(app.getPath('temp'), 'charmly-icon.html');
  fs.writeFileSync(tmp, html);
  const win = new BrowserWindow({
    width: 1024,
    height: 1024,
    show: false,
    transparent: true,
    frame: false,
    useContentSize: true,
    webPreferences: { offscreen: true, zoomFactor: 1 },
  });
  await win.loadFile(tmp);
  await new Promise((r) => setTimeout(r, 500));
  let img = await win.webContents.capturePage({ x: 0, y: 0, width: 1024, height: 1024 });
  if (img.getSize().width !== 1024) img = img.resize({ width: 1024, height: 1024, quality: 'best' });

  const out = (p, size) => {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, size ? img.resize({ width: size, height: size, quality: 'best' }).toPNG() : img.toPNG());
    console.log('wrote', path.relative(root, p));
  };
  out(path.join(root, 'app/build/icon.png'));
  out(path.join(root, 'web/src/app/icon.png'), 256);
  out(path.join(root, 'web/src/app/apple-icon.png'), 180);
  out(path.join(root, 'web/public/logo.png'), 96);
  app.exit(0);
});
