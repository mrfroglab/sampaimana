import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { Bell, LogOut, Menu, Moon, Newspaper, Search, Send, Settings, Star, Sun, X } from 'lucide-react';
import { Wordmark } from './Logo';
import { CommandMenu, openCommandMenu } from './CommandMenu';
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

function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return scrolled;
}

function useMac() {
  const [mac, setMac] = useState(false);
  useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)), []);
  return mac;
}

const iconBtn = buttonClass('ghost', 'icon', 'text-muted hover:text-ink');

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
        className="grid size-9 place-items-center rounded-full bg-iron text-xs font-semibold text-[#fafafa] transition-opacity hover:opacity-85"
      >
        {initials}
        <span className="sr-only">Menu akun</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 w-64 animate-rise overflow-hidden rounded-2xl border border-line bg-raised p-1.5 shadow-pop"
        >
          <div className="px-3 pb-3 pt-2">
            <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
            <p className="truncate text-[13px] text-muted">{user.email}</p>
            <span className="mt-2 inline-flex h-6 items-center rounded-lg border border-line px-2 text-[11px] font-medium text-ink-soft">
              {ROLE_LABEL[user.role]}
            </span>
          </div>
          <div className="border-t border-line pt-1.5">
            <MenuLink to="/akun" icon={Star}>
              Kasus yang saya ikuti
            </MenuLink>
            <MenuLink to="/akun/notifikasi" icon={Bell}>
              Notifikasi
            </MenuLink>
            <MenuLink to="/akun/kontribusi" icon={Send}>
              Kontribusi saya
            </MenuLink>
            <MenuLink to="/akun/pengaturan" icon={Settings}>
              Pengaturan
            </MenuLink>
            {isStaff(user.role) && (
              <MenuLink to="/redaksi" icon={Newspaper}>
                Meja redaksi
              </MenuLink>
            )}
          </div>
          <div className="mt-1.5 border-t border-line pt-1.5">
            <button
              role="menuitem"
              onClick={async () => {
                await logout();
                navigate('/');
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-ink-soft hover:bg-ink/[0.05] hover:text-ink"
            >
              <LogOut className="size-4 text-muted" /> Keluar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({ to, icon: Icon, children }: { to: string; icon: typeof Bell; children: React.ReactNode }) {
  return (
    <Link role="menuitem" to={to} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-ink/[0.05] hover:text-ink">
      <Icon className="size-4 text-muted" /> {children}
    </Link>
  );
}

export function Header() {
  const { status, user } = useSession();
  const { theme, toggle } = useTheme();
  const unread = useUnread(status === 'authenticated');
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const mac = useMac();
  const scrolled = useScrolled();
  useEffect(() => setMobileOpen(false), [location.pathname]);
  const isAdmin = location.pathname.startsWith('/redaksi');

  return (
    <header
      className={cx(
        'sticky top-0 z-40 border-b bg-paper/80 backdrop-blur-xl transition-colors supports-[backdrop-filter]:bg-paper/70',
        scrolled || isAdmin || mobileOpen ? 'border-line' : 'border-transparent',
      )}
    >
      <div className={cx('mx-auto flex h-16 w-full items-center gap-2 px-4 sm:gap-4 sm:px-6 lg:px-8', isAdmin ? 'max-w-none' : 'max-w-[1200px]')}>
        <Link to="/" aria-label="Sampai Mana — beranda" className="shrink-0 rounded-lg">
          <Wordmark />
        </Link>
        <nav className="ml-4 hidden items-center gap-1 md:flex xl:absolute xl:left-1/2 xl:ml-0 xl:-translate-x-1/2" aria-label="Utama">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cx(
                  'rounded-full px-3.5 py-2 text-sm transition-colors',
                  isActive ? 'bg-raised font-medium text-ink shadow-pill ring-1 ring-line' : 'text-muted hover:text-ink',
                )
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          <button
            onClick={openCommandMenu}
            className="hidden h-9 w-44 items-center gap-2 rounded-xl border border-line bg-raised pl-3 pr-1.5 text-sm text-muted transition-colors hover:border-line-strong xl:flex"
          >
            <Search className="size-4" />
            <span className="flex-1 text-left">Cari…</span>
            <span className="flex items-center gap-0.5">
              <kbd className="kbd" suppressHydrationWarning>{mac ? '⌘' : 'Ctrl'}</kbd>
              <kbd className="kbd">K</kbd>
            </span>
          </button>
          <button onClick={openCommandMenu} className={cx(iconBtn, 'xl:hidden')} aria-label="Cari kasus">
            <Search className="size-[18px]" />
          </button>
          <button onClick={toggle} className={iconBtn} aria-label={theme === 'dark' ? 'Gunakan tema terang' : 'Gunakan tema gelap'}>
            {theme === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
          </button>

          {status === 'loading' && <span className="ml-1 hidden h-9 w-[72px] animate-pulse rounded-full bg-ink/[0.05] sm:block" aria-hidden />}
          {status === 'anonymous' && (
            <>
              <Link to={`/masuk?next=${encodeURIComponent(location.pathname)}`} className={buttonClass('ghost', 'sm', 'ml-1 max-sm:hidden')}>
                Masuk
              </Link>
              <Link to="/daftar" className={buttonClass('primary', 'md', 'h-9 max-sm:hidden', true)}>
                Daftar
              </Link>
            </>
          )}
          {status === 'authenticated' && user && (
            <>
              <Link to="/akun/notifikasi" className={cx(iconBtn, 'relative')} aria-label={`Notifikasi${unread ? `, ${unread} belum dibaca` : ''}`}>
                <Bell className="size-[18px]" />
                {unread > 0 && (
                  <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-ember px-1 text-[10px] font-semibold leading-none text-on-ember ring-2 ring-paper num">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Link>
              <span className="ml-1">
                <AccountMenu />
              </span>
            </>
          )}
          <button className={cx(iconBtn, 'md:hidden')} onClick={() => setMobileOpen((o) => !o)} aria-expanded={mobileOpen} aria-label="Menu">
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="animate-fade border-t border-line bg-paper md:hidden">
          <nav className="container-page flex flex-col gap-0.5 py-3" aria-label="Utama (seluler)">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  cx('rounded-xl px-3.5 py-3 text-base', isActive ? 'bg-raised font-medium text-ink ring-1 ring-line' : 'text-ink-soft')
                }
              >
                {n.label}
              </NavLink>
            ))}
            {status === 'anonymous' && (
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-line pt-3">
                <Link to="/masuk" className={buttonClass('outline', 'md')}>
                  Masuk
                </Link>
                <Link to="/daftar" className={buttonClass('primary', 'md')}>
                  Daftar
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
      <CommandMenu />
    </header>
  );
}
