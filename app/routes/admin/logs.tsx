import { useSearchParams } from 'react-router';
import type { Route } from './+types/logs';
import { Badge, EmptyState, PageSkeleton, Pagination } from '~/components/ui';
import { AdminPageHeader } from '~/components/admin/shared';
import { ROLE_LABEL, fmtDateTime } from '~/lib/format';
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
        <EmptyState title="Belum ada aktivitas" />
      ) : (
        <ol className="divide-y divide-line border-y border-line">
          {logs.map((l) => (
            <li key={l.id} className="grid gap-1 py-3 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-4">
              <time dateTime={l.createdAt} className="font-mono text-[11.5px] text-muted num">
                {fmtDateTime(l.createdAt)}
              </time>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge tone={tone(l.action)}>{l.action.replace(/_/g, ' ')}</Badge>
                  <span className="text-ink-soft">{l.entity}</span>
                  {l.entityId && <span className="truncate font-mono text-[11px] text-faint">{l.entityId}</span>}
                </p>
                <p className="mt-1 text-[13px] text-muted">
                  {l.user ? (
                    <>
                      {l.user.name} <span className="text-faint">· {ROLE_LABEL[l.user.role]}</span>
                    </>
                  ) : (
                    'Sistem / akun terhapus'
                  )}
                </p>
                {l.metadata && Object.keys(l.metadata).length > 0 && (
                  <details className="mt-1.5 group">
                    <summary className="cursor-pointer select-none text-xs text-muted hover:text-ink">Metadata</summary>
                    <pre className="mt-2 max-h-72 overflow-auto border border-line bg-sunk p-3 font-mono text-[11.5px] leading-relaxed text-ink-soft">
                      {JSON.stringify(l.metadata, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
      <Pagination page={meta.page} totalPages={meta.totalPages} hrefFor={hrefFor} />
    </div>
  );
}
