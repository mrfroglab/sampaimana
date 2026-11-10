import { useEffect } from 'react';
import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useNavigation,
} from 'react-router';
import type { Route } from './+types/root';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ToastProvider, buttonClass } from './components/ui';
import { EmbedError } from './components/embed';
import { ensureSession } from './lib/session';
import { cx } from './lib/format';
// Fonts are self-hosted (no request to Google): fewer third parties, and embeds stay cookie- and tracker-free.
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/dm-mono/400.css';
import '@fontsource/dm-mono/500.css';
import './app.css';

export const links: Route.LinksFunction = () => [
  { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
  { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
  { rel: 'manifest', href: '/manifest.webmanifest' },
];

// Applied before paint so the page never flashes the wrong theme.
// On /embed/* a valid ?theme=light|dark wins (never persisted); auto/missing follows the
// system and ignores the site preference, because the widget lives on someone else's page.
const themeScript = `(function(){var d=document.documentElement;try{var sys=function(){return matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'};var t=null;if(location.pathname.indexOf('/embed/')===0){var q=new URLSearchParams(location.search).get('theme');t=q==='light'||q==='dark'?q:sys()}else{t=localStorage.getItem('sm-theme')||sys()}d.dataset.theme=t}catch(e){d.dataset.theme='light'}})()`;

/** The embeddable widget (/embed/*) renders bare: no header, footer or session. */
const useIsEmbed = () => useLocation().pathname.startsWith('/embed/');

export function Layout({ children }: { children: React.ReactNode }) {
  const embed = useIsEmbed();
  return (
    <html lang="id" data-theme="light" data-embed={embed ? '' : undefined} className={cx(embed && 'bg-transparent')} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#f4f4f5" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#09090b" media="(prefers-color-scheme: dark)" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Meta />
        <Links />
      </head>
      <body className={cx(embed && 'min-h-0 overflow-x-hidden bg-transparent')}>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function NavigationBar() {
  const navigation = useNavigation();
  const busy = navigation.state !== 'idle';
  return (
    <div
      aria-hidden
      className={`fixed inset-x-0 top-0 z-50 h-[2px] origin-left bg-ink transition-transform duration-500 ${busy ? 'scale-x-75' : 'scale-x-0 opacity-0'}`}
    />
  );
}

export default function App() {
  const embed = useIsEmbed();
  // The newsroom is a full-height tool screen: no marketing footer under it.
  const tool = useLocation().pathname.startsWith('/redaksi');
  useEffect(() => {
    // Anonymous embeds never touch the auth/refresh endpoint.
    if (!embed) void ensureSession();
  }, [embed]);
  if (embed) return <Outlet />;
  return (
    <ToastProvider>
      <NavigationBar />
      <a href="#konten" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-xl focus:bg-ink focus:px-4 focus:py-2 focus:text-on-ink">
        Lewati ke konten
      </a>
      <Header />
      <main id="konten">
        <Outlet />
      </main>
      {!tool && <Footer />}
    </ToastProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const embed = useIsEmbed();
  let status = 500;
  let title = 'Ada yang tidak beres';
  let message = 'Terjadi kesalahan saat memuat halaman. Coba muat ulang beberapa saat lagi.';
  if (isRouteErrorResponse(error)) {
    status = error.status;
    if (error.status === 404) {
      title = 'Halaman tidak ditemukan';
      message = 'Kasus atau halaman yang Anda cari tidak ada, sudah diarsipkan, atau alamatnya berubah.';
    } else if (typeof error.data === 'string' && error.data) {
      message = error.data;
    }
  } else if (error instanceof Error && import.meta.env.DEV) {
    message = error.message;
  }
  if (embed) return <EmbedError status={status} />;
  return (
    <>
      <Header />
      <main id="konten" className="container-page grid min-h-[60dvh] place-items-center py-20">
        <div className="flex max-w-lg flex-col items-center text-center">
          <span className="rounded-lg border border-line bg-raised px-2.5 py-1 font-mono text-xs text-muted">
            Galat {status}
          </span>
          <h1 className="mt-5 text-heading font-semibold text-ink sm:text-heading-lg">{title}</h1>
          <p className="mt-3 text-body-lg text-muted">{message}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <Link to="/" className={buttonClass('primary')}>
              Ke beranda
            </Link>
            <Link to="/kasus" className={buttonClass('outline')}>
              Telusuri kasus
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
