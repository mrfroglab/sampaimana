import { Link } from 'react-router';
import { FilePen, Link2, Paperclip, Plus } from 'lucide-react';
import type { Route } from './+types/contributions';
import { STATUS_LABEL, fmtDateTime, hostOf } from '~/lib/format';
import { api, requireUser } from '~/lib/session';
import type { Contribution } from '~/lib/types';
import { Alert, Badge, Card, CardHeader, EmptyState, LinkButton, PageSkeleton, StatBlock } from '~/components/ui';

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  await requireUser(request);
  const res = await api.get<Contribution[]>('/api/me/contributions');
  return { items: res.data, stats: res.stats as { PENDING: number; APPROVED: number; REJECTED: number; acceptanceRate: number | null } };
}

export function HydrateFallback() {
  return <PageSkeleton />;
}

const STATUS = {
  PENDING: { label: 'Menunggu', tone: 'neutral' },
  APPROVED: { label: 'Diterima', tone: 'ink' },
  REJECTED: { label: 'Ditolak', tone: 'danger' },
} as const;

export default function MyContributions({ loaderData }: Route.ComponentProps) {
  const { items, stats } = loaderData;
  const cta = (
    <LinkButton to="/kontribusi/baru" size="sm">
      <Plus /> Kirim kontribusi
    </LinkButton>
  );
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {(
          [
            ['Menunggu', stats.PENDING],
            ['Diterima', stats.APPROVED],
            ['Ditolak', stats.REJECTED],
            ['Tingkat diterima', stats.acceptanceRate == null ? '—' : `${stats.acceptanceRate}%`],
          ] as const
        ).map(([k, v]) => (
          <StatBlock key={k} label={k} value={v} className="card p-5" />
        ))}
      </dl>

      {items.length === 0 ? (
        <EmptyState icon={<FilePen />} title="Belum ada kontribusi" action={cta}>
          Tahu perkembangan sebuah kasus? Kirim kabar beserta buktinya. Redaksi akan memverifikasi dan memasukkannya ke linimasa.
        </EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <CardHeader title="Riwayat kiriman" description={`${items.length} kontribusi`} action={cta} />
          <ul className="divide-y divide-line">
            {items.map((c) => {
              const s = STATUS[c.status];
              return (
                <li key={c.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Badge tone={s.tone}>{s.label}</Badge>
                    <span className="text-xs text-muted num">{fmtDateTime(c.createdAt)}</span>
                    {c.proposedStage && <span className="text-xs text-muted">usulan tahap: {STATUS_LABEL[c.proposedStage]}</span>}
                  </div>
                  <Link
                    to={`/kasus/${c.case.slug}`}
                    className="mt-2 block text-[15px] font-semibold leading-snug text-ink hover:underline hover:decoration-line-strong hover:underline-offset-[3px]"
                  >
                    {c.case.title}
                  </Link>
                  <p className="mt-1.5 whitespace-pre-line break-words text-sm leading-relaxed text-ink-soft">{c.description}</p>
                  {(c.proofLinks.length > 0 || c.proofFiles.length > 0) && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {c.proofLinks.map((l) => (
                        <a
                          key={l}
                          href={l}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="inline-flex h-6 max-w-full items-center gap-1 rounded-lg border border-line px-2 text-xs text-ink-soft transition-colors hover:bg-ink/[0.06] hover:text-ink"
                        >
                          <Link2 className="size-3 shrink-0" aria-hidden />
                          <span className="truncate">{hostOf(l)}</span>
                        </a>
                      ))}
                      {c.proofFiles.map((f) => (
                        <span
                          key={f.fileName}
                          className="inline-flex h-6 max-w-full items-center gap-1 rounded-lg bg-ink/[0.05] px-2 text-xs text-ink-soft"
                        >
                          <Paperclip className="size-3 shrink-0" aria-hidden />
                          <span className="truncate">{f.fileName}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {c.status === 'REJECTED' && c.rejectionReason && (
                    <div className="mt-3">
                      <Alert tone="danger" title="Catatan redaksi">
                        {c.rejectionReason}
                      </Alert>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
