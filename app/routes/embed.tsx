import { data, isRouteErrorResponse } from 'react-router';
import { Clock, Gavel } from 'lucide-react';
import type { Route } from './+types/embed';
import { ApiError, publicGet } from '~/lib/api';
import { SITE_URL, seo } from '~/lib/seo';
import { STATUS_LABEL, cx, fmtShort } from '~/lib/format';
import type { CaseDetail } from '~/lib/types';
import { StatusRail } from '~/components/StatusRail';
import { CategoryTag, RelTime } from '~/components/ui';
import { EmbedError, EmbedFooter, EmbedFrame } from '~/components/embed';

export async function loader({ params }: Route.LoaderArgs) {
  try {
    const res = await publicGet<CaseDetail>(`/api/cases/${encodeURIComponent(params.slug)}`);
    return { item: res.data };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) throw data('Kasus tidak ditemukan', { status: 404 });
    throw err;
  }
}

// Never indexed; the canonical points at the real case page.
export const meta: Route.MetaFunction = ({ data: d, params }) =>
  seo({
    title: d ? `Status kasus: ${d.item.title}` : 'Status kasus',
    description: d ? `${STATUS_LABEL[d.item.currentStatus]} · ${d.item.title}` : undefined,
    path: `/kasus/${params.slug}`,
    noindex: true,
  });

export default function EmbedPage({ loaderData }: Route.ComponentProps) {
  const { item } = loaderData;
  const href = `${SITE_URL}/kasus/${encodeURIComponent(item.slug)}`;
  const decided = item.currentStatus === 'PUTUSAN';
  const stagesDesc = [...item.stages].sort((a, b) => +new Date(b.startedAt) - +new Date(a.startedAt));
  const active = item.stages.find((s) => s.status === 'AKTIF' && s.stageType === item.currentStatus) ?? stagesDesc[0];
  const overdue = Boolean(!decided && active?.dueAt && new Date(active.dueAt) < new Date());

  return (
    <EmbedFrame slug={item.slug}>
      <article className="card relative flex min-w-0 flex-col p-4 min-[360px]:p-5">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <CategoryTag name={item.category.name} />
          <span className="truncate font-mono text-[11px] text-muted" title={item.caseNumber}>
            {item.caseNumber}
          </span>
        </div>

        <h1 className="mt-3 line-clamp-2 text-[17px] font-semibold leading-snug tracking-[-0.015em] text-ink [overflow-wrap:anywhere]">
          <a
            href={href}
            target="_blank"
            rel="noopener"
            title={item.title}
            className="after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-focus"
          >
            {item.title}
          </a>
        </h1>

        <div className="pb-1 pt-5">
          <div className="min-[360px]:hidden">
            <StatusRail status={item.currentStatus} stages={item.stages} />
          </div>
          <div className="max-[359px]:hidden">
            <StatusRail status={item.currentStatus} stages={item.stages} size="lg" />
          </div>
        </div>

        <p className={cx('mt-3 flex items-start gap-1.5 text-[13px] leading-snug', overdue ? 'font-medium text-ember' : 'text-muted')}>
          {decided ? <Gavel className="mt-px size-3.5 shrink-0" aria-hidden /> : <Clock className="mt-px size-3.5 shrink-0" aria-hidden />}
          <span className="min-w-0">
            {decided ? 'Diputus' : STATUS_LABEL[item.currentStatus]}
            {active && (decided ? ` pada ${fmtShort(active.startedAt)}` : ` sejak ${fmtShort(active.startedAt)}`)}
            {overdue && ` · lewat tenggat ${fmtShort(active!.dueAt)}`}
            <span className={cx(overdue ? 'text-ember' : 'text-muted')}>
              {' · diperbarui '}
              <RelTime date={item.lastActivityAt} />
            </span>
          </span>
        </p>

        <p className="mt-3 text-[11px] leading-snug text-muted">
          Setiap orang yang disebut dianggap tidak bersalah sampai ada putusan berkekuatan hukum tetap.
        </p>

        <EmbedFooter href={href} />
      </article>
    </EmbedFrame>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <EmbedError status={isRouteErrorResponse(error) ? error.status : 500} />;
}
