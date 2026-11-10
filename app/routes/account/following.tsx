import { useState } from 'react';
import { Link } from 'react-router';
import { BellOff, Eye } from 'lucide-react';
import type { Route } from './+types/following';
import { STATUS_LABEL } from '~/lib/format';
import { api, requireUser } from '~/lib/session';
import type { CaseStatus, Category } from '~/lib/types';
import { StatusRail } from '~/components/StatusRail';
import { Badge, Button, Card, CardHeader, CategoryTag, EmptyState, LinkButton, PageSkeleton, RelTime, useToast } from '~/components/ui';

interface Followed {
  id: string;
  slug: string;
  title: string;
  caseNumber: string;
  currentStatus: CaseStatus;
  lastActivityAt: string;
  followedAt: string;
  category: Pick<Category, 'name' | 'color' | 'slug'>;
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  await requireUser(request);
  const res = await api.get<Followed[]>('/api/me/follows');
  return { items: res.data };
}

export function HydrateFallback() {
  return <PageSkeleton />;
}

export default function Following({ loaderData }: Route.ComponentProps) {
  const [items, setItems] = useState(loaderData.items);
  const toast = useToast();

  const unfollow = async (slug: string) => {
    await api.del(`/api/cases/${slug}/follow`);
    setItems((cur) => cur.filter((c) => c.slug !== slug));
    toast('Berhenti mengikuti.');
  };

  if (items.length === 0) {
    return (
      <EmptyState icon={<Eye />} title="Belum mengikuti kasus apa pun" action={<LinkButton to="/kasus">Telusuri kasus</LinkButton>}>
        Tekan “Ikuti kasus” di halaman kasus. Kami akan memberi tahu Anda setiap kali statusnya berubah atau redaksi menerbitkan
        penjelasan baru.
      </EmptyState>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader title="Kasus yang Anda ikuti" description={`${items.length} kasus`} />
      <ul className="divide-y divide-line">
        {items.map((c) => {
          const updatedSinceFollow = new Date(c.lastActivityAt) > new Date(c.followedAt);
          return (
            <li key={c.id} className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(0,1fr)_260px_auto] md:items-center md:gap-6">
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <CategoryTag name={c.category.name} color={c.category.color} />
                  {updatedSinceFollow && <Badge tone="ink">Ada pembaruan</Badge>}
                </div>
                <Link
                  to={`/kasus/${c.slug}`}
                  className="mt-1.5 block text-[15px] font-semibold leading-snug tracking-[-0.01em] text-ink hover:underline hover:decoration-line-strong hover:underline-offset-[3px]"
                >
                  {c.title}
                </Link>
                <p className="mt-1 text-[13px] text-muted">
                  {STATUS_LABEL[c.currentStatus]} · diperbarui <RelTime date={c.lastActivityAt} />
                </p>
              </div>
              <StatusRail status={c.currentStatus} className="min-w-0" />
              <Button variant="ghost" size="sm" onClick={() => unfollow(c.slug)} className="justify-self-start text-muted md:justify-self-end">
                <BellOff /> Berhenti
              </Button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
