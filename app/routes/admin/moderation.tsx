import { useState, type FormEvent } from 'react';
import { Link, useRevalidator, useSearchParams } from 'react-router';
import { Clock, Download, ExternalLink, FileText } from 'lucide-react';
import type { Route } from './+types/moderation';
import { Alert, Badge, Button, Checkbox, Dialog, EmptyState, Field, Input, PageSkeleton, Pagination, Select, Textarea, useToast } from '~/components/ui';
import { AdminPageHeader, Tabs, hoursLabel, useCanEdit } from '~/components/admin/shared';
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

function ReviewDialog({ item, onClose, onDone }: { item: QueueItem; onClose: () => void; onDone: () => void }) {
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
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
        <div role="radiogroup" aria-label="Keputusan" className="grid grid-cols-2 gap-2">
          {(['APPROVED', 'REJECTED'] as const).map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={decision === d}
              onClick={() => setDecision(d)}
              className={cx(
                'border px-4 py-3 text-left transition-colors',
                decision === d
                  ? d === 'APPROVED'
                    ? 'border-ok bg-ok-wash text-ok'
                    : 'border-danger bg-danger-wash text-danger'
                  : 'border-line-strong text-ink-soft hover:border-ink',
              )}
            >
              <span className="block font-medium">{d === 'APPROVED' ? 'Terima' : 'Tolak'}</span>
              <span className="mt-0.5 block text-[12.5px] opacity-80">
                {d === 'APPROVED' ? 'Bukti cukup dan dapat diverifikasi.' : 'Bukti kurang, keliru, atau duplikat.'}
              </span>
            </button>
          ))}
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
              <div className="grid gap-4 border-l-2 border-line-strong pl-4 sm:grid-cols-2">
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
                  <p className="self-end text-[13px] text-accent-ink sm:pb-2">
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

        <div className="flex justify-end gap-2 border-t border-line pt-4">
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

function ContributionCard({ item, editable, onReview }: { item: QueueItem; editable: boolean; onReview: () => void }) {
  const toast = useToast();
  const late = item.status === 'PENDING' && item.waitingHours > SLA;
  const accountDays = daysBetween(item.user.createdAt);
  const rep = item.user.reputation;
  return (
    <article className="border-t-2 border-ink pt-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link to={`/redaksi/kasus/${item.case.id}`} className="font-serif text-xl leading-tight text-ink hover:underline">
            {item.case.title}
          </Link>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted">
            <span className="font-mono">{item.case.caseNumber}</span>
            <span>Tahap kini: {STATUS_LABEL[item.case.currentStatus]}</span>
            {item.proposedStage && (
              <Badge tone={item.proposedStage === item.case.currentStatus ? 'neutral' : 'accent'}>
                Usul: {STATUS_LABEL[item.proposedStage]}
              </Badge>
            )}
          </p>
        </div>
        {item.status === 'PENDING' ? (
          <span className={cx('inline-flex shrink-0 items-center gap-1.5 font-mono text-xs num', late ? 'text-warn' : 'text-muted')}>
            <Clock className="size-3.5" /> menunggu {hoursLabel(item.waitingHours)}
            {late && ' · lewat target'}
          </span>
        ) : (
          <Badge tone={item.status === 'APPROVED' ? 'ok' : 'danger'}>{item.status === 'APPROVED' ? 'Diterima' : 'Ditolak'}</Badge>
        )}
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0">
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{item.description}</p>

          {(item.proofLinks.length > 0 || item.proofFiles.length > 0) && (
            <div className="mt-4">
              <p className="kicker">Bukti</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {item.proofLinks.map((url) => (
                  <li key={url}>
                    <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="link inline-flex items-center gap-1.5 break-all">
                      <ExternalLink className="size-3.5 shrink-0" /> {hostOf(url)}
                      <span className="text-faint">{url.replace(/^https?:\/\/[^/]+/, '').slice(0, 60)}</span>
                    </a>
                  </li>
                ))}
                {item.proofFiles.map((f) => (
                  <li key={f.index}>
                    <button
                      className="link inline-flex items-center gap-1.5 text-left"
                      onClick={() =>
                        downloadProtected(`/api/admin/contributions/${item.id}/files/${f.index}`, f.fileName).catch(() =>
                          toast('File tidak dapat diunduh.', 'danger'),
                        )
                      }
                    >
                      <FileText className="size-3.5 shrink-0" /> {f.fileName}
                      <span className="font-mono text-[11px] text-faint">{fmtBytes(f.size)}</span>
                      <Download className="size-3 text-faint" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {item.status === 'REJECTED' && item.rejectionReason && (
            <p className="mt-4 border-l-2 border-danger pl-3 text-[13px] text-ink-soft">
              <span className="font-medium text-danger">Alasan penolakan:</span> {item.rejectionReason}
            </p>
          )}
          {item.status !== 'PENDING' && (
            <p className="mt-3 text-xs text-faint">
              Ditinjau {item.reviewedBy ? `oleh ${item.reviewedBy.name} ` : ''}· {fmtDateTime(item.reviewedAt)}
              {item.appliedStageId && ' · dijadikan tahapan'}
            </p>
          )}
        </div>

        <aside className="border-line text-[13px] lg:border-l lg:pl-5">
          <p className="kicker">Kontributor</p>
          <p className="mt-1.5 font-medium text-ink">{item.user.name}</p>
          <a href={`mailto:${item.user.email}`} className="link break-all text-muted">
            {item.user.email}
          </a>
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 font-mono text-[11.5px] num">
            <dt className="text-muted">Usia akun</dt>
            <dd className={cx('text-right', accountDays < 2 ? 'text-warn' : 'text-ink')}>{accountDays} hari</dd>
            <dt className="text-muted">Diterima</dt>
            <dd className="text-right text-ink">{rep.approved}</dd>
            <dt className="text-muted">Ditolak</dt>
            <dd className="text-right text-ink">{rep.rejected}</dd>
            <dt className="text-muted">Tingkat terima</dt>
            <dd className="text-right text-ink">{rep.acceptanceRate === null ? '—' : `${rep.acceptanceRate}%`}</dd>
          </dl>
          {item.status === 'PENDING' && editable && (
            <Button className="mt-4 w-full" onClick={onReview}>
              Tinjau
            </Button>
          )}
        </aside>
      </div>
    </article>
  );
}

export default function AdminModeration({ loaderData }: Route.ComponentProps) {
  const { items, meta, status } = loaderData;
  const [params] = useSearchParams();
  const editable = useCanEdit();
  const revalidator = useRevalidator();
  const [reviewing, setReviewing] = useState<QueueItem | null>(null);
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
        <EmptyState title={status === 'PENDING' ? 'Antrean kosong' : 'Belum ada data'}>
          {status === 'PENDING' ? 'Semua kontribusi sudah ditinjau.' : 'Kontribusi yang sudah ditinjau akan muncul di sini.'}
        </EmptyState>
      ) : (
        <div className="space-y-10">
          {items.map((item) => (
            <ContributionCard key={item.id} item={item} editable={editable} onReview={() => setReviewing(item)} />
          ))}
          <Pagination page={meta.page} totalPages={meta.totalPages} hrefFor={(p) => hrefFor(status, p)} />
        </div>
      )}

      {reviewing && (
        <ReviewDialog key={reviewing.id} item={reviewing} onClose={() => setReviewing(null)} onDone={() => revalidator.revalidate()} />
      )}
    </div>
  );
}
