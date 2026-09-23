'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { site, downloadsReady } from '@/lib/site';
import { DownloadIcon } from './icons';

// Guesses the visitor's desktop OS; null for phones, tablets and unknowns.
export function detectOS() {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent || '';
  const platform = navigator.userAgentData?.platform || navigator.platform || '';
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return null;
  if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) {
    // iPadOS reports itself as a Mac but has touch.
    if (navigator.maxTouchPoints > 1) return null;
    return 'mac';
  }
  if (/Win/i.test(platform) || /Windows/i.test(ua)) return 'win';
  return null;
}

export default function DownloadButton({ size, variant = 'primary', short = false, className = '' }) {
  const [os, setOs] = useState(null);
  useEffect(() => setOs(detectOS()), []);

  const cls = `btn btn-${variant}${size === 'sm' ? ' btn-sm' : ''} ${className}`;
  const dl = os && site.downloads[os];

  // Direct download only when we know the OS and releases are configured.
  if (dl && dl.url && downloadsReady) {
    return (
      <a className={cls} href={dl.url} rel="nofollow">
        <DownloadIcon />
        {short ? 'Download' : `Download for ${dl.label}`}
      </a>
    );
  }
  return (
    <Link className={cls} href="/download">
      <DownloadIcon />
      {short ? 'Download' : `Download for Mac & Windows`}
    </Link>
  );
}
