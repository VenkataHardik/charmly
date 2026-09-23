import Link from 'next/link';
import Image from 'next/image';
import { site } from '@/lib/site';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="top">
          <div>
            <Link href="/" className="logo">
              <Image src="/logo.png" alt="" width={32} height={32} />
              {site.name}
            </Link>
            <p className="muted" style={{ marginTop: 10, fontSize: 15 }}>{site.tagline}</p>
          </div>
          <nav aria-label="Footer">
            <Link href="/#features">Features</Link>
            <Link href="/collections">Collections</Link>
            <Link href="/download">Download</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            {site.releasesUrl && <a href={site.releasesUrl} rel="noopener">Release notes</a>}
            {site.instagram && <a href={site.instagram} rel="noopener">Instagram</a>}
          </nav>
        </div>
        <div className="bottom">
          <span>© {year} {site.name}</span>
          <span>Made with a little magic ✦</span>
        </div>
      </div>
    </footer>
  );
}
