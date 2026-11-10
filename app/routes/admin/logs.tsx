import { useSearchParams } from 'react-router';
import { ChevronRight, ListChecks } from 'lucide-react';
import type { Route } from './+types/logs';
import { Badge, EmptyState, PageSkeleton, Pagination } from '~/components/ui';
import { AdminPageHeader, rowClass, theadClass } from '~/components/admin/shared';
import { ROLE_LABEL, cx, fmtDateTime } from '~/lib/format';
import { seo } from '~/lib/seo';
import { api, requireUser } from '~/lib/session';
import type { Role } from '~/lib/types';

export const meta: Route.MetaFunction = () => seo({ title: 'Log audit', noindex: true });

interface LogItem {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { name: string; role: Role } | null;
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  await requireUser(request, ['SUPER_ADMIN', 'EDITOR', 'VIEWER']);
  const sp = new URL(request.url).searchParams;
  const res = await api.get<LogItem[]>('/api/admin/activity-logs', { page: sp.get('page') || 1, limit: 50 });
  return { logs: res.data, meta: res.meta! };
}

export function HydrateFallback() {
  return <PageSkeleton />;
}

const tone = (action: string) =>
  /DELETE|ARCHIVE|REJECT|BAN/.test(action) ? 'danger' : /CREATE|APPROVED|RESTORE/.test(action) ? 'ok' : 'neutral';

export default function AdminLogs({ loaderData }: Route.ComponentProps) {
  const { logs, meta } = loaderData;
  const [params] = useSearchParams();
  const hrefFor = (page: number) => {
    const next = new URLSearchParams(params);
    if (page > 1) next.set('page', String(page));
    else next.delete('page');
    const qs = next.toString();
    return qs ? `?${qs}` : '/redaksi/log';
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker={`${meta.total} entri`}
        title="Log audit"
        description="Catatan internal setiap tindakan redaksi. Data sensitif seperti kata sandi disamarkan. Berbeda dengan riwayat kasus, log ini tidak tampil publik."
      />
      {logs.length === 0 ? (
        <EmptyState title="Belum ada aktivitas" icon={<ListChecks />} />
      ) : (
        <div className="card overflow-hidden">
          <div className={cx(theadClass, 'hidden grid-cols-[170px_minmax(0,1fr)_200px] gap-4 px-5 py-2.5 md:grid')} aria-hidden>
            <span className="kicker">Waktu</span>
            <span className="kicker">Tindakan</span>
            <span className="kicker">Oleh</span>
          </div>
          <ol className="divide-y divide-line">
            {logs.map((l) => (
              <li
                key={l.id}
                className={cx(rowClass, 'grid grid-cols-1 gap-x-4 gap-y-1.5 px-4 py-3.5 sm:px-5 md:grid-cols-[170px_minmax(0,1fr)_200px] md:items-start')}
              >
                <time dateTime={l.createdAt} className="font-mono text-xs text-muted num md:pt-0.5">
                  {fmtDateTime(l.createdAt)}
                </time>
                <div className="min-w-0">
                  <p className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
                    <Badge tone={tone(l.action)}>{l.action.replace(/_/g, ' ')}</Badge>
                    <span className="text-ink-soft">{l.entity}</span>
                    {l.entityId && <span className="min-w-0 truncate font-mono text-xs text-muted">{l.entityId}</span>}
                  </p>
                  {l.metadata && Object.keys(l.metadata).length > 0 && (
                    <details className="group mt-2">
                      <summary className="inline-flex cursor-pointer select-none items-center gap-1 rounded-full text-xs font-medium text-muted transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
                        <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" aria-hidden />
                        Metadata
                      </summary>
                      <pre className="tile mt-2 max-h-72 overflow-auto p-3 font-mono text-xs leading-relaxed text-ink-soft">
                        {JSON.stringify(l.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
                <p className="min-w-0 text-[13px] text-ink-soft">
                  {l.user ? (
                    <>
                      <span className="font-medium text-ink">{l.user.name}</span>{' '}
                      <span className="text-muted">· {ROLE_LABEL[l.user.role]}</span>
                    </>
                  ) : (
                    <span className="text-muted">Sistem / akun terhapus</span>
                  )}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}
      <Pagination page={meta.page} totalPages={meta.totalPages} hrefFor={hrefFor} />
    </div>
  );
}
