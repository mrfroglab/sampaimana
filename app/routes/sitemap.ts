import { publicGet } from '~/lib/api';
import { SITE_URL } from '~/lib/seo';

const MAX_URLS = 50000;

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

interface SitemapData {
  cases: { slug: string; updatedAt?: string | null }[];
  people: { slug: string }[];
  institutions: { slug: string }[];
}

const lastmod = (iso?: string | null) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(+d) ? d.toISOString().slice(0, 10) : undefined;
};

export async function loader() {
  let src: SitemapData;
  try {
    src = (await publicGet<SitemapData>('/api/sitemap-data')).data;
  } catch {
    // Never serve a partial sitemap: crawlers would drop the missing URLs.
    return new Response('Sitemap sementara tidak tersedia.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '300', 'Cache-Control': 'no-store' },
    });
  }

  const enc = (slug: string) => encodeURIComponent(slug);
  const urls: { loc: string; lastmod?: string }[] = [
    ...['/', '/kasus', '/statistik', '/tren', '/data', '/tanam', '/tentang', '/instansi'].map((p) => ({ loc: p })),
    ...(src.cases ?? []).map((c) => ({ loc: `/kasus/${enc(c.slug)}`, lastmod: lastmod(c.updatedAt) })),
    ...(src.people ?? []).map((p) => ({ loc: `/orang/${enc(p.slug)}` })),
    ...(src.institutions ?? []).map((i) => ({ loc: `/instansi/${enc(i.slug)}` })),
  ].slice(0, MAX_URLS);

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${esc(SITE_URL + u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`;
  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
