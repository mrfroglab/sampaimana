import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Alert, Button, Field, Input, Select, Textarea } from '~/components/ui';
import { ApiError } from '~/lib/api';
import { STATUS_HINT, STATUS_LABEL, STATUS_ORDER, cx, toInputDate } from '~/lib/format';
import type { CaseStatus, Category, Defendant } from '~/lib/types';
import { FormCard, type AdminCase } from './shared';

export interface CasePayload {
  caseNumber: string;
  title: string;
  summary: string;
  description: string;
  categoryId: string;
  currentStatus: CaseStatus;
  institution: string;
  court: string;
  region: string;
  filedAt: string;
  defendants: Defendant[];
  reason?: string;
}

const SUMMARY_MAX = 280;

const fromCase = (c?: AdminCase): CasePayload => ({
  caseNumber: c?.caseNumber ?? '',
  title: c?.title ?? '',
  summary: c?.summary ?? '',
  description: c?.description ?? '',
  categoryId: c?.categoryId ?? '',
  currentStatus: c?.currentStatus ?? 'PELAPORAN',
  institution: c?.institution ?? '',
  court: c?.court ?? '',
  region: c?.region ?? '',
  filedAt: toInputDate(c?.filedAt),
  defendants: c?.defendants.map(({ name, role, description }) => ({ name, role, description: description ?? '' })) ?? [],
  reason: '',
});

export function CaseForm({
  initial,
  categories,
  readOnly,
  submitLabel,
  onSubmit,
}: {
  initial?: AdminCase;
  categories: Category[];
  readOnly?: boolean;
  submitLabel: string;
  onSubmit: (payload: CasePayload) => Promise<void>;
}) {
  const [form, setForm] = useState<CasePayload>(() => fromCase(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isEdit = Boolean(initial);
  const statusChanged = isEdit && form.currentStatus !== initial!.currentStatus;

  const set = <K extends keyof CasePayload>(key: K, value: CasePayload[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setDefendant = (i: number, patch: Partial<Defendant>) =>
    setForm((f) => ({ ...f, defendants: f.defendants.map((d, j) => (j === i ? { ...d, ...patch } : d)) }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    if (statusChanged && !form.reason?.trim()) {
      setErrors({ reason: 'Wajib diisi: alasan ini tampil di riwayat publik.' });
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        ...form,
        defendants: form.defendants.filter((d) => d.name.trim() || d.role.trim()),
        reason: form.reason?.trim() || undefined,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors);
        setFormError(err.message);
      } else {
        setFormError('Gagal menyimpan. Periksa koneksi Anda.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {formError && (
        <Alert tone="danger" title="Belum tersimpan">
          {formError}
        </Alert>
      )}

      <FormCard disabled={readOnly} title="Identitas perkara" description="Judul, nomor, kategori, dan uraian yang tampil di halaman publik.">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Judul kasus" error={errors.title} htmlFor="cf-title" className="md:col-span-2">
            <Input id="cf-title" value={form.title} onChange={(e) => set('title', e.target.value)} invalid={!!errors.title} required />
          </Field>
          <Field label="Nomor perkara" hint="Nomor register pengadilan atau laporan polisi." error={errors.caseNumber} htmlFor="cf-number">
            <Input
              id="cf-number"
              className="font-mono"
              value={form.caseNumber}
              onChange={(e) => set('caseNumber', e.target.value)}
              invalid={!!errors.caseNumber}
              required
            />
          </Field>
          <Field label="Kategori" error={errors.categoryId} htmlFor="cf-category">
            <Select id="cf-category" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)} invalid={!!errors.categoryId} required>
              <option value="" disabled>
                Pilih kategori
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Ringkasan"
            optional
            htmlFor="cf-summary"
            error={errors.summary}
            hint={
              <span className={cx('num', form.summary.length > SUMMARY_MAX && 'text-danger')}>
                Satu kalimat untuk kartu kasus · {form.summary.length}/{SUMMARY_MAX}
              </span>
            }
            className="md:col-span-2"
          >
            <Textarea id="cf-summary" rows={2} maxLength={SUMMARY_MAX} value={form.summary} onChange={(e) => set('summary', e.target.value)} />
          </Field>
          <Field
            label="Deskripsi"
            error={errors.description}
            htmlFor="cf-desc"
            hint="Latar perkara secara netral. Hindari menyimpulkan kesalahan sebelum ada putusan."
            className="md:col-span-2"
          >
            <Textarea id="cf-desc" rows={6} value={form.description} onChange={(e) => set('description', e.target.value)} invalid={!!errors.description} />
          </Field>
        </div>
      </FormCard>

      <FormCard disabled={readOnly} title="Status & lembaga" description="Tahap proses hukum dan lembaga yang menanganinya.">
        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label="Tahap saat ini"
            htmlFor="cf-status"
            hint={isEdit ? 'Lebih baik tambah tahapan di linimasa; status ikut berubah otomatis.' : STATUS_HINT[form.currentStatus]}
          >
            <Select id="cf-status" value={form.currentStatus} onChange={(e) => set('currentStatus', e.target.value as CaseStatus)}>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tanggal mulai perkara" optional htmlFor="cf-filed" error={errors.filedAt}>
            <Input id="cf-filed" type="date" value={form.filedAt} onChange={(e) => set('filedAt', e.target.value)} />
          </Field>
          {statusChanged && (
            <Field
              label="Alasan perubahan status"
              htmlFor="cf-reason"
              error={errors.reason}
              hint="Ditampilkan di riwayat publik kasus, misalnya “Putusan dibacakan 12 Mei; sumber: SIPP PN Jakpus”."
              className="md:col-span-2"
            >
              <Textarea id="cf-reason" rows={2} value={form.reason} onChange={(e) => set('reason', e.target.value)} invalid={!!errors.reason} />
            </Field>
          )}
          <Field label="Lembaga penegak hukum" optional htmlFor="cf-inst" hint="Mis. KPK, Kejaksaan Agung, Polda Jawa Barat">
            <Input id="cf-inst" value={form.institution} onChange={(e) => set('institution', e.target.value)} />
          </Field>
          <Field label="Pengadilan" optional htmlFor="cf-court">
            <Input id="cf-court" value={form.court} onChange={(e) => set('court', e.target.value)} />
          </Field>
          <Field label="Wilayah" optional htmlFor="cf-region">
            <Input id="cf-region" value={form.region} onChange={(e) => set('region', e.target.value)} />
          </Field>
        </div>
      </FormCard>

      <FormCard
        disabled={readOnly}
        title="Pihak terkait"
        description="Tulis status hukum secara tepat (terlapor, tersangka, terdakwa, terpidana, tergugat). Nama akan tampil publik."
      >
        <div className="space-y-3">
          {form.defendants.length === 0 && <p className="tile px-4 py-3 text-sm text-muted">Belum ada pihak.</p>}
          {form.defendants.map((d, i) => (
            <div key={i} className="rounded-lg border border-line p-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <Input
                  aria-label={`Nama pihak ${i + 1}`}
                  placeholder="Nama"
                  value={d.name}
                  onChange={(e) => setDefendant(i, { name: e.target.value })}
                  invalid={!!errors[`defendants.${i}.name`]}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 text-muted hover:bg-danger-wash hover:text-danger sm:col-start-3 sm:row-start-1"
                  aria-label={`Hapus pihak ${i + 1}`}
                  onClick={() => setForm((f) => ({ ...f, defendants: f.defendants.filter((_, j) => j !== i) }))}
                >
                  <Trash2 />
                </Button>
                <Input
                  aria-label={`Peran pihak ${i + 1}`}
                  placeholder="Peran / status hukum"
                  value={d.role}
                  onChange={(e) => setDefendant(i, { role: e.target.value })}
                  invalid={!!errors[`defendants.${i}.role`]}
                  className="col-span-2 sm:col-span-1 sm:col-start-2 sm:row-start-1"
                />
                <Input
                  aria-label={`Keterangan pihak ${i + 1}`}
                  placeholder="Keterangan singkat (opsional)"
                  value={d.description ?? ''}
                  onChange={(e) => setDefendant(i, { description: e.target.value })}
                  className="col-span-2"
                />
              </div>
              {(errors[`defendants.${i}.name`] || errors[`defendants.${i}.role`]) && (
                <p className="mt-2 text-[13px] text-danger">{errors[`defendants.${i}.name`] || errors[`defendants.${i}.role`]}</p>
              )}
            </div>
          ))}
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={() => setForm((f) => ({ ...f, defendants: [...f.defendants, { name: '', role: '', description: '' }] }))}
        >
          <Plus /> Tambah pihak
        </Button>
      </FormCard>

      {!readOnly && (
        <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-3xl border border-line bg-raised/90 py-2 pl-5 pr-2 shadow-pop backdrop-blur">
          <p className={cx('min-w-0 truncate text-[13px]', statusChanged ? 'font-medium text-ink' : 'text-muted')}>
            {statusChanged ? 'Status berubah: alasan wajib diisi.' : isEdit ? 'Perubahan tercatat di riwayat kasus.' : 'Tahapan pertama dibuat otomatis.'}
          </p>
          <Button type="submit" loading={busy}>
            {submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
}
