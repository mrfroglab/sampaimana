import { Braces, Download, FileSpreadsheet, Terminal } from 'lucide-react';
import type { Route } from './+types/data';
import { seo, SITE_URL } from '~/lib/seo';
import { buttonClass, SectionHeading } from '~/components/ui';

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

export default function DataPage() {
  return (
    <div className="container-page max-w-4xl pt-10">
      <header className="border-b-2 border-ink pb-6">
        <p className="kicker">Untuk peneliti, jurnalis, dan pengembang</p>
        <h1 className="mt-2 font-serif text-headline text-ink">Data terbuka &amp; API</h1>
        <p className="mt-3 max-w-2xl text-lg text-ink-soft">
          Semua data yang tampil di situs ini bisa Anda unduh dan pakai ulang, termasuk untuk riset dan pemberitaan. Cukup cantumkan
          Sampai Mana sebagai sumber (CC BY 4.0).
        </p>
      </header>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <a href="/api/cases/export.csv" download className="group border border-line-strong bg-raised p-6 hover:border-ink">
          <FileSpreadsheet className="size-6 text-accent" />
          <p className="mt-4 font-serif text-2xl text-ink">CSV</p>
          <p className="mt-1 text-sm text-muted">Satu baris per kasus: nomor perkara, status, lembaga, pihak, jumlah tahapan dan sumber.</p>
          <span className={buttonClass('outline', 'sm', 'mt-5')}>
            <Download className="size-4" /> Unduh CSV
          </span>
        </a>
        <a href="/api/cases/export.json" download className="group border border-line-strong bg-raised p-6 hover:border-ink">
          <Braces className="size-6 text-accent" />
          <p className="mt-4 font-serif text-2xl text-ink">JSON</p>
          <p className="mt-1 text-sm text-muted">Struktur lengkap: kasus, tahapan dengan tanggal dan tenggat, serta seluruh sumber.</p>
          <span className={buttonClass('outline', 'sm', 'mt-5')}>
            <Download className="size-4" /> Unduh JSON
          </span>
        </a>
      </div>

      <section className="mt-16">
        <SectionHeading
          kicker="Tanpa kunci API"
          title="API publik"
          action={
            <a href="/api/docs" className="link text-sm">
              Dokumentasi interaktif →
            </a>
          }
        />
        <p className="mt-3 text-ink-soft">
          Endpoint baca tidak memerlukan autentikasi. Batasnya 300 permintaan per menit per alamat IP. Semua respons memakai bentuk{' '}
          <code className="font-mono text-[13px]">{'{ success, data, meta }'}</code>.
        </p>
        <div className="mt-6 divide-y divide-line border-y border-line">
          {ENDPOINTS.map(([ep, desc]) => (
            <div key={ep} className="grid gap-1 py-3 sm:grid-cols-[280px_1fr] sm:gap-6">
              <code className="font-mono text-[13px] text-ink">{ep}</code>
              <p className="text-sm text-muted">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 overflow-x-auto border border-ink bg-ink p-5 text-paper">
          <p className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-paper/60">
            <Terminal className="size-3.5" /> Contoh
          </p>
          <pre className="font-mono text-[13px] leading-relaxed">
            {`curl "${SITE_URL}/api/cases?status=PERSIDANGAN&sort=oldest&limit=5"

curl "${SITE_URL}/api/cases/export.json" -o sampaimana.json`}
          </pre>
        </div>
      </section>

      <section className="mt-16 border-l-2 border-accent pl-5">
        <h2 className="font-serif text-2xl text-ink">Catatan penggunaan</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-ink-soft">
          <li>Data mencerminkan catatan redaksi pada saat diunduh. Periksa riwayat perubahan untuk melihat koreksi.</li>
          <li>Nama pihak dicantumkan apa adanya dari sumber. Hormati asas praduga tak bersalah saat menggunakan ulang data.</li>
          <li>Kasus yang diarsipkan tidak ikut diekspor.</li>
        </ul>
      </section>
    </div>
  );
}
