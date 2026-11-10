import { useState } from 'react';
import { ArrowUpRight, Braces, Check, Copy, Download, FileSpreadsheet, Terminal } from 'lucide-react';
import type { Route } from './+types/data';
import { seo, SITE_URL } from '~/lib/seo';
import { Badge, Card, CardHeader, PageHeader, buttonClass } from '~/components/ui';

export const meta: Route.MetaFunction = () =>
  seo({
    title: 'Data terbuka & API',
    description: 'Unduh seluruh data kasus dalam CSV atau JSON, atau gunakan API publik Sampai Mana. Lisensi CC BY 4.0.',
    path: '/data',
  });

const ENDPOINTS: [string, string][] = [
  ['GET /api/cases', 'Daftar kasus. Parameter: q, status (dipisah koma), category, sort (updated|newest|oldest|title), page, limit ≤ 50'],
  ['GET /api/cases/{slug}', 'Detail kasus beserta tahapan, sumber, pihak, dan 30 revisi terakhir'],
  ['GET /api/cases/{slug}/revisions', 'Riwayat perubahan lengkap, berhalaman'],
  ['GET /api/cases/{slug}/stages/{id}', 'Satu tahapan beserta artikel penjelasan'],
  ['GET /api/stats', 'Agregat: jumlah per tahap/kategori, durasi rata-rata & median per tahap'],
  ['GET /api/categories', 'Daftar kategori'],
  ['GET /api/cases/export.csv', 'Semua kasus aktif, satu baris per kasus'],
  ['GET /api/cases/export.json', 'Semua kasus aktif lengkap dengan tahapan dan sumber'],
];

const SNIPPETS: { label: string; code: string }[] = [
  { label: 'Lima kasus persidangan terlama', code: `curl "${SITE_URL}/api/cases?status=PERSIDANGAN&sort=oldest&limit=5"` },
  { label: 'Unduh seluruh data', code: `curl "${SITE_URL}/api/cases/export.json" -o sampaimana.json` },
];

const DOWNLOADS = [
  {
    href: '/api/cases/export.csv',
    icon: FileSpreadsheet,
    title: 'CSV',
    desc: 'Satu baris per kasus: nomor perkara, status, lembaga, pihak, jumlah tahapan dan sumber.',
    cta: 'Unduh CSV',
  },
  {
    href: '/api/cases/export.json',
    icon: Braces,
    title: 'JSON',
    desc: 'Struktur lengkap: kasus, tahapan dengan tanggal dan tenggat, serta seluruh sumber.',
    cta: 'Unduh JSON',
  },
];

function CodeBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-sunk">
      <div className="flex items-center justify-between gap-3 border-b border-line py-1.5 pl-4 pr-1.5">
        <p className="flex min-w-0 items-center gap-2 text-xs text-muted">
          <Terminal className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{label}</span>
        </p>
        <button type="button" onClick={copy} className={buttonClass('ghost', 'xs', 'text-muted')} aria-label={`Salin perintah: ${label}`}>
          {copied ? <Check /> : <Copy />}
          <span className="max-sm:sr-only">{copied ? 'Tersalin' : 'Salin'}</span>
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[13px] leading-relaxed text-ink">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function DataPage() {
  return (
    <div className="container-page max-w-5xl pb-20">
      <PageHeader
        kicker="Untuk peneliti, jurnalis, dan pengembang"
        title="Data terbuka & API"
        description="Semua data yang tampil di situs ini bisa Anda unduh dan pakai ulang, termasuk untuk riset dan pemberitaan. Cukup cantumkan Sampai Mana sebagai sumber (CC BY 4.0)."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {DOWNLOADS.map((d) => (
          <a key={d.href} href={d.href} download className="card card-hover group flex flex-col p-6">
            <div className="flex items-start justify-between gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-ink/[0.06] text-ink">
                <d.icon className="size-5" aria-hidden />
              </span>
              <Badge tone="outline">CC BY 4.0</Badge>
            </div>
            <p className="mt-5 text-subheading font-semibold text-ink">{d.title}</p>
            <p className="mt-1 flex-1 text-sm text-muted">{d.desc}</p>
            <span className={buttonClass('primary', 'sm', 'mt-6 self-start')}>
              <Download /> {d.cta}
            </span>
          </a>
        ))}
      </div>

      <Card className="mt-4 min-w-0">
        <CardHeader
          title="API publik"
          description={
            <>
              Tanpa kunci API. Batasnya 300 permintaan per menit per alamat IP. Semua respons memakai bentuk{' '}
              <code className="rounded-sm bg-ink/[0.06] px-1 py-px font-mono text-[12px] text-ink">{'{ success, data, meta }'}</code>.
            </>
          }
          action={
            <a href="/api/docs" className={buttonClass('outline', 'sm', 'max-sm:hidden')}>
              Dokumentasi <ArrowUpRight />
            </a>
          }
        />
        <ul className="divide-y divide-line">
          {ENDPOINTS.map(([ep, desc]) => {
            const [method, path] = ep.split(' ');
            return (
              <li key={ep} className="grid gap-1.5 px-5 py-3.5 md:grid-cols-[minmax(0,300px)_1fr] md:gap-6">
                <div className="flex min-w-0 items-center gap-2">
                  <Badge tone="neutral" className="font-mono text-[11px]">
                    {method}
                  </Badge>
                  <code className="min-w-0 break-all font-mono text-[13px] text-ink">{path}</code>
                </div>
                <p className="text-[13px] text-muted">{desc}</p>
              </li>
            );
          })}
        </ul>
        <div className="space-y-3 border-t border-line p-5">
          <p className="kicker">Contoh</p>
          {SNIPPETS.map((s) => (
            <CodeBlock key={s.label} label={s.label} code={s.code} />
          ))}
          <a href="/api/docs" className={buttonClass('outline', 'sm', 'w-full sm:hidden')}>
            Dokumentasi interaktif <ArrowUpRight />
          </a>
        </div>
      </Card>

      <Card className="mt-4">
        <CardHeader title="Catatan penggunaan" />
        <ul className="space-y-3 p-5 text-sm text-ink-soft">
          {[
            'Data mencerminkan catatan redaksi pada saat diunduh. Periksa riwayat perubahan untuk melihat koreksi.',
            'Nama pihak dicantumkan apa adanya dari sumber. Hormati asas praduga tak bersalah saat menggunakan ulang data.',
            'Kasus yang diarsipkan tidak ikut diekspor.',
          ].map((t) => (
            <li key={t} className="flex gap-3">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink/40" aria-hidden />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
