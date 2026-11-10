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
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Link, type LinkProps } from 'react-router';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Info, Loader2, X } from 'lucide-react';
import { cx, fmtRelative, fmtShort } from '~/lib/format';

/*
 * Primitives for the monochrome system (see DESIGN.md).
 * Interactive elements are pills (rounded-full), containers are 24px cards,
 * nested tiles are 10px. Hover/fill states use translucent ink so they work on
 * the canvas, on cards, and in dark mode alike.
 */

/* ---------- Buttons ---------- */

type Variant = 'primary' | 'accent' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'quiet';
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-on-ink hover:bg-ink/85',
  // "accent" is the same high-emphasis treatment: color is never used for emphasis.
  accent: 'bg-ink text-on-ink hover:bg-ink/85',
  secondary: 'bg-ink/[0.06] text-ink hover:bg-ink/[0.1]',
  outline: 'border border-line bg-raised text-ink shadow-[0_1px_2px_rgb(0_0_0/0.04)] hover:bg-sunk',
  ghost: 'text-ink-soft hover:bg-ink/[0.06] hover:text-ink',
  quiet: 'text-muted hover:text-ink',
  danger: 'bg-danger-wash text-danger hover:bg-danger/15',
};
const sizes: Record<Size, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1',
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-[15px] gap-2',
  icon: 'size-9',
  'icon-sm': 'size-8',
};

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', extra?: string) =>
  cx(
    'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-full font-medium transition-[background-color,color,box-shadow,opacity]',
    'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
    '[&_svg]:size-4 [&_svg]:shrink-0',
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
      {loading && <Loader2 className="animate-spin" aria-hidden />}
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

/* ---------- Surfaces ---------- */

/** White 24px card with a hairline border. `interactive` adds a hover lift. */
export function Card({
  className,
  interactive,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div className={cx('card', interactive && 'card-hover', className)} {...rest}>
      {children}
    </div>
  );
}

/** Header strip inside a card: title, optional description, optional action on the right. */
export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('flex items-start justify-between gap-4 border-b border-line px-5 py-4', className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h3>
        {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Large metric: caption label, big tabular value, optional hint. Typography only. */
export function StatBlock({
  label,
  value,
  hint,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('min-w-0', className)}>
      <dt className="kicker">{label}</dt>
      <dd className="mt-2 text-heading-lg font-semibold leading-none tracking-[-0.04em] text-ink num">{value}</dd>
      {hint && <dd className="mt-2 text-[13px] text-muted">{hint}</dd>}
    </div>
  );
}

/** Page title block used at the top of every non-home page. */
export function PageHeader({
  kicker,
  title,
  description,
  actions,
  crumbs,
  className,
  children,
}: {
  kicker?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  crumbs?: { to?: string; label: string }[];
  className?: string;
  children?: ReactNode;
}) {
  return (
    <header className={cx('pb-8 pt-10 sm:pt-14', className)}>
      {crumbs && <Breadcrumbs items={crumbs} className="mb-5" />}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-3xl">
          {kicker && <p className="kicker mb-3">{kicker}</p>}
          <h1 className="text-heading font-semibold text-ink sm:text-heading-lg">{title}</h1>
          {description && <p className="mt-3 max-w-2xl text-body-lg text-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}

export function Breadcrumbs({ items, className }: { items: { to?: string; label: string }[]; className?: string }) {
  return (
    <nav aria-label="Remah roti" className={cx('min-w-0', className)}>
      <ol className="flex min-w-0 items-center gap-1.5 text-sm text-muted">
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${it.label}-${i}`} className={cx('flex min-w-0 items-center gap-1.5', last && 'min-w-0')}>
              {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-faint" aria-hidden />}
              {it.to && !last ? (
                <Link to={it.to} className="truncate transition-colors hover:text-ink">
                  {it.label}
                </Link>
              ) : (
                <span className={cx('truncate', last && 'text-ink')} aria-current={last ? 'page' : undefined}>
                  {it.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return <kbd className={cx('kbd', className)}>{children}</kbd>;
}

/* ---------- Form fields ---------- */

const fieldBase = cx(
  'w-full border border-transparent bg-ink/[0.045] px-3.5 text-sm text-ink placeholder:text-muted transition-[background-color,border-color,box-shadow]',
  'hover:bg-ink/[0.07] focus:border-line-strong focus:bg-raised focus:outline-none focus:ring-4 focus:ring-ink/[0.06]',
  'disabled:cursor-not-allowed disabled:opacity-60',
  'aria-[invalid=true]:border-danger/50 aria-[invalid=true]:bg-danger-wash/60 aria-[invalid=true]:focus:ring-danger/10',
);

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
        {optional && <span className="text-xs font-normal text-muted">opsional</span>}
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
    return <input ref={ref} aria-invalid={invalid || undefined} className={cx(fieldBase, 'h-10 rounded-full', className)} {...rest} />;
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
      className={cx(fieldBase, 'rounded-2xl py-2.5 leading-relaxed', className)}
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
        className={cx(fieldBase, 'h-10 cursor-pointer appearance-none rounded-full bg-[length:12px] bg-[right_14px_center] bg-no-repeat pr-9', className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 4.5l3.5 3.5 3.5-3.5' fill='none' stroke='%23737373' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
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
      <input id={id} type="checkbox" className="mt-0.5 size-4 shrink-0 cursor-pointer rounded-sm accent-[var(--ink)]" {...rest} />
      <span className="text-sm">
        <span className="text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-[13px] text-muted">{hint}</span>}
      </span>
    </label>
  );
}

/* ---------- Badges ---------- */

type Tone = 'neutral' | 'accent' | 'ok' | 'warn' | 'danger' | 'ink' | 'outline';
const tones: Record<Tone, string> = {
  neutral: 'bg-ink/[0.06] text-ink-soft border-transparent',
  accent: 'bg-ink text-on-ink border-ink',
  ink: 'bg-ink text-on-ink border-ink',
  ok: 'bg-transparent text-ink border-line-strong',
  outline: 'bg-transparent text-ink border-line-strong',
  warn: 'bg-ember-wash text-ember border-transparent',
  danger: 'bg-danger-wash text-danger border-transparent',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-full border px-2 text-xs font-medium leading-none [&_svg]:size-3',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Category label. The public site is achromatic, so the category color is only
 * shown when `showColor` is set (the admin category manager).
 */
export function CategoryTag({
  name,
  color,
  className,
  showColor,
}: {
  name: string;
  color?: string;
  className?: string;
  showColor?: boolean;
}) {
  return (
    <span className={cx('inline-flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-ink-soft', className)}>
      {showColor && color ? (
        <span className="size-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
      ) : (
        <span className="size-1.5 shrink-0 rounded-full bg-ink/40" aria-hidden />
      )}
      <span className="truncate">{name}</span>
    </span>
  );
}

/* ---------- Feedback ---------- */

export function Alert({ tone = 'neutral', title, children }: { tone?: 'neutral' | 'ok' | 'warn' | 'danger'; title?: ReactNode; children?: ReactNode }) {
  const Icon = tone === 'ok' ? CheckCircle2 : tone === 'neutral' ? Info : AlertTriangle;
  const cls = {
    neutral: 'border-line bg-raised text-ink',
    ok: 'border-line bg-raised text-ink',
    warn: 'border-ember/20 bg-ember-wash text-ember',
    danger: 'border-danger/20 bg-danger-wash text-danger',
  }[tone];
  return (
    <div className={cx('flex gap-3 rounded-2xl border px-4 py-3 text-sm', cls)} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cx(Boolean(title) && 'mt-0.5', 'text-ink-soft')}>{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ title, children, action, icon }: { title: ReactNode; children?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line-strong px-6 py-14 text-center">
      {icon && <div className="grid size-11 place-items-center rounded-full bg-ink/[0.06] text-muted [&_svg]:size-5">{icon}</div>}
      <p className="text-subheading font-semibold tracking-[-0.01em] text-ink">{title}</p>
      {children && <div className="max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-lg bg-ink/[0.06]', className)} aria-hidden />;
}

export function PageSkeleton() {
  return (
    <div className="container-page py-14" aria-busy="true" aria-label="Memuat">
      <Skeleton className="h-3 w-24 rounded-full" />
      <Skeleton className="mt-4 h-10 w-2/3 rounded-xl" />
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-32 rounded-3xl" />
        <Skeleton className="h-32 rounded-3xl" />
        <Skeleton className="h-32 rounded-3xl" />
      </div>
      <Skeleton className="mt-4 h-64 rounded-3xl" />
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
        'm-auto w-[calc(100%-2rem)] overflow-hidden rounded-3xl border border-line bg-raised p-0 text-ink shadow-pop backdrop:bg-black/40 backdrop:backdrop-blur-[3px] open:animate-rise',
        wide ? 'max-w-3xl' : 'max-w-lg',
      )}
    >
      {open && (
        <div className="max-h-[85dvh] overflow-y-auto">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-raised/95 px-6 py-4 backdrop-blur">
            <div className="min-w-0">
              <h2 className="text-subheading font-semibold tracking-[-0.015em]">{title}</h2>
              {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
            </div>
            <button onClick={onClose} className={buttonClass('ghost', 'icon-sm', '-mr-2 text-muted')} aria-label="Tutup">
              <X />
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
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex w-full max-w-sm animate-rise items-center gap-3 rounded-2xl border border-line bg-raised px-4 py-3 text-sm text-ink shadow-pop"
          >
            {t.tone === 'danger' ? (
              <AlertTriangle className="size-4 shrink-0 text-danger" />
            ) : (
              <CheckCircle2 className="size-4 shrink-0 text-ink" />
            )}
            <span className="min-w-0">{t.message}</span>
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
    <nav className="flex items-center justify-between gap-4 pt-6" aria-label="Halaman">
      <Link
        to={hrefFor(page - 1)}
        aria-disabled={page <= 1}
        className={buttonClass('ghost', 'sm', page <= 1 ? 'pointer-events-none opacity-40' : undefined)}
      >
        <ChevronLeft /> <span className="max-sm:sr-only">Sebelumnya</span>
      </Link>
      <ol className="flex items-center gap-1 text-[13px]">
        {pages.map((p, i) => (
          <li key={p} className="flex items-center gap-1">
            {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-faint">…</span>}
            <Link
              to={hrefFor(p)}
              aria-current={p === page ? 'page' : undefined}
              className={cx(
                'grid size-8 place-items-center rounded-full font-medium num transition-colors',
                p === page ? 'bg-ink text-on-ink' : 'text-ink-soft hover:bg-ink/[0.06]',
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
        className={buttonClass('ghost', 'sm', page >= totalPages ? 'pointer-events-none opacity-40' : undefined)}
      >
        <span className="max-sm:sr-only">Berikutnya</span> <ChevronRight />
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
    <div className={cx('flex items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {kicker && <p className="kicker">{kicker}</p>}
        <h2 className={cx('text-heading-sm font-semibold text-ink', Boolean(kicker) && 'mt-1.5')}>{title}</h2>
      </div>
      {action}
    </div>
  );
}
