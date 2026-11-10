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
      { to: '/tren', label: 'Tren durasi' },
      { to: '/data', label: 'Data terbuka & API' },
      { to: '/tanam', label: 'Tanam widget' },
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
    <footer className="container-page mt-20 pb-6 sm:mt-28">
      <div className="card grid gap-10 p-7 sm:p-10 md:grid-cols-[1.5fr_1fr_1fr] lg:p-12">
        <div className="max-w-sm">
          <Wordmark />
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Pelacak publik perkembangan kasus hukum di Indonesia: dari laporan sampai putusan, lengkap dengan sumber dan riwayat
            perubahannya.
          </p>
          <div className="mt-6 flex gap-3 rounded-2xl bg-sunk p-4 text-[13px] leading-relaxed text-ink-soft">
            <Scale className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
            <p>Setiap orang yang disebut di situs ini dianggap tidak bersalah sampai ada putusan pengadilan berkekuatan hukum tetap.</p>
          </div>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <p className="kicker">{c.title}</p>
            <ul className="mt-4 space-y-3 text-sm">
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
      <div className="flex flex-col gap-2 px-2 pt-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>Data dapat digunakan ulang dengan lisensi CC BY 4.0.</p>
        <p>sampaimana.hallojanu.me</p>
      </div>
    </footer>
  );
}
