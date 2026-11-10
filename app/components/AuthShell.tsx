import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { StatusRail } from './StatusRail';
import { LogoMark } from './Logo';

/**
 * Centered auth card on a faint blueprint grid. On wide screens a quiet side
 * panel restates why an account is useful and shows the status rail.
 */
export function AuthShell({ kicker, title, children, aside }: { kicker: string; title: string; children: ReactNode; aside: ReactNode }) {
  return (
    <div className="relative isolate overflow-hidden">
      <div className="blueprint pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <div className="container-page grid min-h-[calc(100dvh-4rem)] items-center gap-12 py-10 sm:py-16 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-20">
        <div className="hidden min-w-0 lg:block">
          <p className="kicker">Sampai Mana</p>
          <div className="mt-4 max-w-md text-heading font-semibold text-ink">{aside}</div>
          <div className="card mt-10 max-w-lg px-6 pb-6 pt-5">
            <p className="text-[13px] text-muted">Setiap kasus, tahap demi tahap</p>
            <StatusRail status="PERSIDANGAN" size="lg" className="mt-5" />
          </div>
        </div>

        <div className="mx-auto w-full max-w-[400px] min-w-0 animate-rise lg:mx-0 lg:justify-self-end">
          <div className="card p-6 sm:p-8">
            <div className="flex flex-col items-center text-center">
              <Link to="/" aria-label="Sampai Mana, ke beranda" className="rounded-lg">
                <LogoMark className="size-10" />
              </Link>
              <p className="kicker mt-5">{kicker}</p>
              <h1 className="mt-1.5 text-heading-sm font-semibold text-ink">{title}</h1>
            </div>
            <div className="mt-7">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
