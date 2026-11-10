import { Link } from 'react-router';
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronRight, FileText, Inbox, MessageSquareWarning, Plus, Users } from 'lucide-react';
import type { Route } from './+types/overview';
import { Badge, Card, CardHeader, LinkButton, PageSkeleton } from '~/components/ui';
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
    <div className="space-y-8">
      <AdminPageHeader
        kicker={fmtDate(new Date())}
        title={`Selamat bekerja, ${user.name.split(' ')[0]}.`}
        description="Antrean yang perlu ditangani. Target respons: kontribusi 2×24 jam, koreksi dan hak jawab 3×24 jam."
        actions={
          editable && (
            <LinkButton to="/redaksi/kasus/baru">
              <Plus /> Kasus baru
            </LinkButton>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Kontribusi menunggu"
          icon={<Inbox />}
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
          icon={<MessageSquareWarning />}
          value={fmtNum(o.openCorrections)}
          tone={correctionLate ? 'danger' : 'neutral'}
          note={
            o.openCorrections
              ? `Tertua ${hoursLabel(o.oldestCorrectionHours)}${correctionLate ? ' · lewat target' : ''}`
              : 'Tidak ada permintaan'
          }
          to="/redaksi/koreksi"
        />
        <StatTile
          label="Kasus dipantau"
          icon={<FileText />}
          value={fmtNum(o.cases)}
          note={`${fmtNum(o.inactiveCases)} diarsipkan`}
          to="/redaksi/kasus"
        />
        <StatTile
          label="Pengguna terdaftar"
          icon={<Users />}
          value={fmtNum(o.users)}
          to={user.role === 'SUPER_ADMIN' ? '/redaksi/pengguna' : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader
            title="Tahapan melewati tenggat"
            description="Perlu dicek: tahapan aktif yang sudah lewat tanggal tenggatnya."
            action={
              <Badge tone={o.overdueStages.length ? 'warn' : 'neutral'}>
                <span className="num">{o.overdueStages.length}</span> tahapan
              </Badge>
            }
          />
          {o.overdueStages.length === 0 ? (
            <div className="flex items-start gap-3 p-5">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink/[0.06] text-muted">
                <CheckCircle2 className="size-4" aria-hidden />
              </span>
              <p className="max-w-xl text-sm text-muted">
                Tidak ada tahapan aktif yang melewati tenggat. Isi kolom <em>tenggat</em> pada tahapan (misalnya batas masa penahanan
                atau jadwal sidang) agar keterlambatan proses terpantau di sini.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {o.overdueStages.map((s) => (
                <li key={s.id}>
                  <Link
                    to={`/redaksi/kasus/${s.case.id}`}
                    className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-ink/[0.03]"
                  >
                    <span className="hidden size-8 shrink-0 place-items-center rounded-full bg-ember-wash text-ember sm:grid">
                      <AlertTriangle className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{s.case.title}</span>
                      <span className="mt-0.5 block text-[13px] text-muted">
                        Tahap {STATUS_LABEL[s.stageType].toLowerCase()} · tenggat {fmtDate(s.dueAt)}
                      </span>
                      <span className="mt-1 block text-[13px] font-medium text-ember num sm:hidden">
                        lewat {daysBetween(s.dueAt)} hari
                      </span>
                    </span>
                    <span className="hidden shrink-0 text-[13px] font-medium text-ember num sm:block">
                      lewat {daysBetween(s.dueAt)} hari
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-faint transition-colors group-hover:text-ink" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title="Pekerjaan rutin" description="Pintasan ke antrean harian." />
          <ul className="divide-y divide-line">
            {[
              { to: '/redaksi/moderasi', icon: Inbox, title: 'Tinjau kontribusi', body: 'Periksa bukti, lalu jadikan tahapan atau tolak dengan alasan.' },
              { to: '/redaksi/koreksi', icon: MessageSquareWarning, title: 'Tangani hak jawab', body: 'Balas koreksi dan, bila perlu, tampilkan catatan publik di riwayat kasus.' },
              { to: '/redaksi/kasus', icon: FileText, title: 'Perbarui linimasa', body: 'Tambah tahapan, sumber resmi, dan artikel penjelasan.' },
            ].map(({ to, icon: Icon, title, body }) => (
              <li key={to}>
                <Link to={to} className="group flex items-start gap-3 px-5 py-4 transition-colors hover:bg-ink/[0.03]">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink/[0.06] text-ink">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2 text-sm font-medium text-ink">
                      {title}
                      <ArrowRight className="size-4 shrink-0 text-faint transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
                    </span>
                    <span className="mt-0.5 block text-[13px] leading-relaxed text-muted">{body}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
