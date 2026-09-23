import Link from 'next/link';
import { COLLECTIONS } from '@/shared/charms.js';
import { site } from '@/lib/site';
import HeroCharms from '@/components/HeroCharms';
import DownloadButton from '@/components/DownloadButton';
import Stars from '@/components/Stars';
import { ArrowIcon } from '@/components/icons';

const FEATURES = [
  ['🪢', 'Real physics', 'Every charm hangs on a rope that swings, twists and settles like the real thing. Flick one and watch it spin.', 'var(--pink)'],
  ['🔔', 'Bump & chime', 'Hang up to five at once. They bump into each other with soft little chimes, all generated live.', 'var(--butter)'],
  ['🖼️', 'Make your own', `Drop in a photo of your dog, your plane or your favourite sticker. ${site.name} cuts out the background for you.`, 'var(--lilac)'],
  ['⛓️', 'Nine ropes', 'Neon, gold chain, pearls, leather, temple thread, spider silk and more. Pick a vibe per mood.', 'var(--sky)'],
  ['💧', 'Kind reminders', 'Optional nudges to drink water, stretch or rest your eyes, delivered by a charm that wiggles to get your attention.', '#7be0b5'],
  ['🫥', 'Never in the way', `Clicks pass right through to your apps. ${site.name} sleeps in the menu bar and sips almost no battery.`, '#ff9f7a'],
];

const AUDIENCES = [
  ['kawaii', 'mochi-kitty', 'For the soft hearts', 'Mochi Kitty, Bun Bun, boba and a very sleepy cloud. Pastel everything.', '#ff8fbf'],
  ['good-boys', 'golden-retriever', 'For dog people', 'Goldie the golden retriever, a sunny pup, a corgi and a shiba. All very good.', '#f1b45c'],
  ['aviation', 'airliner', 'For pilots & plane spotters', 'Airliner, fighter jet, vintage prop, pilot wings and a brass compass. Cleared for takeoff.', '#6ea8ff'],
  ['football', 'striker', 'For football fans', 'Our own striker and keeper, the golden boot, the trophy and a whistle for full time.', '#3ecf6e'],
  ['coders', 'rubber-duck', 'For developers', 'A rubber duck for debugging, a terminal, a git branch and a coffee loop that never ends.', '#7ee0a8'],
  ['doctors', 'stethoscope', 'For doctors & nurses', 'A stethoscope, a heartbeat, a happy pill and a big brain for the long shifts.', '#2ec4a8'],
];

const FAQ = [
  [`Is ${site.name} free?`, 'Yes. Download it, hang as many charms as you like, make your own. No account, no ads.'],
  ['Which computers does it run on?', 'macOS 13 Ventura or newer (Apple silicon and Intel, one universal download) and Windows 10 or 11 (64-bit).'],
  ['Will it get in the way of my work?', `No. ${site.name} draws on a transparent layer and lets every click pass through, except when you’re touching a charm. Hide it any time with ⇧⌘O on Mac or Ctrl+Shift+O on Windows.`],
  ['Does it slow my computer down?', `${site.name} only redraws the small area around your charms and pauses when hidden. On a recent MacBook it uses around 2–3% CPU with charms swaying, and nothing when hidden.`],
  ['Can I use my own images?', `Yes. Open Customize → Create, drop in any photo, and ${site.name} removes a plain background and turns it into a charm. Your images never leave your computer.`],
  ['Why does my Mac say it can’t verify the developer?', `Early builds aren’t notarized by Apple yet. Right-click ${site.name} in Applications, choose Open, then Open again. You only need to do this once.`],
  ['How do updates work?', `${site.name} checks for new versions in the background and lets you know from the menu bar. On Windows, updates install themselves.`],
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <Stars />
        <HeroCharms />
        <div className="wrap">
          <div className="hero-copy">
            <span className="eyebrow">Tiny charms. Big mood.</span>
            <h1>
              Hang a little <em>joy</em> on your screen.
            </h1>
            <p className="lede">
              Cute, physics-driven charms that dangle from the top of your desktop, swing when you nudge them and
              chime when they bump. Go on, grab one.
            </p>
            <div className="cta-row">
              <DownloadButton />
              <Link href="/collections" className="btn btn-ghost">
                See the charms <ArrowIcon />
              </Link>
            </div>
            <div className="meta">
              <span>Free</span>
              <span>·</span>
              <span>macOS & Windows</span>
              <span>·</span>
              <span>No account</span>
            </div>
          </div>
        </div>
        <p className="grab-hint">↖ drag, flick or double-click the charms</p>
      </section>

      <section id="features" className="section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow">Not just a sticker</span>
              <h2>
                Small things,
                <br />
                <span className="muted">made to feel real.</span>
              </h2>
            </div>
            <p>The gentle sway. The little clink. The way it twists and unwinds. It’s the tiny details that make a digital object feel like it’s really there.</p>
          </div>
          <div className="features">
            {FEATURES.map(([ico, title, text, c]) => (
              <article className="feature" key={title} style={{ '--c': c }}>
                <div className="ico" aria-hidden="true">{ico}</div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="collections" className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow">Find your little obsession</span>
              <h2>A charm for every personality.</h2>
            </div>
            <p>{COLLECTIONS.reduce((n, c) => n + c.charms.length, 0)} original charms across {COLLECTIONS.length} collections, plus any you make yourself.</p>
          </div>
          <div className="col-row">
            {COLLECTIONS.map((col, i) => (
              <Link key={col.id} href={`/collections#${col.id}`} className="col-card" style={{ '--c': col.accent }}>
                <div className="col-top">
                  <span>Collection {String(i + 1).padStart(2, '0')}</span>
                  <span>{col.charms.length} charms</span>
                </div>
                <div className="dangles" aria-hidden="true">
                  {col.charms.slice(0, 3).map((c, j) => (
                    <div className="dangle" key={c.id}>
                      <span className="str" style={{ height: 34 + ((j * 23) % 40) }} />
                      <img src={`/charms/${c.file}`} alt="" loading="lazy" width="96" height="96" />
                    </div>
                  ))}
                </div>
                <span className="tag">{col.tagline}</span>
                <h3>{col.name}</h3>
                <p>{col.blurb}</p>
                <div className="more">
                  <span>Explore the collection</span>
                  <span>→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow">Made for your people</span>
              <h2>Which one are you?</h2>
            </div>
          </div>
          <div className="audiences">
            {AUDIENCES.map(([col, charm, title, text, c]) => (
              <Link href={`/collections#${col}`} className="aud" key={col} style={{ '--c': c }}>
                <img src={`/charms/${charm}.svg`} alt="" loading="lazy" width="150" height="150" />
                <h3>{title}</h3>
                <p>{text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow">Up and swinging in a minute</span>
              <h2>How it works</h2>
            </div>
          </div>
          <div className="steps">
            <div className="step">
              <h3>Download & open</h3>
              <p>Install {site.name} for Mac or Windows. It lives quietly in your menu bar or system tray.</p>
            </div>
            <div className="step">
              <h3>Pick your charms</h3>
              <p>Browse the library, star your favourites, or make one from a photo. Hang up to five at once.</p>
            </div>
            <div className="step">
              <h3>Give it a nudge</h3>
              <p>Drag to move, flick to spin, double-click to climb. <kbd>⇧⌘O</kbd> or <kbd>Ctrl+Shift+O</kbd> hides them.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow">Good questions</span>
              <h2>FAQ</h2>
            </div>
          </div>
          <div className="faq">
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="band">
            <div className="band-charm" aria-hidden="true">
              <span className="str" />
              <img src="/charms/golden-pup.svg" alt="" width="180" height="180" loading="lazy" />
            </div>
            <span className="eyebrow" style={{ color: '#5a2f73' }}>One little download</span>
            <h2 style={{ marginTop: 16 }}>Your desktop deserves a friend.</h2>
            <p>Free for macOS and Windows. Takes a minute to set up, and you’ll smile every time you see it.</p>
            <div className="cta-row">
              <DownloadButton variant="dark" />
              <Link href="/collections" className="btn btn-ghost">
                Browse charms <ArrowIcon />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
