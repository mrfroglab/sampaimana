import { Link } from 'react-router';
import { ArrowUpRight, Clock, Gavel, Users } from 'lucide-react';
import { StatusRail } from './StatusRail';
import { CategoryTag, RelTime } from './ui';
import { STATUS_LABEL, cx, daysBetween, fmtDuration } from '~/lib/format';
import type { CaseListItem } from '~/lib/types';

export function CaseCard({ item, className }: { item: CaseListItem; className?: string }) {
  const decided = item.currentStatus === 'PUTUSAN';
  const running = item.activeStage && !decided ? daysBetween(item.activeStage.startedAt) : null;
  const overdue = Boolean(item.activeStage?.dueAt && new Date(item.activeStage.dueAt) < new Date() && !decided);
  return (
    <article className={cx('card card-hover group relative flex min-w-0 flex-col p-6 sm:p-7', className)}>
      <div className="flex min-w-0 items-center justify-between gap-3">
        <CategoryTag name={item.category.name} />
        <span className="truncate font-mono text-[11px] text-muted" title={item.caseNumber}>
          {item.caseNumber}
        </span>
      </div>
      <h3 className="mt-4 text-lg font-semibold leading-snug text-ink">
        <Link to={`/kasus/${item.slug}`} className="after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none sm:after:rounded-4xl">
          {item.title}
        </Link>
      </h3>
      {item.summary && <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">{item.summary}</p>}

      <div className="mt-auto pt-6">
        <StatusRail status={item.currentStatus} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line pt-4 text-xs text-muted">
        {running !== null ? (
          <span className={cx('inline-flex items-center gap-1.5', overdue && 'font-medium text-ember-ink')}>
            <Clock className="size-3.5" />
            {fmtDuration(running)} di {STATUS_LABEL[item.currentStatus].toLowerCase()}
            {overdue && ' · lewat tenggat'}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 font-medium text-ink">
            <Gavel className="size-3.5" /> Telah diputus
          </span>
        )}
        {item.followerCount > 0 && (
          <span className="inline-flex items-center gap-1 num">
            <Users className="size-3.5" /> {item.followerCount}
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1">
          <RelTime date={item.lastActivityAt} />
          <ArrowUpRight className="size-3.5 -translate-x-0.5 opacity-0 transition-[opacity,transform] group-hover:translate-x-0 group-hover:opacity-100" />
        </span>
      </div>
    </article>
  );
}
