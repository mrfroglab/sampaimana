import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { FileUp, Link2, Plus, Search, Trash2, X } from 'lucide-react';
import type { Route } from './+types/contribute';
import { seo } from '~/lib/seo';
import { publicGet } from '~/lib/api';
import { STATUS_LABEL, STATUS_ORDER, cx, fmtBytes } from '~/lib/format';
import { ApiError, api, requireUser } from '~/lib/session';
import type { CaseDetail, CaseListItem } from '~/lib/types';
import { StatusRail } from '~/components/StatusRail';
import { Alert, Button, Field, Input, PageSkeleton, Select, Textarea, useToast } from '~/components/ui';

export const meta: Route.MetaFunction = () => seo({ title: 'Kirim kontribusi', path: '/kontribusi/baru', noindex: true });

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const user = await requireUser(request);
  const slug = new URL(request.url).searchParams.get('kasus');
  let initial: Pick<CaseListItem, 'slug' | 'title' | 'caseNumber' | 'currentStatus'> | null = null;
  if (slug) {
    try {
      const res = await publicGet<CaseDetail>(`/api/cases/${encodeURIComponent(slug)}`);
      initial = res.data;
    } catch {
      initial = null;
    }
  }
  return { user, initial };
}

export function HydrateFallback() {
  return <PageSkeleton />;
}

const MAX_FILES = 5;
const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPT = '.jpg,.jpeg,.png,.webp,.pdf,.docx,.mp3,.wav';

type Picked = Pick<CaseListItem, 'slug' | 'title' | 'caseNumber' | 'currentStatus'>;

function CasePicker({ value, onChange, error }: { value: Picked | null; onChange: (c: Picked | null) => void; error?: string }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<CaseListItem[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(() => {
      publicGet<CaseListItem[]>('/api/cases', { q, limit: 8 })
        .then((r) => setResults(r.data))
        .catch(() => setResults([]));
    }, 250);
  }, [q]);

  if (value) {
    return (
      <div className="border border-ink bg-raised p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[11px] text-muted">{value.caseNumber}</p>
            <p className="mt-1 font-serif text-lg leading-snug text-ink">{value.title}</p>
          </div>
          <button type="button" onClick={() => onChange(null)} className="rounded p-1 text-muted hover:bg-sunk hover:text-ink" aria-label="Ganti kasus">
            <X className="size-4" />
          </button>
        </div>
        <StatusRail status={value.currentStatus} className="mt-4" />
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
      <Input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Ketik judul kasus atau nomor perkara"
        className="pl-9"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls="case-results"
        invalid={!!error}
      />
      {open && results.length > 0 && (
        <ul id="case-results" role="listbox" className="absolute inset-x-0 top-11 z-20 max-h-80 overflow-y-auto border border-line-strong bg-raised shadow-lg">
          {results.map((c) => (
            <li key={c.id} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
                className="w-full border-b border-line px-4 py-3 text-left last:border-0 hover:bg-sunk"
              >
                <span className="block text-[15px] text-ink">{c.title}</span>
                <span className="mt-0.5 block font-mono text-[11px] text-muted">
                  {c.caseNumber} · {STATUS_LABEL[c.currentStatus]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.trim().length >= 2 && open && results.length === 0 && (
        <p className="mt-2 text-sm text-muted">Tidak ditemukan. Kasus yang belum dipantau dapat diusulkan lewat koreksi di halaman Metodologi.</p>
      )}
    </div>
  );
}

export default function Contribute({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const [picked, setPicked] = useState<Picked | null>(loaderData.initial);
  const [links, setLinks] = useState<string[]>(['']);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [desc, setDesc] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      if (next.length >= MAX_FILES) {
        toast(`Maksimal ${MAX_FILES} file.`, 'danger');
        break;
      }
      if (f.size > MAX_SIZE) {
        toast(`${f.name} melebihi 10 MB.`, 'danger');
        continue;
      }
      next.push(f);
    }
    setFiles(next);
    if (fileInput.current) fileInput.current.value = '';
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const cleanLinks = links.map((l) => l.trim()).filter(Boolean);
    const nextErrors: Record<string, string> = {};
    if (!picked) nextErrors.caseId = 'Pilih kasus yang ingin Anda kabarkan.';
    if (desc.trim().length < 30) nextErrors.description = 'Uraikan perkembangan minimal 30 karakter.';
    if (!cleanLinks.length && !files.length) nextErrors.proof = 'Sertakan minimal satu bukti: tautan atau file.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const body = new FormData();
    body.set('caseId', picked!.slug);
    body.set('description', desc.trim());
    body.set('proposedStage', String(form.get('proposedStage') || ''));
    body.set('proofLinks', JSON.stringify(cleanLinks));
    files.forEach((f) => body.append('proofFiles', f));
    setBusy(true);
    try {
      await api.post('/api/me/contributions', body);
      toast('Terkirim. Kami kabari setelah redaksi meninjau.');
      navigate('/akun/kontribusi');
    } catch (err) {
      if (err instanceof ApiError) {
        const fe = err.fieldErrors;
        setErrors({ ...fe, proof: Object.keys(fe).some((k) => k.startsWith('proofLinks')) ? 'Periksa tautan bukti, gunakan URL lengkap (https://…).' : '', _: err.message });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-page grid max-w-5xl gap-12 pt-10 lg:grid-cols-[1fr_280px]">
      <form onSubmit={submit} className="min-w-0 space-y-8" noValidate>
        <header className="border-b-2 border-ink pb-5">
          <p className="kicker">Kontribusi publik</p>
          <h1 className="mt-2 font-serif text-headline text-ink">Kirim kabar perkembangan</h1>
          <p className="mt-3 max-w-2xl text-ink-soft">
            Ceritakan apa yang terjadi, kapan, dan dari mana Anda tahu. Redaksi akan memeriksa bukti sebelum memasukkannya ke
            linimasa.
          </p>
        </header>

        {errors._ && <Alert tone="danger">{errors._}</Alert>}

        <Field label="Kasus" error={errors.caseId}>
          <CasePicker value={picked} onChange={setPicked} error={errors.caseId} />
        </Field>

        <Field
          label="Apa perkembangannya?"
          htmlFor="description"
          error={errors.description}
          hint={
            <span className="flex justify-between">
              <span>Contoh: “Berkas dinyatakan lengkap (P-21) oleh Kejari pada 3 Maret, sidang perdana dijadwalkan 20 Maret.”</span>
              <span className={cx('font-mono num', desc.trim().length < 30 && 'text-warn')}>{desc.trim().length}</span>
            </span>
          }
        >
          <Textarea id="description" rows={7} value={desc} onChange={(e) => setDesc(e.target.value)} invalid={!!errors.description} maxLength={5000} />
        </Field>

        <Field label="Menurut Anda, kasus kini di tahap apa?" htmlFor="proposedStage" optional>
          <Select id="proposedStage" name="proposedStage" defaultValue="">
            <option value="">Tidak yakin / tidak berubah</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </Field>

        <fieldset className="space-y-4">
          <legend className="text-[13px] font-medium text-ink">Bukti</legend>
          {errors.proof && (
            <p className="text-[13px] text-danger" role="alert">
              {errors.proof}
            </p>
          )}
          <div className="space-y-2">
            {links.map((l, i) => (
              <div key={i} className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
                  <Input
                    type="url"
                    inputMode="url"
                    value={l}
                    placeholder="https://sipp.pn-…go.id/… atau tautan berita"
                    onChange={(e) => setLinks(links.map((x, j) => (j === i ? e.target.value : x)))}
                    className="pl-9"
                    aria-label={`Tautan bukti ${i + 1}`}
                  />
                </div>
                {links.length > 1 && (
                  <Button variant="ghost" onClick={() => setLinks(links.filter((_, j) => j !== i))} aria-label="Hapus tautan">
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            ))}
            {links.length < 10 && (
              <Button variant="quiet" size="sm" onClick={() => setLinks([...links, ''])}>
                <Plus className="size-4" /> Tambah tautan
              </Button>
            )}
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              addFiles(e.dataTransfer.files);
            }}
            className="border border-dashed border-line-strong bg-raised p-5"
          >
            <div className="flex flex-wrap items-center gap-4">
              <FileUp className="size-6 text-faint" />
              <div className="min-w-0 flex-1 text-sm text-muted">
                <p className="text-ink">Lampirkan dokumen atau foto</p>
                <p>JPG, PNG, WEBP, PDF, DOCX, MP3, WAV · maks 5 file, 10 MB per file. Hanya redaksi yang dapat membuka.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()} disabled={files.length >= MAX_FILES}>
                Pilih file
              </Button>
              <input ref={fileInput} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => addFiles(e.target.files)} />
            </div>
            {files.length > 0 && (
              <ul className="mt-4 divide-y divide-line border-t border-line">
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="truncate text-ink">{f.name}</span>
                    <span className="flex items-center gap-3">
                      <span className="font-mono text-xs text-muted">{fmtBytes(f.size)}</span>
                      <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-muted hover:text-danger" aria-label={`Hapus ${f.name}`}>
                        <X className="size-4" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </fieldset>

        <div className="flex items-center justify-end gap-3 border-t border-line pt-6">
          <Link to={picked ? `/kasus/${picked.slug}` : '/kasus'} className="text-sm text-muted hover:text-ink">
            Batal
          </Link>
          <Button type="submit" size="lg" loading={busy}>
            Kirim untuk ditinjau
          </Button>
        </div>
      </form>

      <aside className="space-y-6 text-sm text-ink-soft lg:pt-28">
        <div className="border-l-2 border-accent pl-4">
          <p className="font-medium text-ink">Yang membuat kiriman cepat diterima</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-[13.5px]">
            <li>Tanggal kejadian yang jelas.</li>
            <li>Tautan ke sumber primer: SIPP pengadilan, rilis resmi, dokumen sidang.</li>
            <li>Bahasa yang faktual, tanpa opini atau tuduhan.</li>
          </ul>
        </div>
        <p className="text-[13px] text-muted">
          Akun baru dapat memiliki satu kiriman yang menunggu moderasi. Kiriman yang ditolak selalu disertai alasan.
        </p>
      </aside>
    </div>
  );
}
