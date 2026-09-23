import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { site } from '@/lib/site';

export const alt = site.tagline;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const CHARMS = ['mochi-kitty', 'golden-retriever', 'airliner', 'nazar', 'moon'];

export default async function OpengraphImage() {
  const svgs = await Promise.all(
    CHARMS.map((id) => readFile(join(process.cwd(), 'public', 'charms', `${id}.svg`), 'base64')),
  );
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          padding: 70, color: '#f6f1ff',
          background: 'radial-gradient(ellipse at 75% 20%, #3a2a70, #120d26 60%, #0e0b1a)',
        }}
      >
        <div style={{ position: 'absolute', top: 0, right: 60, display: 'flex', gap: 36 }}>
          {svgs.map((b64, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 3, height: 60 + ((i * 47) % 110), background: '#8fe3ff' }} />
              <img src={`data:image/svg+xml;base64,${b64}`} width={120} height={120} />
            </div>
          ))}
        </div>
        <div style={{ fontSize: 34, color: '#ff8fbf', fontWeight: 700, letterSpacing: 4 }}>{site.name.toUpperCase()}</div>
        <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, maxWidth: 820, marginTop: 14 }}>
          Hang a little joy on your screen.
        </div>
        <div style={{ fontSize: 30, color: '#aaa1c4', marginTop: 20 }}>Free for macOS & Windows</div>
      </div>
    ),
    size,
  );
}
