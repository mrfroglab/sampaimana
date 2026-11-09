import type { ReactNode } from 'react';
import { StatusRail } from './StatusRail';

export function AuthShell({ kicker, title, children, aside }: { kicker: string; title: string; children: ReactNode; aside: ReactNode }) {
  return (
    <div className="container-page grid min-h-[calc(100dvh-4rem)] gap-12 py-12 lg:grid-cols-[1fr_440px] lg:items-center lg:gap-20">
      <div className="hidden lg:block">
        <p className="kicker">Sampai Mana</p>
        <div className="mt-4 max-w-md font-serif text-[2.1rem] leading-[1.2] text-ink">{aside}</div>
        <StatusRail status="PERSIDANGAN" size="lg" className="mt-12 max-w-lg" />
      </div>
      <div className="w-full max-w-md animate-rise justify-self-center border border-line-strong bg-raised p-6 sm:p-8 lg:justify-self-end">
        <p className="kicker text-accent-ink">{kicker}</p>
        <h1 className="mt-2 font-serif text-[2rem] leading-tight text-ink">{title}</h1>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
