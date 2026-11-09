import { RelTime } from './ui';
import { fmtDateTime } from '~/lib/format';
import type { Revision } from '~/lib/types';

export const ACTION_LABEL: Record<string, string> = {
  CASE_CREATED: 'Kasus dipantau',
  CASE_UPDATED: 'Data kasus',
  STATUS_CHANGED: 'Status',
  STAGE_ADDED: 'Tahapan',
  STAGE_UPDATED: 'Tahapan',
  STAGE_REMOVED: 'Tahapan',
  ARTICLE_PUBLISHED: 'Penjelasan',
  ARTICLE_UPDATED: 'Penjelasan',
  ARTICLE_REMOVED: 'Penjelasan',
  SOURCE_ADDED: 'Sumber',
  SOURCE_VERIFIED: 'Verifikasi',
  SOURCE_REMOVED: 'Sumber',
  CORRECTION: 'Koreksi',
  CONTRIBUTION_APPLIED: 'Kontribusi',
};

export function RevisionList({ revisions }: { revisions: Revision[] }) {
  if (revisions.length === 0) return <p className="text-sm text-muted">Belum ada perubahan tercatat.</p>;
  return (
    <ol className="relative">
      {revisions.map((r) => {
        const isCorrection = r.action === 'CORRECTION';
        const isStatus = r.action === 'STATUS_CHANGED';
        return (
          <li key={r.id} className="grid grid-cols-[96px_1fr] gap-4 border-t border-line py-3.5 first:border-t-0 sm:grid-cols-[132px_1fr]">
            <div className="text-[11px] leading-tight text-muted">
              <RelTime date={r.createdAt} className="block font-mono" />
              <span className="mt-1 block text-faint">{fmtDateTime(r.createdAt)}</span>
            </div>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2">
                <span
                  className={
                    isCorrection
                      ? 'font-mono text-[10.5px] uppercase tracking-[0.08em] text-warn'
                      : isStatus
                        ? 'font-mono text-[10.5px] uppercase tracking-[0.08em] text-accent-ink'
                        : 'font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted'
                  }
                >
                  {ACTION_LABEL[r.action] ?? r.action}
                </span>
                {r.user?.name && <span className="text-[11px] text-faint">oleh {r.user.name}</span>}
              </p>
              <p className="mt-1 text-[14.5px] leading-snug text-ink">{r.summary}</p>
              {r.reason && (
                <p
                  className={
                    isCorrection
                      ? 'mt-2 border-l-2 border-warn bg-warn-wash/60 px-3 py-2 text-sm text-ink-soft'
                      : 'mt-1.5 text-sm italic text-ink-soft'
                  }
                >
                  {isCorrection ? r.reason : `Alasan: ${r.reason}`}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
