import { site, downloadsReady } from '@/lib/site';
import DownloadCards from '@/components/DownloadCards';

export const metadata = {
  title: 'Download',
  description: `Download ${site.name} for macOS and Windows. Free.`,
  alternates: { canonical: '/download' },
};

export default function DownloadPage() {
  return (
    <div className="wrap">
      <header className="page-head">
        <span className="eyebrow">Free download</span>
        <h1>Get {site.name}</h1>
        <p>One small app, a whole shelf of charms. Pick your computer below.</p>
      </header>
      <DownloadCards />
      {!downloadsReady && (
        <p className="notice">
          Downloads are being prepared and will appear here shortly. Check back soon!
        </p>
      )}
      {site.releasesUrl && (
        <p className="notice">
          Looking for an older version or release notes? Everything is on the{' '}
          <a href={site.releasesUrl} style={{ color: 'var(--pink)', textDecoration: 'underline' }} rel="noopener">
            releases page
          </a>
          .
        </p>
      )}
      <div style={{ height: 80 }} />
    </div>
  );
}
