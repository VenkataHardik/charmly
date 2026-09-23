import { site } from '@/lib/site';

export const metadata = { title: 'Privacy', alternates: { canonical: '/privacy' } };

export default function Privacy() {
  return (
    <div className="wrap">
      <header className="page-head">
        <span className="eyebrow">Privacy</span>
        <h1>Your desktop stays yours.</h1>
      </header>
      <div className="prose">
        <p>
          {site.name} is built to work entirely on your computer. This page explains the little data it touches.
        </p>
        <h2>The app</h2>
        <ul>
          <li>No account, no sign-in, no ads, and no analytics or tracking.</li>
          <li>Your settings and any charms you create are stored only on your computer, in the app’s data folder.</li>
          <li>Images you turn into charms are processed locally and are never uploaded.</li>
          <li>
            The only network request the app makes is an update check against our public releases on GitHub. That request
            is subject to GitHub’s privacy policy and includes standard information like your IP address and app version.
          </li>
        </ul>
        <h2>This website</h2>
        <ul>
          <li>We don’t use cookies or third-party trackers.</li>
          <li>Our hosting provider may keep standard server logs (such as IP address and pages requested) for security and reliability.</li>
          <li>Downloads are served from GitHub Releases.</li>
        </ul>
        <h2>Questions</h2>
        <p>
          {site.supportEmail ? (
            <>Email us at <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>.</>
          ) : (
            'Reach out through the links in the footer.'
          )}
        </p>
      </div>
    </div>
  );
}
