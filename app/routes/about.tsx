import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import type { Route } from './+types/about';
import { seo } from '~/lib/seo';
import { STATUS_HINT, STATUS_LABEL, STATUS_ORDER } from '~/lib/format';
import { Badge, PageHeader, buttonClass } from '~/components/ui';

export const meta: Route.MetaFunction = () =>
  seo({
    title: 'Metodologi & kebijakan redaksi',
    description: 'Cara Sampai Mana memantau kasus, memverifikasi sumber, menangani koreksi dan hak jawab.',
    path: '/tentang',
  });

const TOC: [string, string][] = [
  ['tujuan', 'Tujuan'],
  ['tahap', 'Lima tahap'],
  ['verifikasi', 'Verifikasi sumber'],
  ['kontribusi', 'Kontribusi publik'],
  ['koreksi', 'Koreksi & hak jawab'],
  ['disclaimer', 'Penafian hukum'],
];

function Section({ id, n, title, children }: { id: string; n: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-line pt-8 first:border-t-0 first:pt-0 sm:pt-10">
      <p className="text-[13px] font-medium text-muted num">{n}</p>
      <h2 className="mt-1 text-heading-sm font-semibold text-ink">{title}</h2>
      <div className="prose-editorial mt-4">{children}</div>
    </section>
  );
}

export default function About() {
  return (
    <div className="container-page max-w-5xl pb-20">
      <PageHeader kicker="Tentang Sampai Mana" title="Metodologi & kebijakan redaksi" />

      <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10">
        <nav className="hidden lg:block" aria-label="Daftar isi">
          <div className="sticky top-24">
            <p className="kicker mb-3 px-3">Daftar isi</p>
            <ul className="space-y-0.5 text-sm">
              {TOC.map(([id, label]) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="block truncate rounded-lg px-3 py-1.5 text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <article className="card min-w-0 space-y-8 p-6 sm:space-y-10 sm:p-10">
          <Section id="tujuan" n="01" title="Mengapa situs ini ada">
            <p>
              Perkara hukum yang menyangkut kepentingan publik sering ramai saat penangkapan, lalu senyap bertahun-tahun. Publik
              jarang tahu apakah berkasnya sudah dilimpahkan, kapan sidang dimulai, atau bagaimana putusannya. Sampai Mana mencatat
              perjalanan itu tahap demi tahap supaya mudah ditagih dan diperiksa.
            </p>
          </Section>

          <Section id="tahap" n="02" title="Lima tahap yang kami pakai">
            <p>Setiap kasus ditempatkan pada salah satu dari lima tahap berikut. Gugatan perdata dapat melompati penyidikan dan penuntutan.</p>
            <ol className="my-6 divide-y divide-line overflow-hidden rounded-2xl border border-line text-sm leading-normal">
              {STATUS_ORDER.map((s, i) => (
                <li key={s} className="flex gap-3 px-4 py-3 sm:gap-4">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink/[0.06] text-xs font-medium text-ink num">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1 sm:grid sm:grid-cols-[140px_1fr] sm:items-baseline sm:gap-4">
                    <span className="block pt-0.5 font-medium text-ink">{STATUS_LABEL[s]}</span>
                    <span className="mt-0.5 block text-muted sm:mt-0">{STATUS_HINT[s]}</span>
                  </div>
                </li>
              ))}
            </ol>
            <p>
              Perubahan status wajib disertai alasan dan selalu tercatat di bagian{' '}
              <strong className="font-medium text-ink">Riwayat perubahan</strong> pada halaman kasus. Bila
              sebuah tahap memiliki tenggat (misalnya batas masa penahanan atau jadwal sidang) dan tenggat itu terlewati tanpa kabar,
              kami menandainya.
            </p>
          </Section>

          <Section id="verifikasi" n="03" title="Verifikasi sumber">
            <p>
              Kami mengutamakan dokumen primer: putusan dan jadwal sidang di sistem informasi pengadilan, rilis resmi aparat penegak
              hukum, serta dokumen persidangan. Liputan media dipakai sebagai pelengkap.
            </p>
            <p>
              Sumber bertanda <Badge tone="ok" className="align-[2px]">terverifikasi</Badge> sudah diperiksa redaksi: tautannya aktif,
              isinya sesuai klaim, dan penerbitnya jelas. Sumber tanpa tanda tetap kami tampilkan agar Anda bisa menilainya sendiri.
            </p>
          </Section>

          <Section id="kontribusi" n="04" title="Kontribusi publik">
            <p>
              Siapa pun dapat mendaftar dan mengirim kabar perkembangan beserta bukti. Setiap kiriman masuk antrean moderasi dan tidak
              pernah tampil otomatis. Akun baru dibatasi satu kiriman yang menunggu, dan file bukti disimpan privat, hanya bisa dibuka
              redaksi.
            </p>
            <p>
              <Link to="/kontribusi/baru" className={buttonClass('outline', 'sm')}>
                Kirim kontribusi <ArrowRight />
              </Link>
            </p>
          </Section>

          <Section id="koreksi" n="05" title="Koreksi dan hak jawab">
            <p>
              Pihak yang disebut dalam sebuah kasus, atau kuasa hukumnya, berhak meminta koreksi dan menyampaikan tanggapan. Gunakan
              tombol <strong className="font-medium text-ink">Ajukan koreksi</strong> di halaman kasus; tidak perlu membuat akun. Kami menargetkan tanggapan dalam 3×24 jam.
            </p>
            <p>Koreksi yang kami terima dicatat terbuka di riwayat perubahan kasus. Kami tidak menghapus catatan diam-diam.</p>
          </Section>

          <Section id="disclaimer" n="06" title="Penafian hukum">
            <p>
              Sampai Mana adalah catatan jurnalistik atas proses hukum yang bersifat publik, bukan nasihat hukum. Setiap orang yang
              disebut dianggap tidak bersalah sampai ada putusan pengadilan yang berkekuatan hukum tetap. Status &ldquo;tersangka&rdquo;,
              &ldquo;terdakwa&rdquo;, atau &ldquo;terpidana&rdquo; mengikuti dokumen resmi pada tanggal yang tercantum.
            </p>
          </Section>
        </article>
      </div>
    </div>
  );
}
