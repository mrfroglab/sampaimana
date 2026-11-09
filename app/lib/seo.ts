export const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined) || 'https://sampaimana.hallojanu.me';
export const SITE_NAME = 'Sampai Mana';
const DEFAULT_DESC =
  'Pantau sampai mana kasus hukum publik di Indonesia berjalan — dari pelaporan hingga putusan, lengkap dengan sumber terverifikasi dan riwayat perubahan.';

export function seo({
  title,
  description = DEFAULT_DESC,
  path = '/',
  type = 'website',
  noindex,
}: {
  title?: string;
  description?: string;
  path?: string;
  type?: 'website' | 'article';
  noindex?: boolean;
}) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} · Pelacak perkembangan kasus hukum`;
  const url = `${SITE_URL}${path}`;
  const image = `${SITE_URL}/og.png`;
  return [
    { title: fullTitle },
    { name: 'description', content: description },
    { tagName: 'link', rel: 'canonical', href: url },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:locale', content: 'id_ID' },
    { property: 'og:type', content: type },
    { property: 'og:title', content: title || SITE_NAME },
    { property: 'og:description', content: description },
    { property: 'og:url', content: url },
    { property: 'og:image', content: image },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title || SITE_NAME },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: image },
    ...(noindex ? [{ name: 'robots', content: 'noindex' }] : []),
  ];
}
