import type { Route } from './+types/terms';
import { seo } from '~/lib/seo';
import { legalPage } from '~/lib/legal.server';
import { LegalPage } from '~/components/LegalPage';

// Content lives in docs/legal/TERMS.md.
export const loader = () => legalPage('terms');

export const meta: Route.MetaFunction = () =>
  seo({
    title: 'Syarat & Ketentuan',
    description: 'Ketentuan memakai Sampai Mana: akun, kontribusi, pemakaian yang dilarang, dan lisensi data.',
    path: '/ketentuan',
  });

export default function Terms({ loaderData }: Route.ComponentProps) {
  return <LegalPage kicker="Legal" title={loaderData.title} html={loaderData.html} />;
}
