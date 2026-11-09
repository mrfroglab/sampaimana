import { NavLink, Outlet } from 'react-router';
import type { Route } from './+types/layout';
import { seo } from '~/lib/seo';
import { cx, ROLE_LABEL } from '~/lib/format';
import { requireUser, useSession } from '~/lib/session';
import { PageSkeleton } from '~/components/ui';

export const meta: Route.MetaFunction = () => seo({ title: 'Akun saya', noindex: true });

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  return { user: await requireUser(request) };
}

export function HydrateFallback() {
  return <PageSkeleton />;
}

const TABS = [
  { to: '/akun', label: 'Diikuti', end: true },
  { to: '/akun/notifikasi', label: 'Notifikasi' },
  { to: '/akun/kontribusi', label: 'Kontribusi' },
  { to: '/akun/pengaturan', label: 'Pengaturan' },
];

export default function AccountLayout({ loaderData }: Route.ComponentProps) {
  const { user: live } = useSession();
  const user = live ?? loaderData.user;
  return (
    <div className="container-page pt-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">{ROLE_LABEL[user.role]}</p>
          <h1 className="mt-2 font-serif text-headline text-ink">{user.name}</h1>
        </div>
      </header>
      <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-line" aria-label="Akun">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              cx(
                '-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-[14px] transition-colors',
                isActive ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink',
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <div className="py-8">
        <Outlet />
      </div>
    </div>
  );
}
