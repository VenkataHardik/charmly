// Menu bar / tray glyph (a charm on a string) drawn into a raw BGRA bitmap, so
// no image files are needed. macOS gets a template image that follows the theme.
const { nativeImage } = require('electron');

function makeTrayIcon(isMac) {
  const scale = 2;
  const size = 16 * scale;
  const buf = Buffer.alloc(size * size * 4);
  const [r, g, b] = isMac ? [0, 0, 0] : [0xff, 0xff, 0xff];

  const plot = (x, y, a) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    buf[i] = b;
    buf[i + 1] = g;
    buf[i + 2] = r;
    buf[i + 3] = Math.max(buf[i + 3], a);
  };
  const disc = (cx, cy, r0, r1, a = 255) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d >= r0 && d <= r1) plot(x, y, a);
        else if (d > r1 && d < r1 + 1) plot(x, y, Math.round(a * (r1 + 1 - d)));
      }
    }
  };

  const cx = size / 2;
  for (let y = 0; y < 9; y++) plot(cx, y, 255); // string
  disc(cx, 11, 1.6, 2.8); // jump ring
  disc(cx, 21, 7.5, 10); // charm rim
  disc(cx, 21, 0, 3.6); // charm centre

  const img = nativeImage.createFromBitmap(buf, { width: size, height: size, scaleFactor: scale });
  if (isMac) img.setTemplateImage(true);
  return img;
}

module.exports = { makeTrayIcon };
