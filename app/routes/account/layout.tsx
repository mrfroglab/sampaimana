import { NavLink, Outlet } from 'react-router';
import { Bell, Eye, FilePen, Settings } from 'lucide-react';
import type { Route } from './+types/layout';
import { seo } from '~/lib/seo';
import { cx, ROLE_LABEL } from '~/lib/format';
import { requireUser, useSession } from '~/lib/session';
import { PageHeader, PageSkeleton } from '~/components/ui';

export const meta: Route.MetaFunction = () => seo({ title: 'Akun saya', noindex: true });

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  return { user: await requireUser(request) };
}

export function HydrateFallback() {
  return <PageSkeleton />;
}

const TABS = [
  { to: '/akun', label: 'Diikuti', icon: Eye, end: true },
  { to: '/akun/notifikasi', label: 'Notifikasi', icon: Bell },
  { to: '/akun/kontribusi', label: 'Kontribusi', icon: FilePen },
  { to: '/akun/pengaturan', label: 'Pengaturan', icon: Settings },
];

export default function AccountLayout({ loaderData }: Route.ComponentProps) {
  const { user: live } = useSession();
  const user = live ?? loaderData.user;
  const initial = user.name.trim().charAt(0).toUpperCase() || '?';
  return (
    <div className="container-page pb-20">
      <PageHeader
        kicker={ROLE_LABEL[user.role]}
        title={
          <span className="flex min-w-0 items-center gap-3 sm:gap-4">
            <span
              className="grid size-10 shrink-0 place-items-center rounded-full bg-iron text-base font-semibold text-[#fafafa] sm:size-12 sm:text-lg"
              aria-hidden
            >
              {initial}
            </span>
            <span className="min-w-0 truncate">{user.name}</span>
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
        <nav aria-label="Akun" className="-mx-4 min-w-0 sm:mx-0">
          <ul className="flex gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:px-0 lg:sticky lg:top-24 lg:flex-col lg:overflow-visible lg:pb-0">
            {TABS.map((t) => (
              <li key={t.to} className="shrink-0">
                <NavLink
                  to={t.to}
                  end={t.end}
                  className={({ isActive }) =>
                    cx(
                      'flex h-9 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 text-sm transition-colors [&_svg]:size-4 [&_svg]:shrink-0',
                      isActive ? 'bg-ink/[0.06] font-medium text-ink' : 'text-muted hover:bg-ink/[0.04] hover:text-ink',
                    )
                  }
                >
                  <t.icon aria-hidden />
                  {t.label}
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
