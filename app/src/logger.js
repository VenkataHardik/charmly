// Tiny file logger: userData/logs/main.log, rotated at 1 MB.
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const MAX_BYTES = 1024 * 1024;
let file = null;

function logFile() {
  if (!file) {
    const dir = path.join(app.getPath('userData'), 'logs');
    fs.mkdirSync(dir, { recursive: true });
    file = path.join(dir, 'main.log');
  }
  return file;
}

function write(level, args) {
  const line = `[${new Date().toISOString()}] ${level} ${args
    .map((a) => (a instanceof Error ? a.stack || a.message : typeof a === 'string' ? a : JSON.stringify(a)))
    .join(' ')}\n`;
  if (!app.isPackaged) process.stdout.write(line);
  try {
    const f = logFile();
    if (fs.existsSync(f) && fs.statSync(f).size > MAX_BYTES) fs.renameSync(f, `${f}.old`);
    fs.appendFileSync(f, line);
  } catch {
    // Logging must never crash the app.
  }
}

module.exports = {
  info: (...a) => write('INFO', a),
  warn: (...a) => write('WARN', a),
  error: (...a) => write('ERROR', a),
  path: () => logFile(),
};
