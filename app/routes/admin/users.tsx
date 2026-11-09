import { useState } from 'react';
import { Form, useRevalidator, useSearchParams } from 'react-router';
import { Search } from 'lucide-react';
import type { Route } from './+types/users';
import { Badge, Button, EmptyState, Input, PageSkeleton, Pagination, RelTime, Select, useToast } from '~/components/ui';
import { AdminPageHeader, ConfirmDialog } from '~/components/admin/shared';
import { ROLE_LABEL, cx } from '~/lib/format';
import { seo } from '~/lib/seo';
import { api, requireUser } from '~/lib/session';
import type { Role } from '~/lib/types';

export const meta: Route.MetaFunction = () => seo({ title: 'Pengguna', noindex: true });

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  bannedAt: string | null;
  createdAt: string;
  contributions: { approved: number; rejected: number; pending: number };
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const me = await requireUser(request, ['SUPER_ADMIN']);
  const sp = new URL(request.url).searchParams;
  const res = await api.get<AdminUser[]>('/api/admin/users', { q: sp.get('q'), page: sp.get('page') || 1, limit: 30 });
  return { users: res.data, meta: res.meta!, me };
}

export function HydrateFallback() {
  return <PageSkeleton />;
}

const ROLES: Role[] = ['CONTRIBUTOR', 'VIEWER', 'EDITOR', 'SUPER_ADMIN'];

export default function AdminUsers({ loaderData }: Route.ComponentProps) {
  const { users, meta, me } = loaderData;
  const [params] = useSearchParams();
  const revalidator = useRevalidator();
  const toast = useToast();
  const [saving, setSaving] = useState<string | null>(null);
  const [banning, setBanning] = useState<AdminUser | null>(null);

  const update = async (u: AdminUser, body: { role?: Role; banned?: boolean }) => {
    setSaving(u.id);
    try {
      await api.patch(`/api/admin/users/${u.id}`, body);
      toast(body.banned === undefined ? `Peran ${u.name} diubah. Sesinya di perangkat lain diakhiri.` : body.banned ? `${u.name} diblokir.` : `Blokir ${u.name} dicabut.`);
      revalidator.revalidate();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Gagal memperbarui.', 'danger');
    } finally {
      setSaving(null);
    }
  };

  const hrefFor = (page: number) => {
    const next = new URLSearchParams(params);
    if (page > 1) next.set('page', String(page));
    else next.delete('page');
    const qs = next.toString();
    return qs ? `?${qs}` : '/redaksi/pengguna';
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker={`${meta.total} akun`}
        title="Pengguna"
        description="Mengubah peran atau memblokir akun langsung mengakhiri semua sesinya."
      />
      <Form method="get" role="search" className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
        <Input name="q" defaultValue={params.get('q') ?? ''} placeholder="Cari nama atau email" aria-label="Cari pengguna" className="pl-9" />
      </Form>

      {users.length === 0 ? (
        <EmptyState title="Tidak ada pengguna yang cocok" />
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {users.map((u) => {
            const self = u.id === me.id;
            const reviewed = u.contributions.approved + u.contributions.rejected;
            return (
              <li key={u.id} className={cx('grid gap-3 py-3 md:grid-cols-[minmax(0,1fr)_170px_150px_auto] md:items-center', u.bannedAt && 'opacity-70')}>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-ink">{u.name}</span>
                    {self && <Badge>Anda</Badge>}
                    {u.bannedAt && <Badge tone="danger">Diblokir</Badge>}
                  </p>
                  <p className="truncate text-[13px] text-muted">{u.email}</p>
                  <p className="text-xs text-faint">
                    Bergabung <RelTime date={u.createdAt} />
                  </p>
                </div>
                <div className="font-mono text-[11.5px] text-muted num">
                  {u.contributions.approved}✓ · {u.contributions.rejected}✗ · {u.contributions.pending} antre
                  {reviewed > 0 && <span className="block text-faint">{Math.round((u.contributions.approved / reviewed) * 100)}% diterima</span>}
                </div>
                <Select
                  aria-label={`Peran ${u.name}`}
                  value={u.role}
                  disabled={self || saving === u.id}
                  onChange={(e) => update(u, { role: e.target.value as Role })}
                  className="h-9 text-sm"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </Select>
                <div className="flex md:justify-end">
                  {!self &&
                    (u.bannedAt ? (
                      <Button size="sm" variant="outline" loading={saving === u.id} onClick={() => update(u, { banned: false })}>
                        Cabut blokir
                      </Button>
                    ) : (
                      <Button size="sm" variant="danger" onClick={() => setBanning(u)}>
                        Blokir
                      </Button>
                    ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Pagination page={meta.page} totalPages={meta.totalPages} hrefFor={hrefFor} />

      <ConfirmDialog
        open={!!banning}
        onClose={() => setBanning(null)}
        title={`Blokir ${banning?.name ?? ''}?`}
        description="Akun tidak bisa masuk, mengikuti kasus, atau mengirim kontribusi. Kontribusi lama tetap tersimpan."
        confirmLabel="Blokir akun"
        danger
        onConfirm={async () => {
          if (!banning) return;
          await update(banning, { banned: true });
          setBanning(null);
        }}
      />
    </div>
  );
}
