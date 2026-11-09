import { useState } from 'react';
import { Link } from 'react-router';
import { BellOff } from 'lucide-react';
import type { Route } from './+types/following';
import { STATUS_LABEL } from '~/lib/format';
import { api, requireUser } from '~/lib/session';
import type { CaseStatus, Category } from '~/lib/types';
import { StatusRail } from '~/components/StatusRail';
import { Button, CategoryTag, EmptyState, LinkButton, PageSkeleton, RelTime, useToast } from '~/components/ui';

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
      <EmptyState title="Belum mengikuti kasus apa pun" action={<LinkButton to="/kasus">Telusuri kasus</LinkButton>}>
        Tekan “Ikuti kasus” di halaman kasus. Kami akan memberi tahu Anda setiap kali statusnya berubah atau redaksi menerbitkan
        penjelasan baru.
      </EmptyState>
    );
  }

  return (
    <ul className="divide-y divide-line border-y border-line">
      {items.map((c) => {
        const updatedSinceFollow = new Date(c.lastActivityAt) > new Date(c.followedAt);
        return (
          <li key={c.id} className="grid gap-4 py-5 md:grid-cols-[1fr_320px_auto] md:items-center">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <CategoryTag name={c.category.name} color={c.category.color} />
                {updatedSinceFollow && <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-accent-ink">ada pembaruan</span>}
              </div>
              <Link to={`/kasus/${c.slug}`} className="link mt-1.5 block font-serif text-[1.25rem] leading-snug text-ink">
                {c.title}
              </Link>
              <p className="mt-1 text-xs text-muted">
                {STATUS_LABEL[c.currentStatus]} · diperbarui <RelTime date={c.lastActivityAt} />
              </p>
            </div>
            <StatusRail status={c.currentStatus} />
            <Button variant="quiet" size="sm" onClick={() => unfollow(c.slug)} className="justify-self-start md:justify-self-end">
              <BellOff className="size-4" /> Berhenti
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
