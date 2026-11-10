import { Link } from 'react-router';
import { ArrowUpRight, Landmark } from 'lucide-react';
import type { Route } from './+types/institutions';
import { publicGet } from '~/lib/api';
import { SITE_URL, seo } from '~/lib/seo';
import { fmtNum } from '~/lib/format';
import { EmptyState, PageHeader } from '~/components/ui';

interface InstitutionRow {
  name: string;
  slug: string;
  cases: number;
}

export async function loader() {
  const res = await publicGet<InstitutionRow[]>('/api/institutions');
  return { institutions: res.data };
}

const DESC = 'Daftar lembaga penangan perkara dan jumlah kasus publik yang dipantau di Sampai Mana.';

export const meta: Route.MetaFunction = ({ data: d }) =>
  seo({
    title: 'Lembaga penangan kasus',
    description: DESC,
    path: '/instansi',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Lembaga penangan kasus',
      url: `${SITE_URL}/instansi`,
      inLanguage: 'id-ID',
      ...(d && {
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: d.institutions.length,
          itemListElement: d.institutions.map((i, n) => ({
            '@type': 'ListItem',
            position: n + 1,
            name: i.name,
            url: `${SITE_URL}/instansi/${i.slug}`,
          })),
        },
      }),
    },
  });

export default function Institutions({ loaderData }: Route.ComponentProps) {
  const { institutions } = loaderData;
  return (
    <div className="container-page pb-20">
      <PageHeader
        kicker="Telusuri"
        title="Lembaga penangan"
        description={DESC}
        crumbs={[{ to: '/', label: 'Beranda' }, { label: 'Lembaga' }]}
      />
      {institutions.length === 0 ? (
        <EmptyState icon={<Landmark />} title="Belum ada lembaga tercatat">
          Lembaga akan muncul di sini setelah kasus yang menyebutnya dipantau.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {institutions.map((i) => (
            <li key={i.slug} className="min-w-0">
              <Link
                to={`/instansi/${i.slug}`}
                className="card card-hover group flex h-full items-start justify-between gap-4 p-5"
              >
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold leading-snug text-ink [overflow-wrap:anywhere]">
                    {i.name}
                  </span>
                  <span className="mt-1.5 block text-[13px] text-muted">
                    <span className="font-medium text-ink num">{fmtNum(i.cases)}</span> kasus
                  </span>
                </span>
                <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted transition-colors group-hover:text-ink" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
