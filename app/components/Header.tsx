import { useEffect, useRef, useState } from 'react';
import { Form, Link, NavLink, useLocation, useNavigate } from 'react-router';
import { Bell, LogOut, Menu, Moon, Search, Settings, Shield, Sun, User as UserIcon, X } from 'lucide-react';
import { Wordmark } from './Logo';
import { buttonClass } from './ui';
import { cx, isStaff, ROLE_LABEL } from '~/lib/format';
import { api, logout, useSession } from '~/lib/session';

const NAV = [
  { to: '/kasus', label: 'Kasus' },
  { to: '/statistik', label: 'Statistik' },
  { to: '/data', label: 'Data terbuka' },
  { to: '/tentang', label: 'Metodologi' },
];

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);
  useEffect(() => {
    setTheme((document.documentElement.dataset.theme as 'light' | 'dark') || 'light');
  }, []);
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('sm-theme', next);
    } catch {
      /* private mode */
    }
    setTheme(next);
  };
  return { theme, toggle };
}

function useUnread(enabled: boolean) {
  const [unread, setUnread] = useState(0);
  const location = useLocation();
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    api
      .get<unknown[]>('/api/me/notifications', { limit: 1 })
      .then((r) => alive && setUnread(r.meta?.unread ?? 0))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [enabled, location.pathname]);
  return unread;
}

function AccountMenu() {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  if (!user) return null;
  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="grid size-9 place-items-center rounded-full border border-line-strong bg-raised font-mono text-xs font-semibold text-ink hover:border-ink"
      >
        {initials}
        <span className="sr-only">Menu akun</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-50 w-64 animate-rise border border-line-strong bg-raised py-1 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.35)]"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-medium text-ink">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
            <p className="kicker mt-2">{ROLE_LABEL[user.role]}</p>
          </div>
          <MenuLink to="/akun" icon={UserIcon}>
            Kasus yang saya ikuti
          </MenuLink>
          <MenuLink to="/akun/notifikasi" icon={Bell}>
            Notifikasi
          </MenuLink>
          <MenuLink to="/akun/kontribusi" icon={Shield}>
            Kontribusi saya
          </MenuLink>
          <MenuLink to="/akun/pengaturan" icon={Settings}>
            Pengaturan
          </MenuLink>
          {isStaff(user.role) && (
            <MenuLink to="/redaksi" icon={Shield}>
              Meja redaksi
            </MenuLink>
          )}
          <button
            role="menuitem"
            onClick={async () => {
              await logout();
              navigate('/');
            }}
            className="flex w-full items-center gap-3 border-t border-line px-4 py-2.5 text-left text-sm text-ink-soft hover:bg-sunk hover:text-ink"
          >
            <LogOut className="size-4" /> Keluar
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink({ to, icon: Icon, children }: { to: string; icon: typeof Bell; children: React.ReactNode }) {
  return (
    <Link role="menuitem" to={to} className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink-soft hover:bg-sunk hover:text-ink">
      <Icon className="size-4" /> {children}
    </Link>
  );
}

export function Header() {
  const { status, user } = useSession();
  const { theme, toggle } = useTheme();
  const unread = useUnread(status === 'authenticated');
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/92 backdrop-blur supports-[backdrop-filter]:bg-paper/80">
      <div className="container-page flex h-16 items-center gap-3 sm:gap-6">
        <Link to="/" aria-label="Sampai Mana — beranda" className="shrink-0">
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Utama">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cx(
                  'relative px-3 py-2 text-[14px] transition-colors',
                  isActive ? 'text-ink after:absolute after:inset-x-3 after:-bottom-[13px] after:h-[2px] after:bg-accent' : 'text-muted hover:text-ink',
                )
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-0.5 sm:gap-1.5">
          <Form action="/kasus" className="relative hidden lg:block" role="search">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <input
              name="q"
              type="search"
              placeholder="Cari kasus, nomor perkara, nama…"
              aria-label="Cari kasus"
              className="h-9 w-64 rounded-[3px] border border-line bg-raised pl-9 pr-3 text-sm placeholder:text-faint focus:w-80 focus:border-ink focus:outline-none transition-[width,border-color]"
            />
          </Form>
          <Link to="/kasus" className="grid size-9 place-items-center rounded text-ink-soft hover:bg-sunk lg:hidden" aria-label="Cari kasus">
            <Search className="size-[18px]" />
          </Link>
          <button
            onClick={toggle}
            className="grid size-9 place-items-center rounded text-ink-soft hover:bg-sunk hover:text-ink"
            aria-label={theme === 'dark' ? 'Gunakan tema terang' : 'Gunakan tema gelap'}
          >
            {theme === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
          </button>

          {status === 'loading' && <span className="ml-1 hidden h-9 w-[84px] animate-pulse rounded-[3px] bg-sunk sm:block" aria-hidden />}
          {status === 'anonymous' && (
            <Link to={`/masuk?next=${encodeURIComponent(location.pathname)}`} className={buttonClass('outline', 'sm', 'ml-1 hidden sm:inline-flex')}>
              Masuk
            </Link>
          )}
          {status === 'authenticated' && user && (
            <>
              <Link to="/akun/notifikasi" className="relative grid size-9 place-items-center rounded text-ink-soft hover:bg-sunk hover:text-ink" aria-label={`Notifikasi${unread ? `, ${unread} belum dibaca` : ''}`}>
                <Bell className="size-[18px]" />
                {unread > 0 && (
                  <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-accent px-1 font-mono text-[9px] font-semibold leading-4 text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Link>
              <AccountMenu />
            </>
          )}
          <button
            className="grid size-9 place-items-center rounded text-ink-soft hover:bg-sunk md:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-line bg-paper md:hidden">
          <nav className="container-page flex flex-col py-2" aria-label="Utama (seluler)">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) => cx('border-b border-line py-3 font-serif text-xl', isActive ? 'text-accent-ink' : 'text-ink')}
              >
                {n.label}
              </NavLink>
            ))}
            {status === 'anonymous' && (
              <div className="flex gap-2 py-4">
                <Link to="/masuk" className={buttonClass('primary', 'md', 'flex-1')}>
                  Masuk
                </Link>
                <Link to="/daftar" className={buttonClass('outline', 'md', 'flex-1')}>
                  Daftar
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
