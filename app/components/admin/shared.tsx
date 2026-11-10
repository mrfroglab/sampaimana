import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { Breadcrumbs, Button, CardHeader, Dialog, Field, StatBlock, Textarea } from '~/components/ui';
import { canEdit, cx } from '~/lib/format';
import { useSession } from '~/lib/session';
import type { Article, Category, CaseStatus, Defendant, Revision, Source, Stage } from '~/lib/types';

/* ---------- Admin-specific shapes ---------- */

export interface Overview {
  pendingContributions: number;
  oldestPendingHours: number | null;
  openCorrections: number;
  oldestCorrectionHours: number | null;
  cases: number;
  inactiveCases: number;
  users: number;
  overdueStages: {
    id: string;
    stageType: CaseStatus;
    dueAt: string;
    case: { id: string; title: string; slug: string };
  }[];
}

export interface AdminCaseRow {
  id: string;
  slug: string;
  caseNumber: string;
  title: string;
  currentStatus: CaseStatus;
  isActive: boolean;
  lastActivityAt: string;
  category: { name: string; color: string };
  _count: { stages: number; sources: number; follows: number };
  pendingContributions: number;
  openCorrections: number;
}

export interface AdminStage extends Omit<Stage, 'article'> {
  article: Article | null;
}

export interface AdminCase {
  id: string;
  slug: string;
  caseNumber: string;
  title: string;
  summary: string | null;
  description: string;
  categoryId: string;
  category: Category;
  currentStatus: CaseStatus;
  institution: string | null;
  court: string | null;
  region: string | null;
  sippUrl?: string | null;
  filedAt: string | null;
  isActive: boolean;
  lastActivityAt: string;
  defendants: Defendant[];
  stages: AdminStage[];
  sources: Source[];
  revisions: Revision[];
  _count: { follows: number };
}

export const RELATION_LABEL: Record<string, string> = {
  PIHAK_TERKAIT: 'Pihak terkait',
  KUASA_HUKUM: 'Kuasa hukum',
  JURNALIS: 'Jurnalis',
  PUBLIK: 'Publik',
};

export const useCanEdit = () => {
  const { user } = useSession();
  return canEdit(user?.role);
};

/* ---------- Layout pieces ---------- */

/** Title block at the top of every admin page: optional crumbs, caption, title, description, actions. */
export function AdminPageHeader({
  kicker,
  title,
  description,
  actions,
  crumbs,
}: {
  kicker?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  crumbs?: { to?: string; label: string }[];
}) {
  return (
    <header>
      {crumbs && <Breadcrumbs items={crumbs} className="mb-4" />}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {kicker && <div className="kicker mb-2">{kicker}</div>}
          <h1 className="text-heading-sm font-semibold text-ink sm:text-heading">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** Segmented pill tabs. Scrolls horizontally inside itself on narrow screens, never the page. */
export function Tabs<T extends string>({
  value,
  options,
  onChange,
  hrefFor,
  label,
}: {
  value: T;
  options: { value: T; label: ReactNode; count?: number }[];
  onChange?: (v: T) => void;
  hrefFor?: (v: T) => string;
  label: string;
}) {
  return (
    <div className="max-w-full overflow-x-auto [scrollbar-width:none]">
      <div role="tablist" aria-label={label} className="inline-flex gap-1 rounded-full bg-ink/[0.045] p-1">
        {options.map((o) => {
          const active = o.value === value;
          const cls = cx(
            'inline-flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium transition-[background-color,color,box-shadow]',
            active ? 'bg-raised text-ink shadow-card' : 'text-muted hover:text-ink',
          );
          const inner = (
            <>
              {o.label}
              {o.count !== undefined && (
                <span
                  className={cx(
                    'grid h-[18px] min-w-[18px] place-items-center rounded-full px-1.5 text-[11px] num',
                    active ? 'bg-ink/[0.06] text-ink' : 'text-muted',
                  )}
                >
                  {o.count}
                </span>
              )}
            </>
          );
          return hrefFor ? (
            <Link key={o.value} role="tab" aria-selected={active} to={hrefFor(o.value)} className={cls}>
              {inner}
            </Link>
          ) : (
            <button key={o.value} type="button" role="tab" aria-selected={active} onClick={() => onChange?.(o.value)} className={cls}>
              {inner}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Metric card. `warn`/`danger` mark an overdue queue (ember note), never decoration. */
export function StatTile({
  label,
  value,
  note,
  tone = 'neutral',
  to,
  icon,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: 'neutral' | 'warn' | 'danger' | 'ok';
  to?: string;
  icon?: ReactNode;
}) {
  const alert = tone === 'warn' || tone === 'danger';
  const body = (
    <>
      <dl className="min-w-0">
        <StatBlock
          label={
            <span className="flex items-center justify-between gap-2">
              {label}
              {icon && <span className="text-muted [&_svg]:size-4">{icon}</span>}
            </span>
          }
          value={value}
          hint={
            note && (
              <span className={cx('inline-flex items-center gap-1.5', alert && 'font-medium text-ember')}>
                {alert && <span className="size-1.5 shrink-0 rounded-full bg-ember" aria-hidden />}
                {note}
              </span>
            )
          }
        />
      </dl>
      {to && (
        <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-muted transition-colors group-hover:text-ink">
          Buka <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      )}
    </>
  );
  const cls = 'card flex flex-col justify-between p-5';
  return to ? (
    <Link to={to} className={cx(cls, 'card-hover group')}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Card that groups related form fields. Rendered as a fieldset so `disabled` locks every control. */
export function FormCard({
  title,
  description,
  disabled,
  action,
  children,
  bodyClassName,
}: {
  title: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  action?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <fieldset disabled={disabled} className="card min-w-0 overflow-hidden">
      <legend className="sr-only">{title}</legend>
      <CardHeader title={title} description={description} action={action} />
      <div className={cx('p-5', bodyClassName)}>{children}</div>
    </fieldset>
  );
}

/** Card container for a data table. The table scrolls horizontally inside the card, never the page. */
export function TableCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('card overflow-hidden', className)}>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

/** Table header cell / row classes shared by every admin table. */
export const thClass = 'kicker whitespace-nowrap px-4 py-2.5 text-left first:pl-5 last:pr-5';
export const theadClass = 'border-b border-line bg-alt';
export const rowClass = 'transition-colors hover:bg-ink/[0.03]';
export const tdClass = 'px-4 py-3.5 align-middle first:pl-5 last:pr-5';

/** Button row at the bottom of a dialog form. Stacks (primary on top) on phones. */
export const dialogFooterClass = 'flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end';

/** Small round avatar with initials (no images in the admin). */
export function Initials({ name, className }: { name: string; className?: string }) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  return (
    <span
      aria-hidden
      className={cx('grid size-8 shrink-0 place-items-center rounded-full bg-ink/[0.06] text-xs font-medium text-ink-soft', className)}
    >
      {letters || '?'}
    </span>
  );
}

/** Confirm dialog with an optional free-text reason (stored in the public history). */
export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  danger,
  withReason,
  reasonLabel = 'Alasan',
  reasonHint,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  withReason?: boolean;
  reasonLabel?: string;
  reasonHint?: ReactNode;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onClose={onClose} title={title} description={description}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await onConfirm(reason.trim());
            setReason('');
          } finally {
            setBusy(false);
          }
        }}
        className="space-y-5"
      >
        {withReason && (
          <Field label={reasonLabel} hint={reasonHint} optional htmlFor="confirm-reason">
            <Textarea id="confirm-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        )}
        <div className={cx('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', withReason && 'border-t border-line pt-4')}>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" variant={danger ? 'danger' : 'primary'} loading={busy}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export const hoursLabel = (h: number | null) => {
  if (h === null) return '—';
  if (h < 1) return '< 1 jam';
  if (h < 48) return `${h} jam`;
  return `${Math.floor(h / 24)} hari`;
};

/** Splits plain text into paragraphs on blank lines. */
export const paragraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
