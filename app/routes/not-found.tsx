import { data } from 'react-router';
import { ArrowLeft, Search } from 'lucide-react';
import { LinkButton } from '~/components/ui';

export function loader() {
  throw data('Halaman tidak ditemukan', { status: 404 });
}

/** Centered 404, rendered inside the normal header/footer shell. */
function NotFoundView() {
  return (
    <div className="container-page grid min-h-[calc(100dvh-16rem)] place-items-center py-16 sm:py-24">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <span className="font-mono text-[13px] text-muted">404</span>
        <div className="mt-4 grid size-12 place-items-center rounded-full bg-ink/[0.06] text-muted">
          <Search className="size-5" aria-hidden />
        </div>
        <h1 className="mt-5 text-heading font-semibold text-ink">Halaman tidak ditemukan</h1>
        <p className="mt-3 text-body-lg text-muted">
          Kasus atau halaman yang Anda cari tidak ada, sudah diarsipkan, atau alamatnya berubah.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <LinkButton to="/" variant="primary">
            <ArrowLeft /> Ke beranda
          </LinkButton>
          <LinkButton to="/kasus" variant="outline">
            Telusuri kasus
          </LinkButton>
        </div>
      </div>
    </div>
  );
}

// The loader always throws a 404, so the route boundary is what actually renders.
export function ErrorBoundary() {
  return <NotFoundView />;
}

export default function NotFound() {
  return <NotFoundView />;
}
