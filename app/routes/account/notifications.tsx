import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Bell, CheckCheck } from 'lucide-react';
import type { Route } from './+types/notifications';
import { cx } from '~/lib/format';
import { api, requireUser } from '~/lib/session';
import type { Notification, PageMeta } from '~/lib/types';
import { Badge, Button, Card, CardHeader, EmptyState, PageSkeleton, Pagination, RelTime } from '~/components/ui';

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  await requireUser(request);
  const page = Number(new URL(request.url).searchParams.get('page')) || 1;
  const res = await api.get<Notification[]>('/api/me/notifications', { page, limit: 20 });
  return { items: res.data, meta: res.meta as PageMeta & { unread: number } };
}

export function HydrateFallback() {
  return <PageSkeleton />;
}

const TYPE_LABEL: Record<string, string> = {
  STATUS_CHANGE: 'Status berubah',
  STAGE_UPDATE: 'Tahapan',
  ARTICLE_PUBLISHED: 'Penjelasan baru',
  CONTRIBUTION_REVIEWED: 'Kontribusi',
};

export default function Notifications({ loaderData }: Route.ComponentProps) {
  const [items, setItems] = useState(loaderData.items);
  const [unread, setUnread] = useState(loaderData.meta.unread);
  const [params] = useSearchParams();

  const markAll = async () => {
    await api.post('/api/me/notifications/read', {});
    setItems((cur) => cur.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    setUnread(0);
  };
  const markOne = (id: string) => {
    const target = items.find((n) => n.id === id);
    if (!target || target.readAt) return;
    void api.post('/api/me/notifications/read', { ids: [id] });
    setItems((cur) => cur.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnread((u) => Math.max(0, u - 1));
  };

  if (items.length === 0) {
    return (
      <EmptyState icon={<Bell />} title="Belum ada notifikasi">
        Notifikasi muncul ketika kasus yang Anda ikuti berubah status, ada tahapan baru, atau kontribusi Anda ditinjau.
      </EmptyState>
    );
  }

  return (
    <div>
      <Card className="overflow-hidden">
        <CardHeader
          title="Notifikasi"
          description={
            <>
              <span className="font-medium text-ink num">{unread}</span> belum dibaca
            </>
          }
          action={
            <Button variant="outline" size="sm" onClick={markAll} disabled={!unread} className="shrink-0">
              <CheckCheck /> <span className="max-sm:sr-only">Tandai semua dibaca</span>
            </Button>
          }
        />
        <ul className="divide-y divide-line">
          {items.map((n) => {
            const body = (
              <div className="flex gap-3">
                <span className="flex h-5 w-2 shrink-0 items-center" aria-hidden={!!n.readAt}>
                  {!n.readAt && <span className="size-2 rounded-full bg-ink" role="img" aria-label="Belum dibaca" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                    <Badge tone="neutral">{TYPE_LABEL[n.type] ?? n.type}</Badge>
                    <RelTime date={n.createdAt} />
                  </p>
                  <p className={cx('mt-1.5 text-sm leading-snug', n.readAt ? 'text-ink-soft' : 'font-semibold text-ink')}>{n.title}</p>
                  <p className="mt-0.5 text-[13px] text-muted">{n.body}</p>
                </div>
              </div>
            );
            return (
              <li key={n.id}>
                {n.link ? (
                  <Link to={n.link} onClick={() => markOne(n.id)} className="block px-5 py-4 transition-colors hover:bg-ink/[0.03]">
                    {body}
                  </Link>
                ) : (
                  <div className="px-5 py-4" onClick={() => markOne(n.id)}>
                    {body}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
      <Pagination
        page={loaderData.meta.page}
        totalPages={loaderData.meta.totalPages}
        hrefFor={(p) => {
          const next = new URLSearchParams(params);
          next.set('page', String(p));
          return `/akun/notifikasi?${next}`;
        }}
      />
    </div>
  );
}
