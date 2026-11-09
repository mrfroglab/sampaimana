import { useState } from 'react';
import { Link, useRevalidator, useSearchParams } from 'react-router';
import { Archive, ArchiveRestore, ArrowLeft, ExternalLink, Users } from 'lucide-react';
import type { Route } from './+types/case-edit';
import { Alert, Badge, Button, CategoryTag, PageSkeleton, useToast } from '~/components/ui';
import { StatusRail } from '~/components/StatusRail';
import { CaseForm } from '~/components/admin/CaseForm';
import { StageEditor } from '~/components/admin/StageEditor';
import { SourcesManager } from '~/components/admin/SourcesManager';
import { AdminPageHeader, ConfirmDialog, Tabs, useCanEdit, type AdminCase } from '~/components/admin/shared';
import { publicGet } from '~/lib/api';
import { fmtDateTime } from '~/lib/format';
import { seo } from '~/lib/seo';
import { api, requireUser } from '~/lib/session';
import type { Category } from '~/lib/types';

export const meta: Route.MetaFunction = ({ data }) => seo({ title: data ? `Sunting: ${data.data.title}` : 'Sunting kasus', noindex: true });

export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  await requireUser(request, ['SUPER_ADMIN', 'EDITOR', 'VIEWER']);
  const [detail, categories] = await Promise.all([
    api.get<AdminCase>(`/api/admin/cases/${params.id}`),
    publicGet<Category[]>('/api/categories'),
  ]);
  return { data: detail.data, categories: categories.data };
}

export function HydrateFallback() {
  return <PageSkeleton />;
}

type Tab = 'linimasa' | 'sumber' | 'detail' | 'riwayat';

const ACTION_LABEL: Record<string, string> = {
  CASE_CREATED: 'Dibuat',
  CASE_UPDATED: 'Data diubah',
  STATUS_CHANGED: 'Status',
  STAGE_ADDED: 'Tahapan',
  STAGE_UPDATED: 'Tahapan',
  STAGE_REMOVED: 'Tahapan',
  ARTICLE_PUBLISHED: 'Artikel',
  ARTICLE_UPDATED: 'Artikel',
  ARTICLE_REMOVED: 'Artikel',
  SOURCE_ADDED: 'Sumber',
  SOURCE_VERIFIED: 'Sumber',
  SOURCE_REMOVED: 'Sumber',
  CONTRIBUTION_APPLIED: 'Kontribusi',
  CORRECTION: 'Koreksi',
};

export default function AdminCaseEdit({ loaderData }: Route.ComponentProps) {
  const { data: c, categories } = loaderData;
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'linimasa';
  const editable = useCanEdit();
  const revalidator = useRevalidator();
  const toast = useToast();
  const [archiving, setArchiving] = useState(false);
  const refresh = () => revalidator.revalidate();

  return (
    <div className="space-y-6">
      <Link to="/redaksi/kasus" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Semua kasus
      </Link>

      <AdminPageHeader
        kicker={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 normal-case tracking-normal">
            <CategoryTag name={c.category.name} color={c.category.color} className="text-xs" />
            <span className="font-mono text-[11px] text-faint">{c.caseNumber}</span>
          </span>
        }
        title={c.title}
        actions={
          <>
            {c.isActive && (
              <a href={`/kasus/${c.slug}`} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-1.5 px-2 text-sm text-ink-soft hover:text-ink">
                Halaman publik <ExternalLink className="size-3.5" />
              </a>
            )}
            {editable &&
              (c.isActive ? (
                <Button variant="outline" onClick={() => setArchiving(true)}>
                  <Archive className="size-4" /> Arsipkan
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      await api.post(`/api/admin/cases/${c.id}/restore`);
                      toast('Kasus dipulihkan dan kembali tampil publik.');
                      refresh();
                    } catch (err) {
                      toast(err instanceof Error ? err.message : 'Gagal memulihkan.', 'danger');
                    }
                  }}
                >
                  <ArchiveRestore className="size-4" /> Pulihkan
                </Button>
              ))}
          </>
        }
      />

      {!c.isActive && (
        <Alert tone="warn" title="Kasus diarsipkan">
          Kasus ini tidak tampil di situs publik, pencarian, maupun ekspor data.
        </Alert>
      )}

      <div className="grid gap-6 border border-line bg-raised p-4 sm:p-5 md:grid-cols-[1fr_auto] md:items-center">
        <StatusRail status={c.currentStatus} stages={c.stages} size="lg" />
        <div className="flex gap-6 font-mono text-xs text-muted md:flex-col md:gap-1 md:border-l md:border-line md:pl-5">
          <span className="inline-flex items-center gap-1.5 num">
            <Users className="size-3.5" /> {c._count.follows} pengikut
          </span>
          <span>Aktivitas {fmtDateTime(c.lastActivityAt)}</span>
        </div>
      </div>

      <Tabs<Tab>
        label="Bagian kasus"
        value={tab}
        onChange={(v) => setParams((p) => (v === 'linimasa' ? (p.delete('tab'), p) : (p.set('tab', v), p)), { replace: true, preventScrollReset: true })}
        options={[
          { value: 'linimasa', label: 'Linimasa', count: c.stages.length },
          { value: 'sumber', label: 'Sumber', count: c.sources.length },
          { value: 'detail', label: 'Data kasus' },
          { value: 'riwayat', label: 'Riwayat', count: c.revisions.length },
        ]}
      />

      <div className="pt-2">
        {tab === 'linimasa' && (
          <StageEditor caseId={c.id} stages={c.stages} currentStatus={c.currentStatus} editable={editable} onChanged={refresh} />
        )}
        {tab === 'sumber' && <SourcesManager caseId={c.id} sources={c.sources} stages={c.stages} editable={editable} onChanged={refresh} />}
        {tab === 'detail' && (
          <div className="max-w-3xl">
            <CaseForm
              key={`${c.lastActivityAt}-${c.currentStatus}`}
              initial={c}
              categories={categories}
              readOnly={!editable}
              submitLabel="Simpan perubahan"
              onSubmit={async (payload) => {
                const res = await api.put(`/api/admin/cases/${c.id}`, payload);
                toast(res.message || 'Kasus diperbarui.');
                refresh();
              }}
            />
          </div>
        )}
        {tab === 'riwayat' && (
          <div>
            <p className="text-sm text-muted">Riwayat ini tampil publik di halaman kasus (50 entri terakhir).</p>
            <ol className="mt-4 divide-y divide-line border-y border-line">
              {c.revisions.map((r) => (
                <li key={r.id} className="grid gap-1 py-3 sm:grid-cols-[150px_1fr] sm:gap-4">
                  <div className="font-mono text-[11.5px] text-muted num">{fmtDateTime(r.createdAt)}</div>
                  <div>
                    <p className="flex flex-wrap items-center gap-2 text-sm text-ink">
                      <Badge tone={r.action === 'STATUS_CHANGED' ? 'accent' : r.action === 'CORRECTION' ? 'warn' : 'neutral'}>
                        {ACTION_LABEL[r.action] ?? r.action}
                      </Badge>
                      {r.summary}
                    </p>
                    {r.reason && <p className="mt-1 border-l-2 border-line-strong pl-2 text-[13px] text-muted">{r.reason}</p>}
                    {r.user && <p className="mt-1 text-xs text-faint">oleh {r.user.name}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={archiving}
        onClose={() => setArchiving(false)}
        title="Arsipkan kasus ini?"
        description="Kasus akan hilang dari situs publik, pencarian, dan ekspor data. Data dan riwayat tetap tersimpan dan bisa dipulihkan."
        confirmLabel="Arsipkan"
        danger
        withReason
        reasonLabel="Alasan (catatan internal)"
        onConfirm={async (reason) => {
          try {
            await api.del(`/api/admin/cases/${c.id}`, { reason: reason || undefined });
            toast('Kasus diarsipkan.');
            setArchiving(false);
            refresh();
          } catch (err) {
            toast(err instanceof Error ? err.message : 'Gagal mengarsipkan.', 'danger');
          }
        }}
      />
    </div>
  );
}
