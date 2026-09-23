'use client';

import { useEffect, useState } from 'react';
import { site, downloadsReady } from '@/lib/site';
import { detectOS } from './DownloadButton';
import { DownloadIcon, LaptopIcon, DesktopIcon } from './icons';

const STEPS = {
  mac: [
    ['Open', `the downloaded ${site.name}.dmg and drag ${site.name} into Applications.`],
    ['Right-click', `${site.name} in Applications and choose Open (first launch only).`],
    ['Look up:', 'your charm lives in the menu bar at the top of the screen.'],
  ],
  win: [
    ['Run', `${site.name}-win-setup.exe. It installs in a few seconds, no admin needed.`],
    ['If SmartScreen appears,', 'click More info → Run anyway (first install only).'],
    ['Find it', 'in the system tray near the clock. Click it for the menu.'],
  ],
};

export default function DownloadCards() {
  const [os, setOs] = useState(null);
  useEffect(() => setOs(detectOS()), []);

  return (
    <div className="dl-grid">
      {['mac', 'win'].map((key) => {
        const d = site.downloads[key];
        const Icon = key === 'mac' ? LaptopIcon : DesktopIcon;
        return (
          <article key={key} className={`dl${os === key ? ' recommended' : ''}`}>
            <div className="os">
              <Icon />
              <h2>{d.label}</h2>
              {os === key && <span className="badge">Your computer</span>}
            </div>
            <p className="muted">{d.detail}</p>
            {downloadsReady && d.url ? (
              <a className={`btn ${os === key || !os ? 'btn-primary' : 'btn-ghost'}`} href={d.url} rel="nofollow">
                <DownloadIcon /> Download for {d.label}
              </a>
            ) : (
              <span className="btn btn-ghost" aria-disabled="true" style={{ opacity: 0.6, cursor: 'default' }}>
                Coming soon
              </span>
            )}
            <ol>
              {STEPS[key].map(([b, rest]) => (
                <li key={b}>
                  <b>{b}</b> {rest}
                </li>
              ))}
            </ol>
          </article>
        );
      })}
    </div>
  );
}
