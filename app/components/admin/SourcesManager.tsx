import { useState, type FormEvent } from 'react';
import { BadgeCheck, ExternalLink, Link2, Plus, Trash2 } from 'lucide-react';
import { Alert, Badge, Button, CardHeader, Checkbox, Dialog, EmptyState, Field, Input, Select, useToast } from '~/components/ui';
import { ApiError } from '~/lib/api';
import { SOURCE_TYPE_LABEL, STATUS_LABEL, fmtDate, fmtShort, hostOf } from '~/lib/format';
import { api } from '~/lib/session';
import type { Source, SourceType } from '~/lib/types';
import { ConfirmDialog, dialogFooterClass, type AdminStage } from './shared';

const TYPES = Object.keys(SOURCE_TYPE_LABEL) as SourceType[];

function AddSourceDialog({
  open,
  onClose,
  caseId,
  stages,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  caseId: string;
  stages: AdminStage[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: '',
    url: '',
    publisher: '',
    type: 'OFFICIAL' as SourceType,
    publishedAt: '',
    stageId: '',
    isVerified: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await api.post(`/api/admin/cases/${caseId}/sources`, { ...form, title: form.title.trim(), url: form.url.trim() });
      toast('Sumber ditambahkan.');
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) setErrors({ ...err.fieldErrors, _form: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Tambah sumber" description="Utamakan sumber primer: rilis resmi lembaga, SIPP, direktori putusan MA.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {errors._form && <Alert tone="danger">{errors._form}</Alert>}
        <Field label="URL" htmlFor="src-url" error={errors.url}>
          <Input
            id="src-url"
            type="url"
            inputMode="url"
            placeholder="https://"
            value={form.url}
            onChange={(e) => set('url', e.target.value)}
            onBlur={() => !form.publisher && form.url && set('publisher', hostOf(form.url))}
            invalid={!!errors.url}
          />
        </Field>
        <Field label="Judul" htmlFor="src-title" error={errors.title}>
          <Input id="src-title" value={form.title} onChange={(e) => set('title', e.target.value)} invalid={!!errors.title} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Penerbit" optional htmlFor="src-pub">
            <Input id="src-pub" value={form.publisher} onChange={(e) => set('publisher', e.target.value)} />
          </Field>
          <Field label="Jenis" htmlFor="src-type">
            <Select id="src-type" value={form.type} onChange={(e) => set('type', e.target.value as SourceType)}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {SOURCE_TYPE_LABEL[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tanggal terbit" optional htmlFor="src-date">
            <Input id="src-date" type="date" value={form.publishedAt} onChange={(e) => set('publishedAt', e.target.value)} />
          </Field>
          <Field label="Kaitkan ke tahapan" optional htmlFor="src-stage">
            <Select id="src-stage" value={form.stageId} onChange={(e) => set('stageId', e.target.value)}>
              <option value="">Kasus secara umum</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {STATUS_LABEL[s.stageType]} · {fmtShort(s.startedAt)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Checkbox
          checked={form.isVerified}
          onChange={(e) => set('isVerified', e.target.checked)}
          label="Saya sudah memeriksa sumber ini"
          hint="Sumber terverifikasi ditandai di halaman publik beserta nama pemeriksanya di log internal."
        />
        <div className={dialogFooterClass}>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" loading={busy}>
            Tambah sumber
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function SourcesManager({
  caseId,
  sources,
  stages,
  editable,
  onChanged,
}: {
  caseId: string;
  sources: Source[];
  stages: AdminStage[];
  editable: boolean;
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Source | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const toast = useToast();
  const stageLabel = (id: string | null) => {
    const s = stages.find((x) => x.id === id);
    return s ? `${STATUS_LABEL[s.stageType]} · ${fmtShort(s.startedAt)}` : 'Umum';
  };
  const verified = sources.filter((s) => s.isVerified).length;

  const toggleVerify = async (s: Source) => {
    setToggling(s.id);
    try {
      await api.patch(`/api/admin/sources/${s.id}`, { isVerified: !s.isVerified });
      toast(s.isVerified ? 'Tanda verifikasi dicabut.' : 'Sumber ditandai terverifikasi.');
      onChanged();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Gagal memperbarui.', 'danger');
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="card overflow-hidden">
      <CardHeader
        title="Sumber"
        description={
          <>
            <span className="num">{sources.length}</span> sumber · <span className="num">{verified}</span> terverifikasi
          </>
        }
        action={
          editable && (
            <Button size="sm" className="shrink-0" onClick={() => setAdding(true)}>
              <Plus /> Sumber
            </Button>
          )
        }
      />

      {sources.length === 0 ? (
        <div className="p-5">
          <EmptyState title="Belum ada sumber" icon={<Link2 />}>
            Kasus tanpa sumber sulit dipercaya pembaca. Tambahkan minimal satu sumber primer.
          </EmptyState>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {sources.map((s) => (
            <li key={s.id} className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-ink/[0.02] sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="group inline-flex max-w-full items-start gap-1.5 text-sm font-medium text-ink"
                >
                  <span className="min-w-0 break-words group-hover:underline">{s.title}</span>
                  <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-muted group-hover:text-ink" aria-hidden />
                </a>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13px] text-muted">
                  <span className="min-w-0 truncate">{s.publisher || hostOf(s.url)}</span>
                  <Badge>{SOURCE_TYPE_LABEL[s.type]}</Badge>
                  <span>{stageLabel(s.stageId)}</span>
                  {s.publishedAt && <span className="font-mono text-xs num">{fmtDate(s.publishedAt)}</span>}
                </div>
                {s.isVerified && (
                  <p className="mt-2">
                    <Badge tone="outline">
                      <BadgeCheck /> Diverifikasi{s.verifiedBy ? ` oleh ${s.verifiedBy.name}` : ''}
                      {s.verifiedAt ? ` · ${fmtShort(s.verifiedAt)}` : ''}
                    </Badge>
                  </p>
                )}
              </div>
              {editable && (
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="sm" variant={s.isVerified ? 'ghost' : 'outline'} loading={toggling === s.id} onClick={() => toggleVerify(s)}>
                    {s.isVerified ? 'Cabut verifikasi' : 'Verifikasi'}
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="text-muted hover:bg-danger-wash hover:text-danger"
                    aria-label="Hapus sumber"
                    onClick={() => setRemoving(s)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {adding && <AddSourceDialog open onClose={() => setAdding(false)} caseId={caseId} stages={stages} onSaved={onChanged} />}
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title="Hapus sumber?"
        description={removing?.title}
        confirmLabel="Hapus"
        danger
        onConfirm={async () => {
          if (!removing) return;
          try {
            await api.del(`/api/admin/sources/${removing.id}`);
            toast('Sumber dihapus.');
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
