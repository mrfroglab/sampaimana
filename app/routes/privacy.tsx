import type { Route } from './+types/privacy';
import { seo } from '~/lib/seo';
import { legalPage } from '~/lib/legal.server';
import { LegalPage } from '~/components/LegalPage';

// Content lives in docs/legal/PRIVACY.md.
export const loader = () => legalPage('privacy');

export const meta: Route.MetaFunction = () =>
  seo({
    title: 'Kebijakan Privasi',
    description: 'Data pribadi apa yang dikumpulkan Sampai Mana, untuk apa, berapa lama disimpan, dan hak Anda atasnya.',
    path: '/privasi',
  });

export default function Privacy({ loaderData }: Route.ComponentProps) {
  return <LegalPage kicker="Legal" title={loaderData.title} html={loaderData.html} />;
}
