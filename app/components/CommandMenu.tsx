import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, BarChart3, BookOpen, CornerDownLeft, Database, FileText, Loader2, Search, Send } from 'lucide-react';
import { publicGet } from '~/lib/api';
import { STATUS_LABEL, cx } from '~/lib/format';
import type { CaseListItem } from '~/lib/types';

const OPEN_EVENT = 'sm:command-menu';

/** Open the global search palette from anywhere. */
export const openCommandMenu = () => window.dispatchEvent(new Event(OPEN_EVENT));

const PAGES = [
  { to: '/kasus', label: 'Semua kasus', icon: FileText },
  { to: '/statistik', label: 'Statistik', icon: BarChart3 },
  { to: '/data', label: 'Data terbuka & API', icon: Database },
  { to: '/tentang', label: 'Metodologi', icon: BookOpen },
  { to: '/kontribusi/baru', label: 'Kirim kontribusi', icon: Send },
];

type Item = { key: string; to: string; label: string; meta?: string; icon?: typeof FileText };

/**
 * ⌘K / Ctrl+K / "/" search palette. Searches cases through the public API and
 * offers quick links. Rendered once in the header.
 */
export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<CaseListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === '/' && !typing) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      requestAnimationFrame(() => input.current?.focus());
    }
    if (!open && el.open) el.close();
    if (!open) {
      setQ('');
      setResults([]);
      setActive(0);
    }
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      publicGet<CaseListItem[]>('/api/cases', { q: term, limit: 7 }, { signal: ctrl.signal })
        .then((r) => setResults(r.data))
        .catch(() => {})
        .finally(() => !ctrl.signal.aborted && setLoading(false));
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const items: Item[] = useMemo(() => {
    const term = q.trim();
    const cases: Item[] = results.map((c) => ({
      key: c.id,
      to: `/kasus/${c.slug}`,
      label: c.title,
      meta: `${STATUS_LABEL[c.currentStatus]} · ${c.caseNumber}`,
    }));
    const pages: Item[] = PAGES.filter((p) => !term || p.label.toLowerCase().includes(term.toLowerCase())).map((p) => ({
      key: p.to,
      to: p.to,
      label: p.label,
      icon: p.icon,
    }));
    const all: Item[] = term.length >= 2 ? [{ key: '__all', to: `/kasus?q=${encodeURIComponent(term)}`, label: `Cari “${term}” di semua kasus`, icon: Search }] : [];
    return [...cases, ...all, ...pages];
  }, [q, results]);

  useEffect(() => setActive(0), [items.length]);

  const go = (it?: Item) => {
    if (!it) return;
    setOpen(false);
    navigate(it.to);
  };

  const caseCount = results.length;

  return (
    <dialog
      ref={dialog}
      onClose={() => setOpen(false)}
      onClick={(e) => e.target === dialog.current && setOpen(false)}
      aria-label="Cari"
      className="mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-3xl border border-line bg-raised p-0 text-ink shadow-pop backdrop:bg-black/40 backdrop:backdrop-blur-[3px] open:animate-rise"
    >
      {open && (
        <div
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(items.length - 1, a + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              go(items[active]);
            }
          }}
        >
          <div className="flex items-center gap-3 border-b border-line px-5">
            {loading ? <Loader2 className="size-4 shrink-0 animate-spin text-muted" /> : <Search className="size-4 shrink-0 text-muted" />}
            <input
              ref={input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari kasus, nomor perkara, atau nama pihak…"
              className="h-14 min-w-0 flex-1 bg-transparent text-[15px] placeholder:text-muted focus:outline-none"
              aria-label="Kata kunci"
              role="combobox"
              aria-expanded="true"
              aria-controls="cmdk-list"
              aria-activedescendant={items[active] ? `cmdk-${items[active].key}` : undefined}
            />
            <kbd className="kbd">Esc</kbd>
          </div>
          <ul id="cmdk-list" role="listbox" className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
            {caseCount > 0 && <li className="kicker px-3 pb-1.5 pt-2">Kasus</li>}
            {q.trim().length >= 2 && !loading && caseCount === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted">Tidak ada kasus yang cocok.</li>
            )}
            {items.map((it, i) => {
              const isCase = i < caseCount;
              const Icon = it.icon ?? FileText;
              return (
                <li key={it.key}>
                  {i === caseCount && <p className="kicker px-3 pb-1.5 pt-3">{q.trim().length >= 2 ? 'Lainnya' : 'Halaman'}</p>}
                  <button
                    id={`cmdk-${it.key}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseMove={() => setActive(i)}
                    onClick={() => go(it)}
                    className={cx(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                      i === active ? 'bg-ink/[0.06] text-ink' : 'text-ink-soft',
                    )}
                  >
                    {isCase ? (
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-raised text-muted">
                        <FileText className="size-4" />
                      </span>
                    ) : (
                      <Icon className="ml-2 mr-1 size-4 shrink-0 text-muted" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">{it.label}</span>
                      {it.meta && <span className="block truncate font-mono text-[11px] text-muted">{it.meta}</span>}
                    </span>
                    {i === active && <CornerDownLeft className="size-3.5 shrink-0 text-muted" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between gap-3 border-t border-line bg-alt px-5 py-2.5 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <kbd className="kbd">↑</kbd>
              <kbd className="kbd">↓</kbd> pilih
              <kbd className="kbd ml-2">↵</kbd> buka
            </span>
            <a href="/kasus" onClick={(e) => { e.preventDefault(); go({ key: 'all', to: '/kasus', label: '' }); }} className="inline-flex items-center gap-1 hover:text-ink">
              Semua kasus <ArrowRight className="size-3" />
            </a>
          </div>
        </div>
      )}
    </dialog>
  );
}
