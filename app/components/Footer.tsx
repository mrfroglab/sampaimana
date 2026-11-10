import { Link } from 'react-router';
import { Scale } from 'lucide-react';
import { Wordmark } from './Logo';

const COLS = [
  {
    title: 'Telusuri',
    links: [
      { to: '/kasus', label: 'Semua kasus' },
      { to: '/instansi', label: 'Lembaga' },
      { to: '/statistik', label: 'Statistik' },
      { to: '/data', label: 'Data terbuka & API' },
      { to: '/kontribusi/baru', label: 'Kirim kontribusi' },
    ],
  },
  {
    title: 'Redaksi',
    links: [
      { to: '/tentang', label: 'Metodologi & verifikasi' },
      { to: '/tentang#koreksi', label: 'Koreksi & hak jawab' },
      { to: '/tentang#disclaimer', label: 'Penafian hukum' },
      { to: '/daftar', label: 'Jadi kontributor' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-alt">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="max-w-sm">
          <Wordmark />
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Pelacak publik perkembangan kasus hukum di Indonesia: dari laporan sampai putusan, lengkap dengan sumber dan riwayat
            perubahannya.
          </p>
          <div className="mt-5 flex gap-3 rounded-2xl border border-line bg-raised p-3.5 text-[13px] leading-relaxed text-ink-soft">
            <Scale className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
            <p>Setiap orang yang disebut di situs ini dianggap tidak bersalah sampai ada putusan pengadilan berkekuatan hukum tetap.</p>
          </div>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <p className="kicker">{c.title}</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {c.links.map((l) => (
                <li key={l.to}>
                  <Link className="text-ink-soft transition-colors hover:text-ink" to={l.to}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>Data dapat digunakan ulang dengan lisensi CC BY 4.0.</p>
          <p className="font-mono">sampaimana.hallojanu.me</p>
        </div>
      </div>
    </footer>
  );
}
