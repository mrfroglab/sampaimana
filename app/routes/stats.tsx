import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight } from 'lucide-react';
import type { Route } from './+types/stats';
import { publicGet } from '~/lib/api';
import { seo } from '~/lib/seo';
import { STATUS_LABEL, STATUS_ORDER, fmtDuration, fmtNum } from '~/lib/format';
import type { Stats } from '~/lib/types';
import { Card, CardHeader, EmptyState, PageHeader, StatBlock } from '~/components/ui';

export const meta: Route.MetaFunction = () =>
  seo({ title: 'Statistik', description: 'Berapa lama kasus hukum bertahan di tiap tahap, dan di mana saja kasus tertahan.', path: '/statistik' });

export async function loader() {
  const res = await publicGet<Stats>('/api/stats');
  return { stats: res.data };
}

/** Ink bar on a soft rounded track. Children are overlaid (e.g. a median tick). */
function Bar({ value, max, children }: { value: number; max: number; children?: ReactNode }) {
  const pct = max ? Math.max(value ? 1.5 : 0, (value / max) * 100) : 0;
  return (
    <div className="relative h-2 rounded-full bg-ink/[0.06]">
      <div className="h-full rounded-full bg-ink" style={{ width: `${Math.min(100, pct)}%` }} />
      {children}
    </div>
  );
}

const ROW = 'group grid items-center gap-3 px-5 py-3 transition-colors hover:bg-ink/[0.03]';

export default function StatsPage({ loaderData }: Route.ComponentProps) {
  const { stats } = loaderData;
  const maxStatus = Math.max(1, ...STATUS_ORDER.map((s) => stats.byStatus[s]));
  const maxCat = Math.max(1, ...stats.byCategory.map((c) => c.count));
  const durations = stats.stageDurations.filter((d) => d.stageType !== 'PUTUSAN');
  const maxDur = Math.max(1, ...durations.map((d) => d.avgDays ?? 0));
  const verifiedPct = stats.totals.sources ? Math.round((stats.totals.verifiedSources / stats.totals.sources) * 100) : 0;

  const totals = [
    { label: 'Kasus dipantau', value: fmtNum(stats.totals.cases) },
    { label: 'Belum diputus', value: fmtNum(stats.totals.ongoing) },
    { label: 'Sumber tercatat', value: fmtNum(stats.totals.sources) },
    { label: 'Sumber terverifikasi', value: `${verifiedPct}%` },
  ];

  return (
    <div className="container-page pb-20">
      <PageHeader
        kicker="Angka di balik linimasa"
        title="Statistik"
        description="Seberapa lama sebuah kasus bertahan di setiap tahap, dan berapa banyak yang belum sampai di putusan. Dihitung dari tahapan yang sudah selesai pada kasus aktif."
      />

      <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {totals.map((t) => (
          <StatBlock key={t.label} label={t.label} value={t.value} className="card p-5 sm:p-6" />
        ))}
      </dl>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader
            title="Rata-rata lama tiap tahap"
            description="Garis vertikal menandai median. Angka kecil di kanan: jumlah tahap yang dihitung."
          />
          <ul className="space-y-5 p-5">
            {durations.map((d) => (
              <li key={d.stageType}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-sm font-medium text-ink">{STATUS_LABEL[d.stageType]}</span>
                  <span className="shrink-0 text-sm font-medium text-ink num">
                    {d.avgDays == null ? '—' : fmtDuration(Math.round(d.avgDays))}
                    <span className="ml-2 text-xs font-normal text-muted">n={d.count}</span>
                  </span>
                </div>
                <div className="mt-2.5">
                  <Bar value={d.avgDays ?? 0} max={maxDur}>
                    {d.medianDays != null && (
                      <span
                        className="absolute -top-1 -bottom-1 w-[3px] -translate-x-1/2 rounded-full bg-ink ring-2 ring-raised"
                        style={{ left: `${Math.min(100, (d.medianDays / maxDur) * 100)}%` }}
                        title={`Median ${fmtDuration(Math.round(d.medianDays))}`}
                      />
                    )}
                  </Bar>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="min-w-0">
          <CardHeader title="Kasus menurut tahap saat ini" description="Pilih tahap untuk melihat daftar kasusnya." />
          <ul className="divide-y divide-line">
            {STATUS_ORDER.map((s) => (
              <li key={s}>
                <Link to={`/kasus?status=${s}`} className={`${ROW} grid-cols-[minmax(0,6.5rem)_1fr_2.5rem] sm:grid-cols-[9rem_1fr_3rem]`}>
                  <span className="truncate text-sm text-ink-soft group-hover:text-ink">{STATUS_LABEL[s]}</span>
                  <Bar value={stats.byStatus[s]} max={maxStatus} />
                  <span className="text-right text-sm font-medium text-ink num">{fmtNum(stats.byStatus[s])}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="min-w-0">
          <CardHeader title="Menurut kategori" description="Jumlah kasus yang dipantau di tiap bidang." />
          <ul className="divide-y divide-line">
            {stats.byCategory.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/kasus?category=${c.slug}`}
                  className={`${ROW} grid-cols-[minmax(0,6.5rem)_1fr_2.5rem] sm:grid-cols-[minmax(0,11rem)_1fr_3rem]`}
                >
                  <span className="truncate text-sm text-ink-soft group-hover:text-ink">{c.name}</span>
                  <Bar value={c.count} max={maxCat} />
                  <span className="text-right text-sm font-medium text-ink num">{fmtNum(c.count)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="min-w-0">
          <CardHeader title="Paling lama di tahap yang sama" description="Kasus aktif yang paling lama belum berpindah tahap." />
          {stats.longestActive.length === 0 ? (
            <div className="p-5">
              <EmptyState title="Tidak ada yang tertahan">Semua kasus yang dipantau sudah diputus.</EmptyState>
            </div>
          ) : (
            <ol className="divide-y divide-line">
              {stats.longestActive.map((s, i) => (
                <li key={s.case.slug}>
                  <Link to={`/kasus/${s.case.slug}`} className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-ink/[0.03]">
                    <span className="w-5 shrink-0 text-xs text-muted num">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-medium text-ink">{s.case.title}</span>
                      <span className="mt-0.5 block text-[13px] text-muted">{STATUS_LABEL[s.stageType]}</span>
                    </span>
                    <span className="shrink-0 text-right text-sm font-semibold text-ink num">{fmtDuration(s.daysRunning)}</span>
                    <ArrowUpRight className="size-4 shrink-0 text-muted transition-colors group-hover:text-ink max-sm:hidden" aria-hidden />
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
