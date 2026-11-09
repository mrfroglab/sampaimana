import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Link, type LinkProps } from 'react-router';
import { AlertTriangle, CheckCircle2, Info, Loader2, X } from 'lucide-react';
import { cx, fmtRelative, fmtShort } from '~/lib/format';

/* ---------- Buttons ---------- */

type Variant = 'primary' | 'accent' | 'outline' | 'ghost' | 'danger' | 'quiet';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-paper hover:bg-ink-soft border border-ink',
  accent: 'bg-accent text-white hover:bg-accent-ink border border-accent',
  outline: 'border border-line-strong text-ink hover:border-ink hover:bg-raised',
  ghost: 'text-ink-soft hover:text-ink hover:bg-sunk border border-transparent',
  quiet: 'text-muted hover:text-ink border border-transparent',
  danger: 'border border-danger/40 text-danger hover:bg-danger-wash',
};
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-[15px] gap-2',
};

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', extra?: string) =>
  cx(
    'inline-flex shrink-0 items-center justify-center rounded-[3px] font-medium tracking-[-0.005em] transition-colors',
    'disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    extra,
  );

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClass(variant, size, className)} disabled={disabled || loading} {...rest}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

export function LinkButton({
  variant = 'primary',
  size = 'md',
  className,
  ...rest
}: LinkProps & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

/* ---------- Form fields ---------- */

const fieldBase =
  'w-full rounded-[3px] border border-line-strong bg-raised px-3 text-[15px] text-ink placeholder:text-faint transition-colors hover:border-ink-soft focus:border-ink focus:outline-none aria-[invalid=true]:border-danger';

export function Field({
  label,
  hint,
  error,
  children,
  optional,
  htmlFor,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  optional?: boolean;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="flex items-baseline justify-between gap-2 text-[13px] font-medium text-ink">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-faint">opsional</span>}
      </label>
      {children}
      {error ? (
        <p className="text-[13px] text-danger" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-[13px] text-muted">{hint}</p>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...rest }, ref) {
    return <input ref={ref} aria-invalid={invalid || undefined} className={cx(fieldBase, 'h-10', className)} {...rest} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, rows = 4, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cx(fieldBase, 'py-2.5 leading-relaxed', className)}
      {...rest}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  function Select({ className, invalid, children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cx(fieldBase, 'h-10 appearance-none bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-9', className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%23888' stroke-width='1.5'/%3E%3C/svg%3E\")",
        }}
        {...rest}
      >
        {children}
      </select>
    );
  },
);

export function Checkbox({ label, hint, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; hint?: ReactNode }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <input id={id} type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[var(--ink)]" {...rest} />
      <span className="text-sm">
        <span className="text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-[13px] text-muted">{hint}</span>}
      </span>
    </label>
  );
}

/* ---------- Badges ---------- */

type Tone = 'neutral' | 'accent' | 'ok' | 'warn' | 'danger' | 'ink';
const tones: Record<Tone, string> = {
  neutral: 'bg-sunk text-ink-soft border-line',
  accent: 'bg-accent-wash text-accent-ink border-accent/25',
  ok: 'bg-ok-wash text-ok border-ok/25',
  warn: 'bg-warn-wash text-warn border-warn/30',
  danger: 'bg-danger-wash text-danger border-danger/25',
  ink: 'bg-ink text-paper border-ink',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-[2px] border px-1.5 py-[3px] font-mono text-[10.5px] font-medium uppercase leading-none tracking-[0.08em]',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function CategoryTag({ name, color, className }: { name: string; color: string; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 text-[13px] text-ink-soft', className)}>
      <span className="size-2 rounded-full" style={{ background: color }} aria-hidden />
      {name}
    </span>
  );
}

/* ---------- Feedback ---------- */

export function Alert({ tone = 'neutral', title, children }: { tone?: 'neutral' | 'ok' | 'warn' | 'danger'; title?: ReactNode; children?: ReactNode }) {
  const Icon = tone === 'ok' ? CheckCircle2 : tone === 'neutral' ? Info : AlertTriangle;
  const cls = {
    neutral: 'border-line bg-raised text-ink-soft',
    ok: 'border-ok/30 bg-ok-wash text-ok',
    warn: 'border-warn/30 bg-warn-wash text-warn',
    danger: 'border-danger/30 bg-danger-wash text-danger',
  }[tone];
  return (
    <div className={cx('flex gap-3 rounded-[3px] border px-4 py-3 text-sm', cls)} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cx(Boolean(title) && 'mt-0.5', 'text-ink-soft')}>{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 border border-dashed border-line-strong px-6 py-10 sm:items-center sm:text-center">
      <p className="font-serif text-2xl text-ink">{title}</p>
      {children && <div className="max-w-md text-sm text-muted">{children}</div>}
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-[2px] bg-sunk', className)} aria-hidden />;
}

export function PageSkeleton() {
  return (
    <div className="container-page py-12" aria-busy="true" aria-label="Memuat">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-4 h-10 w-2/3" />
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="mt-6 h-64" />
    </div>
  );
}

/* ---------- Dialog (native <dialog>) ---------- */

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cx(
        'm-auto w-[calc(100%-2rem)] border border-line-strong bg-paper p-0 text-ink shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)] backdrop:bg-[rgba(20,18,14,0.55)] backdrop:backdrop-blur-[2px]',
        wide ? 'max-w-3xl' : 'max-w-lg',
      )}
    >
      {open && (
        <div className="max-h-[85dvh] overflow-y-auto">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-paper px-6 py-4">
            <div>
              <h2 className="font-serif text-2xl leading-tight">{title}</h2>
              {description && <p className="mt-1 text-sm text-muted">{description}</p>}
            </div>
            <button onClick={onClose} className="-mr-2 rounded p-2 text-muted hover:bg-sunk hover:text-ink" aria-label="Tutup">
              <X className="size-4" />
            </button>
          </div>
          <div className="px-6 py-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}

/* ---------- Toasts ---------- */

type ToastTone = 'ok' | 'danger' | 'neutral';
interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}
const ToastContext = createContext<(message: string, tone?: ToastTone) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((message: string, tone: ToastTone = 'ok') => {
    const id = Date.now() + Math.random();
    setItems((cur) => [...cur.slice(-2), { id, tone, message }]);
    setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), 4500);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            className={cx(
              'pointer-events-auto flex max-w-md animate-rise items-center gap-3 rounded-[3px] border px-4 py-3 text-sm shadow-lg',
              t.tone === 'danger' ? 'border-danger/40 bg-danger-wash text-danger' : 'border-ink bg-ink text-paper',
            )}
          >
            {t.tone === 'danger' ? <AlertTriangle className="size-4 shrink-0" /> : <CheckCircle2 className="size-4 shrink-0" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

/* ---------- Pagination ---------- */

export function Pagination({ page, totalPages, hrefFor }: { page: number; totalPages: number; hrefFor: (p: number) => string }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  );
  return (
    <nav className="flex items-center justify-between gap-4 border-t border-line pt-5" aria-label="Halaman">
      <Link
        to={hrefFor(page - 1)}
        aria-disabled={page <= 1}
        className={cx('text-sm', page <= 1 ? 'pointer-events-none text-faint' : 'link')}
        preventScrollReset={false}
      >
        ← Sebelumnya
      </Link>
      <ol className="flex items-center gap-1 font-mono text-[13px]">
        {pages.map((p, i) => (
          <li key={p} className="flex items-center gap-1">
            {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-faint">…</span>}
            <Link
              to={hrefFor(p)}
              aria-current={p === page ? 'page' : undefined}
              className={cx(
                'grid size-8 place-items-center rounded-[2px]',
                p === page ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-sunk',
              )}
            >
              {p}
            </Link>
          </li>
        ))}
      </ol>
      <Link
        to={hrefFor(page + 1)}
        aria-disabled={page >= totalPages}
        className={cx('text-sm', page >= totalPages ? 'pointer-events-none text-faint' : 'link')}
      >
        Berikutnya →
      </Link>
    </nav>
  );
}

/* ---------- Misc ---------- */

export function RelTime({ date, className }: { date: string; className?: string }) {
  // Relative time differs between server and client render; the client value wins.
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => setLabel(fmtRelative(date)), [date]);
  return (
    <time dateTime={date} className={className} suppressHydrationWarning title={new Date(date).toLocaleString('id-ID')}>
      {label ?? fmtShort(date)}
    </time>
  );
}

export function SectionHeading({ kicker, title, action, className }: { kicker?: ReactNode; title: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx('flex items-end justify-between gap-4 border-t-2 border-ink pt-3', className)}>
      <div>
        {kicker && <p className="kicker">{kicker}</p>}
        <h2 className="mt-1 font-serif text-[1.65rem] leading-tight tracking-[-0.01em] text-ink">{title}</h2>
      </div>
      {action}
    </div>
  );
}
