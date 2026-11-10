import { Link } from 'react-router';
import { ArrowRight, CheckCircle2, ChevronRight, FileText, Inbox, MessageSquareWarning, Plus, Users } from 'lucide-react';
import type { Route } from './+types/overview';
import { Card, CardHeader, LinkButton, PageSkeleton, buttonClass } from '~/components/ui';
import { AdminPageHeader, AttentionBadge, StatTile, hoursLabel, useCanEdit, type Attention, type AttentionItem, type Overview } from '~/components/admin/shared';
import { STATUS_LABEL, fmtDate, fmtNum } from '~/lib/format';
import { seo } from '~/lib/seo';
import { api, requireUser } from '~/lib/session';

export const meta: Route.MetaFunction = () => seo({ title: 'Ringkasan redaksi', noindex: true });

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const user = await requireUser(request, ['SUPER_ADMIN', 'EDITOR', 'VIEWER']);
  const [res, attention] = await Promise.all([
    api.get<Overview>('/api/admin/overview'),
    api.get<Attention>('/api/admin/attention'),
  ]);
  return { user, overview: res.data, attention: attention.data };
}

export function HydrateFallback() {
  return <PageSkeleton />;
}

// Target response time for the moderation queue and right-of-reply requests.
const SLA_HOURS = 48;
const CORRECTION_SLA_HOURS = 72;

export default function AdminOverview({ loaderData }: Route.ComponentProps) {
  const { user, overview: o, attention } = loaderData;
  const needsCheck = attention.overdue.length + attention.stale.length;
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
            title="Perlu dicek"
            description="Tahapan aktif yang lewat tenggat, yang segera jatuh tempo, dan kasus yang lama tanpa pembaruan."
            action={
              <Link to="/redaksi/kasus?attention=check" className={buttonClass(needsCheck ? 'primary' : 'outline', 'sm')}>
                <span className="num">{needsCheck}</span> perlu dicek
              </Link>
            }
          />
          {attention.overdue.length + attention.dueSoon.length + attention.stale.length === 0 ? (
            <div className="flex items-start gap-3 p-5">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink/[0.06] text-muted">
                <CheckCircle2 className="size-4" aria-hidden />
              </span>
              <p className="max-w-xl text-sm text-muted">
                Tidak ada yang perlu dicek. Isi kolom <em>tenggat</em> pada tahapan (misalnya batas masa penahanan atau jadwal sidang)
                agar keterlambatan proses terpantau di sini. Ringkasan harian dikirim ke redaksi setiap pagi bila ada yang perlu dicek.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              <AttentionGroup title="Lewat tenggat" items={attention.overdue} reason="OVERDUE" />
              <AttentionGroup title="Jatuh tempo dalam 7 hari" items={attention.dueSoon} reason="DUE_SOON" />
              <AttentionGroup title="Tanpa pembaruan lama" items={attention.stale} reason="STALE" />
            </div>
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

const GROUP_LIMIT = 5;

function AttentionGroup({ title, items, reason }: { title: string; items: AttentionItem[]; reason: 'OVERDUE' | 'DUE_SOON' | 'STALE' }) {
  if (items.length === 0) return null;
  return (
    <section>
      <div className="flex items-center justify-between gap-3 bg-alt px-5 py-2">
        <h3 className="kicker">{title}</h3>
        <span className="text-xs text-muted num">{items.length}</span>
      </div>
      <ul className="divide-y divide-line">
        {items.slice(0, GROUP_LIMIT).map((i) => (
          <li key={`${i.case.id}-${i.stage?.id ?? 'x'}`}>
            <Link to={`/redaksi/kasus/${i.case.id}`} className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-ink/[0.03]">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{i.case.title}</span>
                <span className="mt-0.5 block truncate text-[13px] text-muted">
                  {i.stage ? `Tahap ${STATUS_LABEL[i.stage.stageType].toLowerCase()}` : STATUS_LABEL[i.case.currentStatus]}
                  {i.stage?.dueAt && reason !== 'STALE' ? ` · tenggat ${fmtDate(i.stage.dueAt)}` : ''}
                </span>
              </span>
              <AttentionBadge reason={reason} days={i.days} />
              <ChevronRight className="size-4 shrink-0 text-faint transition-colors group-hover:text-ink" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      {items.length > GROUP_LIMIT && (
        <Link to="/redaksi/kasus?attention=check" className="block px-5 py-2.5 text-[13px] text-muted hover:text-ink">
          Lihat {items.length - GROUP_LIMIT} lainnya <ArrowRight className="ml-0.5 inline size-3.5" />
        </Link>
      )}
    </section>
  );
}
