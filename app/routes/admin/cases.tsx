import { Form, Link, useSearchParams } from 'react-router';
import { Plus, Search } from 'lucide-react';
import type { Route } from './+types/cases';
import { Badge, Button, CategoryTag, EmptyState, Input, LinkButton, PageSkeleton, Pagination, RelTime, Select } from '~/components/ui';
import { AdminPageHeader, Tabs, useCanEdit, type AdminCaseRow } from '~/components/admin/shared';
import { STATUS_LABEL, STATUS_ORDER, cx } from '~/lib/format';
import { seo } from '~/lib/seo';
import { api, requireUser } from '~/lib/session';

export const meta: Route.MetaFunction = () => seo({ title: 'Kelola kasus', noindex: true });

type ArchiveState = 'active' | 'inactive' | 'all';

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  await requireUser(request, ['SUPER_ADMIN', 'EDITOR', 'VIEWER']);
  const sp = new URL(request.url).searchParams;
  const res = await api.get<AdminCaseRow[]>('/api/admin/cases', {
    q: sp.get('q'),
    status: sp.get('status'),
    state: sp.get('state') || 'active',
    page: sp.get('page') || 1,
    limit: 25,
  });
  return { items: res.data, meta: res.meta! };
}

export function HydrateFallback() {
  return <PageSkeleton />;
}

const th = 'py-2 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted';

export default function AdminCases({ loaderData }: Route.ComponentProps) {
  const { items, meta } = loaderData;
  const [params] = useSearchParams();
  const editable = useCanEdit();
  const state = (params.get('state') as ArchiveState) || 'active';
  const filtered = Boolean(params.get('q') || params.get('status'));

  const hrefWith = (patch: Record<string, string | number | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v === null || v === '' ? next.delete(k) : next.set(k, String(v))));
    if (!('page' in patch)) next.delete('page');
    const qs = next.toString();
    return qs ? `?${qs}` : '/redaksi/kasus';
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker={`${meta.total} kasus`}
        title="Kasus"
        description="Kasus yang diarsipkan tidak tampil di situs publik, tetapi data dan riwayatnya tetap tersimpan."
        actions={
          editable && (
            <LinkButton to="/redaksi/kasus/baru">
              <Plus className="size-4" /> Kasus baru
            </LinkButton>
          )
        }
      />

      <Tabs<ArchiveState>
        label="Status arsip"
        value={state}
        hrefFor={(v) => hrefWith({ state: v === 'active' ? null : v })}
        options={[
          { value: 'active', label: 'Aktif' },
          { value: 'inactive', label: 'Diarsipkan' },
          { value: 'all', label: 'Semua' },
        ]}
      />

      <Form method="get" className="flex flex-col gap-2 sm:flex-row" role="search">
        {state !== 'active' && <input type="hidden" name="state" value={state} />}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
          <Input name="q" defaultValue={params.get('q') ?? ''} placeholder="Judul atau nomor perkara" aria-label="Cari kasus" className="pl-9" />
        </div>
        <Select name="status" defaultValue={params.get('status') ?? ''} aria-label="Filter tahap" className="sm:w-48">
          <option value="">Semua tahap</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="outline">
          Terapkan
        </Button>
      </Form>

      {items.length === 0 ? (
        <EmptyState title="Tidak ada kasus">
          {filtered ? 'Coba ubah kata kunci atau filter.' : 'Belum ada kasus pada daftar ini.'}
        </EmptyState>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-ink text-left">
                  <th className={cx(th, 'pr-4')}>Kasus</th>
                  <th className={cx(th, 'px-3')}>Tahap</th>
                  <th className={cx(th, 'px-3 text-right')} title="Jumlah tahapan / sumber">
                    Thp / Smb
                  </th>
                  <th className={cx(th, 'px-3')}>Antrean</th>
                  <th className={cx(th, 'pl-3 text-right')}>Aktivitas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((c) => (
                  <tr key={c.id} className={cx('group align-top hover:bg-raised', !c.isActive && 'text-muted')}>
                    <td className="py-3 pr-4">
                      <Link to={`/redaksi/kasus/${c.id}`} className="font-medium text-ink group-hover:underline">
                        {c.title}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <CategoryTag name={c.category.name} color={c.category.color} className="text-xs" />
                        <span className="font-mono text-[11px] text-faint">{c.caseNumber}</span>
                        {!c.isActive && <Badge>Diarsipkan</Badge>}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">{STATUS_LABEL[c.currentStatus]}</td>
                    <td className="px-3 py-3 text-right font-mono text-xs num">
                      {c._count.stages} / {c._count.sources}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.pendingContributions > 0 && <Badge tone="accent">{c.pendingContributions} kontribusi</Badge>}
                        {c.openCorrections > 0 && <Badge tone="danger">{c.openCorrections} koreksi</Badge>}
                        {!c.pendingContributions && !c.openCorrections && <span className="text-faint">—</span>}
                      </div>
                    </td>
                    <td className="whitespace-nowrap py-3 pl-3 text-right text-xs text-muted">
                      <RelTime date={c.lastActivityAt} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-line border-y border-line md:hidden">
            {items.map((c) => (
              <li key={c.id}>
                <Link to={`/redaksi/kasus/${c.id}`} className="block py-3">
                  <p className="font-medium text-ink">{c.title}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    <span>{STATUS_LABEL[c.currentStatus]}</span>
                    <span className="font-mono">{c.caseNumber}</span>
                    <RelTime date={c.lastActivityAt} />
                  </p>
                  {(c.pendingContributions > 0 || c.openCorrections > 0 || !c.isActive) && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {!c.isActive && <Badge>Diarsipkan</Badge>}
                      {c.pendingContributions > 0 && <Badge tone="accent">{c.pendingContributions} kontribusi</Badge>}
                      {c.openCorrections > 0 && <Badge tone="danger">{c.openCorrections} koreksi</Badge>}
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          <Pagination page={meta.page} totalPages={meta.totalPages} hrefFor={(p) => hrefWith({ page: p })} />
        </>
      )}
    </div>
  );
}
