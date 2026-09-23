import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="wrap" style={{ textAlign: 'center', padding: '120px 0' }}>
      <img src="/charms/sleepy-cloud.svg" alt="" width="160" height="160" style={{ margin: '0 auto 30px' }} />
      <h1 style={{ fontSize: 56 }}>This page drifted off.</h1>
      <p className="muted" style={{ margin: '16px 0 30px' }}>We couldn’t find what you were looking for.</p>
      <Link href="/" className="btn btn-primary">Take me home</Link>
    </div>
  );
}
