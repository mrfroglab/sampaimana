import { useState } from 'react';
import { Link } from 'react-router';
import { BarChart3, Info, ShieldCheck } from 'lucide-react';
import type { Route } from './+types/trends';
import { publicGet } from '~/lib/api';
import { seo } from '~/lib/seo';
import { cx, fmtDuration, fmtNum } from '~/lib/format';
import { Badge, Card, CardHeader, EmptyState, LinkButton, PageHeader, StatBlock } from '~/components/ui';

/** Shape of GET /api/stats/trends (verified stages only). */
interface TrendGroup {
  key: string;
  slug: string;
  label: string;
  cases: number;
  decided: number;
  samples: number;
  lowSample: boolean;
  medianDays: number | null;
  avgDays: number | null;
  minDays: number | null;
  maxDays: number | null;
  verifiedStages: number;
  stages: number;
}
interface Trends {
  groupBy: string;
  minSamples: number;
  coverage: { cases: number; measuredCases: number; verifiedStages: number; stages: number };
  groups: TrendGroup[];
}

export const meta: Route.MetaFunction = () =>
  seo({
    title: 'Tren durasi proses hukum',
    description:
      'Instansi mana yang paling lama memproses kasus, dan berapa lama dari penyidikan sampai putusan per kategori. Dihitung dari tahapan terverifikasi saja, lengkap dengan jumlah sampel.',
    path: '/tren',
  });

export async function loader() {
  const [institutions, categories] = await Promise.all([
    publicGet<Trends>('/api/stats/trends', { groupBy: 'institution' }),
    publicGet<Trends>('/api/stats/trends', { groupBy: 'category' }),
  ]);
  return { institutions: institutions.data, categories: categories.data };
}

type Measure = 'median' | 'avg';

const days = (n: number | null) => (n === null ? '—' : `${fmtNum(Math.round(n))} hari`);

function Segmented({ value, onChange }: { value: Measure; onChange: (v: Measure) => void }) {
  const opts: { value: Measure; label: string }[] = [
    { value: 'median', label: 'Median' },
    { value: 'avg', label: 'Rata-rata' },
  ];
  return (
    <div role="group" aria-label="Ukuran yang ditampilkan" className="inline-flex gap-1 rounded-xl bg-ink/[0.05] p-1">
      {opts.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'h-8 rounded-lg px-3.5 text-[13px] font-medium transition-[background-color,color,box-shadow]',
            value === o.value ? 'bg-raised text-ink shadow-card' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** One horizontal bar chart. Pure HTML/CSS so it reflows at 360px and follows the light/dark tokens. */
function BarList({
  groups,
  measure,
  minSamples,
  hrefFor,
}: {
  groups: TrendGroup[];
  measure: Measure;
  minSamples: number;
  hrefFor: (g: TrendGroup) => string;
}) {
  const value = (g: TrendGroup) => (measure === 'median' ? g.medianDays : g.avgDays);
  const measured = groups.filter((g) => g.samples > 0);
  const ranked = measured.filter((g) => !g.lowSample).sort((a, b) => (value(b) ?? 0) - (value(a) ?? 0));
  const thin = measured.filter((g) => g.lowSample).sort((a, b) => (value(b) ?? 0) - (value(a) ?? 0));
  const unmeasured = groups.filter((g) => g.samples === 0);
  const max = Math.max(1, ...measured.map((g) => value(g) ?? 0));

  const row = (g: TrendGroup, rank: number | null) => {
    const v = value(g) ?? 0;
    return (
      <li key={g.slug} className="py-4 first:pt-0 last:pb-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2.5">
            {rank !== null ? (
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink/[0.06] text-xs font-semibold text-ink-soft num">{rank}</span>
            ) : (
              <span className="size-6 shrink-0" aria-hidden />
            )}
            <Link to={hrefFor(g)} className="min-w-0 truncate text-sm font-medium text-ink hover:underline">
              {g.label}
            </Link>
            {g.lowSample && <Badge tone="outline">sampel kecil</Badge>}
          </div>
          <p className="shrink-0 text-right text-[15px] font-semibold text-ink num">{days(value(g))}</p>
        </div>
        <div
          className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-ink/[0.06] sm:ml-[34px]"
          role="img"
          aria-label={`${g.label}: ${days(value(g))}, dari ${g.samples} kasus terukur`}
        >
          <div
            className={cx('h-full rounded-full', g.lowSample ? 'bg-ink/25' : 'bg-ink')}
            style={{ width: `${Math.max(2, (v / max) * 100)}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted sm:ml-[34px]">
          <span className="num">{g.samples}</span> kasus terukur · median <span className="num">{days(g.medianDays)}</span> · rata-rata{' '}
          <span className="num">{days(g.avgDays)}</span> · rentang <span className="num">{fmtNum(Math.round(g.minDays ?? 0))}</span>–
          <span className="num">{fmtNum(Math.round(g.maxDays ?? 0))}</span> hari
          {g.medianDays !== null && <span className="max-sm:hidden"> · ≈ {fmtDuration(Math.round(g.medianDays))} (median)</span>}
        </p>
      </li>
    );
  };

  return (
    <div>
      {ranked.length > 0 && <ol className="divide-y divide-line">{ranked.map((g, i) => row(g, i + 1))}</ol>}
      {thin.length > 0 && (
        <div className={cx(ranked.length > 0 && 'mt-5 border-t border-line pt-5')}>
          <p className="kicker mb-3">Belum diperingkat · kurang dari {minSamples} kasus terukur</p>
          <ul className="divide-y divide-line">{thin.map((g) => row(g, null))}</ul>
        </div>
      )}
      {unmeasured.length > 0 && (
        <div className={cx((ranked.length > 0 || thin.length > 0) && 'mt-5 border-t border-line pt-5')}>
          <p className="kicker mb-2.5">Belum bisa diukur</p>
          <ul className="flex flex-wrap gap-1.5">
            {unmeasured.map((g) => (
              <li key={g.slug}>
                <Link
                  to={hrefFor(g)}
                  className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-line bg-raised px-2.5 text-xs text-ink-soft transition-colors hover:border-line-strong"
                >
                  {g.label} <span className="text-muted num">{g.cases}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Kasus-kasus ini belum punya tahap penyidikan dan putusan yang sama-sama terverifikasi.</p>
        </div>
      )}
    </div>
  );
}

export default function TrendsPage({ loaderData }: Route.ComponentProps) {
  const { institutions, categories } = loaderData;
  const [measure, setMeasure] = useState<Measure>('median');
  const cov = institutions.coverage;
  const nothing = cov.measuredCases === 0;
  const pct = cov.stages ? Math.round((cov.verifiedStages / cov.stages) * 100) : 0;

  return (
    <div className="container-page pb-4">
      <PageHeader
        kicker="Analisis"
        title="Tren durasi proses hukum"
        description="Berapa lama kasus bergerak dari penyidikan sampai putusan, dan instansi mana yang paling lama. Hanya tahapan yang sudah terverifikasi yang dihitung."
        crumbs={[{ to: '/', label: 'Beranda' }, { to: '/statistik', label: 'Statistik' }, { label: 'Tren' }]}
        actions={nothing ? undefined : <Segmented value={measure} onChange={setMeasure} />}
      />

      <dl className="card grid grid-cols-1 gap-px overflow-hidden bg-line sm:grid-cols-3">
        <div className="bg-raised p-5 sm:p-6">
          <StatBlock label="Kasus aktif" value={fmtNum(cov.cases)} hint="seluruh kasus yang dipantau" />
        </div>
        <div className="bg-raised p-5 sm:p-6">
          <StatBlock
            label="Kasus terukur"
            value={fmtNum(cov.measuredCases)}
            hint={cov.cases ? `${Math.round((cov.measuredCases / cov.cases) * 100)}% punya penyidikan & putusan terverifikasi` : undefined}
          />
        </div>
        <div className="bg-raised p-5 sm:p-6">
          <StatBlock label="Tahapan terverifikasi" value={`${fmtNum(cov.verifiedStages)} / ${fmtNum(cov.stages)}`} hint={`${pct}% dari seluruh tahapan`} />
        </div>
      </dl>

      {nothing ? (
        <div className="mt-6">
          <EmptyState
            icon={<ShieldCheck />}
            title="Belum ada data yang cukup terverifikasi"
            action={
              <LinkButton to="/tentang" variant="outline" size="sm">
                Bagaimana verifikasi bekerja
              </LinkButton>
            }
          >
            Angka tren hanya dihitung dari tahapan yang punya sumber terverifikasi redaksi, supaya tidak menyesatkan. Begitu ada kasus dengan tahap
            penyidikan dan putusan yang sama-sama terverifikasi, grafik akan muncul di sini.
          </EmptyState>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card className="min-w-0 overflow-hidden">
            <CardHeader
              title="Instansi paling lambat"
              description={`${measure === 'median' ? 'Median' : 'Rata-rata'} hari dari penyidikan sampai putusan, terlama di atas.`}
            />
            <div className="p-5 sm:p-6">
              {institutions.groups.length ? (
                <BarList groups={institutions.groups} measure={measure} minSamples={institutions.minSamples} hrefFor={(g) => `/instansi/${g.slug}`} />
              ) : (
                <p className="text-sm text-muted">Belum ada kasus dengan instansi penangan yang tercatat.</p>
              )}
            </div>
          </Card>
          <Card className="min-w-0 overflow-hidden">
            <CardHeader
              title="Durasi per kategori"
              description={`${measure === 'median' ? 'Median' : 'Rata-rata'} hari dari penyidikan sampai putusan untuk tiap bidang.`}
            />
            <div className="p-5 sm:p-6">
              <BarList groups={categories.groups} measure={measure} minSamples={categories.minSamples} hrefFor={(g) => `/kasus?category=${g.slug}`} />
            </div>
          </Card>
        </div>
      )}

      <Card className="mt-4 overflow-hidden">
        <CardHeader title="Cara membaca angka ini" description="Catatan metodologi, supaya angkanya tidak disalahartikan." action={<Info className="size-4 text-muted" aria-hidden />} />
        <ul className="grid gap-x-8 gap-y-4 p-5 text-sm leading-relaxed text-ink-soft sm:p-6 md:grid-cols-2">
          <li>
            <span className="font-medium text-ink">Yang diukur.</span> Hari dari awal tahap penyidikan sampai awal tahap putusan pada kasus yang sama. Kasus
            tanpa tahap penyidikan (misalnya gugatan perdata) tidak ikut terukur.
          </li>
          <li>
            <span className="font-medium text-ink">Hanya tahapan terverifikasi.</span> Sebuah tahapan dihitung bila punya sumber yang sudah diverifikasi
            redaksi. Tahapan tanpa sumber terverifikasi diabaikan, bukan ditebak.
          </li>
          <li>
            <span className="font-medium text-ink">Jumlah sampel.</span> Instansi atau kategori baru diperingkat bila punya minimal{' '}
            <span className="num">{institutions.minSamples}</span> kasus terukur. Di bawah itu angkanya tetap tampil, tetapi diberi tanda &ldquo;sampel
            kecil&rdquo; dan tidak diberi peringkat.
          </li>
          <li>
            <span className="font-medium text-ink">Bukan penilaian kinerja.</span> Kasus berbeda tingkat kerumitan, dan kasus di sini bukan sampel acak:
            hanya yang sudah diputus dan sudah terverifikasi. Gunakan sebagai gambaran, bukan peringkat kualitas. Data lengkap tersedia di{' '}
            <Link to="/data" className="link">
              halaman data terbuka
            </Link>
            .
          </li>
        </ul>
        <div className="flex items-center gap-2 border-t border-line bg-alt px-5 py-3 text-xs text-muted sm:px-6">
          <BarChart3 className="size-3.5 shrink-0" aria-hidden />
          Dihitung ulang otomatis; cache paling lama 5 menit.
        </div>
      </Card>
    </div>
  );
}
