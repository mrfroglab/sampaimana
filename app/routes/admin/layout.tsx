import { NavLink, Outlet } from 'react-router';
import { ExternalLink, FileText, FolderTree, Gauge, Inbox, ListChecks, MessageSquareWarning, Users } from 'lucide-react';
import type { Route } from './+types/layout';
import { Badge, PageSkeleton } from '~/components/ui';
import type { Overview } from '~/components/admin/shared';
import { ROLE_LABEL, cx } from '~/lib/format';
import { seo } from '~/lib/seo';
import { api, requireUser } from '~/lib/session';

export const meta: Route.MetaFunction = () => seo({ title: 'Meja redaksi', noindex: true });

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const user = await requireUser(request, ['SUPER_ADMIN', 'EDITOR', 'VIEWER']);
  const overview = await api.get<Overview>('/api/admin/overview');
  return { user, overview: overview.data };
}

export function HydrateFallback() {
  return <PageSkeleton />;
}

export default function AdminLayout({ loaderData }: Route.ComponentProps) {
  const { user, overview } = loaderData;
  const nav = [
    { to: '/redaksi', label: 'Ringkasan', icon: Gauge, end: true, count: 0 },
    { to: '/redaksi/kasus', label: 'Kasus', icon: FileText, count: 0 },
    { to: '/redaksi/moderasi', label: 'Moderasi', icon: Inbox, count: overview.pendingContributions },
    { to: '/redaksi/koreksi', label: 'Koreksi', icon: MessageSquareWarning, count: overview.openCorrections },
    { to: '/redaksi/kategori', label: 'Kategori', icon: FolderTree, count: 0 },
    ...(user.role === 'SUPER_ADMIN' ? [{ to: '/redaksi/pengguna', label: 'Pengguna', icon: Users, count: 0 }] : []),
    { to: '/redaksi/log', label: 'Log audit', icon: ListChecks, count: 0 },
  ];

  return (
    <div className="bg-paper">
      <div className="border-b border-line bg-sunk/60">
        <div className="container-page flex h-11 items-center justify-between gap-4">
          <p className="flex items-center gap-3">
            <span className="kicker text-ink">Meja redaksi</span>
            <Badge tone={user.role === 'VIEWER' ? 'neutral' : 'ink'}>{ROLE_LABEL[user.role]}</Badge>
            {user.role === 'VIEWER' && <span className="hidden text-xs text-muted sm:inline">Akses baca saja</span>}
          </p>
          <a
            href="/api/docs"
            target="_blank"
            rel="noopener"
            className="hidden items-center gap-1 text-xs text-muted hover:text-ink sm:inline-flex"
          >
            Dokumentasi API <ExternalLink className="size-3" />
          </a>
        </div>
      </div>

      <div className="container-page grid gap-6 py-6 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10 lg:py-10">
        <nav aria-label="Navigasi redaksi" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
          <ul className="flex gap-1 border-b border-line lg:sticky lg:top-24 lg:flex-col lg:gap-0.5 lg:border-b-0">
            {nav.map(({ to, label, icon: Icon, count, end }) => (
              <li key={to} className="shrink-0">
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cx(
                      'flex items-center gap-2.5 whitespace-nowrap px-3 py-2 text-sm transition-colors',
                      'max-lg:-mb-px max-lg:border-b-2 lg:rounded-[3px] lg:border-l-2',
                      isActive
                        ? 'border-ink text-ink lg:bg-raised'
                        : 'border-transparent text-muted hover:text-ink lg:hover:bg-raised/70',
                    )
                  }
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span>{label}</span>
                  {count > 0 && (
                    <span
                      className="ml-auto grid min-w-5 place-items-center rounded-full bg-accent px-1.5 font-mono text-[10px] font-semibold leading-5 text-white num"
                      aria-label={`${count} menunggu`}
                    >
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
