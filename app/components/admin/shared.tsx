import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Button, Dialog, Field, Textarea } from '~/components/ui';
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

export function AdminPageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {kicker && <p className="kicker">{kicker}</p>}
        <h1 className="mt-1 font-serif text-[2rem] leading-tight tracking-[-0.015em] text-ink">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

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
    <div role="tablist" aria-label={label} className="-mb-px flex gap-1 overflow-x-auto border-b border-line">
      {options.map((o) => {
        const active = o.value === value;
        const cls = cx(
          'relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-3 py-2.5 text-sm transition-colors',
          active ? 'text-ink after:absolute after:inset-x-2 after:-bottom-px after:h-[2px] after:bg-ink' : 'text-muted hover:text-ink',
        );
        const inner = (
          <>
            {o.label}
            {o.count !== undefined && (
              <span className={cx('font-mono text-[11px] num', active ? 'text-ink-soft' : 'text-faint')}>{o.count}</span>
            )}
          </>
        );
        return hrefFor ? (
          <Link key={o.value} role="tab" aria-selected={active} to={hrefFor(o.value)} className={cls}>
            {inner}
          </Link>
        ) : (
          <button key={o.value} role="tab" aria-selected={active} onClick={() => onChange?.(o.value)} className={cls}>
            {inner}
          </button>
        );
      })}
    </div>
  );
}

export function StatTile({
  label,
  value,
  note,
  tone = 'neutral',
  to,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: 'neutral' | 'warn' | 'danger' | 'ok';
  to?: string;
}) {
  const body = (
    <>
      <p className="kicker">{label}</p>
      <p
        className={cx(
          'mt-2 font-serif text-[2.4rem] leading-none num',
          tone === 'warn' ? 'text-warn' : tone === 'danger' ? 'text-danger' : tone === 'ok' ? 'text-ok' : 'text-ink',
        )}
      >
        {value}
      </p>
      {note && <p className="mt-2 text-[12.5px] text-muted">{note}</p>}
    </>
  );
  const cls = 'block border-t-2 border-ink bg-raised px-4 pb-4 pt-3';
  return to ? (
    <Link to={to} className={cx(cls, 'transition-colors hover:bg-sunk')}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
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
        <div className="flex justify-end gap-2">
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
