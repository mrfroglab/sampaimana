import { Check } from 'lucide-react';
import { STATUS_LABEL, STATUS_ORDER, cx, fmtShort } from '~/lib/format';
import type { CaseStatus, Stage } from '~/lib/types';

/**
 * The signature element: five stations on a line, like a transit map.
 * Passed stations are solid ink, the current one is a hollow ring with the
 * single red "live" dot (unless the case is decided, then it is a solid check),
 * skipped ones (e.g. civil suits without penyidikan) are dashed, future ones
 * are hollow hairline rings.
 *
 * Stations sit at 0%, 25% … 100% of the width so the line spans edge to edge.
 * The small variant only labels the current station.
 */
export function StatusRail({
  status,
  stages,
  size = 'sm',
  className,
}: {
  status: CaseStatus;
  stages?: Pick<Stage, 'stageType' | 'startedAt' | 'status'>[];
  size?: 'sm' | 'lg';
  className?: string;
}) {
  const currentIndex = STATUS_ORDER.indexOf(status);
  const visited = new Set(stages?.map((s) => s.stageType) ?? STATUS_ORDER.slice(0, currentIndex + 1));
  const firstStart = (type: CaseStatus) =>
    stages
      ?.filter((s) => s.stageType === type)
      .sort((a, b) => +new Date(a.startedAt) - +new Date(b.startedAt))[0]?.startedAt;
  const done = status === 'PUTUSAN';
  const lg = size === 'lg';
  const dot = lg ? 22 : 12;
  const last = STATUS_ORDER.length - 1;
  const progress = (currentIndex / last) * 100;

  const align = (i: number) => (i === 0 ? 'left-0 text-left' : i === last ? 'right-0 text-right' : '-translate-x-1/2 text-center');
  const posStyle = (i: number) => (i === 0 || i === last ? undefined : { left: `${(i / last) * 100}%` });

  return (
    <div className={cx('w-full', className)} role="img" aria-label={`Tahap saat ini: ${STATUS_LABEL[status]} (${currentIndex + 1} dari 5)`}>
      {/* track */}
      <div className="relative" style={{ height: dot, marginInline: dot / 2 }}>
        <span aria-hidden className={cx('absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-full bg-ink/10', lg ? 'h-[3px]' : 'h-[2px]')} />
        <span
          aria-hidden
          className={cx('absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-ink', lg ? 'h-[3px]' : 'h-[2px]')}
          style={{ width: `${progress}%` }}
        />
        {STATUS_ORDER.map((s, i) => {
          const isCurrent = i === currentIndex;
          const isPast = i < currentIndex;
          const skipped = isPast && !visited.has(s);
          return (
            <span
              key={s}
              aria-hidden
              className={cx(
                'absolute top-0 z-10 grid -translate-x-1/2 place-items-center rounded-full',
                lg ? 'border-2' : 'border-[1.5px]',
                isCurrent && !done && 'border-ink bg-raised',
                isCurrent && done && 'border-ink bg-ink',
                isPast && !skipped && 'border-ink bg-ink',
                skipped && 'border-dashed border-line-strong bg-raised',
                !isPast && !isCurrent && 'border-line-strong bg-raised',
              )}
              style={{ left: `${(i / last) * 100}%`, width: dot, height: dot }}
            >
              {isCurrent && !done && (
                <span className={cx('animate-pulse-dot rounded-full bg-ember', lg ? 'size-2' : 'size-1')} />
              )}
              {lg && isCurrent && done && <Check className="size-3 text-on-ink" strokeWidth={3} />}
              {lg && isPast && !skipped && <span className="size-1.5 rounded-full bg-on-ink" />}
            </span>
          );
        })}
      </div>

      {/* labels */}
      <div className={cx('relative', lg ? 'mt-3 h-10 max-sm:h-5' : 'mt-2 h-4')}>
        {STATUS_ORDER.map((s, i) => {
          const isCurrent = i === currentIndex;
          const isPast = i < currentIndex;
          const skipped = isPast && !visited.has(s);
          if (!lg && !isCurrent) return null;
          return (
            <span key={s} className={cx('absolute top-0 whitespace-nowrap', align(i), lg && !isCurrent && 'max-sm:hidden')} style={posStyle(i)}>
              <span
                className={cx(
                  'block leading-tight',
                  lg ? 'text-[13px] max-sm:text-xs' : 'text-xs',
                  isCurrent ? 'font-semibold text-ink' : isPast ? 'font-medium text-ink-soft' : 'text-muted',
                  skipped && 'font-normal text-muted line-through decoration-line-strong',
                )}
              >
                {STATUS_LABEL[s]}
                {!lg && <span className="ml-1.5 font-normal text-muted num">{i + 1}/5</span>}
              </span>
              {lg && (
                <span className="mt-1 block font-mono text-[11px] text-muted num max-sm:hidden">
                  {skipped ? 'tidak tercatat' : visited.has(s) && i <= currentIndex ? fmtShort(firstStart(s)) : '—'}
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
