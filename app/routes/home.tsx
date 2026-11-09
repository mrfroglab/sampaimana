import { Form, Link } from 'react-router';
import { ArrowRight, Search } from 'lucide-react';
import type { Route } from './+types/home';
import { publicGet } from '~/lib/api';
import { seo } from '~/lib/seo';
import { STATUS_HINT, STATUS_LABEL, STATUS_ORDER, cx, fmtDate, fmtDuration, fmtNum } from '~/lib/format';
import type { CaseListItem, Category, Stats } from '~/lib/types';
import { CaseCard } from '~/components/CaseCard';
import { CategoryTag, LinkButton, RelTime, SectionHeading } from '~/components/ui';
import { ACTION_LABEL } from '~/components/RevisionList';

export const meta: Route.MetaFunction = () => seo({});

export async function loader() {
  const [stats, cases, categories] = await Promise.all([
    publicGet<Stats>('/api/stats'),
    publicGet<CaseListItem[]>('/api/cases', { sort: 'updated', limit: 6 }),
    publicGet<Category[]>('/api/categories'),
  ]);
  return { stats: stats.data, cases: cases.data, categories: categories.data, today: new Date().toISOString() };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { stats, cases, categories, today } = loaderData;
  const max = Math.max(1, ...STATUS_ORDER.map((s) => stats.byStatus[s]));

  return (
    <>
      {/* Masthead */}
      <section className="paper-grain border-b border-line">
        <div className="container-page pb-14 pt-10 sm:pt-14">
          <div className="flex flex-wrap items-center justify-between gap-2 border-y border-ink py-2">
            <p className="kicker text-ink">Pelacak kasus hukum publik</p>
            <p className="kicker" suppressHydrationWarning>
              {fmtDate(today)}
            </p>
          </div>
          <div className="mt-10 grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:items-end">
            <div className="animate-rise">
              <h1 className="font-serif text-display font-medium tracking-[-0.035em] text-ink">
                Sampai <em className="font-normal italic text-accent">mana</em>
                <br />
                kasusnya?
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
                Banyak perkara besar ramai di awal, lalu hilang dari berita. Di sini setiap kasus dicatat tahap demi tahap, dari
                laporan sampai putusan, dengan sumber yang bisa Anda periksa sendiri.
              </p>
              <Form action="/kasus" role="search" className="mt-8 flex max-w-xl">
                <label htmlFor="hero-q" className="sr-only">
                  Cari kasus
                </label>
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-faint" />
                  <input
                    id="hero-q"
                    name="q"
                    type="search"
                    placeholder="Nama kasus, nomor perkara, atau nama pihak"
                    className="h-14 w-full rounded-l-[3px] border border-r-0 border-ink bg-raised pl-12 pr-4 text-base placeholder:text-faint focus:outline-none"
                  />
                </div>
                <button className="h-14 rounded-r-[3px] bg-ink px-6 font-medium text-paper hover:bg-ink-soft">Cari</button>
              </Form>
            </div>

            {/* The line: case counts per station */}
            <div className="border border-line-strong bg-raised p-5 sm:p-6" aria-label="Jumlah kasus per tahap">
              <div className="flex items-baseline justify-between">
                <p className="kicker text-ink">Posisi kasus hari ini</p>
                <p className="font-mono text-xs text-muted num">{fmtNum(stats.totals.cases)} kasus</p>
              </div>
              <ol className="mt-5">
                {STATUS_ORDER.map((s, i) => {
                  const n = stats.byStatus[s];
                  return (
                    <li key={s}>
                      <Link
                        to={`/kasus?status=${s}`}
                        className="group grid grid-cols-[18px_1fr_auto] gap-3 rounded-[2px] py-2.5 pr-1 hover:bg-sunk"
                      >
                        <span className="relative flex justify-center">
                          <span
                            className={cx(
                              'relative z-10 mt-[5px] size-3 rounded-full border-2',
                              s === 'PUTUSAN' ? 'border-ink bg-ink' : n ? 'border-accent bg-accent' : 'border-line-strong bg-paper',
                            )}
                          />
                          {i < STATUS_ORDER.length - 1 && (
                            <span className="absolute left-1/2 top-[17px] h-[calc(100%+10px)] w-[2px] -translate-x-1/2 bg-line-strong" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="text-[15px] font-medium text-ink group-hover:text-accent-ink">{STATUS_LABEL[s]}</span>
                          <span className="mt-1.5 block h-[3px] bg-sunk">
                            <span
                              className={cx('block h-full transition-[width] duration-700', s === 'PUTUSAN' ? 'bg-ink' : 'bg-accent')}
                              style={{ width: `${(n / max) * 100}%` }}
                            />
                          </span>
                          <span className="mt-1 block truncate text-xs text-muted">{STATUS_HINT[s]}</span>
                        </span>
                        <span className="font-serif text-3xl leading-none text-ink num">{n}</span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Ledger */}
      <section className="border-b border-line bg-raised">
        <dl className="container-page grid grid-cols-2 md:grid-cols-4">
          {(
            [
              ['Kasus dipantau', stats.totals.cases],
              ['Masih berjalan', stats.totals.ongoing],
              ['Telah diputus', stats.totals.decided],
              ['Sumber terverifikasi', stats.totals.verifiedSources],
            ] as const
          ).map(([label, value], i) => (
            <div
              key={label}
              className={cx(
                'py-6',
                i % 2 === 1 && 'border-l border-line pl-5',
                i >= 2 && 'border-t border-line md:border-t-0',
                i === 2 && 'md:border-l md:pl-5',
              )}
            >
              <dt className="kicker">{label}</dt>
              <dd className="mt-2 font-serif text-4xl leading-none text-ink num">{fmtNum(value)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="container-page mt-14 grid gap-14 lg:grid-cols-[1fr_340px]">
        <section className="min-w-0">
          <SectionHeading
            kicker="Linimasa"
            title="Baru bergerak"
            action={
              <Link to="/kasus" className="link inline-flex items-center gap-1 text-sm">
                Semua kasus <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          <div className="mt-6 grid gap-x-8 gap-y-10 sm:grid-cols-2">
            {cases.map((c) => (
              <CaseCard key={c.id} item={c} />
            ))}
          </div>
        </section>

        <aside className="min-w-0 space-y-12">
          <section>
            <SectionHeading kicker="Tertahan" title="Paling lama di satu tahap" />
            {stats.longestActive.length === 0 ? (
              <p className="mt-4 text-sm text-muted">Belum ada kasus berjalan yang tercatat.</p>
            ) : (
              <ol className="mt-4 divide-y divide-line">
                {stats.longestActive.map((s, i) => (
                  <li key={s.case.slug} className="flex gap-4 py-3">
                    <span className="font-serif text-2xl leading-none text-faint num">{i + 1}</span>
                    <div className="min-w-0">
                      <Link to={`/kasus/${s.case.slug}`} className="link font-serif text-[1.05rem] leading-snug">
                        {s.case.title}
                      </Link>
                      <p className="mt-1 text-xs text-muted">
                        <span className="font-medium text-accent-ink">{fmtDuration(s.daysRunning)}</span> di tahap{' '}
                        {STATUS_LABEL[s.stageType].toLowerCase()}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section>
            <SectionHeading kicker="Catatan redaksi" title="Perubahan terbaru" />
            <ol className="mt-4 space-y-4">
              {stats.recentUpdates.map((u) => (
                <li key={u.id} className="border-l-2 border-line pl-4">
                  <p className="flex items-center gap-2 text-[11px] text-muted">
                    <span className="font-mono uppercase tracking-[0.08em] text-ink-soft">{ACTION_LABEL[u.action] ?? 'Pembaruan'}</span>
                    <span aria-hidden>·</span>
                    <RelTime date={u.createdAt} />
                  </p>
                  <p className="mt-1 text-sm leading-snug text-ink">{u.summary}</p>
                  <Link to={`/kasus/${u.case.slug}`} className="mt-0.5 block truncate text-xs text-muted hover:text-accent-ink">
                    {u.case.title}
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>

      <section className="container-page mt-16">
        <SectionHeading kicker="Bidang" title="Telusuri menurut kategori" />
        <ul className="mt-5 flex flex-wrap gap-2">
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                to={`/kasus?category=${c.slug}`}
                className="inline-flex items-center gap-3 rounded-[3px] border border-line-strong bg-raised px-4 py-2.5 hover:border-ink"
              >
                <CategoryTag name={c.name} color={c.color} className="text-[14px] text-ink" />
                <span className="font-mono text-xs text-muted num">{c.caseCount ?? 0}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="container-page mt-16">
        <div className="grid gap-px overflow-hidden border border-ink bg-ink md:grid-cols-2">
          <div className="bg-paper p-8 sm:p-10">
            <p className="kicker text-accent-ink">Kontribusi publik</p>
            <h2 className="mt-3 font-serif text-3xl leading-tight text-ink">Tahu perkembangan terbaru sebuah kasus?</h2>
            <p className="mt-3 max-w-md text-ink-soft">
              Kirimkan kabar beserta tautan atau dokumen bukti. Redaksi memverifikasi setiap kiriman sebelum masuk ke linimasa.
            </p>
            <LinkButton to="/kontribusi/baru" className="mt-6" variant="accent">
              Kirim kontribusi
            </LinkButton>
          </div>
          <div className="bg-paper p-8 sm:p-10">
            <p className="kicker">Untuk peneliti &amp; jurnalis</p>
            <h2 className="mt-3 font-serif text-3xl leading-tight text-ink">Semua data terbuka untuk dipakai ulang.</h2>
            <p className="mt-3 max-w-md text-ink-soft">Unduh CSV atau JSON, atau gunakan API publik. Lisensi CC BY 4.0.</p>
            <LinkButton to="/data" className="mt-6" variant="outline">
              Data terbuka &amp; API
            </LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}
