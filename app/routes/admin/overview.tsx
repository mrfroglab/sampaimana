import { Link } from 'react-router';
import { AlertTriangle, ArrowRight, Plus } from 'lucide-react';
import type { Route } from './+types/overview';
import { LinkButton, PageSkeleton, SectionHeading } from '~/components/ui';
import { AdminPageHeader, StatTile, hoursLabel, useCanEdit, type Overview } from '~/components/admin/shared';
import { STATUS_LABEL, daysBetween, fmtDate, fmtNum } from '~/lib/format';
import { seo } from '~/lib/seo';
import { api, requireUser } from '~/lib/session';

export const meta: Route.MetaFunction = () => seo({ title: 'Ringkasan redaksi', noindex: true });

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const user = await requireUser(request, ['SUPER_ADMIN', 'EDITOR', 'VIEWER']);
  const res = await api.get<Overview>('/api/admin/overview');
  return { user, overview: res.data };
}

export function HydrateFallback() {
  return <PageSkeleton />;
}

// Target response time for the moderation queue and right-of-reply requests.
const SLA_HOURS = 48;
const CORRECTION_SLA_HOURS = 72;

export default function AdminOverview({ loaderData }: Route.ComponentProps) {
  const { user, overview: o } = loaderData;
  const editable = useCanEdit();
  const pendingLate = (o.oldestPendingHours ?? 0) > SLA_HOURS;
  const correctionLate = (o.oldestCorrectionHours ?? 0) > CORRECTION_SLA_HOURS;

  return (
    <div className="space-y-10">
      <AdminPageHeader
        kicker={fmtDate(new Date())}
        title={`Selamat bekerja, ${user.name.split(' ')[0]}.`}
        description="Antrean yang perlu ditangani. Target respons: kontribusi 2×24 jam, koreksi dan hak jawab 3×24 jam."
        actions={
          editable && (
            <LinkButton to="/redaksi/kasus/baru">
              <Plus className="size-4" /> Kasus baru
            </LinkButton>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Kontribusi menunggu"
          value={fmtNum(o.pendingContributions)}
          tone={pendingLate ? 'warn' : 'neutral'}
          note={
            o.pendingContributions
              ? `Tertua menunggu ${hoursLabel(o.oldestPendingHours)}${pendingLate ? ' · lewat target' : ''}`
              : 'Antrean bersih'
          }
          to="/redaksi/moderasi"
        />
        <StatTile
          label="Koreksi terbuka"
          value={fmtNum(o.openCorrections)}
          tone={correctionLate ? 'danger' : 'neutral'}
          note={
            o.openCorrections
              ? `Tertua ${hoursLabel(o.oldestCorrectionHours)}${correctionLate ? ' · lewat target' : ''}`
              : 'Tidak ada permintaan'
          }
          to="/redaksi/koreksi"
        />
        <StatTile label="Kasus dipantau" value={fmtNum(o.cases)} note={`${fmtNum(o.inactiveCases)} diarsipkan`} to="/redaksi/kasus" />
        <StatTile
          label="Pengguna terdaftar"
          value={fmtNum(o.users)}
          to={user.role === 'SUPER_ADMIN' ? '/redaksi/pengguna' : undefined}
        />
      </div>

      <section>
        <SectionHeading
          kicker="Perlu dicek"
          title="Tahapan melewati tenggat"
          action={<span className="font-mono text-xs text-muted num">{o.overdueStages.length} tahapan</span>}
        />
        {o.overdueStages.length === 0 ? (
          <p className="mt-4 max-w-2xl text-sm text-muted">
            Tidak ada tahapan aktif yang melewati tenggat. Isi kolom <em>tenggat</em> pada tahapan (misalnya batas masa penahanan
            atau jadwal sidang) agar keterlambatan proses terpantau di sini.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {o.overdueStages.map((s) => (
              <li key={s.id}>
                <Link to={`/redaksi/kasus/${s.case.id}`} className="group flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:gap-4">
                  <AlertTriangle className="hidden size-4 shrink-0 text-warn sm:block" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink group-hover:underline">{s.case.title}</span>
                    <span className="text-[13px] text-muted">
                      Tahap {STATUS_LABEL[s.stageType].toLowerCase()} · tenggat {fmtDate(s.dueAt)}
                    </span>
                  </span>
                  <span className="font-mono text-xs text-warn num">lewat {daysBetween(s.dueAt)} hari</span>
                  <ArrowRight className="hidden size-4 text-faint group-hover:text-ink sm:block" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionHeading kicker="Pintasan" title="Pekerjaan rutin" />
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { to: '/redaksi/moderasi', title: 'Tinjau kontribusi', body: 'Periksa bukti, lalu jadikan tahapan atau tolak dengan alasan.' },
            { to: '/redaksi/koreksi', title: 'Tangani hak jawab', body: 'Balas koreksi dan, bila perlu, tampilkan catatan publik di riwayat kasus.' },
            { to: '/redaksi/kasus', title: 'Perbarui linimasa', body: 'Tambah tahapan, sumber resmi, dan artikel penjelasan.' },
          ].map((q) => (
            <li key={q.to}>
              <Link to={q.to} className="group block h-full border border-line bg-raised p-4 transition-colors hover:border-ink">
                <p className="flex items-center justify-between font-medium text-ink">
                  {q.title}
                  <ArrowRight className="size-4 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{q.body}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
