import { useEffect } from 'react';
import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useNavigation,
} from 'react-router';
import type { Route } from './+types/root';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ToastProvider, buttonClass } from './components/ui';
import { ensureSession } from './lib/session';
import './app.css';

export const links: Route.LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap',
  },
  { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
  { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
  { rel: 'manifest', href: '/manifest.webmanifest' },
];

// Applied before paint so the page never flashes the wrong theme.
const themeScript = `(function(){try{var t=localStorage.getItem('sm-theme');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='light'}})()`;

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" data-theme="light" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#f5f5f5" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Meta />
        <Links />
      </head>
      <body>
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
  useEffect(() => {
    void ensureSession();
  }, []);
  return (
    <ToastProvider>
      <NavigationBar />
      <a href="#konten" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-on-ink">
        Lewati ke konten
      </a>
      <Header />
      <main id="konten">
        <Outlet />
      </main>
      <Footer />
    </ToastProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
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
  return (
    <>
      <Header />
      <main id="konten" className="container-page grid min-h-[60dvh] place-items-center py-20">
        <div className="flex max-w-lg flex-col items-center text-center">
          <span className="rounded-full border border-line bg-raised px-3 py-1 font-mono text-xs text-muted shadow-card">
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
