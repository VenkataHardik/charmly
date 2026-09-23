import { site } from '@/lib/site';

export default function sitemap() {
  return ['', '/collections', '/download', '/privacy', '/terms'].map((path) => ({
    url: `${site.url}${path}`,
    changeFrequency: path ? 'monthly' : 'weekly',
    priority: path ? 0.7 : 1,
  }));
}
