import { Link } from 'react-router';
import type { Route } from './+types/stats';
import { publicGet } from '~/lib/api';
import { seo } from '~/lib/seo';
import { STATUS_LABEL, STATUS_ORDER, cx, fmtDuration, fmtNum } from '~/lib/format';
import type { Stats } from '~/lib/types';
import { SectionHeading } from '~/components/ui';

export const meta: Route.MetaFunction = () =>
  seo({ title: 'Statistik', description: 'Berapa lama kasus hukum bertahan di tiap tahap, dan di mana saja kasus tertahan.', path: '/statistik' });

export async function loader() {
  const res = await publicGet<Stats>('/api/stats');
  return { stats: res.data };
}

function Bar({ value, max, tone = 'accent' }: { value: number; max: number; tone?: 'accent' | 'ink' }) {
  return (
    <div className="h-6 bg-sunk">
      <div
        className={cx('h-full', tone === 'ink' ? 'bg-ink' : 'bg-accent')}
        style={{ width: `${max ? Math.max(value ? 1.5 : 0, (value / max) * 100) : 0}%` }}
      />
    </div>
  );
}

export default function StatsPage({ loaderData }: Route.ComponentProps) {
  const { stats } = loaderData;
  const maxStatus = Math.max(1, ...STATUS_ORDER.map((s) => stats.byStatus[s]));
  const maxCat = Math.max(1, ...stats.byCategory.map((c) => c.count));
  const durations = stats.stageDurations.filter((d) => d.stageType !== 'PUTUSAN');
  const maxDur = Math.max(1, ...durations.map((d) => d.avgDays ?? 0));
  const verifiedPct = stats.totals.sources ? Math.round((stats.totals.verifiedSources / stats.totals.sources) * 100) : 0;

  return (
    <div className="container-page pt-10">
      <header className="border-b-2 border-ink pb-6">
        <p className="kicker">Angka di balik linimasa</p>
        <h1 className="mt-2 font-serif text-headline text-ink">Statistik</h1>
        <p className="mt-3 max-w-2xl text-lg text-ink-soft">
          Seberapa lama sebuah kasus bertahan di setiap tahap, dan berapa banyak yang belum sampai di putusan. Dihitung dari
          tahapan yang sudah selesai pada kasus aktif.
        </p>
      </header>

      <dl className="grid grid-cols-2 border-b border-line md:grid-cols-4">
        {(
          [
            ['Kasus dipantau', fmtNum(stats.totals.cases)],
            ['Belum diputus', fmtNum(stats.totals.ongoing)],
            ['Sumber tercatat', fmtNum(stats.totals.sources)],
            ['Sumber terverifikasi', `${verifiedPct}%`],
          ] as const
        ).map(([k, v], i) => (
          <div key={k} className={cx('py-6', i % 2 === 1 && 'border-l border-line pl-5', i >= 2 && 'border-t border-line md:border-t-0', i === 2 && 'md:border-l md:pl-5')}>
            <dt className="kicker">{k}</dt>
            <dd className="mt-2 font-serif text-4xl text-ink num">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-14 grid gap-14 lg:grid-cols-2">
        <section>
          <SectionHeading kicker="Durasi" title="Rata-rata lama tiap tahap" />
          <p className="mt-2 text-sm text-muted">Garis tipis menandai median. Angka kecil di kanan: jumlah tahap yang dihitung.</p>
          <ul className="mt-6 space-y-5">
            {durations.map((d) => (
              <li key={d.stageType}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[15px] font-medium text-ink">{STATUS_LABEL[d.stageType]}</span>
                  <span className="font-mono text-sm text-ink num">
                    {d.avgDays == null ? '—' : fmtDuration(Math.round(d.avgDays))}
                    <span className="ml-2 text-xs text-faint">n={d.count}</span>
                  </span>
                </div>
                <div className="relative mt-2">
                  <Bar value={d.avgDays ?? 0} max={maxDur} />
                  {d.medianDays != null && (
                    <span
                      className="absolute -bottom-1 -top-1 w-[2px] bg-ink"
                      style={{ left: `${Math.min(100, (d.medianDays / maxDur) * 100)}%` }}
                      title={`Median ${fmtDuration(Math.round(d.medianDays))}`}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <SectionHeading kicker="Posisi" title="Kasus menurut tahap saat ini" />
          <ul className="mt-6 space-y-4">
            {STATUS_ORDER.map((s) => (
              <li key={s} className="grid grid-cols-[110px_1fr_40px] items-center gap-3">
                <Link to={`/kasus?status=${s}`} className="link text-[14px]">
                  {STATUS_LABEL[s]}
                </Link>
                <Bar value={stats.byStatus[s]} max={maxStatus} tone={s === 'PUTUSAN' ? 'ink' : 'accent'} />
                <span className="text-right font-mono text-sm num">{stats.byStatus[s]}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <SectionHeading kicker="Bidang" title="Menurut kategori" />
          <ul className="mt-6 space-y-4">
            {stats.byCategory.map((c) => (
              <li key={c.id} className="grid grid-cols-[minmax(0,180px)_1fr_40px] items-center gap-3">
                <Link to={`/kasus?category=${c.slug}`} className="link truncate text-[14px]">
                  {c.name}
                </Link>
                <div className="h-6 bg-sunk">
                  <div className="h-full" style={{ width: `${(c.count / maxCat) * 100}%`, background: c.color }} />
                </div>
                <span className="text-right font-mono text-sm num">{c.count}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <SectionHeading kicker="Tertahan" title="Paling lama di tahap yang sama" />
          {stats.longestActive.length === 0 ? (
            <p className="mt-6 text-sm text-muted">Semua kasus yang dipantau sudah diputus.</p>
          ) : (
            <ol className="mt-4 divide-y divide-line">
              {stats.longestActive.map((s) => (
                <li key={s.case.slug} className="flex items-baseline justify-between gap-4 py-3">
                  <Link to={`/kasus/${s.case.slug}`} className="link min-w-0 font-serif text-[1.05rem]">
                    {s.case.title}
                  </Link>
                  <span className="shrink-0 text-right">
                    <span className="block font-mono text-sm text-accent-ink num">{fmtDuration(s.daysRunning)}</span>
                    <span className="text-xs text-muted">{STATUS_LABEL[s.stageType]}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
