import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Check, FileUp, Link2, Paperclip, Plus, Search, Trash2, X } from 'lucide-react';
import type { Route } from './+types/contribute';
import { seo } from '~/lib/seo';
import { publicGet } from '~/lib/api';
import { STATUS_LABEL, STATUS_ORDER, cx, fmtBytes } from '~/lib/format';
import { ApiError, api, requireUser } from '~/lib/session';
import type { CaseDetail, CaseListItem } from '~/lib/types';
import { StatusRail } from '~/components/StatusRail';
import {
  Alert,
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  LinkButton,
  PageHeader,
  PageSkeleton,
  Select,
  Textarea,
  buttonClass,
  useToast,
} from '~/components/ui';

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

/** Card header title with a numbered step pill. */
function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink text-xs font-medium text-on-ink num">{n}</span>
      <span className="min-w-0">{children}</span>
    </span>
  );
}

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
      <div className="rounded-2xl border border-line bg-ink/[0.02] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-mono text-xs text-muted">{value.caseNumber}</p>
            <p className="mt-1 text-[15px] font-semibold leading-snug tracking-[-0.01em] text-ink">{value.title}</p>
          </div>
          <button type="button" onClick={() => onChange(null)} className={buttonClass('ghost', 'icon-sm', '-mr-1 -mt-1 text-muted')} aria-label="Ganti kasus">
            <X />
          </button>
        </div>
        <StatusRail status={value.currentStatus} className="mt-4" />
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-5 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <Input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Ketik judul kasus atau nomor perkara"
        className="pl-10"
        role="combobox"
        aria-label="Cari kasus"
        aria-expanded={open && results.length > 0}
        aria-controls="case-results"
        invalid={!!error}
      />
      {open && results.length > 0 && (
        <ul
          id="case-results"
          role="listbox"
          className="absolute inset-x-0 top-12 z-20 max-h-80 animate-fade overflow-y-auto rounded-2xl border border-line bg-raised p-1 shadow-pop"
        >
          {results.map((c) => (
            <li key={c.id} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
                className="w-full rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-ink/[0.06]"
              >
                <span className="block text-sm font-medium text-ink">{c.title}</span>
                <span className="mt-0.5 block truncate text-xs text-muted">
                  <span className="font-mono">{c.caseNumber}</span> · {STATUS_LABEL[c.currentStatus]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.trim().length >= 2 && open && results.length === 0 && (
        <p className="mt-2 text-[13px] text-muted">Tidak ditemukan. Kasus yang belum dipantau dapat diusulkan lewat koreksi di halaman Metodologi.</p>
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

  const descLen = desc.trim().length;

  return (
    <div className="container-page max-w-5xl pb-20">
      <PageHeader
        kicker="Kontribusi publik"
        title="Kirim kabar perkembangan"
        description="Ceritakan apa yang terjadi, kapan, dan dari mana Anda tahu. Redaksi akan memeriksa bukti sebelum memasukkannya ke linimasa."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-6">
        <form onSubmit={submit} className="min-w-0 space-y-4" noValidate>
          {errors._ && <Alert tone="danger">{errors._}</Alert>}

          <Card>
            <CardHeader title={<Step n={1}>Kasus</Step>} description="Cari kasus yang sudah dipantau Sampai Mana." />
            <div className="p-5">
              <CasePicker value={picked} onChange={setPicked} error={errors.caseId} />
              {errors.caseId && (
                <p className="mt-1.5 text-[13px] text-danger" role="alert">
                  {errors.caseId}
                </p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title={<Step n={2}>Perkembangan</Step>} description="Uraikan secara faktual apa yang terjadi dan kapan." />
            <div className="space-y-5 p-5">
              <Field
                label="Apa perkembangannya?"
                htmlFor="description"
                error={errors.description}
                hint={
                  <span className="flex items-start justify-between gap-4">
                    <span className="min-w-0">
                      Contoh: “Berkas dinyatakan lengkap (P-21) oleh Kejari pada 3 Maret, sidang perdana dijadwalkan 20 Maret.”
                    </span>
                    <span className={cx('shrink-0 font-mono text-xs num', descLen < 30 ? 'text-muted' : 'text-ink')}>{descLen}</span>
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
            </div>
          </Card>

          <Card>
            <CardHeader title={<Step n={3}>Bukti</Step>} description="Minimal satu tautan atau file." />
            <fieldset className="space-y-5 p-5">
              <legend className="sr-only">Bukti</legend>
              {errors.proof && (
                <p className="text-[13px] text-danger" role="alert">
                  {errors.proof}
                </p>
              )}

              <div className="space-y-2">
                <p className="text-[13px] font-medium text-ink">Tautan</p>
                {links.map((l, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="relative min-w-0 flex-1">
                      <Link2 className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
                      <Input
                        type="url"
                        inputMode="url"
                        value={l}
                        placeholder="https://sipp.pn-…go.id/… atau tautan berita"
                        onChange={(e) => setLinks(links.map((x, j) => (j === i ? e.target.value : x)))}
                        className="pl-10"
                        aria-label={`Tautan bukti ${i + 1}`}
                      />
                    </div>
                    {links.length > 1 && (
                      <Button variant="ghost" size="icon" className="size-10 text-muted" onClick={() => setLinks(links.filter((_, j) => j !== i))} aria-label="Hapus tautan">
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                ))}
                {links.length < 10 && (
                  <Button variant="ghost" size="sm" onClick={() => setLinks([...links, ''])}>
                    <Plus /> Tambah tautan
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-[13px] font-medium text-ink">File</p>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    addFiles(e.dataTransfer.files);
                  }}
                  className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line-strong bg-ink/[0.02] px-5 py-8 text-center transition-colors hover:border-ink/30"
                >
                  <span className="grid size-11 place-items-center rounded-full bg-ink/[0.06] text-muted">
                    <FileUp className="size-5" aria-hidden />
                  </span>
                  <div className="max-w-sm text-sm">
                    <p className="font-medium text-ink">Lampirkan dokumen atau foto</p>
                    <p className="mt-1 text-[13px] text-muted">
                      Seret ke sini atau pilih file. JPG, PNG, WEBP, PDF, DOCX, MP3, WAV · maks 5 file, 10 MB per file. Hanya redaksi
                      yang dapat membuka.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()} disabled={files.length >= MAX_FILES}>
                    Pilih file
                  </Button>
                  <input ref={fileInput} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => addFiles(e.target.files)} />
                </div>
                {files.length > 0 && (
                  <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
                    {files.map((f, i) => (
                      <li key={`${f.name}-${i}`} className="flex items-center gap-3 py-1.5 pl-4 pr-1.5 text-sm">
                        <Paperclip className="size-4 shrink-0 text-muted" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-ink">{f.name}</span>
                        <span className="shrink-0 font-mono text-xs text-muted num">{fmtBytes(f.size)}</span>
                        <button
                          type="button"
                          onClick={() => setFiles(files.filter((_, j) => j !== i))}
                          className={buttonClass('ghost', 'icon-sm', 'text-muted hover:text-danger')}
                          aria-label={`Hapus ${f.name}`}
                        >
                          <X />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </fieldset>
          </Card>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-end">
            <LinkButton to={picked ? `/kasus/${picked.slug}` : '/kasus'} variant="ghost" size="lg">
              Batal
            </LinkButton>
            <Button type="submit" size="lg" loading={busy}>
              Kirim untuk ditinjau
            </Button>
          </div>
        </form>

        <aside className="min-w-0">
          <div className="space-y-4 lg:sticky lg:top-24">
            <Card className="p-5">
              <p className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Yang membuat kiriman cepat diterima</p>
              <ul className="mt-3 space-y-2.5 text-[13px] text-ink-soft">
                {[
                  'Tanggal kejadian yang jelas.',
                  'Tautan ke sumber primer: SIPP pengadilan, rilis resmi, dokumen sidang.',
                  'Bahasa yang faktual, tanpa opini atau tuduhan.',
                ].map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-ink" aria-hidden />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <p className="px-1 text-[13px] text-muted">
              Akun baru dapat memiliki satu kiriman yang menunggu moderasi. Kiriman yang ditolak selalu disertai alasan.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
