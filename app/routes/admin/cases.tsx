import { Form, Link, useSearchParams } from 'react-router';
import { AlertTriangle, ChevronRight, FileText, Pencil, Plus, Search } from 'lucide-react';
import type { Route } from './+types/cases';
import { Badge, Button, CategoryTag, EmptyState, Input, LinkButton, PageSkeleton, Pagination, RelTime, Select, buttonClass } from '~/components/ui';
import {
  AdminPageHeader,
  AttentionBadge,
  TableCard,
  Tabs,
  rowClass,
  tdClass,
  thClass,
  theadClass,
  useCanEdit,
  type AdminCaseRow,
} from '~/components/admin/shared';
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
    attention: sp.get('attention'),
    page: sp.get('page') || 1,
    limit: 25,
  });
  return { items: res.data, meta: res.meta! };
}

export function HydrateFallback() {
  return <PageSkeleton />;
}

export default function AdminCases({ loaderData }: Route.ComponentProps) {
  const { items, meta } = loaderData;
  const [params] = useSearchParams();
  const editable = useCanEdit();
  const state = (params.get('state') as ArchiveState) || 'active';
  const needsCheck = params.get('attention') === 'check';
  const filtered = Boolean(params.get('q') || params.get('status') || needsCheck);

  const hrefWith = (patch: Record<string, string | number | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v === null || v === '' ? next.delete(k) : next.set(k, String(v))));
    if (!('page' in patch)) next.delete('page');
    const qs = next.toString();
    return qs ? `?${qs}` : '/redaksi/kasus';
  };

  const queue = (c: AdminCaseRow) =>
    c.pendingContributions > 0 || c.openCorrections > 0 ? (
      <div className="flex flex-wrap gap-1">
        {c.pendingContributions > 0 && (
          <Badge tone="ink">
            <span className="num">{c.pendingContributions}</span> kontribusi
          </Badge>
        )}
        {c.openCorrections > 0 && (
          <Badge tone="outline">
            <span className="num">{c.openCorrections}</span> koreksi
          </Badge>
        )}
      </div>
    ) : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker={`${meta.total} kasus`}
        title="Kasus"
        description="Kasus yang diarsipkan tidak tampil di situs publik, tetapi data dan riwayatnya tetap tersimpan."
        actions={
          editable && (
            <LinkButton to="/redaksi/kasus/baru">
              <Plus /> Kasus baru
            </LinkButton>
          )
        }
      />

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
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
          <Link
            to={hrefWith({ attention: needsCheck ? null : 'check' })}
            aria-pressed={needsCheck}
            className={buttonClass(needsCheck ? 'primary' : 'outline', 'sm')}
          >
            <AlertTriangle /> Perlu dicek
          </Link>
        </div>

        <Form method="get" className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center" role="search">
          {state !== 'active' && <input type="hidden" name="state" value={state} />}
          {needsCheck && <input type="hidden" name="attention" value="check" />}
          <div className="relative min-w-0 flex-1 xl:w-72 xl:flex-none">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input name="q" defaultValue={params.get('q') ?? ''} placeholder="Judul atau nomor perkara" aria-label="Cari kasus" className="pl-10" />
          </div>
          <div className="flex gap-2">
            <Select name="status" defaultValue={params.get('status') ?? ''} aria-label="Filter tahap" className="min-w-0 flex-1 sm:w-44 sm:flex-none">
              <option value="">Semua tahap</option>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="secondary" className="h-10">
              Terapkan
            </Button>
          </div>
        </Form>
      </div>

      {items.length === 0 ? (
        <EmptyState title={needsCheck ? 'Tidak ada kasus yang perlu dicek' : 'Tidak ada kasus'} icon={<FileText />}>
          {needsCheck
            ? 'Semua tahapan aktif masih dalam tenggat dan setiap kasus punya pembaruan terbaru.'
            : filtered
              ? 'Coba ubah kata kunci atau filter.'
              : 'Belum ada kasus pada daftar ini.'}
        </EmptyState>
      ) : (
        <>
          <TableCard className="hidden md:block">
            <table className="w-full border-collapse text-sm">
              <thead className={theadClass}>
                <tr>
                  <th className={thClass}>Kasus</th>
                  <th className={thClass}>Tahap</th>
                  <th className={cx(thClass, 'text-right')} title="Jumlah tahapan / sumber">
                    Thp / Smb
                  </th>
                  <th className={thClass}>Antrean</th>
                  <th className={cx(thClass, 'text-right')}>Aktivitas</th>
                  <th className={thClass}>
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((c) => (
                  <tr key={c.id} className={cx(rowClass, 'group')}>
                    <td className={cx(tdClass, 'min-w-[260px]')}>
                      <Link to={`/redaksi/kasus/${c.id}`} className={cx('font-medium hover:underline', c.isActive ? 'text-ink' : 'text-muted')}>
                        {c.title}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <CategoryTag name={c.category.name} color={c.category.color} showColor />
                        <span className="font-mono text-xs text-muted">{c.caseNumber}</span>
                        {!c.isActive && <Badge tone="outline">Diarsipkan</Badge>}
                        <AttentionBadge reason={c.attention} days={c.attentionDays} />
                      </div>
                    </td>
                    <td className={tdClass}>
                      <Badge>{STATUS_LABEL[c.currentStatus]}</Badge>
                    </td>
                    <td className={cx(tdClass, 'whitespace-nowrap text-right font-mono text-xs text-ink-soft num')}>
                      {c._count.stages} / {c._count.sources}
                    </td>
                    <td className={tdClass}>{queue(c) ?? <span className="text-faint">—</span>}</td>
                    <td className={cx(tdClass, 'whitespace-nowrap text-right text-[13px] text-muted')}>
                      <RelTime date={c.lastActivityAt} />
                    </td>
                    <td className={cx(tdClass, 'w-12 text-right')}>
                      <LinkButton to={`/redaksi/kasus/${c.id}`} variant="ghost" size="icon-sm" aria-label={`Buka ${c.title}`} className="text-muted">
                        {editable ? <Pencil /> : <ChevronRight />}
                      </LinkButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>

          <ul className="card divide-y divide-line overflow-hidden md:hidden">
            {items.map((c) => (
              <li key={c.id}>
                <Link to={`/redaksi/kasus/${c.id}`} className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-ink/[0.03]">
                  <div className="min-w-0 flex-1">
                    <p className={cx('font-medium', c.isActive ? 'text-ink' : 'text-muted')}>{c.title}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      <CategoryTag name={c.category.name} color={c.category.color} showColor />
                      <span className="font-mono">{c.caseNumber}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge>{STATUS_LABEL[c.currentStatus]}</Badge>
                      {!c.isActive && <Badge tone="outline">Diarsipkan</Badge>}
                      <AttentionBadge reason={c.attention} days={c.attentionDays} />
                      {queue(c)}
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      <span className="num">
                        {c._count.stages} tahapan · {c._count.sources} sumber
                      </span>{' '}
                      · <RelTime date={c.lastActivityAt} />
                    </p>
                  </div>
                  <ChevronRight className="mt-0.5 size-4 shrink-0 text-faint" aria-hidden />
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
