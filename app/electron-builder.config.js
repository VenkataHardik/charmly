// electron-builder config. Product name and app id come from ../brand.json so
// the brand can be renamed in one place.
const brand = require('../brand.json');

// owner/repo for GitHub Releases: brand.json, or the repo CI is running in.
const repo = brand.githubRepo || process.env.GITHUB_REPOSITORY || '';
const [owner, name] = repo.split('/');

module.exports = {
  appId: brand.appId,
  productName: brand.name,
  copyright: `© ${new Date().getFullYear()} ${brand.name}`,
  directories: { output: 'dist', buildResources: 'build' },
  files: ['main.js', 'preload.js', 'brand.json', 'src/**/*', 'renderer/**/*', 'package.json'],
  asar: true,
  publish: owner && name ? [{ provider: 'github', owner, repo: name, releaseType: 'release' }] : null,
  mac: {
    category: 'public.app-category.entertainment',
    target: [
      { target: 'dmg', arch: ['universal'] },
      { target: 'zip', arch: ['universal'] },
    ],
    artifactName: '${productName}-mac-${arch}.${ext}',
    hardenedRuntime: true,
    gatekeeperAssess: false,
    extendInfo: { LSUIElement: true },
  },
  dmg: {
    title: '${productName}',
    contents: [
      { x: 150, y: 190, type: 'file' },
      { x: 390, y: 190, type: 'link', path: '/Applications' },
    ],
  },
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    artifactName: '${productName}-win-setup.${ext}',
  },
  nsis: {
    oneClick: true,
    perMachine: false,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: brand.name,
  },
};
