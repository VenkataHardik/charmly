import Link from 'next/link';
import Image from 'next/image';
import { site } from '@/lib/site';
import DownloadButton from './DownloadButton';

export default function Header() {
  return (
    <header className="header">
      <div className="wrap">
        <Link href="/" className="logo" aria-label={`${site.name} home`}>
          <Image src="/logo.png" alt="" width={36} height={36} priority />
          {site.name}
        </Link>
        <nav className="nav" aria-label="Main">
          <Link href="/#features">Features</Link>
          <Link href="/collections">Collections</Link>
          <Link href="/#faq">FAQ</Link>
          <Link href="/download">Download</Link>
        </nav>
        <DownloadButton size="sm" variant="ghost" short />
      </div>
    </header>
  );
}
