import { site } from '@/lib/site';

export const metadata = { title: 'Terms', alternates: { canonical: '/terms' } };

export default function Terms() {
  return (
    <div className="wrap">
      <header className="page-head">
        <span className="eyebrow">Terms</span>
        <h1>The small print.</h1>
      </header>
      <div className="prose">
        <p>By downloading or using {site.name} you agree to these terms.</p>
        <h2>Using {site.name}</h2>
        <p>
          {site.name} is free for personal use. You may not resell it, repackage it, or redistribute the built-in charm
          artwork outside the app.
        </p>
        <h2>Your charms</h2>
        <p>
          You’re responsible for images you import with Create. Only use images you have the right to use. Custom charms
          stay on your computer.
        </p>
        <h2>No warranty</h2>
        <p>
          {site.name} is provided “as is”, without warranties of any kind. To the extent permitted by law, we aren’t
          liable for any damages arising from its use.
        </p>
        <h2>Changes</h2>
        <p>We may update these terms as the app evolves. Continued use after changes means you accept them.</p>
      </div>
    </div>
  );
}
