import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CheckCheck } from 'lucide-react';
import type { Route } from './+types/notifications';
import { cx } from '~/lib/format';
import { api, requireUser } from '~/lib/session';
import type { Notification, PageMeta } from '~/lib/types';
import { Button, EmptyState, PageSkeleton, Pagination, RelTime } from '~/components/ui';

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
      <EmptyState title="Belum ada notifikasi">
        Notifikasi muncul ketika kasus yang Anda ikuti berubah status, ada tahapan baru, atau kontribusi Anda ditinjau.
      </EmptyState>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">
          <span className="font-medium text-ink num">{unread}</span> belum dibaca
        </p>
        <Button variant="outline" size="sm" onClick={markAll} disabled={!unread}>
          <CheckCheck className="size-4" /> Tandai semua dibaca
        </Button>
      </div>
      <ul className="divide-y divide-line border-y border-line">
        {items.map((n) => {
          const body = (
            <>
              <p className="flex items-center gap-2 text-[11px] text-muted">
                {!n.readAt && <span className="size-2 rounded-full bg-accent" aria-label="Belum dibaca" />}
                <span className="font-mono uppercase tracking-[0.08em]">{TYPE_LABEL[n.type] ?? n.type}</span>
                <span aria-hidden>·</span>
                <RelTime date={n.createdAt} />
              </p>
              <p className={cx('mt-1 font-serif text-[1.1rem] leading-snug', n.readAt ? 'text-ink-soft' : 'text-ink')}>{n.title}</p>
              <p className="mt-1 text-sm text-muted">{n.body}</p>
            </>
          );
          return (
            <li key={n.id} className={cx(!n.readAt && 'bg-raised')}>
              {n.link ? (
                <Link to={n.link} onClick={() => markOne(n.id)} className="block px-4 py-4 hover:bg-sunk">
                  {body}
                </Link>
              ) : (
                <div className="px-4 py-4" onClick={() => markOne(n.id)}>
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-8">
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
    </div>
  );
}
