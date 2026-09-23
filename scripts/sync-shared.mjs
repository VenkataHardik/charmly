// Copies the shared engine, charm art and brand config into the app and the
// website. Both copies are generated (gitignored), so edit shared/ instead.
import { cpSync, mkdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shared = join(root, 'shared');
const artDir = join(shared, 'charms');
const only = process.argv[2]; // "app" | "web" | undefined (both)

const targets = {
  app: [
    [shared, join(root, 'app/renderer/shared'), (src) => !src.endsWith('package.json')],
    [join(root, 'brand.json'), join(root, 'app/brand.json')],
  ],
  web: [
    [shared, join(root, 'web/src/shared'), (src) => src !== artDir && !src.startsWith(artDir + sep) && !src.endsWith('package.json')],
    [join(shared, 'charms'), join(root, 'web/public/charms')],
    [join(root, 'brand.json'), join(root, 'web/src/brand.json')],
  ],
};

if (!existsSync(shared)) {
  console.error(`sync-shared: ${shared} not found`);
  process.exit(1);
}

for (const [name, jobs] of Object.entries(targets)) {
  if (only && only !== name) continue;
  for (const [src, dest, filter] of jobs) {
    rmSync(dest, { recursive: true, force: true });
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest, { recursive: true, filter: filter || (() => true) });
  }
  console.log(`sync-shared: updated ${name}`);
}

// The main process is CommonJS, so it gets the charm names as plain JSON.
if (!only || only === 'app') {
  const { ALL_CHARMS } = await import(pathToFileURL(join(shared, 'charms.js')).href);
  const names = Object.fromEntries(ALL_CHARMS.map((c) => [c.id, c.name]));
  writeFileSync(join(root, 'app/src/charm-names.json'), `${JSON.stringify(names, null, 2)}\n`);
}
