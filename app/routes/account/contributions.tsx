import { Link } from 'react-router';
import { Paperclip, Plus } from 'lucide-react';
import type { Route } from './+types/contributions';
import { STATUS_LABEL, fmtDateTime, hostOf } from '~/lib/format';
import { api, requireUser } from '~/lib/session';
import type { Contribution } from '~/lib/types';
import { Badge, EmptyState, LinkButton, PageSkeleton } from '~/components/ui';

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  await requireUser(request);
  const res = await api.get<Contribution[]>('/api/me/contributions');
  return { items: res.data, stats: res.stats as { PENDING: number; APPROVED: number; REJECTED: number; acceptanceRate: number | null } };
}

export function HydrateFallback() {
  return <PageSkeleton />;
}

const STATUS = {
  PENDING: { label: 'Menunggu', tone: 'warn' },
  APPROVED: { label: 'Diterima', tone: 'ok' },
  REJECTED: { label: 'Ditolak', tone: 'danger' },
} as const;

export default function MyContributions({ loaderData }: Route.ComponentProps) {
  const { items, stats } = loaderData;
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <dl className="flex gap-8">
          {(
            [
              ['Menunggu', stats.PENDING],
              ['Diterima', stats.APPROVED],
              ['Ditolak', stats.REJECTED],
              ['Tingkat diterima', stats.acceptanceRate == null ? '—' : `${stats.acceptanceRate}%`],
            ] as const
          ).map(([k, v]) => (
            <div key={k}>
              <dt className="kicker">{k}</dt>
              <dd className="mt-1 font-serif text-3xl text-ink num">{v}</dd>
            </div>
          ))}
        </dl>
        <LinkButton to="/kontribusi/baru" variant="accent">
          <Plus className="size-4" /> Kirim kontribusi
        </LinkButton>
      </div>

      <div className="mt-8">
        {items.length === 0 ? (
          <EmptyState title="Belum ada kontribusi">
            Tahu perkembangan sebuah kasus? Kirim kabar beserta buktinya. Redaksi akan memverifikasi dan memasukkannya ke linimasa.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {items.map((c) => {
              const s = STATUS[c.status];
              return (
                <li key={c.id} className="py-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge tone={s.tone}>{s.label}</Badge>
                    <span className="font-mono text-[11px] text-muted">{fmtDateTime(c.createdAt)}</span>
                    {c.proposedStage && <span className="text-xs text-muted">usulan tahap: {STATUS_LABEL[c.proposedStage]}</span>}
                  </div>
                  <Link to={`/kasus/${c.case.slug}`} className="link mt-2 block font-serif text-[1.15rem] text-ink">
                    {c.case.title}
                  </Link>
                  <p className="mt-2 whitespace-pre-line text-[14.5px] leading-relaxed text-ink-soft">{c.description}</p>
                  {(c.proofLinks.length > 0 || c.proofFiles.length > 0) && (
                    <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                      {c.proofLinks.map((l) => (
                        <a key={l} href={l} target="_blank" rel="noopener noreferrer nofollow" className="link">
                          {hostOf(l)}
                        </a>
                      ))}
                      {c.proofFiles.map((f) => (
                        <span key={f.fileName} className="inline-flex items-center gap-1">
                          <Paperclip className="size-3" /> {f.fileName}
                        </span>
                      ))}
                    </p>
                  )}
                  {c.status === 'REJECTED' && c.rejectionReason && (
                    <p className="mt-3 border-l-2 border-danger bg-danger-wash/50 px-3 py-2 text-sm text-ink-soft">
                      <span className="font-medium text-danger">Catatan redaksi:</span> {c.rejectionReason}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
