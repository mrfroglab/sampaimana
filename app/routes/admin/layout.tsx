import { NavLink, Outlet } from 'react-router';
import {
  ExternalLink,
  FileText,
  FolderTree,
  Gauge,
  Inbox,
  ListChecks,
  MessageSquareWarning,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Route } from './+types/layout';
import { Badge, PageSkeleton } from '~/components/ui';
import { Initials, type Overview } from '~/components/admin/shared';
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

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  count: number;
  end?: boolean;
  group: 'Redaksi' | 'Antrean' | 'Administrasi';
}

function CountBadge({ count, active }: { count: number; active?: boolean }) {
  if (count <= 0) return null;
  return (
    <span
      className={cx(
        'ml-auto grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-medium leading-none num',
        active ? 'bg-ink text-on-ink' : 'bg-ink/[0.08] text-ink',
      )}
      aria-label={`${count} menunggu`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

export default function AdminLayout({ loaderData }: Route.ComponentProps) {
  const { user, overview } = loaderData;
  const superAdmin = user.role === 'SUPER_ADMIN';

  // Flat list (mobile tab order); the desktop sidebar groups it.
  const flat: NavItem[] = [
    { to: '/redaksi', label: 'Ringkasan', icon: Gauge, end: true, count: 0, group: 'Redaksi' },
    { to: '/redaksi/kasus', label: 'Kasus', icon: FileText, count: 0, group: 'Redaksi' },
    { to: '/redaksi/moderasi', label: 'Moderasi', icon: Inbox, count: overview.pendingContributions, group: 'Antrean' },
    { to: '/redaksi/koreksi', label: 'Koreksi', icon: MessageSquareWarning, count: overview.openCorrections, group: 'Antrean' },
    { to: '/redaksi/kategori', label: 'Kategori', icon: FolderTree, count: 0, group: 'Redaksi' },
    ...(superAdmin ? [{ to: '/redaksi/pengguna', label: 'Pengguna', icon: Users, count: 0, group: 'Administrasi' as const }] : []),
    { to: '/redaksi/log', label: 'Log audit', icon: ListChecks, count: 0, group: 'Administrasi' },
  ];
  const groups = (['Redaksi', 'Antrean', 'Administrasi'] as const).map((label) => ({
    label,
    items: flat.filter((i) => i.group === label),
  }));

  return (
    <div className="lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      {/* Desktop sidebar */}
      <aside className="hidden border-r border-line bg-alt lg:block">
        <div className="sticky top-16 flex h-[calc(100dvh-4rem)] flex-col overflow-y-auto px-3 py-5">
          <div className="flex items-center gap-3 px-2.5 pb-5">
            <Initials name={user.name} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">Meja redaksi</p>
              <p className="truncate text-[13px] text-muted">{user.name}</p>
            </div>
          </div>

          <nav aria-label="Navigasi redaksi" className="flex-1 space-y-5">
            {groups.map((g) =>
              g.items.length === 0 ? null : (
                <div key={g.label}>
                  <p className="kicker px-3 pb-1.5">{g.label}</p>
                  <ul className="space-y-0.5">
                    {g.items.map(({ to, label, icon: Icon, count, end }) => (
                      <li key={to}>
                        <NavLink
                          to={to}
                          end={end}
                          className={({ isActive }) =>
                            cx(
                              'flex h-9 items-center gap-2.5 rounded-full px-3 text-sm transition-colors',
                              isActive ? 'bg-ink/[0.06] font-medium text-ink' : 'text-muted hover:bg-ink/[0.04] hover:text-ink',
                            )
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <Icon className={cx('size-4 shrink-0', isActive ? 'text-ink' : 'text-muted')} aria-hidden />
                              <span className="truncate">{label}</span>
                              <CountBadge count={count} active={isActive} />
                            </>
                          )}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ),
            )}
          </nav>

          <div className="mt-6 space-y-3 border-t border-line px-2.5 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={user.role === 'VIEWER' ? 'outline' : 'ink'}>{ROLE_LABEL[user.role]}</Badge>
              {user.role === 'VIEWER' && <span className="text-xs text-muted">Akses baca saja</span>}
            </div>
            <a
              href="/api/docs"
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-ink"
            >
              Dokumentasi API <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Mobile / tablet: role line + scrollable pill tabs */}
        <div className="sticky top-16 z-30 border-b border-line bg-alt/95 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 pt-3 sm:px-6">
            <p className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-semibold text-ink">Meja redaksi</span>
              <Badge tone={user.role === 'VIEWER' ? 'outline' : 'ink'}>{ROLE_LABEL[user.role]}</Badge>
            </p>
            <a
              href="/api/docs"
              target="_blank"
              rel="noopener"
              className="hidden shrink-0 items-center gap-1 text-xs text-muted hover:text-ink sm:inline-flex"
            >
              Dokumentasi API <ExternalLink className="size-3" aria-hidden />
            </a>
          </div>
          <nav aria-label="Navigasi redaksi" className="overflow-x-auto [scrollbar-width:none]">
            <ul className="flex w-max gap-1 px-4 py-2.5 sm:px-6">
              {flat.map(({ to, label, icon: Icon, count, end }) => (
                <li key={to} className="shrink-0">
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      cx(
                        'flex h-8 items-center gap-2 whitespace-nowrap rounded-full px-3 text-[13px] transition-colors',
                        isActive ? 'bg-ink/[0.06] font-medium text-ink' : 'text-muted hover:bg-ink/[0.04] hover:text-ink',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className="size-4 shrink-0" aria-hidden />
                        <span>{label}</span>
                        <CountBadge count={count} active={isActive} />
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mx-auto w-full max-w-[1120px] px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
