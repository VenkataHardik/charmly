import brand from '../brand.json';

// Everything deploy-specific lives here and comes from env vars, so the same
// code works locally, on Vercel previews and in production.
const repo = process.env.NEXT_PUBLIC_GITHUB_REPO || brand.githubRepo || '';

function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

// File names are fixed by app/electron-builder.config.js (artifactName), and
// GitHub's /releases/latest/download/<name> always serves the newest release.
const latest = (file) => (repo ? `https://github.com/${repo}/releases/latest/download/${file}` : null);

export const site = {
  name: brand.name,
  tagline: brand.tagline,
  description: brand.description,
  url: siteUrl(),
  repo,
  instagram: brand.instagram,
  supportEmail: brand.supportEmail,
  releasesUrl: repo ? `https://github.com/${repo}/releases` : null,
  downloads: {
    mac: {
      url: latest(`${brand.name}-mac-universal.dmg`),
      label: 'macOS',
      detail: 'Universal · Apple silicon & Intel · macOS 13+',
    },
    win: {
      url: latest(`${brand.name}-win-setup.exe`),
      label: 'Windows',
      detail: '64-bit installer · Windows 10 & 11',
    },
  },
};

export const downloadsReady = Boolean(repo);
