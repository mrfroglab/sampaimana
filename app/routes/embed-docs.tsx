import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, Code2, Copy, Loader2, Search, X } from 'lucide-react';
import type { Route } from './+types/embed-docs';
import { ApiError, publicGet } from '~/lib/api';
import { SITE_URL, seo } from '~/lib/seo';
import { STATUS_LABEL, cx } from '~/lib/format';
import type { CaseListItem } from '~/lib/types';
import { Alert, Badge, Card, CardHeader, Input, PageHeader, buttonClass } from '~/components/ui';

export const meta: Route.MetaFunction = () =>
  seo({
    title: 'Tanam status kasus di situs Anda',
    description:
      'Pasang widget status kasus Sampai Mana di blog, artikel berita, atau situs Anda. Gratis, tanpa cookie, dan otomatis menyesuaikan tinggi.',
    path: '/tanam',
  });

type PickedCase = Pick<CaseListItem, 'slug' | 'title' | 'caseNumber'>;

const SLUG_RE = /^[a-z0-9-]{1,120}$/;
const THEMES = [
  ['auto', 'Otomatis'],
  ['light', 'Terang'],
  ['dark', 'Gelap'],
] as const;
type Theme = (typeof THEMES)[number][0];

/** `?kasus=<slug>` prefill, validated server-side so a bad slug is simply ignored. */
export async function loader({ request }: Route.LoaderArgs) {
  const slug = new URL(request.url).searchParams.get('kasus') ?? '';
  if (!SLUG_RE.test(slug)) return { initial: null as PickedCase | null, invalid: Boolean(slug) };
  try {
    const { data } = await publicGet<CaseListItem>(`/api/cases/${encodeURIComponent(slug)}`);
    return { initial: { slug: data.slug, title: data.title, caseNumber: data.caseNumber } as PickedCase | null, invalid: false };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return { initial: null as PickedCase | null, invalid: true };
    throw err;
  }
}

const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function CodeBlock({ label, code, disabled }: { label: string; code: string; disabled?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Clipboard API can be unavailable (insecure context): fall back to a hidden textarea.
      const ta = document.createElement('textarea');
      ta.value = code;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-line bg-sunk">
      <div className="flex items-center justify-between gap-3 border-b border-line py-1.5 pl-4 pr-1.5">
        <p className="flex min-w-0 items-center gap-2 text-xs text-muted">
          <Code2 className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{label}</span>
        </p>
        <button
          type="button"
          onClick={copy}
          disabled={disabled}
          className={buttonClass('ghost', 'xs', 'text-muted')}
          aria-label={`Salin kode: ${label}`}
        >
          {copied ? <Check /> : <Copy />}
          <span>{copied ? 'Tersalin' : 'Salin'}</span>
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[13px] leading-relaxed text-ink">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/** Pill segmented control (radio semantics). */
function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex max-w-full gap-1 rounded-full bg-ink/[0.045] p-1">
      {options.map(([v, text]) => {
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(v)}
            className={cx(
              'inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium transition-[background-color,color,box-shadow]',
              active ? 'bg-raised text-ink shadow-card' : 'text-muted hover:text-ink',
            )}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}

/** Typeahead over /api/cases?q=, debounced, keyboard accessible. */
function CasePicker({
  inputId,
  selected,
  onSelect,
}: {
  inputId: string;
  selected: PickedCase | null;
  onSelect: (c: PickedCase | null) => void;
}) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CaseListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(
      async () => {
        try {
          const res = await publicGet<CaseListItem[]>('/api/cases', { q: query.trim(), limit: 6, sort: 'updated' }, { signal: ctrl.signal });
          setItems(res.data);
          setFailed(false);
          setActive(0);
        } catch (e) {
          if ((e as { name?: string }).name !== 'AbortError') setFailed(true);
        } finally {
          if (!ctrl.signal.aborted) setLoading(false);
        }
      },
      query.trim() ? 250 : 0,
    );
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, open]);

  useEffect(() => {
    const away = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, []);

  const choose = (c: CaseListItem) => {
    onSelect({ slug: c.slug, title: c.title, caseNumber: c.caseNumber });
    setOpen(false);
    setQuery('');
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter' && open && items[active]) {
      e.preventDefault();
      choose(items[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <Input
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={open && items[active] ? `${id}-o${active}` : undefined}
          autoComplete="off"
          placeholder="Cari judul atau nomor perkara"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          className="pl-10 pr-10"
        />
        {loading && <Loader2 className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted" aria-hidden />}
      </div>

      {open && (
        <ul
          id={`${id}-list`}
          role="listbox"
          aria-label="Hasil pencarian kasus"
          className="absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-line bg-raised p-1.5 shadow-pop"
        >
          {failed && <li className="px-3 py-3 text-[13px] text-muted">Pencarian gagal. Coba lagi sebentar lagi.</li>}
          {!failed && !loading && items.length === 0 && <li className="px-3 py-3 text-[13px] text-muted">Tidak ada kasus yang cocok.</li>}
          {!failed &&
            items.map((c, i) => (
              <li
                key={c.slug}
                id={`${id}-o${i}`}
                role="option"
                aria-selected={selected?.slug === c.slug}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(c);
                }}
                className={cx('cursor-pointer rounded-xl px-3 py-2.5', i === active && 'bg-ink/[0.06]')}
              >
                <p className="line-clamp-2 text-sm font-medium leading-snug text-ink">{c.title}</p>
                <p className="mt-1 flex items-center gap-2 text-xs text-muted">
                  <span className="truncate font-mono">{c.caseNumber}</span>
                  <span aria-hidden>·</span>
                  <span className="shrink-0">{STATUS_LABEL[c.currentStatus]}</span>
                </p>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

const PREVIEW_BG: Record<Theme, string> = {
  light: 'bg-[#f5f5f5]',
  dark: 'bg-[#0a0a0a]',
  auto: 'bg-[#f5f5f5] dark:bg-[#0a0a0a]',
};

function Preview({ slug, theme }: { slug: string; theme: Theme }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(300);
  // Mount the frame only after the message listener exists, otherwise the first height message
  // (sent while the server-rendered iframe loads, before hydration) would be lost.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== ref.current?.contentWindow) return;
      const m = e.data as { type?: string; height?: number } | null;
      if (m?.type === 'sampaimana:height' && typeof m.height === 'number') setHeight(Math.min(4000, Math.max(60, Math.ceil(m.height))));
    };
    window.addEventListener('message', onMsg);
    setReady(true);
    return () => window.removeEventListener('message', onMsg);
  }, []);
  if (!ready) return <div style={{ height }} aria-hidden />;
  return (
    <iframe
      ref={ref}
      key={`${slug}:${theme}`}
      src={`/embed/kasus/${encodeURIComponent(slug)}?theme=${theme}`}
      title={`Pratinjau widget: ${slug}`}
      scrolling="no"
      referrerPolicy="strict-origin-when-cross-origin"
      style={{ width: '100%', maxWidth: 560, height, border: 0, display: 'block', margin: '0 auto' }}
    />
  );
}

const NOTES = [
  'Gratis dipakai di blog, artikel berita, dan situs organisasi. Mohon biarkan tautan "Lihat selengkapnya di Sampai Mana" tetap tampil.',
  'Data kasus berlisensi CC BY 4.0: cantumkan Sampai Mana sebagai sumber bila Anda mengutipnya di tempat lain.',
  'Tinggi widget menyesuaikan isi secara otomatis hanya pada versi skrip. Pada versi iframe, atur tinggi sendiri (sekitar 340 px; tambah bila lebarnya sempit).',
  'Widget tidak memasang cookie dan tidak memuat sumber daya pihak ketiga dari situs Anda. Pengunjung hanya mengunduh halaman widget dari Sampai Mana.',
  'Widget selalu menampilkan status terbaru kasus. Bila kasus diarsipkan, widget menampilkan pesan bahwa kasus tidak ditemukan.',
];

export default function EmbedDocsPage({ loaderData }: Route.ComponentProps) {
  const { initial, invalid } = loaderData;
  const [selected, setSelected] = useState<PickedCase | null>(initial);
  const [theme, setTheme] = useState<Theme>('auto');

  const choose = (c: PickedCase | null) => {
    setSelected(c);
    // Keep the URL shareable without re-running the loader.
    const url = new URL(window.location.href);
    if (c) url.searchParams.set('kasus', c.slug);
    else url.searchParams.delete('kasus');
    window.history.replaceState(window.history.state, '', url);
  };

  const slug = selected?.slug ?? 'slug-kasus-anda';
  const title = selected?.title ?? 'Nama kasus';
  const scriptCode = useMemo(
    () => `<div data-sampaimana-case="${slug}" data-theme="${theme}"></div>\n<script async src="${SITE_URL}/embed.js"></script>`,
    [slug, theme],
  );
  const iframeCode = useMemo(
    () =>
      `<iframe\n  src="${SITE_URL}/embed/kasus/${slug}?theme=${theme}"\n  title="Status kasus: ${escAttr(title)}"\n  loading="lazy"\n  referrerpolicy="strict-origin-when-cross-origin"\n  style="width:100%;max-width:560px;height:340px;border:0"\n></iframe>`,
    [slug, theme, title],
  );

  return (
    <div className="container-page max-w-5xl pb-20">
      <PageHeader
        kicker="Untuk blog, media, dan organisasi"
        title="Tanam status kasus di situs Anda"
        description="Tampilkan sampai mana sebuah kasus berjalan, lengkap dengan tahapannya, langsung di artikel atau halaman Anda. Cukup salin dua baris kode."
      />

      {invalid && (
        <div className="mb-4">
          <Alert tone="warn" title="Kasus pada tautan tidak ditemukan">
            Pilih kasus lain lewat kolom pencarian di bawah.
          </Alert>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <Card className="h-fit min-w-0">
          <CardHeader title="Pengaturan" description="Pilih kasus dan tampilannya." />
          <div className="space-y-5 p-5">
            <div className="space-y-1.5">
              <label htmlFor="tanam-kasus" className="block text-[13px] font-medium text-ink">
                Kasus
              </label>
              <CasePicker inputId="tanam-kasus" selected={selected} onSelect={choose} />
              {selected ? (
                <div className="mt-2 flex items-start justify-between gap-2 rounded-lg bg-sunk px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-[13px] font-medium leading-snug text-ink">{selected.title}</p>
                    <p className="mt-1 truncate font-mono text-[11px] text-muted">{selected.slug}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => choose(null)}
                    aria-label="Hapus pilihan kasus"
                    className="grid size-6 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : (
                <p className="text-[13px] text-muted">Belum ada kasus dipilih.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-[13px] font-medium text-ink">Tema</p>
              <Segmented label="Tema widget" value={theme} options={THEMES} onChange={setTheme} />
              <p className="text-[13px] text-muted">&ldquo;Otomatis&rdquo; mengikuti mode terang atau gelap perangkat pengunjung.</p>
            </div>
          </div>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader
            title="Pratinjau langsung"
            description="Persis seperti yang tampil di situs Anda."
            action={<Badge tone="outline">{THEMES.find(([v]) => v === theme)![1]}</Badge>}
          />
          <div className={cx('grid min-h-[260px] place-items-center p-4 sm:p-8', PREVIEW_BG[theme])}>
            {selected ? (
              <div className="w-full">
                <Preview slug={selected.slug} theme={theme} />
              </div>
            ) : (
              <p className="max-w-xs text-center text-sm text-[#737373]">Pilih kasus di sebelah kiri untuk melihat pratinjau widget.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4">
        <CodeBlock label="Versi skrip (disarankan): tinggi otomatis" code={scriptCode} disabled={!selected} />
        <CodeBlock label="Versi iframe polos" code={iframeCode} disabled={!selected} />
      </div>

      <Card className="mt-4">
        <CardHeader title="Catatan penggunaan" />
        <ul className="space-y-3 p-5 text-sm text-ink-soft">
          {NOTES.map((t) => (
            <li key={t} className="flex gap-3">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-ink/40" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
