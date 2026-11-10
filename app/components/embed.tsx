import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { SITE_URL } from '~/lib/seo';
import { Wordmark } from './Logo';

/**
 * Pieces shared by the framed widget (/embed/kasus/:slug) and its error state.
 * The widget reports its own height to the host page (see public embed script).
 */

/** Slug from the current /embed/kasus/:slug pathname ('' when not on an embed route). */
export const embedSlugFromPath = (pathname: string) => {
  const m = /^\/embed\/kasus\/([^/]+)/.exec(pathname);
  if (!m) return '';
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
};

/**
 * Wraps the card, and posts `{ type: 'sampaimana:height', slug, height }` to the parent window
 * on mount and whenever the content size changes. The height is not sensitive, so '*' is fine.
 */
export function EmbedFrame({ slug, children }: { slug: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined' || window.parent === window) return;
    let last = -1;
    const post = () => {
      const height = Math.ceil(el.getBoundingClientRect().height);
      if (height === last) return;
      last = height;
      window.parent.postMessage({ type: 'sampaimana:height', slug, height }, '*');
    };
    post();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', post);
      return () => window.removeEventListener('resize', post);
    }
    const ro = new ResizeObserver(post);
    ro.observe(el);
    return () => ro.disconnect();
  }, [slug]);
  // 3px gutter so the card's hairline and whisper shadow are never clipped by the iframe edge.
  return (
    <div ref={ref} className="w-full min-w-0 p-[3px]">
      {children}
    </div>
  );
}

/** Footer line of the widget: wordmark + link back to the site. */
export function EmbedFooter({ href }: { href?: string }) {
  return (
    <div className="mt-3.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-line pt-3">
      <span className="origin-left scale-90">
        <Wordmark />
      </span>
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener"
          className="relative z-10 text-xs font-medium text-ink underline decoration-line-strong decoration-1 underline-offset-[3px] transition-colors hover:decoration-ink"
        >
          Lihat selengkapnya di Sampai Mana ↗
        </a>
      )}
    </div>
  );
}

/** Minimal error card for the widget: no site header/footer. */
export function EmbedError({ status = 404 }: { status?: number }) {
  const { pathname } = useLocation();
  const slug = embedSlugFromPath(pathname);
  const notFound = status === 404;
  return (
    <EmbedFrame slug={slug}>
      <div className="card flex flex-col gap-1.5 p-5">
        <span className="font-mono text-[11px] text-muted">Galat {status}</span>
        <p className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
          {notFound ? 'Kasus tidak ditemukan' : 'Status kasus belum bisa dimuat'}
        </p>
        <p className="text-[13px] text-muted">
          {notFound ? 'Kasus ini tidak ada atau sudah diarsipkan.' : 'Terjadi kesalahan. Coba muat ulang beberapa saat lagi.'}
        </p>
        <EmbedFooter href={SITE_URL} />
      </div>
    </EmbedFrame>
  );
}
