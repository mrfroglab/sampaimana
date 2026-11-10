import { Form, Link } from 'react-router';
import { ArrowRight, ArrowUpRight, Database, Search, Send, Timer } from 'lucide-react';
import type { Route } from './+types/home';
import { publicGet } from '~/lib/api';
import { seo } from '~/lib/seo';
import { STATUS_HINT, STATUS_LABEL, STATUS_ORDER, cx, fmtDuration, fmtNum } from '~/lib/format';
import type { CaseListItem, Category, Stats } from '~/lib/types';
import { CaseCard } from '~/components/CaseCard';
import { CardHeader, LinkButton, RelTime, SectionHeading, StatBlock, buttonClass } from '~/components/ui';
import { ACTION_LABEL } from '~/components/RevisionList';

export const meta: Route.MetaFunction = () => seo({});

export async function loader() {
  const [stats, cases, categories] = await Promise.all([
    publicGet<Stats>('/api/stats'),
    publicGet<CaseListItem[]>('/api/cases', { sort: 'updated', limit: 6 }),
    publicGet<Category[]>('/api/categories'),
  ]);
  return { stats: stats.data, cases: cases.data, categories: categories.data };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { stats, cases, categories } = loaderData;
  const max = Math.max(1, ...STATUS_ORDER.map((s) => stats.byStatus[s]));
  const latest = stats.recentUpdates[0];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div aria-hidden className="blueprint pointer-events-none absolute inset-0" />
        <div className="container-page relative grid gap-12 pb-16 pt-14 sm:pt-20 lg:grid-cols-[1.25fr_1fr] lg:items-center lg:gap-16 lg:pb-24">
          <div className="min-w-0 animate-rise">
            {latest ? (
              <Link
                to={`/kasus/${latest.case.slug}`}
                className="group inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-raised py-1 pl-1 pr-3 text-[13px] shadow-card transition-colors hover:border-line-strong"
              >
                <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full bg-ink px-2.5 text-xs font-medium text-on-ink">
                  <span className="size-1.5 animate-pulse-dot rounded-full bg-ember" aria-hidden />
                  Terbaru
                </span>
                <span className="truncate text-ink-soft">{latest.case.title}</span>
                <ArrowRight className="size-3.5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
              </Link>
            ) : (
              <p className="kicker">Pelacak kasus hukum publik</p>
            )}

            <h1 className="mt-6 text-display font-semibold text-ink">
              Sampai mana
              <br />
              kasusnya<span className="text-muted">?</span>
            </h1>
            <p className="mt-5 max-w-xl text-body-lg leading-relaxed text-muted sm:text-subheading">
              Banyak perkara besar ramai di awal, lalu hilang dari berita. Di sini setiap kasus dicatat tahap demi tahap, dari laporan
              sampai putusan, dengan sumber yang bisa Anda periksa sendiri.
            </p>

            <Form action="/kasus" role="search" className="mt-8 flex max-w-xl items-center gap-2 rounded-full border border-line bg-raised p-1.5 shadow-card focus-within:border-line-strong focus-within:ring-4 focus-within:ring-ink/[0.06]">
              <label htmlFor="hero-q" className="sr-only">
                Cari kasus
              </label>
              <Search className="ml-3 size-4 shrink-0 text-muted" aria-hidden />
              <input
                id="hero-q"
                name="q"
                type="search"
                placeholder="Nama kasus, nomor perkara, atau nama pihak"
                className="h-10 min-w-0 flex-1 bg-transparent text-[15px] placeholder:text-muted focus:outline-none"
              />
              <button className={buttonClass('primary', 'md', 'h-10 px-5')}>Cari</button>
            </Form>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-muted">
              <Link to="/kasus" className="inline-flex items-center gap-1 font-medium text-ink hover:underline">
                Telusuri {fmtNum(stats.totals.cases)} kasus <ArrowRight className="size-3.5" />
              </Link>
              <span className="hidden sm:inline">
                atau tekan <kbd className="kbd">/</kbd> untuk mencari di mana saja
              </span>
            </div>
          </div>

          {/* The line: case counts per station */}
          <div className="card min-w-0 animate-rise overflow-hidden [animation-delay:80ms]" aria-label="Jumlah kasus per tahap">
            <CardHeader
              title="Posisi kasus hari ini"
              description="Jumlah kasus aktif di setiap tahap proses hukum"
              action={<span className="font-mono text-xs text-muted num">{fmtNum(stats.totals.cases)} total</span>}
            />
            <ol className="p-2">
              {STATUS_ORDER.map((s, i) => {
                const n = stats.byStatus[s];
                const decided = s === 'PUTUSAN';
                return (
                  <li key={s}>
                    <Link
                      to={`/kasus?status=${s}`}
                      className="group grid grid-cols-[20px_1fr_auto] items-start gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-ink/[0.04]"
                    >
                      <span className="relative flex h-full justify-center">
                        <span
                          className={cx(
                            'relative z-10 mt-1 grid size-3 place-items-center rounded-full border-[1.5px]',
                            decided || n ? 'border-ink bg-ink' : 'border-line-strong bg-raised',
                          )}
                        />
                        {i < STATUS_ORDER.length - 1 && (
                          <span className="absolute left-1/2 top-[18px] h-[calc(100%+12px)] w-px -translate-x-1/2 bg-line-strong" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="text-sm font-medium text-ink">{STATUS_LABEL[s]}</span>
                        </span>
                        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
                          <span
                            className={cx('block h-full rounded-full transition-[width] duration-700', decided ? 'bg-ink' : 'bg-ink/70')}
                            style={{ width: `${(n / max) * 100}%` }}
                          />
                        </span>
                        <span className="mt-1.5 block truncate text-xs text-muted">{STATUS_HINT[s]}</span>
                      </span>
                      <span className="text-heading-sm font-semibold leading-none tracking-[-0.03em] text-ink num">{n}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      {/* Ledger */}
      <section className="container-page -mt-px">
        <dl className="card mt-10 grid grid-cols-2 gap-px overflow-hidden bg-line md:grid-cols-4">
          {(
            [
              ['Kasus dipantau', stats.totals.cases, 'di seluruh kategori'],
              ['Masih berjalan', stats.totals.ongoing, 'belum ada putusan'],
              ['Telah diputus', stats.totals.decided, 'putusan tercatat'],
              ['Sumber terverifikasi', stats.totals.verifiedSources, 'diperiksa redaksi'],
            ] as const
          ).map(([label, value, hint]) => (
            <div key={label} className="bg-raised p-5 sm:p-6">
              <StatBlock label={label} value={fmtNum(value)} hint={hint} />
            </div>
          ))}
        </dl>
      </section>

      <div className="container-page mt-16 grid gap-12 lg:grid-cols-[1fr_360px]">
        <section className="min-w-0">
          <SectionHeading
            kicker="Linimasa"
            title="Baru bergerak"
            action={
              <LinkButton to="/kasus" variant="ghost" size="sm">
                Semua kasus <ArrowRight />
              </LinkButton>
            }
          />
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {cases.map((c) => (
              <CaseCard key={c.id} item={c} />
            ))}
          </div>
        </section>

        <aside className="min-w-0 space-y-4 lg:pt-[3.75rem]">
          <section className="card overflow-hidden">
            <CardHeader title="Paling lama di satu tahap" description="Kasus berjalan yang belum bergeser" />
            {stats.longestActive.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">Belum ada kasus berjalan yang tercatat.</p>
            ) : (
              <ol className="divide-y divide-line">
                {stats.longestActive.map((s, i) => (
                  <li key={s.case.slug}>
                    <Link to={`/kasus/${s.case.slug}`} className="group flex gap-3 px-5 py-3.5 transition-colors hover:bg-ink/[0.03]">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink/[0.06] text-xs font-semibold text-ink-soft num">
                        {i + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="line-clamp-2 text-sm font-medium leading-snug text-ink group-hover:underline">{s.case.title}</span>
                        <span className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                          <Timer className="size-3.5" />
                          <span className="font-medium text-ink num">{fmtDuration(s.daysRunning)}</span> di{' '}
                          {STATUS_LABEL[s.stageType].toLowerCase()}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="card overflow-hidden">
            <CardHeader title="Perubahan terbaru" description="Catatan redaksi, terbuka untuk publik" />
            <ol className="relative px-5 py-4">
              {stats.recentUpdates.map((u, i) => (
                <li key={u.id} className="relative pb-4 pl-5 last:pb-0">
                  {i < stats.recentUpdates.length - 1 && (
                    <span aria-hidden className="absolute bottom-0 left-[3px] top-3 w-px bg-line" />
                  )}
                  <span aria-hidden className="absolute left-0 top-1.5 size-[7px] rounded-full bg-ink/50" />
                  <p className="flex items-center gap-1.5 text-xs text-muted">
                    <span className="font-medium text-ink-soft">{ACTION_LABEL[u.action] ?? 'Pembaruan'}</span>
                    <span aria-hidden>·</span>
                    <RelTime date={u.createdAt} />
                  </p>
                  <p className="mt-0.5 text-sm leading-snug text-ink">{u.summary}</p>
                  <Link to={`/kasus/${u.case.slug}`} className="mt-0.5 block truncate text-xs text-muted hover:text-ink hover:underline">
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
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                to={`/kasus?category=${c.slug}`}
                className="card card-hover group flex h-full items-center justify-between gap-3 px-5 py-4"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{c.name}</span>
                  <span className="mt-0.5 block text-xs text-muted num">{c.caseCount ?? 0} kasus</span>
                </span>
                <ArrowUpRight className="size-4 shrink-0 text-muted transition-colors group-hover:text-ink" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="container-page mt-16">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card flex flex-col p-7 sm:p-9">
            <span className="grid size-10 place-items-center rounded-full bg-ink text-on-ink">
              <Send className="size-4" />
            </span>
            <h2 className="mt-6 text-heading-sm font-semibold text-ink">Tahu perkembangan terbaru sebuah kasus?</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
              Kirimkan kabar beserta tautan atau dokumen bukti. Redaksi memverifikasi setiap kiriman sebelum masuk ke linimasa.
            </p>
            <div className="mt-auto pt-7">
              <LinkButton to="/kontribusi/baru">Kirim kontribusi</LinkButton>
            </div>
          </div>
          <div className="card flex flex-col p-7 sm:p-9">
            <span className="grid size-10 place-items-center rounded-full bg-ink/[0.06] text-ink">
              <Database className="size-4" />
            </span>
            <h2 className="mt-6 text-heading-sm font-semibold text-ink">Semua data terbuka untuk dipakai ulang.</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
              Unduh CSV atau JSON, atau gunakan API publik. Lisensi CC BY 4.0, untuk peneliti dan jurnalis.
            </p>
            <div className="mt-auto pt-7">
              <LinkButton to="/data" variant="outline">
                Data terbuka &amp; API
              </LinkButton>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
