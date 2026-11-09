import { cx } from '~/lib/format';

/** The question-mark seal from the original brand, redrawn as a crisp vector. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cx('shrink-0', className)} aria-hidden>
      <circle cx="16" cy="16" r="14.5" fill="var(--paper-raised)" stroke="var(--accent)" strokeWidth="2" />
      <path
        d="M11.6 12.2c0-2.7 2-4.5 4.7-4.5 2.6 0 4.5 1.6 4.5 3.9 0 1.9-1.1 2.9-2.5 3.9-1.3.9-1.8 1.6-1.8 3.1v.6h-1.7v-.8c0-1.9.7-3 2-4 1.1-.8 1.7-1.6 1.7-2.8 0-1.4-1-2.4-2.4-2.4-1.5 0-2.6 1.1-2.6 2.6 0 .3 0 .5.1.7-.3.4-.8.6-1.2.6-.5 0-.8-.3-.8-.9Z"
        fill="var(--accent)"
      />
      <circle cx="15.7" cy="22.9" r="1.45" fill="var(--accent)" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <LogoMark className="size-7 sm:size-8" />
      <span className="font-serif text-[1.25rem] font-semibold sm:text-[1.45rem] leading-none tracking-[-0.02em] text-ink">
        Sampai Mana<span className="text-accent">?</span>
      </span>
    </span>
  );
}
