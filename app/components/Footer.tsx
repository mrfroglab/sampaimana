import { Link } from 'react-router';
import { Wordmark } from './Logo';

export function Footer() {
  return (
    <footer className="mt-24 border-t-2 border-ink bg-paper">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-md">
          <Wordmark />
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Pelacak publik perkembangan kasus hukum di Indonesia: dari laporan sampai putusan, lengkap dengan sumber dan riwayat
            perubahannya.
          </p>
          <p className="mt-4 border-l-2 border-accent pl-3 text-[13px] leading-relaxed text-ink-soft">
            Setiap orang yang disebut di situs ini dianggap tidak bersalah sampai ada putusan pengadilan berkekuatan hukum tetap.
          </p>
        </div>
        <div>
          <p className="kicker">Telusuri</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="link" to="/kasus">Semua kasus</Link></li>
            <li><Link className="link" to="/statistik">Statistik</Link></li>
            <li><Link className="link" to="/data">Data terbuka &amp; API</Link></li>
            <li><Link className="link" to="/daftar">Jadi kontributor</Link></li>
          </ul>
        </div>
        <div>
          <p className="kicker">Redaksi</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="link" to="/tentang">Metodologi &amp; verifikasi</Link></li>
            <li><Link className="link" to="/tentang#koreksi">Koreksi &amp; hak jawab</Link></li>
            <li><Link className="link" to="/tentang#disclaimer">Penafian hukum</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-faint sm:flex-row sm:items-center sm:justify-between">
          <p>Data dapat digunakan ulang dengan lisensi CC BY 4.0.</p>
          <p className="font-mono">sampaimana.hallojanu.me</p>
        </div>
      </div>
    </footer>
  );
}
