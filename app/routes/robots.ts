import { SITE_URL } from '~/lib/seo';

export function loader() {
  const body = `User-agent: *
Allow: /
Disallow: /akun
Disallow: /redaksi
Disallow: /masuk
Disallow: /daftar
Disallow: /kontribusi/

Sitemap: ${SITE_URL}/sitemap.xml
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
}
