import { Link } from 'react-router';
import { ArrowUpRight, Clock, Users } from 'lucide-react';
import { StatusRail } from './StatusRail';
import { CategoryTag, RelTime } from './ui';
import { STATUS_LABEL, cx, daysBetween, fmtDuration } from '~/lib/format';
import type { CaseListItem } from '~/lib/types';

export function CaseCard({ item, className }: { item: CaseListItem; className?: string }) {
  const running = item.activeStage && item.currentStatus !== 'PUTUSAN' ? daysBetween(item.activeStage.startedAt) : null;
  const overdue = item.activeStage?.dueAt && new Date(item.activeStage.dueAt) < new Date() && item.currentStatus !== 'PUTUSAN';
  return (
    <article className={cx('group relative flex flex-col border-t border-ink pt-4', className)}>
      <div className="flex items-center justify-between gap-3">
        <CategoryTag name={item.category.name} color={item.category.color} />
        <span className="truncate font-mono text-[11px] text-faint" title={item.caseNumber}>
          {item.caseNumber}
        </span>
      </div>
      <h3 className="mt-3 font-serif text-[1.42rem] leading-[1.15] tracking-[-0.01em] text-ink">
        <Link to={`/kasus/${item.slug}`} className="decoration-accent decoration-2 underline-offset-4 after:absolute after:inset-0 group-hover:underline">
          {item.title}
        </Link>
      </h3>
      {item.summary && <p className="mt-2 line-clamp-2 text-[14.5px] leading-relaxed text-muted">{item.summary}</p>}

      <StatusRail status={item.currentStatus} className="mt-5" />

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted">
        {running !== null ? (
          <span className={cx('inline-flex items-center gap-1.5', overdue && 'text-warn')}>
            <Clock className="size-3.5" />
            {fmtDuration(running)} di tahap {STATUS_LABEL[item.currentStatus].toLowerCase()}
            {overdue && ' · lewat tenggat'}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-ink-soft">Telah diputus</span>
        )}
        {item.followerCount > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5" /> {item.followerCount}
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1">
          Diperbarui <RelTime date={item.lastActivityAt} />
          <ArrowUpRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
        </span>
      </div>
    </article>
  );
}
