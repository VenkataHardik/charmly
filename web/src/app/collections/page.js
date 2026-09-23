import { COLLECTIONS } from '@/shared/charms.js';
import { site } from '@/lib/site';
import DownloadButton from '@/components/DownloadButton';

export const metadata = {
  title: 'Collections',
  description: 'Kawaii kitties, golden retrievers, planes, lucky charms and celestial friends, all ready to hang on your desktop.',
  alternates: { canonical: '/collections' },
};

export default function CollectionsPage() {
  return (
    <div className="wrap">
      <header className="page-head">
        <span className="eyebrow">The charm shelf</span>
        <h1>Every charm, all in one place.</h1>
        <p>Hover to give them a swing. In {site.name} you can hang up to five at once, or make your own from any photo.</p>
      </header>
      {COLLECTIONS.map((col) => (
        <section key={col.id} id={col.id} className="col-section" style={{ scrollMarginTop: 90 }}>
          <header>
            <div>
              <span className="eyebrow" style={{ color: col.accent }}>{col.tagline}</span>
              <h2 style={{ marginTop: 12 }}>{col.name}</h2>
            </div>
            <p className="muted" style={{ maxWidth: 380 }}>{col.blurb}</p>
          </header>
          <div className="charm-grid">
            {col.charms.map((c) => (
              <div className="charm-tile" key={c.id}>
                <img src={`/charms/${c.file}`} alt={c.name} loading="lazy" width="110" height="110" />
                <span>{c.name}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
      <section className="col-section" style={{ textAlign: 'center', paddingBottom: 100 }}>
        <h2>Don’t see yours?</h2>
        <p className="muted" style={{ margin: '14px auto 28px', maxWidth: 520 }}>
          Make it. Drop any photo into {site.name}’s Create tab and it becomes a charm with its own rope and physics.
        </p>
        <DownloadButton />
      </section>
    </div>
  );
}
