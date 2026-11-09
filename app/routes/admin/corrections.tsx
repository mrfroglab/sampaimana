import { useState, type FormEvent } from 'react';
import { Link, useRevalidator, useSearchParams } from 'react-router';
import { Clock, Mail } from 'lucide-react';
import type { Route } from './+types/corrections';
import { Alert, Badge, Button, Dialog, EmptyState, Field, PageSkeleton, Pagination, Textarea, useToast } from '~/components/ui';
import { AdminPageHeader, RELATION_LABEL, Tabs, hoursLabel, useCanEdit } from '~/components/admin/shared';
import { ApiError } from '~/lib/api';
import { cx, fmtDateTime } from '~/lib/format';
import { seo } from '~/lib/seo';
import { api, requireUser } from '~/lib/session';
import type { CorrectionStatus } from '~/lib/types';

export const meta: Route.MetaFunction = () => seo({ title: 'Koreksi & hak jawab', noindex: true });

interface CorrectionItem {
  id: string;
  name: string;
  email: string;
  relation: string;
  message: string;
  status: CorrectionStatus;
  response: string | null;
  handledAt: string | null;
  createdAt: string;
  case: { id: string; title: string; slug: string };
  handledBy: { name: string } | null;
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  await requireUser(request, ['SUPER_ADMIN', 'EDITOR', 'VIEWER']);
  const sp = new URL(request.url).searchParams;
  const status = (sp.get('status') as CorrectionStatus) || 'OPEN';
  const res = await api.get<CorrectionItem[]>('/api/admin/corrections', { status, page: sp.get('page') || 1, limit: 20 });
  return { items: res.data, meta: res.meta!, status };
}

export function HydrateFallback() {
  return <PageSkeleton />;
}

const SLA = 72;
const ageHours = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 3_600_000);

function ResolveDialog({ item, onClose, onDone }: { item: CorrectionItem; onClose: () => void; onDone: () => void }) {
  const [status, setStatus] = useState<'RESOLVED' | 'REJECTED'>('RESOLVED');
  const [response, setResponse] = useState('');
  const [publicNote, setPublicNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await api.post(`/api/admin/corrections/${item.id}/resolve`, {
        status,
        response: response.trim(),
        publicNote: publicNote.trim() || undefined,
      });
      toast(publicNote.trim() ? 'Ditangani. Catatan publik tampil di riwayat kasus.' : 'Permintaan koreksi ditangani.');
      onDone();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) setErrors({ ...err.fieldErrors, _form: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} wide title="Tangani permintaan koreksi" description={`${item.case.title} · ${item.name}`}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        {errors._form && <Alert tone="danger">{errors._form}</Alert>}
        <blockquote className="border-l-2 border-line-strong pl-4 text-[14.5px] leading-relaxed whitespace-pre-line text-ink-soft">{item.message}</blockquote>
        <div role="radiogroup" aria-label="Hasil" className="grid grid-cols-2 gap-2">
          {(['RESOLVED', 'REJECTED'] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={status === s}
              onClick={() => setStatus(s)}
              className={cx(
                'border px-4 py-3 text-left text-sm transition-colors',
                status === s ? 'border-ink bg-raised text-ink' : 'border-line-strong text-muted hover:border-ink',
              )}
            >
              <span className="block font-medium">{s === 'RESOLVED' ? 'Diterima / dikoreksi' : 'Tidak dikoreksi'}</span>
              <span className="mt-0.5 block text-[12.5px]">
                {s === 'RESOLVED' ? 'Data kasus sudah atau akan diperbaiki.' : 'Data sudah sesuai sumber.'}
              </span>
            </button>
          ))}
        </div>
        <Field
          label="Tanggapan redaksi"
          htmlFor="co-response"
          error={errors.response}
          hint="Catatan internal: apa yang diperiksa dan diputuskan. Balas pemohon lewat email secara terpisah."
        >
          <Textarea id="co-response" rows={4} value={response} onChange={(e) => setResponse(e.target.value)} invalid={!!errors.response} />
        </Field>
        <Field
          label="Catatan publik"
          optional
          htmlFor="co-public"
          error={errors.publicNote}
          hint="Jika diisi, catatan ini tampil di riwayat kasus sebagai “Catatan koreksi / hak jawab”. Jangan cantumkan email atau data pribadi pemohon."
        >
          <Textarea id="co-public" rows={3} value={publicNote} onChange={(e) => setPublicNote(e.target.value)} />
        </Field>
        <p className="text-[13px] text-muted">
          Perubahan pada data kasus (status, nama pihak, tanggal) tetap dilakukan di{' '}
          <Link to={`/redaksi/kasus/${item.case.id}`} className="link">
            editor kasus
          </Link>
          .
        </p>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" loading={busy}>
            Simpan keputusan
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export default function AdminCorrections({ loaderData }: Route.ComponentProps) {
  const { items, meta, status } = loaderData;
  const [params] = useSearchParams();
  const editable = useCanEdit();
  const revalidator = useRevalidator();
  const [handling, setHandling] = useState<CorrectionItem | null>(null);
  const hrefFor = (s: CorrectionStatus, page?: number) => {
    const next = new URLSearchParams(params);
    if (s === 'OPEN') next.delete('status');
    else next.set('status', s);
    if (page && page > 1) next.set('page', String(page));
    else next.delete('page');
    const qs = next.toString();
    return qs ? `?${qs}` : '/redaksi/koreksi';
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker="Hak jawab"
        title="Koreksi & hak jawab"
        description="Permintaan dari pihak terkait, kuasa hukum, jurnalis, atau publik. Tanggapi dalam 3×24 jam."
      />
      <Tabs<CorrectionStatus>
        label="Status koreksi"
        value={status}
        hrefFor={(s) => hrefFor(s)}
        options={[
          { value: 'OPEN', label: 'Terbuka', count: status === 'OPEN' ? meta.total : undefined },
          { value: 'RESOLVED', label: 'Diterima', count: status === 'RESOLVED' ? meta.total : undefined },
          { value: 'REJECTED', label: 'Tidak dikoreksi', count: status === 'REJECTED' ? meta.total : undefined },
        ]}
      />

      {items.length === 0 ? (
        <EmptyState title={status === 'OPEN' ? 'Tidak ada permintaan terbuka' : 'Belum ada data'} />
      ) : (
        <div className="space-y-8">
          {items.map((item) => {
            const age = ageHours(item.createdAt);
            const late = item.status === 'OPEN' && age > SLA;
            return (
              <article key={item.id} className="border-t-2 border-ink pt-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink">{item.name}</span>
                      <Badge tone={item.relation === 'PIHAK_TERKAIT' || item.relation === 'KUASA_HUKUM' ? 'accent' : 'neutral'}>
                        {RELATION_LABEL[item.relation] ?? item.relation}
                      </Badge>
                    </p>
                    <a href={`mailto:${item.email}`} className="link mt-1 inline-flex items-center gap-1.5 text-[13px] text-muted">
                      <Mail className="size-3.5" /> {item.email}
                    </a>
                    <p className="mt-1 text-[13px] text-muted">
                      Tentang{' '}
                      <Link to={`/redaksi/kasus/${item.case.id}`} className="link text-ink-soft">
                        {item.case.title}
                      </Link>
                    </p>
                  </div>
                  {item.status === 'OPEN' ? (
                    <span className={cx('inline-flex shrink-0 items-center gap-1.5 font-mono text-xs num', late ? 'text-danger' : 'text-muted')}>
                      <Clock className="size-3.5" /> {hoursLabel(age)}
                      {late && ' · lewat target'}
                    </span>
                  ) : (
                    <span className="font-mono text-xs text-muted">{fmtDateTime(item.handledAt)}</span>
                  )}
                </div>
                <p className="mt-3 max-w-3xl whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{item.message}</p>
                {item.response && (
                  <p className="mt-3 max-w-3xl border-l-2 border-line-strong pl-3 text-[13px] text-muted">
                    <span className="font-medium text-ink-soft">Tanggapan{item.handledBy ? ` ${item.handledBy.name}` : ''}:</span> {item.response}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="font-mono text-[11px] text-faint">Masuk {fmtDateTime(item.createdAt)}</span>
                  {item.status === 'OPEN' && editable && (
                    <Button size="sm" onClick={() => setHandling(item)}>
                      Tangani
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
          <Pagination page={meta.page} totalPages={meta.totalPages} hrefFor={(p) => hrefFor(status, p)} />
        </div>
      )}

      {handling && <ResolveDialog key={handling.id} item={handling} onClose={() => setHandling(null)} onDone={() => revalidator.revalidate()} />}
    </div>
  );
}
