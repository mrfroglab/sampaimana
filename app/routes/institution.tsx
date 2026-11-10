import { data } from 'react-router';
import type { Route } from './+types/institution';
import { ApiError, publicGet } from '~/lib/api';
import { SITE_URL, seo } from '~/lib/seo';
import { fmtNum } from '~/lib/format';
import type { CaseListItem } from '~/lib/types';
import { CaseCard } from '~/components/CaseCard';
import { PageHeader, StatBlock } from '~/components/ui';

interface Institution {
  name: string;
  slug: string;
  stats: { cases: number; decided: number; ongoing: number; medianDaysToDecision: number | null };
  cases: CaseListItem[];
}

export async function loader({ params }: Route.LoaderArgs) {
  try {
    const res = await publicGet<Institution>(`/api/institutions/${encodeURIComponent(params.slug)}`);
    return { institution: res.data };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) throw data('Lembaga tidak ditemukan', { status: 404 });
    throw err;
  }
}

export const meta: Route.MetaFunction = ({ data: d }) => {
  if (!d) return seo({ title: 'Lembaga tidak ditemukan', noindex: true });
  const { institution: inst } = d;
  const path = `/instansi/${inst.slug}`;
  const median = inst.stats.medianDaysToDecision;
  return seo({
    title: `${inst.name} — kasus yang ditangani`,
    description: `${inst.stats.cases} kasus publik yang ditangani ${inst.name}: ${inst.stats.ongoing} berjalan, ${inst.stats.decided} diputus${
      median !== null ? `, median ${fmtNum(median)} hari sampai putusan` : ''
    }.`,
    path,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${inst.name} — kasus yang ditangani`,
      url: `${SITE_URL}${path}`,
      inLanguage: 'id-ID',
      about: { '@type': 'Organization', name: inst.name },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: inst.cases.length,
        itemListElement: inst.cases.map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: c.title,
          url: `${SITE_URL}/kasus/${c.slug}`,
        })),
      },
    },
  });
};

export default function InstitutionPage({ loaderData }: Route.ComponentProps) {
  const { institution: inst } = loaderData;
  const { stats } = inst;

  return (
    <div className="container-page pb-20">
      <PageHeader
        kicker="Lembaga penangan"
        title={<span className="[overflow-wrap:anywhere]">{inst.name}</span>}
        description="Kasus publik yang ditangani lembaga ini, beserta rata-rata kecepatan penyelesaiannya."
        crumbs={[{ to: '/', label: 'Beranda' }, { to: '/instansi', label: 'Lembaga' }, { label: inst.name }]}
      />

      <dl className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4">
        <StatBlock label="Kasus" value={fmtNum(stats.cases)} />
        <StatBlock label="Berjalan" value={fmtNum(stats.ongoing)} />
        <StatBlock label="Diputus" value={fmtNum(stats.decided)} />
        <StatBlock
          label="Median hari sampai putusan"
          value={stats.medianDaysToDecision !== null ? fmtNum(stats.medianDaysToDecision) : '—'}
          hint={stats.medianDaysToDecision === null ? <span className="text-muted">belum cukup data</span> : undefined}
        />
      </dl>

      <h2 className="mt-12 text-heading-sm font-semibold text-ink">Kasus</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        {inst.cases.map((c) => (
          <CaseCard key={c.id} item={c} className="min-w-0" />
        ))}
      </div>
    </div>
  );
}
