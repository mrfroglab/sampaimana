import { Link } from 'react-router';
import type { Route } from './+types/about';
import { seo } from '~/lib/seo';
import { STATUS_HINT, STATUS_LABEL, STATUS_ORDER } from '~/lib/format';

export const meta: Route.MetaFunction = () =>
  seo({
    title: 'Metodologi & kebijakan redaksi',
    description: 'Cara Sampai Mana memantau kasus, memverifikasi sumber, menangani koreksi dan hak jawab.',
    path: '/tentang',
  });

function Section({ id, kicker, title, children }: { id?: string; kicker: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t-2 border-ink pt-4">
      <p className="kicker">{kicker}</p>
      <h2 className="mt-1 font-serif text-[1.9rem] leading-tight text-ink">{title}</h2>
      <div className="mt-4 space-y-4 font-serif text-[1.1rem] leading-[1.75] text-ink-soft">{children}</div>
    </section>
  );
}

export default function About() {
  return (
    <div className="container-page grid max-w-5xl gap-12 pt-10 lg:grid-cols-[200px_1fr]">
      <nav className="hidden lg:block" aria-label="Daftar isi">
        <ul className="sticky top-24 space-y-2 text-sm">
          {[
            ['#tujuan', 'Tujuan'],
            ['#tahap', 'Lima tahap'],
            ['#verifikasi', 'Verifikasi sumber'],
            ['#kontribusi', 'Kontribusi publik'],
            ['#koreksi', 'Koreksi & hak jawab'],
            ['#disclaimer', 'Penafian hukum'],
          ].map(([href, label]) => (
            <li key={href}>
              <a href={href} className="text-muted hover:text-ink">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-14">
        <header>
          <p className="kicker">Tentang Sampai Mana</p>
          <h1 className="mt-2 font-serif text-headline text-ink">Metodologi &amp; kebijakan redaksi</h1>
        </header>

        <Section id="tujuan" kicker="01" title="Mengapa situs ini ada">
          <p>
            Perkara hukum yang menyangkut kepentingan publik sering ramai saat penangkapan, lalu senyap bertahun-tahun. Publik
            jarang tahu apakah berkasnya sudah dilimpahkan, kapan sidang dimulai, atau bagaimana putusannya. Sampai Mana mencatat
            perjalanan itu tahap demi tahap supaya mudah ditagih dan diperiksa.
          </p>
        </Section>

        <Section id="tahap" kicker="02" title="Lima tahap yang kami pakai">
          <p>Setiap kasus ditempatkan pada salah satu dari lima tahap berikut. Gugatan perdata dapat melompati penyidikan dan penuntutan.</p>
          <ol className="not-prose mt-2 divide-y divide-line border-y border-line font-sans text-base">
            {STATUS_ORDER.map((s, i) => (
              <li key={s} className="grid grid-cols-[32px_140px_1fr] gap-3 py-3">
                <span className="font-mono text-sm text-faint">{i + 1}</span>
                <span className="font-medium text-ink">{STATUS_LABEL[s]}</span>
                <span className="text-muted">{STATUS_HINT[s]}</span>
              </li>
            ))}
          </ol>
          <p>
            Perubahan status wajib disertai alasan dan selalu tercatat di bagian <em>Riwayat perubahan</em> pada halaman kasus. Bila
            sebuah tahap memiliki tenggat (misalnya batas masa penahanan atau jadwal sidang) dan tenggat itu terlewati tanpa kabar,
            kami menandainya.
          </p>
        </Section>

        <Section id="verifikasi" kicker="03" title="Verifikasi sumber">
          <p>
            Kami mengutamakan dokumen primer: putusan dan jadwal sidang di sistem informasi pengadilan, rilis resmi aparat penegak
            hukum, serta dokumen persidangan. Liputan media dipakai sebagai pelengkap.
          </p>
          <p>
            Sumber bertanda <span className="font-sans text-sm font-medium text-ok">terverifikasi</span> sudah diperiksa redaksi:
            tautannya aktif, isinya sesuai klaim, dan penerbitnya jelas. Sumber tanpa tanda tetap kami tampilkan agar Anda bisa
            menilainya sendiri.
          </p>
        </Section>

        <Section id="kontribusi" kicker="04" title="Kontribusi publik">
          <p>
            Siapa pun dapat mendaftar dan mengirim kabar perkembangan beserta bukti. Setiap kiriman masuk antrean moderasi dan tidak
            pernah tampil otomatis. Akun baru dibatasi satu kiriman yang menunggu, dan file bukti disimpan privat, hanya bisa dibuka
            redaksi.
          </p>
          <p>
            <Link to="/kontribusi/baru" className="link font-sans text-base">
              Kirim kontribusi →
            </Link>
          </p>
        </Section>

        <Section id="koreksi" kicker="05" title="Koreksi dan hak jawab">
          <p>
            Pihak yang disebut dalam sebuah kasus, atau kuasa hukumnya, berhak meminta koreksi dan menyampaikan tanggapan. Gunakan
            tombol <em>Ajukan koreksi</em> di halaman kasus; tidak perlu membuat akun. Kami menargetkan tanggapan dalam 3×24 jam.
          </p>
          <p>
            Koreksi yang kami terima dicatat terbuka di riwayat perubahan kasus. Kami tidak menghapus catatan diam-diam.
          </p>
        </Section>

        <Section id="disclaimer" kicker="06" title="Penafian hukum">
          <p>
            Sampai Mana adalah catatan jurnalistik atas proses hukum yang bersifat publik, bukan nasihat hukum. Setiap orang yang
            disebut dianggap tidak bersalah sampai ada putusan pengadilan yang berkekuatan hukum tetap. Status &ldquo;tersangka&rdquo;,
            &ldquo;terdakwa&rdquo;, atau &ldquo;terpidana&rdquo; mengikuti dokumen resmi pada tanggal yang tercantum.
          </p>
        </Section>
      </div>
    </div>
  );
}
