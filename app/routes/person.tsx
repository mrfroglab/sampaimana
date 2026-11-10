import { data } from 'react-router';
import { Scale } from 'lucide-react';
import type { Route } from './+types/person';
import { ApiError, publicGet } from '~/lib/api';
import { SITE_URL, seo } from '~/lib/seo';
import { fmtNum } from '~/lib/format';
import type { CaseListItem } from '~/lib/types';
import { CaseCard } from '~/components/CaseCard';
import { Badge, PageHeader, StatBlock } from '~/components/ui';

interface Person {
  name: string;
  slug: string;
  roles: string[];
  cases: CaseListItem[];
}

export async function loader({ params }: Route.LoaderArgs) {
  try {
    const res = await publicGet<Person>(`/api/people/${encodeURIComponent(params.slug)}`);
    return { person: res.data };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) throw data('Pihak tidak ditemukan', { status: 404 });
    throw err;
  }
}

export const meta: Route.MetaFunction = ({ data: d }) => {
  if (!d) return seo({ title: 'Pihak tidak ditemukan', noindex: true });
  const { person } = d;
  const path = `/orang/${person.slug}`;
  return seo({
    title: `${person.name} — kasus terkait`,
    description: `${person.cases.length} kasus publik yang menyebut ${person.name}: status terkini dan riwayat. Dianggap tidak bersalah hingga ada putusan berkekuatan hukum tetap.`,
    path,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${person.name} — kasus terkait`,
      url: `${SITE_URL}${path}`,
      inLanguage: 'id-ID',
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: person.cases.length,
        itemListElement: person.cases.map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: c.title,
          url: `${SITE_URL}/kasus/${c.slug}`,
        })),
      },
    },
  });
};

export default function PersonPage({ loaderData }: Route.ComponentProps) {
  const { person } = loaderData;
  const total = person.cases.length;
  const decided = person.cases.filter((c) => c.currentStatus === 'PUTUSAN').length;

  return (
    <div className="container-page pb-20">
      <PageHeader
        kicker="Pihak dalam kasus publik"
        title={<span className="[overflow-wrap:anywhere]">{person.name}</span>}
        crumbs={[{ to: '/', label: 'Beranda' }, { to: '/kasus', label: 'Kasus' }, { label: person.name }]}
      >
        {person.roles.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Peran">
            {person.roles.map((r) => (
              <li key={r}>
                <Badge tone="outline">{r}</Badge>
              </li>
            ))}
          </ul>
        )}
      </PageHeader>

      <div className="card flex gap-3 p-4 sm:items-center sm:p-5" role="note">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink/[0.06] text-ink">
          <Scale className="size-4" aria-hidden />
        </span>
        <p className="min-w-0 text-sm leading-relaxed text-ink-soft sm:text-[15px]">
          <strong className="font-semibold text-ink">Asas praduga tak bersalah.</strong> Setiap orang yang disebut di situs ini
          dianggap tidak bersalah sampai ada putusan pengadilan berkekuatan hukum tetap. Halaman ini hanya merangkum kasus publik
          yang menyebut nama tersebut; kemunculan nama bukan pernyataan bersalah.
        </p>
      </div>

      <dl className="mt-10 grid grid-cols-3 gap-4 sm:max-w-xl">
        <StatBlock label="Kasus" value={fmtNum(total)} />
        <StatBlock label="Berjalan" value={fmtNum(total - decided)} />
        <StatBlock label="Diputus" value={fmtNum(decided)} />
      </dl>

      <h2 className="mt-12 text-heading-sm font-semibold text-ink">Kasus terkait</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        {person.cases.map((c) => (
          <CaseCard key={c.id} item={c} className="min-w-0" />
        ))}
      </div>
    </div>
  );
}
