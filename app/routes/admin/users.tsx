import { useState } from 'react';
import { Form, useRevalidator, useSearchParams } from 'react-router';
import { Ban, LockOpen, Search, ShieldOff, Users } from 'lucide-react';
import type { Route } from './+types/users';
import { Badge, Button, EmptyState, Input, PageSkeleton, Pagination, RelTime, Select, useToast } from '~/components/ui';
import {
  AdminPageHeader,
  ConfirmDialog,
  Initials,
  TableCard,
  rowClass,
  tdClass,
  thClass,
  theadClass,
} from '~/components/admin/shared';
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
  totpEnabledAt: string | null;
  lockedUntil: string | null;
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
  const [resetting, setResetting] = useState<AdminUser | null>(null);

  type Patch = { role?: Role; banned?: boolean; reset2fa?: true; unlock?: true };
  const message = (u: AdminUser, body: Patch) =>
    body.reset2fa
      ? `Verifikasi dua langkah ${u.name} direset. Semua sesinya diakhiri.`
      : body.unlock
        ? `Kunci akun ${u.name} dibuka.`
        : body.banned === undefined
          ? `Peran ${u.name} diubah. Sesinya di perangkat lain diakhiri.`
          : body.banned
            ? `${u.name} diblokir.`
            : `Blokir ${u.name} dicabut.`;

  const update = async (u: AdminUser, body: Patch) => {
    setSaving(u.id);
    try {
      await api.patch(`/api/admin/users/${u.id}`, body);
      toast(message(u, body));
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

  const roleSelect = (u: AdminUser, self: boolean, className?: string) => (
    <Select
      aria-label={`Peran ${u.name}`}
      value={u.role}
      disabled={self || saving === u.id}
      onChange={(e) => update(u, { role: e.target.value as Role })}
      className={cx('h-8 text-[13px]', className)}
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {ROLE_LABEL[r]}
        </option>
      ))}
    </Select>
  );

  const banAction = (u: AdminUser) =>
    u.bannedAt ? (
      <Button size="sm" variant="outline" loading={saving === u.id} onClick={() => update(u, { banned: false })}>
        Cabut blokir
      </Button>
    ) : (
      <Button size="sm" variant="danger" onClick={() => setBanning(u)}>
        <Ban /> Blokir
      </Button>
    );

  const locked = (u: AdminUser) => Boolean(u.lockedUntil && new Date(u.lockedUntil) > new Date());

  const securityActions = (u: AdminUser) => (
    <>
      {locked(u) && (
        <Button size="sm" variant="outline" loading={saving === u.id} onClick={() => update(u, { unlock: true })}>
          <LockOpen /> Buka kunci
        </Button>
      )}
      {u.totpEnabledAt && (
        <Button size="sm" variant="ghost" onClick={() => setResetting(u)}>
          <ShieldOff /> Reset 2FA
        </Button>
      )}
    </>
  );

  const identity = (u: AdminUser, self: boolean) => (
    <div className="flex min-w-0 items-center gap-3">
      <Initials name={u.name} />
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium text-ink">{u.name}</span>
          {self && <Badge>Anda</Badge>}
          {u.bannedAt && <Badge tone="danger">Diblokir</Badge>}
          {locked(u) && <Badge tone="warn">Terkunci</Badge>}
          {u.totpEnabledAt ? <Badge tone="outline">2FA</Badge> : u.role !== 'CONTRIBUTOR' && <Badge tone="warn">Tanpa 2FA</Badge>}
        </p>
        <p className="truncate text-[13px] text-muted">{u.email}</p>
      </div>
    </div>
  );

  const record = (u: AdminUser) => {
    const reviewed = u.contributions.approved + u.contributions.rejected;
    return (
      <div className="text-[13px] text-ink-soft num">
        <span className="whitespace-nowrap">
          {u.contributions.approved} diterima · {u.contributions.rejected} ditolak · {u.contributions.pending} antre
        </span>
        {reviewed > 0 && (
          <span className="block text-xs text-muted">{Math.round((u.contributions.approved / reviewed) * 100)}% diterima</span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker={`${meta.total} akun`}
        title="Pengguna"
        description="Mengubah peran, memblokir, atau mereset verifikasi dua langkah langsung mengakhiri semua sesi akun itu."
      />
      <Form method="get" role="search" className="relative w-full sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <Input name="q" defaultValue={params.get('q') ?? ''} placeholder="Cari nama atau email" aria-label="Cari pengguna" className="pl-10" />
      </Form>

      {users.length === 0 ? (
        <EmptyState title="Tidak ada pengguna yang cocok" icon={<Users />} />
      ) : (
        <>
          <TableCard className="hidden md:block">
            <table className="w-full border-collapse text-sm">
              <thead className={theadClass}>
                <tr>
                  <th className={thClass}>Pengguna</th>
                  <th className={thClass}>Kontribusi</th>
                  <th className={thClass}>Bergabung</th>
                  <th className={thClass}>Peran</th>
                  <th className={thClass}>
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.map((u) => {
                  const self = u.id === me.id;
                  return (
                    <tr key={u.id} className={cx(rowClass, u.bannedAt && 'opacity-70')}>
                      <td className={cx(tdClass, 'min-w-[240px]')}>{identity(u, self)}</td>
                      <td className={tdClass}>{record(u)}</td>
                      <td className={cx(tdClass, 'whitespace-nowrap text-[13px] text-muted')}>
                        <RelTime date={u.createdAt} />
                      </td>
                      <td className={cx(tdClass, 'w-44')}>{roleSelect(u, self, 'w-40 min-w-40')}</td>
                      <td className={cx(tdClass, 'text-right')}>
                        {!self && (
                          <div className="flex justify-end gap-1.5">
                            {securityActions(u)}
                            {banAction(u)}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableCard>

          <ul className="card divide-y divide-line overflow-hidden md:hidden">
            {users.map((u) => {
              const self = u.id === me.id;
              return (
                <li key={u.id} className={cx('space-y-3 px-4 py-4', u.bannedAt && 'opacity-70')}>
                  {identity(u, self)}
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    {record(u)}
                    <span className="text-xs text-muted">
                      Bergabung <RelTime date={u.createdAt} />
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {roleSelect(u, self, 'min-w-0 flex-1')}
                    {!self && securityActions(u)}
                    {!self && banAction(u)}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
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
      <ConfirmDialog
        open={!!resetting}
        onClose={() => setResetting(null)}
        title={`Reset verifikasi dua langkah ${resetting?.name ?? ''}?`}
        description="Lakukan hanya setelah memastikan identitas pemilik akun (mis. lewat telepon). Akun bisa masuk dengan kata sandi saja sampai pemiliknya mengaktifkan ulang."
        confirmLabel="Reset 2FA"
        danger
        onConfirm={async () => {
          if (!resetting) return;
          await update(resetting, { reset2fa: true });
          setResetting(null);
        }}
      />
    </div>
  );
}
