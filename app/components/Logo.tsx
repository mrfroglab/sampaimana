import { cx } from '~/lib/format';

/** Question-mark app tile: ink square, paper glyph, ember dot (the one red mark). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cx('shrink-0', className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--ink)" />
      <path
        d="M11.4 12.1c0-2.8 2.1-4.7 4.9-4.7 2.7 0 4.7 1.7 4.7 4.1 0 2-1.2 3-2.6 4-1.3.9-1.8 1.6-1.8 3.1v.7h-2v-.9c0-2 .8-3.1 2.1-4.1 1.1-.8 1.6-1.6 1.6-2.7 0-1.3-.9-2.2-2.2-2.2-1.4 0-2.4 1-2.4 2.4 0 .3 0 .5.1.7-.3.4-.9.7-1.4.7-.6 0-1-.4-1-1.1Z"
        fill="var(--on-ink)"
      />
      <circle cx="15.6" cy="23.2" r="1.8" fill="var(--ember)" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-2', className)}>
      <LogoMark className="size-7" />
      <span className="text-[15px] font-semibold leading-none tracking-[-0.03em] text-ink">Sampai Mana</span>
    </span>
  );
}
