import { Link } from 'react-router';
import { PageHeader } from '~/components/ui';

/** Shared layout for /privasi and /ketentuan. `html` comes from docs/legal/*.md via app/lib/legal.server.ts. */
export function LegalPage({ title, html, kicker }: { title: string; html: string; kicker: string }) {
  return (
    <div className="container-page max-w-4xl pb-20">
      <PageHeader kicker={kicker} title={title} />
      <article className="card p-6 sm:p-10">
        <div className="prose-legal" dangerouslySetInnerHTML={{ __html: html }} />
      </article>
      <p className="mt-6 px-2 text-sm text-muted">
        Lihat juga{' '}
        <Link to="/privasi" className="link">
          Kebijakan Privasi
        </Link>
        ,{' '}
        <Link to="/ketentuan" className="link">
          Syarat &amp; Ketentuan
        </Link>
        , dan{' '}
        <Link to="/tentang" className="link">
          Metodologi &amp; kebijakan redaksi
        </Link>
        .
      </p>
    </div>
  );
}
