import { useState, type FormEvent } from 'react';
import { Link, useRevalidator, useSearchParams } from 'react-router';
import { Check, Clock, Download, ExternalLink, FileText, Inbox, Info, Link2, X } from 'lucide-react';
import type { Route } from './+types/moderation';
import { Alert, Badge, Button, Checkbox, Dialog, EmptyState, Field, Input, PageSkeleton, Pagination, Select, Textarea, useToast } from '~/components/ui';
import { AdminPageHeader, Initials, Tabs, dialogFooterClass, hoursLabel, useCanEdit } from '~/components/admin/shared';
import { ApiError } from '~/lib/api';
import { STAGE_STATUS_LABEL, STATUS_LABEL, STATUS_ORDER, cx, daysBetween, fmtBytes, fmtDateTime, hostOf, toInputDate } from '~/lib/format';
import { seo } from '~/lib/seo';
import { api, downloadProtected, requireUser } from '~/lib/session';
import type { CaseStatus, ContributionStatus, StageStatus } from '~/lib/types';

export const meta: Route.MetaFunction = () => seo({ title: 'Moderasi kontribusi', noindex: true });

interface QueueItem {
  id: string;
  description: string;
  proposedStage: CaseStatus | null;
  status: ContributionStatus;
  proofLinks: string[];
  proofFiles: { index: number; fileName: string; mimeType: string; size: number }[];
  rejectionReason: string | null;
  reviewedAt: string | null;
  appliedStageId: string | null;
  createdAt: string;
  waitingHours: number;
  case: { id: string; title: string; slug: string; caseNumber: string; currentStatus: CaseStatus };
  user: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
    reputation: { approved: number; rejected: number; pending: number; acceptanceRate: number | null };
  };
  reviewedBy: { name: string } | null;
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  await requireUser(request, ['SUPER_ADMIN', 'EDITOR', 'VIEWER']);
  const sp = new URL(request.url).searchParams;
  const status = (sp.get('status') as ContributionStatus) || 'PENDING';
  const res = await api.get<QueueItem[]>('/api/admin/contributions', { status, page: sp.get('page') || 1, limit: 20 });
  return { items: res.data, meta: res.meta!, status };
}

export function HydrateFallback() {
  return <PageSkeleton />;
}

const SLA = 48;

type Decision = 'APPROVED' | 'REJECTED';

function ReviewDialog({
  item,
  initialDecision = 'APPROVED',
  onClose,
  onDone,
}: {
  item: QueueItem;
  initialDecision?: Decision;
  onClose: () => void;
  onDone: () => void;
}) {
  const [decision, setDecision] = useState<Decision>(initialDecision);
  const [applyStage, setApplyStage] = useState(Boolean(item.proposedStage));
  const [stage, setStage] = useState({
    stageType: (item.proposedStage ?? item.case.currentStatus) as CaseStatus,
    status: 'AKTIF' as StageStatus,
    title: '',
    summary: item.description.slice(0, 600),
    startedAt: toInputDate(item.createdAt),
  });
  const hasLinks = item.proofLinks.length > 0;
  const [importLinks, setImportLinks] = useState(hasLinks);
  const [verifyLinks, setVerifyLinks] = useState(false);
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const movesStatus = applyStage && stage.status === 'AKTIF' && stage.stageType !== item.case.currentStatus;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (decision === 'REJECTED' && !reason.trim()) {
      setErrors({ rejectionReason: 'Tulis alasan agar kontributor bisa memperbaiki kirimannya.' });
      return;
    }
    setBusy(true);
    try {
      await api.post(`/api/admin/contributions/${item.id}/review`, {
        decision,
        ...(decision === 'REJECTED'
          ? { rejectionReason: reason.trim() }
          : {
              apply: applyStage ? { ...stage, title: stage.title.trim(), summary: stage.summary.trim() } : undefined,
              importLinks: hasLinks && importLinks,
              verifyLinks: hasLinks && importLinks && verifyLinks,
            }),
      });
      toast(decision === 'APPROVED' ? 'Kontribusi diterima. Kontributor diberi tahu.' : 'Kontribusi ditolak. Kontributor menerima alasannya.');
      onDone();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) setErrors({ ...err.fieldErrors, _form: err.message });
      if (err instanceof ApiError && err.status === 409) onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} wide title="Tinjau kontribusi" description={`${item.case.title} · dari ${item.user.name}`}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        {errors._form && <Alert tone="danger">{errors._form}</Alert>}
        <div role="radiogroup" aria-label="Keputusan" className="grid gap-2 sm:grid-cols-2">
          {(['APPROVED', 'REJECTED'] as const).map((d) => {
            const on = decision === d;
            const Icon = d === 'APPROVED' ? Check : X;
            return (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setDecision(d)}
                className={cx(
                  'flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-[border-color,background-color,box-shadow]',
                  on
                    ? d === 'APPROVED'
                      ? 'border-ink bg-ink/[0.03] ring-1 ring-ink'
                      : 'border-danger/50 bg-danger-wash ring-1 ring-danger/50'
                    : 'border-line hover:border-line-strong hover:bg-ink/[0.02]',
                )}
              >
                <span
                  aria-hidden
                  className={cx(
                    'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full [&_svg]:size-3',
                    on ? (d === 'APPROVED' ? 'bg-ink text-on-ink' : 'bg-danger text-on-ink') : 'bg-ink/[0.06] text-muted',
                  )}
                >
                  <Icon strokeWidth={2.5} />
                </span>
                <span className="min-w-0">
                  <span className={cx('block text-sm font-medium', on && d === 'REJECTED' ? 'text-danger' : 'text-ink')}>
                    {d === 'APPROVED' ? 'Terima' : 'Tolak'}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-muted">
                    {d === 'APPROVED' ? 'Bukti cukup dan dapat diverifikasi.' : 'Bukti kurang, keliru, atau duplikat.'}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {decision === 'APPROVED' ? (
          <div className="space-y-4">
            <Checkbox
              checked={applyStage}
              onChange={(e) => setApplyStage(e.target.checked)}
              label="Jadikan tahapan baru di linimasa"
              hint={item.proposedStage ? `Kontributor mengusulkan tahap ${STATUS_LABEL[item.proposedStage]}.` : 'Kontributor tidak mengusulkan tahap.'}
            />
            {applyStage && (
              <div className="grid gap-4 rounded-2xl border border-line p-4 sm:grid-cols-2">
                <Field label="Tahap" htmlFor="rv-type">
                  <Select id="rv-type" value={stage.stageType} onChange={(e) => setStage((s) => ({ ...s, stageType: e.target.value as CaseStatus }))}>
                    {STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Status tahapan" htmlFor="rv-status">
                  <Select id="rv-status" value={stage.status} onChange={(e) => setStage((s) => ({ ...s, status: e.target.value as StageStatus }))}>
                    {(['AKTIF', 'SELESAI', 'PENDING'] as StageStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {STAGE_STATUS_LABEL[s]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Judul peristiwa" optional htmlFor="rv-title" className="sm:col-span-2">
                  <Input id="rv-title" value={stage.title} onChange={(e) => setStage((s) => ({ ...s, title: e.target.value }))} placeholder="Mis. Sidang perdana" />
                </Field>
                <Field label="Keterangan" optional htmlFor="rv-summary" hint="Disunting dari uraian kontributor. Tulis ulang secara netral." className="sm:col-span-2">
                  <Textarea id="rv-summary" rows={4} value={stage.summary} onChange={(e) => setStage((s) => ({ ...s, summary: e.target.value }))} />
                </Field>
                <Field label="Tanggal peristiwa" htmlFor="rv-date">
                  <Input id="rv-date" type="date" value={stage.startedAt} onChange={(e) => setStage((s) => ({ ...s, startedAt: e.target.value }))} />
                </Field>
                {movesStatus && (
                  <p className="flex items-start gap-2 self-end text-[13px] font-medium text-ink sm:pb-2.5">
                    <Info className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                    Status kasus akan pindah ke {STATUS_LABEL[stage.stageType]} dan pengikut diberi tahu.
                  </p>
                )}
              </div>
            )}
            {hasLinks && (
              <>
                <Checkbox
                  checked={importLinks}
                  onChange={(e) => setImportLinks(e.target.checked)}
                  label={`Impor ${item.proofLinks.length} tautan sebagai sumber`}
                  hint={applyStage ? 'Sumber dikaitkan ke tahapan baru.' : 'Sumber dikaitkan ke kasus secara umum.'}
                />
                {importLinks && (
                  <div className="pl-7">
                    <Checkbox
                      checked={verifyLinks}
                      onChange={(e) => setVerifyLinks(e.target.checked)}
                      label="Tandai sumber terverifikasi"
                      hint="Hanya jika Anda sudah membuka dan memeriksa setiap tautan."
                    />
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <Field
            label="Alasan penolakan"
            htmlFor="rv-reason"
            error={errors.rejectionReason}
            hint="Dikirim ke kontributor. Jelaskan apa yang kurang, misalnya sumber primer atau tanggal."
          >
            <Textarea id="rv-reason" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} invalid={!!errors.rejectionReason} />
          </Field>
        )}

        <div className={dialogFooterClass}>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" variant={decision === 'APPROVED' ? 'primary' : 'danger'} loading={busy}>
            {decision === 'APPROVED' ? 'Terima kontribusi' : 'Tolak kontribusi'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function ContributionCard({
  item,
  editable,
  onReview,
}: {
  item: QueueItem;
  editable: boolean;
  onReview: (decision: Decision) => void;
}) {
  const toast = useToast();
  const late = item.status === 'PENDING' && item.waitingHours > SLA;
  const accountDays = daysBetween(item.user.createdAt);
  const newAccount = accountDays < 2;
  const rep = item.user.reputation;
  const reviewed = rep.approved + rep.rejected;
  const hasProof = item.proofLinks.length > 0 || item.proofFiles.length > 0;

  return (
    <article className="card overflow-hidden">
      {/* Case + waiting time */}
      <header className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            to={`/redaksi/kasus/${item.case.id}`}
            className="text-subheading font-semibold leading-snug tracking-[-0.01em] text-ink hover:underline"
          >
            {item.case.title}
          </Link>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-muted">
            <span className="font-mono text-xs">{item.case.caseNumber}</span>
            <span>Tahap kini: {STATUS_LABEL[item.case.currentStatus]}</span>
            {item.proposedStage && (
              <Badge tone={item.proposedStage === item.case.currentStatus ? 'neutral' : 'ink'}>
                Usul: {STATUS_LABEL[item.proposedStage]}
              </Badge>
            )}
          </div>
        </div>
        {item.status === 'PENDING' ? (
          <Badge tone={late ? 'warn' : 'neutral'} className="shrink-0 self-start">
            <Clock /> menunggu <span className="num">{hoursLabel(item.waitingHours)}</span>
            {late && ' · lewat target'}
          </Badge>
        ) : (
          <Badge tone={item.status === 'APPROVED' ? 'ok' : 'danger'} className="shrink-0 self-start">
            {item.status === 'APPROVED' ? <Check /> : <X />}
            {item.status === 'APPROVED' ? 'Diterima' : 'Ditolak'}
          </Badge>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px]">
        {/* Contribution body + evidence */}
        <div className="min-w-0 space-y-4 px-5 py-5">
          <p className="whitespace-pre-line text-body-lg leading-relaxed text-ink-soft">{item.description}</p>

          {hasProof && (
            <div>
              <p className="kicker">Bukti</p>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {item.proofLinks.map((url) => (
                  <li key={url} className="min-w-0">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="tile group flex min-w-0 items-center gap-3 px-3 py-2.5 transition-colors hover:bg-ink/[0.07]"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-raised text-muted shadow-card">
                        <Link2 className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{hostOf(url)}</span>
                        <span className="block truncate font-mono text-xs text-muted">
                          {url.replace(/^https?:\/\/[^/]+/, '').slice(0, 60) || '/'}
                        </span>
                      </span>
                      <ExternalLink className="size-3.5 shrink-0 text-muted group-hover:text-ink" aria-hidden />
                    </a>
                  </li>
                ))}
                {item.proofFiles.map((f) => (
                  <li key={f.index} className="min-w-0">
                    <button
                      type="button"
                      className="tile group flex w-full min-w-0 items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-ink/[0.07]"
                      onClick={() =>
                        downloadProtected(`/api/admin/contributions/${item.id}/files/${f.index}`, f.fileName).catch(() =>
                          toast('File tidak dapat diunduh.', 'danger'),
                        )
                      }
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-raised text-muted shadow-card">
                        <FileText className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{f.fileName}</span>
                        <span className="block font-mono text-xs text-muted">{fmtBytes(f.size)}</span>
                      </span>
                      <Download className="size-3.5 shrink-0 text-muted group-hover:text-ink" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {item.status === 'REJECTED' && item.rejectionReason && (
            <div className="rounded-lg bg-danger-wash px-4 py-3 text-[13px] text-ink-soft">
              <p className="mb-0.5 font-medium text-danger">Alasan penolakan</p>
              {item.rejectionReason}
            </div>
          )}
          {item.status !== 'PENDING' && (
            <p className="text-xs text-muted">
              Ditinjau {item.reviewedBy ? `oleh ${item.reviewedBy.name} ` : ''}· {fmtDateTime(item.reviewedAt)}
              {item.appliedStageId && ' · dijadikan tahapan'}
            </p>
          )}
        </div>

        {/* Contributor */}
        <aside className="border-t border-line bg-alt px-5 py-5 text-[13px] lg:border-l lg:border-t-0">
          <p className="kicker">Kontributor</p>
          <div className="mt-2.5 flex items-center gap-3">
            <Initials name={item.user.name} />
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{item.user.name}</p>
              <a href={`mailto:${item.user.email}`} className="block truncate text-muted transition-colors hover:text-ink">
                {item.user.email}
              </a>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {reviewed === 0 ? (
              <Badge tone="outline">Kontributor baru</Badge>
            ) : (
              <Badge tone="outline">
                <span className="num">{rep.acceptanceRate === null ? '—' : `${rep.acceptanceRate}%`}</span> diterima
              </Badge>
            )}
            {newAccount && <Badge tone="warn">Akun baru</Badge>}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 num">
            <dt className="text-muted">Usia akun</dt>
            <dd className={cx('text-right font-medium', newAccount ? 'text-ember' : 'text-ink')}>{accountDays} hari</dd>
            <dt className="text-muted">Diterima</dt>
            <dd className="text-right font-medium text-ink">{rep.approved}</dd>
            <dt className="text-muted">Ditolak</dt>
            <dd className="text-right font-medium text-ink">{rep.rejected}</dd>
            <dt className="text-muted">Tingkat terima</dt>
            <dd className="text-right font-medium text-ink">{rep.acceptanceRate === null ? '—' : `${rep.acceptanceRate}%`}</dd>
          </dl>
        </aside>
      </div>

      {item.status === 'PENDING' && editable && (
        <footer className="flex flex-col-reverse gap-2 border-t border-line px-5 py-3 sm:flex-row sm:items-center sm:justify-end">
          <Button variant="danger" onClick={() => onReview('REJECTED')}>
            <X /> Tolak
          </Button>
          <Button onClick={() => onReview('APPROVED')}>
            <Check /> Terima
          </Button>
        </footer>
      )}
    </article>
  );
}

export default function AdminModeration({ loaderData }: Route.ComponentProps) {
  const { items, meta, status } = loaderData;
  const [params] = useSearchParams();
  const editable = useCanEdit();
  const revalidator = useRevalidator();
  const [reviewing, setReviewing] = useState<{ item: QueueItem; decision: Decision } | null>(null);
  const hrefFor = (s: ContributionStatus, page?: number) => {
    const next = new URLSearchParams(params);
    if (s === 'PENDING') next.delete('status');
    else next.set('status', s);
    if (page && page > 1) next.set('page', String(page));
    else next.delete('page');
    const qs = next.toString();
    return qs ? `?${qs}` : '/redaksi/moderasi';
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker="Kontribusi publik"
        title="Moderasi"
        description="Kontribusi diurutkan dari yang paling lama menunggu. Periksa bukti sebelum menerima. Kontribusi yang diterima bisa langsung menjadi tahapan baru."
      />
      <Tabs<ContributionStatus>
        label="Status kontribusi"
        value={status}
        hrefFor={(s) => hrefFor(s)}
        options={[
          { value: 'PENDING', label: 'Menunggu', count: status === 'PENDING' ? meta.total : undefined },
          { value: 'APPROVED', label: 'Diterima', count: status === 'APPROVED' ? meta.total : undefined },
          { value: 'REJECTED', label: 'Ditolak', count: status === 'REJECTED' ? meta.total : undefined },
        ]}
      />

      {items.length === 0 ? (
        <EmptyState title={status === 'PENDING' ? 'Antrean kosong' : 'Belum ada data'} icon={<Inbox />}>
          {status === 'PENDING' ? 'Semua kontribusi sudah ditinjau.' : 'Kontribusi yang sudah ditinjau akan muncul di sini.'}
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <ContributionCard
              key={item.id}
              item={item}
              editable={editable}
              onReview={(decision) => setReviewing({ item, decision })}
            />
          ))}
          <Pagination page={meta.page} totalPages={meta.totalPages} hrefFor={(p) => hrefFor(status, p)} />
        </div>
      )}

      {reviewing && (
        <ReviewDialog
          key={reviewing.item.id}
          item={reviewing.item}
          initialDecision={reviewing.decision}
          onClose={() => setReviewing(null)}
          onDone={() => revalidator.revalidate()}
        />
      )}
    </div>
  );
}
