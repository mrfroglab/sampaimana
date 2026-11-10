import { useState, type FormEvent } from 'react';
import { ArrowLeft, FileSearch, ShieldCheck } from 'lucide-react';
import { Alert, Badge, Button, Checkbox, Dialog, EmptyState, Field, Input, Textarea, useToast } from '~/components/ui';
import { ApiError } from '~/lib/api';
import { STAGE_STATUS_LABEL, STATUS_LABEL, cx, fmtDate, fmtShort } from '~/lib/format';
import { api } from '~/lib/session';
import type { SippApplyResult, SippParsed, SippPreview, SippProposal } from '~/lib/types';
import { dialogFooterClass } from './shared';

const MAX_BYTES = 2 * 1024 * 1024;
const nf = new Intl.NumberFormat('id-ID');

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof ApiError ? err.message : err instanceof Error && err.message ? err.message : fallback;

/** Only the fields that exist on the parsed page. */
function SippSummary({ parsed }: { parsed: SippParsed }) {
  const rows: { label: string; value: string }[] = [
    { label: 'Nomor perkara', value: parsed.caseNumber ?? '' },
    { label: 'Pengadilan', value: parsed.court ?? '' },
    { label: 'Klasifikasi', value: parsed.classification ?? '' },
    { label: 'Tanggal pendaftaran', value: parsed.registeredAt ? fmtDate(parsed.registeredAt) : '' },
    { label: 'Status di SIPP', value: parsed.statusText ?? '' },
    { label: 'Tanggal putusan', value: parsed.verdictDate ? fmtDate(parsed.verdictDate) : '' },
    { label: 'Ringkasan putusan', value: parsed.verdictSummary ?? '' },
  ].filter((r) => r.value);
  const parties = parsed.parties ?? [];
  const schedule = parsed.schedule ?? [];

  if (!rows.length && !parties.length && !schedule.length) return null;

  return (
    <section className="rounded-2xl border border-line bg-raised" aria-label="Isi halaman yang terbaca">
      <h3 className="kicker border-b border-line px-4 py-2.5">Yang terbaca dari halaman</h3>
      <div className="space-y-4 p-4">
        {rows.length > 0 && (
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {rows.map((r) => (
              <div key={r.label} className={cx('min-w-0', r.label === 'Ringkasan putusan' && 'sm:col-span-2')}>
                <dt className="kicker">{r.label}</dt>
                <dd className={cx('mt-0.5 text-sm text-ink [overflow-wrap:anywhere]', r.label === 'Nomor perkara' && 'font-mono text-[13px]')}>
                  {r.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {parties.length > 0 && (
          <div>
            <p className="kicker">Pihak</p>
            <ul className="mt-1.5 space-y-1 text-sm">
              {parties.map((p, i) => (
                <li key={`${p.role}-${p.name}-${i}`} className="flex flex-wrap gap-x-2 [overflow-wrap:anywhere]">
                  <span className="text-muted">{p.role}</span>
                  <span className="text-ink">{p.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {schedule.length > 0 && (
          <div>
            <p className="kicker">Jadwal sidang</p>
            <ul className="mt-1.5 max-h-44 space-y-1.5 overflow-y-auto text-sm">
              {schedule.map((h, i) => (
                <li key={`${h.date}-${i}`} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
                  <span className="font-mono text-xs text-muted num sm:pt-0.5">
                    {fmtShort(h.date)}
                    {h.time ? ` · ${h.time}` : ''}
                  </span>
                  <span className="min-w-0 text-ink [overflow-wrap:anywhere]">
                    {h.agenda || 'Sidang'}
                    {h.room && <span className="text-muted"> · {h.room}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function ProposalRow({ p, checked, onToggle }: { p: SippProposal; checked: boolean; onToggle: () => void }) {
  return (
    <li className={cx('rounded-lg border p-3 transition-colors', checked ? 'border-line-strong bg-ink/[0.03]' : 'border-line')}>
      <Checkbox
        checked={checked}
        onChange={onToggle}
        label={
          <span className="block min-w-0 [overflow-wrap:anywhere]">
            <span className="flex flex-wrap items-center gap-1.5">
              <Badge tone="ink">{STATUS_LABEL[p.stageType]}</Badge>
              <Badge tone="neutral">{STAGE_STATUS_LABEL[p.status]}</Badge>
            </span>
            <span className="mt-1.5 block font-medium">{p.title || STATUS_LABEL[p.stageType]}</span>
          </span>
        }
        hint={
          <>
            {p.summary && <span className="line-clamp-3 block">{p.summary}</span>}
            <span className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs num">
              <span>Mulai {fmtDate(p.startedAt)}</span>
              {p.dueAt && (
                <span className="text-ink-soft">
                  {p.stageType === 'PERSIDANGAN' ? 'Sidang berikutnya' : 'Tenggat'} {fmtDate(p.dueAt)}
                </span>
              )}
            </span>
          </>
        }
      />
    </li>
  );
}

function SippImportBody({
  onClose,
  caseId,
  initialSippUrl,
  onApplied,
}: Pick<Parameters<typeof SippImportDialog>[0], 'onClose' | 'caseId' | 'initialSippUrl' | 'onApplied'>) {
  const toast = useToast();
  const [step, setStep] = useState<'paste' | 'review'>('paste');
  const [input, setInput] = useState('');
  const [sippUrl, setSippUrl] = useState(initialSippUrl ?? '');
  const [preview, setPreview] = useState<SippPreview | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [applying, setApplying] = useState(false);

  const text = input.trim();
  const tooLarge = new Blob([text]).size > MAX_BYTES;

  const runPreview = async (opts?: { notice?: string }) => {
    setReading(true);
    setError(null);
    setUrlError(undefined);
    setNotice(opts?.notice ?? null);
    try {
      const res = await api.post<SippPreview>(`/api/admin/cases/${caseId}/sipp/preview`, { input: text });
      setPreview(res.data);
      setSelected(new Set(res.data.proposals.map((p) => p.key)));
      setStep('review');
    } catch (err) {
      setError(errorMessage(err, 'Gagal membaca halaman. Periksa koneksi Anda.'));
      setStep('paste');
    } finally {
      setReading(false);
    }
  };

  const onRead = (e: FormEvent) => {
    e.preventDefault();
    if (!text || tooLarge || reading) return;
    void runPreview();
  };

  const onApply = async () => {
    if (!preview || selected.size === 0 || applying) return;
    setApplying(true);
    setError(null);
    try {
      const url = sippUrl.trim();
      const res = await api.post<SippApplyResult>(`/api/admin/cases/${caseId}/sipp/apply`, {
        input: text,
        keys: preview.proposals.filter((p) => selected.has(p.key)).map((p) => p.key),
        ...(url ? { sippUrl: url } : {}),
      });
      const n = res.data.created.length;
      toast(`${n} tahapan diimpor dari SIPP.`);
      onApplied();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        if (err.fieldErrors.sippUrl) {
          setUrlError(err.fieldErrors.sippUrl);
          setStep('paste');
          setError(err.message);
        } else {
          // Stale proposals (already imported): show why, then refresh the preview.
          await runPreview({ notice: err.message });
        }
      } else {
        setError(errorMessage(err, 'Gagal menerapkan tahapan. Periksa koneksi Anda.'));
      }
    } finally {
      setApplying(false);
    }
  };

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  if (step === 'paste' || !preview) {
    return (
      <form onSubmit={onRead} className="space-y-5" noValidate>
        {error && (
          <Alert tone="danger" title="Belum bisa dibaca">
            {error}
          </Alert>
        )}

        <div className="space-y-2">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-soft marker:text-muted">
            <li>Buka halaman “Detil Perkara” di SIPP pengadilan lewat browser Anda.</li>
            <li>
              Tekan <kbd className="rounded-sm bg-ink/[0.06] px-1 font-mono text-xs text-ink">Ctrl</kbd> +{' '}
              <kbd className="rounded-sm bg-ink/[0.06] px-1 font-mono text-xs text-ink">A</kbd> lalu{' '}
              <kbd className="rounded-sm bg-ink/[0.06] px-1 font-mono text-xs text-ink">Ctrl</kbd> +{' '}
              <kbd className="rounded-sm bg-ink/[0.06] px-1 font-mono text-xs text-ink">C</kbd> (atau salin sumber HTML halaman).
            </li>
            <li>Tempel di kolom di bawah, lalu klik “Baca halaman”.</li>
          </ol>
          <p className="flex items-start gap-2 text-[13px] text-muted">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>Kami tidak mengambil data dari SIPP, hanya membaca teks yang Anda tempel.</span>
          </p>
        </div>

        <Field
          label="Tautan halaman SIPP"
          optional
          htmlFor="sipp-url"
          error={urlError}
          hint="Disimpan di kasus dan dilampirkan sebagai sumber pada tahapan yang diimpor."
        >
          <Input
            id="sipp-url"
            type="url"
            inputMode="url"
            placeholder="https://sipp.pn-…go.id/index.php/detil_perkara"
            value={sippUrl}
            onChange={(e) => setSippUrl(e.target.value)}
            invalid={!!urlError}
          />
        </Field>

        <Field
          label="Isi halaman SIPP"
          htmlFor="sipp-input"
          hint={
            <span className={cx('num', tooLarge && 'text-danger')}>
              {nf.format(text.length)} karakter · maksimal 2 MB{tooLarge ? ' (terlalu besar)' : ''}
            </span>
          }
        >
          <Textarea
            id="sipp-input"
            rows={10}
            spellCheck={false}
            className="font-mono text-[13px] leading-snug"
            placeholder="Tempel teks atau HTML halaman Detil Perkara di sini…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            invalid={tooLarge}
          />
        </Field>

        <div className={dialogFooterClass}>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" loading={reading} disabled={!text || tooLarge}>
            <FileSearch /> Baca halaman
          </Button>
        </div>
      </form>
    );
  }

  const { parsed, proposals, warnings } = preview;
  const allSelected = proposals.length > 0 && selected.size === proposals.length;
  const urlToSave = sippUrl.trim();
  const urlWillChange = urlToSave && urlToSave !== (initialSippUrl ?? '');

  return (
    <div className="space-y-5">
      {error && (
        <Alert tone="danger" title="Gagal menerapkan">
          {error}
        </Alert>
      )}
      {notice && (
        <Alert tone="warn" title="Pratinjau dimuat ulang">
          {notice}
        </Alert>
      )}

      <SippSummary parsed={parsed} />

      {warnings.length > 0 && (
        <Alert tone="warn" title="Perlu diperiksa">
          <ul className="list-disc space-y-0.5 pl-4">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </Alert>
      )}

      {proposals.length === 0 ? (
        <EmptyState title="Tidak ada usulan tahapan baru" icon={<FileSearch />}>
          Tidak ditemukan tahapan baru pada halaman ini, atau semuanya sudah pernah diimpor ke kasus ini.
        </EmptyState>
      ) : (
        <section aria-label="Usulan tahapan" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[15px] font-semibold tracking-[-0.01em]">
              Usulan tahapan <span className="font-normal text-muted num">({proposals.length})</span>
            </h3>
            <Button
              variant="quiet"
              size="xs"
              onClick={() => setSelected(allSelected ? new Set() : new Set(proposals.map((p) => p.key)))}
            >
              {allSelected ? 'Hapus semua pilihan' : 'Pilih semua'}
            </Button>
          </div>
          <ul className="space-y-2">
            {proposals.map((p) => (
              <ProposalRow key={p.key} p={p} checked={selected.has(p.key)} onToggle={() => toggle(p.key)} />
            ))}
          </ul>
        </section>
      )}

      <div className="space-y-1.5">
        <p className="tile px-3 py-2.5 text-[13px] text-ink-soft">
          Usulan ini belum disimpan. Tahapan yang Anda terapkan langsung tampil di publik dan diberitahukan ke pengikut kasus.
        </p>
        {urlWillChange && <p className="px-1 text-[13px] text-muted">Tautan SIPP juga akan disimpan di kasus ini.</p>}
      </div>

      <div className={dialogFooterClass}>
        <Button
          variant="ghost"
          onClick={() => {
            setStep('paste');
            setError(null);
            setNotice(null);
          }}
          disabled={applying}
        >
          <ArrowLeft /> Kembali
        </Button>
        <Button onClick={onApply} loading={applying} disabled={selected.size === 0}>
          Terapkan {selected.size} tahapan
        </Button>
      </div>
    </div>
  );
}

/** Paste-based SIPP import: read a pasted "Detil Perkara" page, review proposed stages, apply the chosen ones. */
export function SippImportDialog({
  open,
  onClose,
  caseId,
  caseTitle,
  initialSippUrl,
  onApplied,
}: {
  open: boolean;
  onClose: () => void;
  caseId: string;
  caseTitle: string;
  initialSippUrl?: string | null;
  onApplied: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} wide title="Impor dari SIPP" description={caseTitle}>
      {/* Mounted only while open (Dialog renders children then), so every opening starts from a clean paste step. */}
      <SippImportBody onClose={onClose} caseId={caseId} initialSippUrl={initialSippUrl} onApplied={onApplied} />
    </Dialog>
  );
}
