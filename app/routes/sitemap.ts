import { publicGet } from '~/lib/api';
import { SITE_URL } from '~/lib/seo';
import type { CaseListItem } from '~/lib/types';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export async function loader() {
  const urls: { loc: string; lastmod?: string }[] = ['/', '/kasus', '/statistik', '/data', '/tentang'].map((p) => ({ loc: p }));
  // Walk every page of active cases.
  for (let page = 1; page <= 200; page += 1) {
    const res = await publicGet<CaseListItem[]>('/api/cases', { page, limit: 50, sort: 'newest' });
    res.data.forEach((c) => urls.push({ loc: `/kasus/${c.slug}`, lastmod: c.lastActivityAt }));
    if (!res.meta || page >= res.meta.totalPages) break;
  }
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${esc(SITE_URL + u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod.slice(0, 10)}</lastmod>` : ''}</url>`).join('\n')}
</urlset>`;
  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
