import { useState, type FormEvent } from 'react';
import { Link2, FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import { Alert, Badge, Button, Dialog, Field, Input, Select, Textarea, useToast } from '~/components/ui';
import { ApiError } from '~/lib/api';
import {
  STAGE_STATUS_LABEL,
  STATUS_LABEL,
  STATUS_ORDER,
  cx,
  daysBetween,
  fmtDate,
  fmtDuration,
  toInputDate,
} from '~/lib/format';
import { api } from '~/lib/session';
import type { CaseStatus, StageStatus } from '~/lib/types';
import { ConfirmDialog, paragraphs, type AdminStage } from './shared';

interface StageForm {
  stageType: CaseStatus;
  status: StageStatus;
  title: string;
  summary: string;
  startedAt: string;
  endedAt: string;
  dueAt: string;
  reason: string;
}

const emptyStage = (after?: CaseStatus): StageForm => {
  const nextIndex = after ? Math.min(STATUS_ORDER.indexOf(after) + 1, STATUS_ORDER.length - 1) : 0;
  return {
    stageType: STATUS_ORDER[nextIndex],
    status: 'AKTIF',
    title: '',
    summary: '',
    startedAt: toInputDate(new Date().toISOString()),
    endedAt: '',
    dueAt: '',
    reason: '',
  };
};

const fromStage = (s: AdminStage): StageForm => ({
  stageType: s.stageType,
  status: s.status,
  title: s.title ?? '',
  summary: s.summary ?? '',
  startedAt: toInputDate(s.startedAt),
  endedAt: toInputDate(s.endedAt),
  dueAt: toInputDate(s.dueAt),
  reason: '',
});

function StageDialog({
  open,
  onClose,
  caseId,
  stage,
  currentStatus,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  caseId: string;
  stage: AdminStage | null;
  currentStatus: CaseStatus;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<StageForm>(() => (stage ? fromStage(stage) : emptyStage(currentStatus)));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const set = <K extends keyof StageForm>(k: K, v: StageForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const movesStatus = form.status === 'AKTIF' && form.stageType !== currentStatus;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setFormError(null);
    const body = {
      ...form,
      title: form.title.trim(),
      summary: form.summary.trim(),
      reason: form.reason.trim() || undefined,
    };
    try {
      if (stage) await api.put(`/api/admin/stages/${stage.id}`, body);
      else await api.post(`/api/admin/cases/${caseId}/stages`, body);
      toast(stage ? 'Tahapan diperbarui.' : 'Tahapan ditambahkan.');
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors);
        setFormError(err.message);
      } else setFormError('Gagal menyimpan tahapan.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={stage ? 'Ubah tahapan' : 'Tambah tahapan'} wide>
      <form onSubmit={submit} className="space-y-5" noValidate>
        {formError && <Alert tone="danger">{formError}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tahap" htmlFor="sd-type">
            <Select id="sd-type" value={form.stageType} onChange={(e) => set('stageType', e.target.value as CaseStatus)}>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status tahapan" htmlFor="sd-status" hint="Tahapan “berjalan” menutup tahapan aktif sebelumnya.">
            <Select id="sd-status" value={form.status} onChange={(e) => set('status', e.target.value as StageStatus)}>
              {(['AKTIF', 'SELESAI', 'PENDING'] as StageStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STAGE_STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Judul peristiwa" optional htmlFor="sd-title" error={errors.title} className="sm:col-span-2" hint="Mis. “Berkas dinyatakan lengkap (P-21)”, “Sidang perdana”.">
            <Input id="sd-title" value={form.title} onChange={(e) => set('title', e.target.value)} />
          </Field>
          <Field label="Keterangan singkat" optional htmlFor="sd-summary" error={errors.summary} className="sm:col-span-2">
            <Textarea id="sd-summary" rows={3} value={form.summary} onChange={(e) => set('summary', e.target.value)} />
          </Field>
          <Field label="Mulai" htmlFor="sd-start" error={errors.startedAt}>
            <Input id="sd-start" type="date" value={form.startedAt} onChange={(e) => set('startedAt', e.target.value)} />
          </Field>
          <Field label="Selesai" optional htmlFor="sd-end" error={errors.endedAt}>
            <Input id="sd-end" type="date" value={form.endedAt} onChange={(e) => set('endedAt', e.target.value)} />
          </Field>
          <Field
            label="Tenggat"
            optional
            htmlFor="sd-due"
            error={errors.dueAt}
            hint="Batas masa penahanan, jadwal putusan, dsb. Tahapan yang lewat tenggat ditandai."
            className="sm:col-span-2"
          >
            <Input id="sd-due" type="date" value={form.dueAt} onChange={(e) => set('dueAt', e.target.value)} className="sm:max-w-[50%]" />
          </Field>
          <Field
            label="Alasan / dasar perubahan"
            optional={!movesStatus}
            htmlFor="sd-reason"
            className="sm:col-span-2"
            hint={
              movesStatus
                ? `Status kasus akan berpindah ke ${STATUS_LABEL[form.stageType]}. Alasan tampil di riwayat publik dan notifikasi pengikut.`
                : 'Tampil di riwayat publik.'
            }
          >
            <Textarea id="sd-reason" rows={2} value={form.reason} onChange={(e) => set('reason', e.target.value)} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" loading={busy}>
            {stage ? 'Simpan perubahan' : 'Tambah tahapan'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function ArticleDialog({
  open,
  onClose,
  stage,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  stage: AdminStage;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(stage.article?.title ?? stage.title ?? '');
  const [content, setContent] = useState(stage.article?.content ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const toast = useToast();
  const paras = paragraphs(content);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await api.put(`/api/admin/stages/${stage.id}/article`, { title: title.trim(), content: content.trim() });
      toast(stage.article ? 'Penjelasan diperbarui.' : 'Penjelasan diterbitkan. Pengikut kasus diberi tahu.');
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) setErrors({ ...err.fieldErrors, _form: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      wide
      title={stage.article ? 'Ubah artikel penjelasan' : 'Tulis artikel penjelasan'}
      description={`Tahap ${STATUS_LABEL[stage.stageType].toLowerCase()} · ${fmtDate(stage.startedAt)}`}
    >
      <form onSubmit={save} className="space-y-4" noValidate>
        {errors._form && <Alert tone="danger">{errors._form}</Alert>}
        <Field label="Judul" htmlFor="ad-title" error={errors.title}>
          <Input id="ad-title" value={title} onChange={(e) => setTitle(e.target.value)} invalid={!!errors.title} />
        </Field>
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-ink">Isi</span>
            <div className="flex gap-1 text-[13px]" role="tablist" aria-label="Mode editor">
              {(['write', 'preview'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={cx('rounded-[3px] px-2.5 py-1', tab === t ? 'bg-ink text-paper' : 'text-muted hover:text-ink')}
                >
                  {t === 'write' ? 'Tulis' : 'Pratinjau'}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-1.5 grid gap-4 lg:grid-cols-2">
            <div className={cx(tab === 'preview' && 'max-lg:hidden')}>
              <Textarea
                aria-label="Isi artikel"
                rows={14}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                invalid={!!errors.content}
                className="font-serif text-[16px]"
                placeholder="Pisahkan paragraf dengan satu baris kosong. Jelaskan apa yang terjadi, dasar hukumnya, dan apa artinya bagi publik."
              />
              <p className={cx('mt-1.5 text-[13px]', errors.content ? 'text-danger' : 'text-muted')}>
                {errors.content || `${paras.length} paragraf · ${content.trim().split(/\s+/).filter(Boolean).length} kata`}
              </p>
            </div>
            <div className={cx('border border-line bg-raised px-5 py-4', tab === 'write' && 'max-lg:hidden')} aria-label="Pratinjau">
              <p className="kicker">Pratinjau</p>
              <h3 className="mt-2 font-serif text-2xl leading-tight text-ink">{title || 'Judul artikel'}</h3>
              <div className="prose-editorial mt-4 !text-[1rem]">
                {paras.length ? paras.map((p, i) => <p key={i}>{p}</p>) : <p className="text-faint">Belum ada isi.</p>}
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-2 border-t border-line pt-4">
          {stage.article ? (
            <Button variant="danger" onClick={() => setConfirmRemove(true)}>
              Tarik artikel
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" loading={busy}>
              {stage.article ? 'Simpan' : 'Terbitkan'}
            </Button>
          </div>
        </div>
      </form>
      <ConfirmDialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title="Tarik artikel penjelasan?"
        description="Artikel dihapus dari halaman publik dan tercatat di riwayat kasus."
        confirmLabel="Tarik artikel"
        danger
        onConfirm={async () => {
          try {
            await api.del(`/api/admin/stages/${stage.id}/article`);
            toast('Artikel ditarik.');
            setConfirmRemove(false);
            onSaved();
            onClose();
          } catch (err) {
            toast(err instanceof Error ? err.message : 'Gagal menarik artikel.', 'danger');
          }
        }}
      />
    </Dialog>
  );
}

export function StageEditor({
  caseId,
  stages,
  currentStatus,
  editable,
  onChanged,
}: {
  caseId: string;
  stages: AdminStage[];
  currentStatus: CaseStatus;
  editable: boolean;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<AdminStage | 'new' | null>(null);
  const [writing, setWriting] = useState<AdminStage | null>(null);
  const [removing, setRemoving] = useState<AdminStage | null>(null);
  const toast = useToast();

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {stages.length} tahapan. Tahapan berstatus <strong className="font-medium text-ink">berjalan</strong> menentukan status kasus.
        </p>
        {editable && (
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus className="size-4" /> Tahapan
          </Button>
        )}
      </div>

      <ol className="mt-5 border-l-2 border-line-strong">
        {stages.map((s) => {
          const overdue = s.status === 'AKTIF' && s.dueAt && new Date(s.dueAt) < new Date();
          return (
            <li key={s.id} className="relative pb-6 pl-6 last:pb-0">
              <span
                aria-hidden
                className={cx(
                  'absolute -left-[7px] top-1.5 size-3 rounded-full border-2',
                  s.status === 'AKTIF' ? 'border-accent bg-accent' : s.status === 'SELESAI' ? 'border-ink bg-ink' : 'border-line-strong bg-paper',
                )}
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-ink">{STATUS_LABEL[s.stageType]}</span>
                    <Badge tone={s.status === 'AKTIF' ? 'accent' : s.status === 'SELESAI' ? 'neutral' : 'warn'}>
                      {STAGE_STATUS_LABEL[s.status]}
                    </Badge>
                    {overdue && <Badge tone="warn">Lewat tenggat</Badge>}
                  </p>
                  {s.title && <p className="mt-1 text-[15px] text-ink-soft">{s.title}</p>}
                  <p className="mt-1 font-mono text-[11.5px] text-muted num">
                    {fmtDate(s.startedAt)} → {s.endedAt ? fmtDate(s.endedAt) : 'sekarang'}
                    {' · '}
                    {fmtDuration(daysBetween(s.startedAt, s.endedAt ?? new Date()))}
                    {s.dueAt && ` · tenggat ${fmtDate(s.dueAt)}`}
                  </p>
                  {s.summary && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{s.summary}</p>}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                    <span className={cx('inline-flex items-center gap-1', s.article ? 'text-ok' : 'text-faint')}>
                      <FileText className="size-3.5" /> {s.article ? `Artikel: ${s.article.title}` : 'Belum ada artikel'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-muted">
                      <Link2 className="size-3.5" /> {s.sources.length} sumber
                    </span>
                  </div>
                </div>
                {editable && (
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="outline" onClick={() => setWriting(s)}>
                      <FileText className="size-3.5" /> {s.article ? 'Artikel' : 'Tulis'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(s)} aria-label="Ubah tahapan">
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRemoving(s)}
                      aria-label="Hapus tahapan"
                      disabled={stages.length <= 1}
                      title={stages.length <= 1 ? 'Kasus harus punya minimal satu tahapan' : undefined}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {editing && (
        <StageDialog
          key={editing === 'new' ? 'new' : editing.id}
          open
          onClose={() => setEditing(null)}
          caseId={caseId}
          stage={editing === 'new' ? null : editing}
          currentStatus={currentStatus}
          onSaved={onChanged}
        />
      )}
      {writing && <ArticleDialog key={writing.id} open onClose={() => setWriting(null)} stage={writing} onSaved={onChanged} />}
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title="Hapus tahapan ini?"
        description={removing ? `${STATUS_LABEL[removing.stageType]} · ${fmtDate(removing.startedAt)}. Artikel penjelasannya ikut terhapus.` : undefined}
        confirmLabel="Hapus tahapan"
        danger
        withReason
        reasonHint="Tampil di riwayat publik, mis. “Duplikat entri” atau “Tanggal keliru”."
        onConfirm={async (reason) => {
          if (!removing) return;
          try {
            await api.del(`/api/admin/stages/${removing.id}`, { reason: reason || undefined });
            toast('Tahapan dihapus.');
            setRemoving(null);
            onChanged();
          } catch (err) {
            toast(err instanceof Error ? err.message : 'Gagal menghapus.', 'danger');
          }
        }}
      />
    </div>
  );
}
