import { RelTime } from './ui';
import { cx, fmtDateTime } from '~/lib/format';
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
    <ol>
      {revisions.map((r) => {
        const isCorrection = r.action === 'CORRECTION';
        const isStatus = r.action === 'STATUS_CHANGED';
        return (
          <li key={r.id} className="group grid grid-cols-[8px_minmax(0,1fr)] gap-x-3.5 pb-5 last:pb-0">
            <div className="relative flex justify-center" aria-hidden>
              <span
                className={cx(
                  'relative z-10 mt-[6px] size-2 rounded-full',
                  isCorrection ? 'bg-ember' : isStatus ? 'bg-ink' : 'bg-line-strong',
                )}
              />
              <span className="absolute -bottom-1 top-[20px] w-px bg-line group-last:hidden" />
            </div>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] text-muted">
                <span className={cx('font-medium', isCorrection ? 'text-ember' : 'text-ink')}>
                  {ACTION_LABEL[r.action] ?? r.action}
                </span>
                <span aria-hidden className="text-faint">
                  ·
                </span>
                <RelTime date={r.createdAt} />
                <span className="max-sm:hidden">({fmtDateTime(r.createdAt)})</span>
                {r.user?.name && (
                  <>
                    <span aria-hidden className="text-faint">
                      ·
                    </span>
                    <span className="min-w-0 truncate">oleh {r.user.name}</span>
                  </>
                )}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink [overflow-wrap:anywhere]">{r.summary}</p>
              {r.reason &&
                (isCorrection ? (
                  <p className="mt-2 rounded-lg bg-ember-wash px-3 py-2 text-[13px] leading-relaxed text-ink-soft">{r.reason}</p>
                ) : (
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">Alasan: {r.reason}</p>
                ))}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
