import { Form, Link } from 'react-router';
import { ArrowRight, ArrowUpRight, Database, Search, Send, Timer } from 'lucide-react';
import type { Route } from './+types/home';
import { publicGet } from '~/lib/api';
import { seo } from '~/lib/seo';
import { STATUS_HINT, STATUS_LABEL, STATUS_ORDER, cx, fmtDuration, fmtNum } from '~/lib/format';
import type { CaseListItem, Category, Stats } from '~/lib/types';
import { CaseCard } from '~/components/CaseCard';
import { Badge, CardHeader, LinkButton, RelTime, SectionHeading, buttonClass } from '~/components/ui';
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

const WHY = [
  'Perkara besar ramai di awal, lalu hilang dari berita.',
  'Setiap tahap dicatat dengan tanggal dan sumber yang bisa diperiksa.',
  'Lama tiap tahap terlihat, jadi yang macet tidak tersembunyi.',
  'Koreksi dan riwayat perubahan terbuka untuk publik.',
];

export default function Home({ loaderData }: Route.ComponentProps) {
  const { stats, cases, categories } = loaderData;
  const max = Math.max(1, ...STATUS_ORDER.map((s) => stats.byStatus[s]));
  const latest = stats.recentUpdates[0];

  return (
    <>
      {/* Hero: massive headline left, compact search right */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="blueprint pointer-events-none absolute inset-0" />
        <div className="container-page relative grid gap-10 pb-14 pt-12 sm:pb-20 sm:pt-20 lg:grid-cols-[1.35fr_1fr] lg:items-end lg:gap-16">
          <div className="min-w-0 animate-rise">
            {latest ? (
              <Link
                to={`/kasus/${latest.case.slug}`}
                className="group inline-flex max-w-full items-center gap-2.5 rounded-xl border border-line bg-raised py-1 pl-1 pr-3 text-[13px] transition-colors hover:border-line-strong"
              >
                <Badge tone="ember" className="shrink-0">
                  <span className="size-1.5 rounded-full bg-on-ember" aria-hidden />
                  Terbaru
                </Badge>
                <span className="truncate text-ink-soft">{latest.case.title}</span>
                <ArrowRight className="size-3.5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
              </Link>
            ) : (
              <p className="eyebrow">Pelacak kasus hukum publik</p>
            )}

            <h1 className="mt-7 text-display font-semibold text-ink">
              Sampai mana
              <br />
              kasusnya<span className="text-ember">?</span>
            </h1>
          </div>

          <div className="min-w-0 animate-rise [animation-delay:80ms] lg:pb-2">
            <p className="text-body-lg text-muted">
              Banyak perkara besar ramai di awal, lalu hilang dari berita. Di sini setiap kasus dicatat tahap demi tahap, dari laporan
              sampai putusan, dengan sumber yang bisa Anda periksa sendiri.
            </p>
            <Form
              action="/kasus"
              role="search"
              className="mt-6 flex items-center gap-2 rounded-[18px] border border-line bg-raised p-1.5 transition-[border-color,box-shadow] focus-within:border-line-strong focus-within:ring-4 focus-within:ring-ink/[0.05]"
            >
              <label htmlFor="hero-q" className="sr-only">
                Cari kasus
              </label>
              <Search className="ml-2.5 size-4 shrink-0 text-muted" aria-hidden />
              <input
                id="hero-q"
                name="q"
                type="search"
                placeholder="Nama kasus, nomor perkara, atau pihak"
                className="h-10 min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-faint focus:outline-none"
              />
              <button className={buttonClass('primary', 'md', 'px-5')}>Cari</button>
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
        </div>
      </section>

      {/* Stats row: big numbers with their label on the same baseline */}
      <section className="container-page">
        <dl className="card grid grid-cols-2 overflow-hidden lg:grid-cols-4">
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
                'flex min-w-0 flex-col-reverse justify-end gap-1 p-6 sm:flex-row-reverse sm:items-baseline sm:gap-3 sm:p-8',
                i % 2 === 1 && 'border-l border-line',
                i >= 2 && 'max-lg:border-t max-lg:border-line',
                i === 2 && 'lg:border-l lg:border-line',
              )}
            >
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="text-heading-lg font-semibold leading-none text-ink num">{fmtNum(value)}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* The line: case counts per station */}
      <section className="container-page mt-4" aria-labelledby="posisi">
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-3 px-6 pt-6 sm:px-8 sm:pt-8">
            <div>
              <h2 id="posisi" className="text-subheading font-semibold text-ink">
                Posisi kasus hari ini
              </h2>
              <p className="mt-0.5 text-sm text-muted">Jumlah kasus di setiap tahap proses hukum</p>
            </div>
            <Badge tone="neutral" className="num">
              {fmtNum(stats.totals.cases)} total
            </Badge>
          </div>
          <ol className="grid gap-px p-2 sm:grid-cols-5 sm:p-3">
            {STATUS_ORDER.map((s, i) => {
              const n = stats.byStatus[s];
              const decided = s === 'PUTUSAN';
              return (
                <li key={s} className="min-w-0">
                  <Link
                    to={`/kasus?status=${s}`}
                    className="group grid h-full grid-cols-[auto_1fr] items-center gap-x-4 rounded-2xl p-4 transition-colors hover:bg-ink/[0.035] sm:grid-cols-1 sm:items-start sm:p-5"
                  >
                    <span className="relative flex items-center sm:mb-5">
                      <span
                        className={cx(
                          'relative z-10 size-3 rounded-full border-[1.5px]',
                          n ? 'border-ink bg-ink' : 'border-line-strong bg-raised',
                          decided && n > 0 && 'border-ember bg-ember',
                        )}
                        aria-hidden
                      />
                      {i < STATUS_ORDER.length - 1 && (
                        <span aria-hidden className="absolute left-3 right-[-2.75rem] top-1/2 hidden h-px bg-line-strong sm:block" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-baseline justify-between gap-3 sm:block">
                        <span className="text-sm font-medium text-ink sm:block">
                          <span className="mr-1.5 text-muted num">{i + 1}.</span>
                          {STATUS_LABEL[s]}
                        </span>
                        <span className="text-heading-sm font-semibold leading-none text-ink num sm:mt-3 sm:block">{n}</span>
                      </span>
                      <span className="mt-3 block h-1 overflow-hidden rounded-full bg-ink/[0.06]">
                        <span
                          className={cx('block h-full rounded-full transition-[width] duration-700', decided ? 'bg-ink' : 'bg-ink/60')}
                          style={{ width: `${(n / max) * 100}%` }}
                        />
                      </span>
                      <span className="mt-2 block text-xs text-muted sm:min-h-[2lh]">{STATUS_HINT[s]}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Recently moved */}
      <section className="container-page mt-16 sm:mt-20">
        <SectionHeading
          kicker="Linimasa"
          title="Baru bergerak"
          action={
            <LinkButton to="/kasus" variant="outline" size="sm">
              Semua kasus <ArrowRight />
            </LinkButton>
          }
        />
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => (
            <CaseCard key={c.id} item={c} />
          ))}
        </div>
      </section>

      {/* Dark feature band + the stalled list */}
      <section className="container-page mt-16 grid gap-4 sm:mt-20 lg:grid-cols-[1.1fr_1fr]">
        <div className="feature flex flex-col p-7 sm:p-10">
          <p className="inline-flex h-7 w-fit items-center rounded-lg border border-white/15 px-2.5 text-[13px] font-medium text-white/80">
            Kenapa dilacak
          </p>
          <h2 className="mt-6 max-w-md text-heading-sm font-bold text-white">Ingatan publik pendek. Catatan perkara tidak boleh.</h2>
          <ul className="mt-8 space-y-4">
            {WHY.map((w) => (
              <li key={w} className="flex gap-3 text-base font-medium leading-snug text-white sm:text-lg">
                <ArrowRight className="mt-1 size-4 shrink-0 text-ember sm:size-5" aria-hidden />
                <span className="text-white/90">{w}</span>
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-10">
            <Link
              to="/tentang"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-white/20 bg-white px-5 text-sm font-medium text-[#3f3f46] transition-colors hover:bg-white/90"
            >
              Metodologi &amp; verifikasi <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>

        <section className="card overflow-hidden">
          <CardHeader title="Paling lama di satu tahap" description="Kasus berjalan yang belum bergeser" />
          {stats.longestActive.length === 0 ? (
            <p className="px-6 py-8 text-sm text-muted">Belum ada kasus berjalan yang tercatat.</p>
          ) : (
            <ol className="divide-y divide-line">
              {stats.longestActive.map((s, i) => (
                <li key={s.case.slug}>
                  <Link to={`/kasus/${s.case.slug}`} className="group flex gap-4 px-6 py-4 transition-colors hover:bg-ink/[0.025]">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-line text-xs font-semibold text-ink-soft num">
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="line-clamp-2 text-[15px] font-medium leading-snug text-ink group-hover:underline">{s.case.title}</span>
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
      </section>

      {/* Categories */}
      <section className="container-page mt-16 sm:mt-20">
        <SectionHeading kicker="Bidang" title="Telusuri menurut kategori" />
        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                to={`/kasus?category=${c.slug}`}
                className="card card-hover card-dense group flex h-full flex-col justify-between gap-6 p-6"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="text-base font-semibold leading-snug text-ink">{c.name}</span>
                  <ArrowUpRight className="size-4 shrink-0 text-muted transition-colors group-hover:text-ink" />
                </span>
                <Badge tone="neutral" className="w-fit num">
                  {c.caseCount ?? 0} kasus
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Recent changes + calls to action */}
      <section className="container-page mt-16 grid gap-4 sm:mt-20 lg:grid-cols-[1fr_1fr]">
        <section className="card overflow-hidden">
          <CardHeader title="Perubahan terbaru" description="Catatan redaksi, terbuka untuk publik" />
          <ol className="relative px-6 py-5">
            {stats.recentUpdates.map((u, i) => (
              <li key={u.id} className="relative pb-5 pl-5 last:pb-0">
                {i < stats.recentUpdates.length - 1 && <span aria-hidden className="absolute bottom-0 left-[3px] top-3 w-px bg-line" />}
                <span aria-hidden className="absolute left-0 top-1.5 size-[7px] rounded-full bg-ink/45" />
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

        <div className="grid gap-4">
          <div className="card flex flex-col p-7 sm:p-8">
            <span className="grid size-10 place-items-center rounded-full bg-ink text-on-ink">
              <Send className="size-4" />
            </span>
            <h2 className="mt-6 text-subheading font-semibold text-ink">Tahu perkembangan terbaru sebuah kasus?</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
              Kirimkan kabar beserta tautan atau dokumen bukti. Redaksi memverifikasi setiap kiriman sebelum masuk ke linimasa.
            </p>
            <div className="mt-auto pt-6">
              <LinkButton to="/kontribusi/baru">Kirim kontribusi</LinkButton>
            </div>
          </div>
          <div className="card flex flex-col p-7 sm:p-8">
            <span className="grid size-10 place-items-center rounded-full border border-line text-ink">
              <Database className="size-4" />
            </span>
            <h2 className="mt-6 text-subheading font-semibold text-ink">Semua data terbuka untuk dipakai ulang.</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
              Unduh CSV atau JSON, atau gunakan API publik. Lisensi CC BY 4.0, untuk peneliti dan jurnalis.
            </p>
            <div className="mt-auto pt-6">
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
