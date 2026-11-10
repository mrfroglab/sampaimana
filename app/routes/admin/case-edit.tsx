import { useState } from 'react';
import { useRevalidator, useSearchParams } from 'react-router';
import { Archive, ArchiveRestore, ExternalLink, Users } from 'lucide-react';
import type { Route } from './+types/case-edit';
import { Alert, Badge, Button, Card, CardHeader, CategoryTag, PageSkeleton, buttonClass, useToast } from '~/components/ui';
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
      <AdminPageHeader
        crumbs={[{ to: '/redaksi/kasus', label: 'Kasus' }, { label: c.title }]}
        kicker={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 normal-case tracking-normal">
            <CategoryTag name={c.category.name} color={c.category.color} showColor />
            <span className="font-mono text-xs font-normal text-muted">{c.caseNumber}</span>
            {!c.isActive && <Badge tone="outline">Diarsipkan</Badge>}
          </span>
        }
        title={c.title}
        actions={
          <>
            {c.isActive && (
              <a href={`/kasus/${c.slug}`} target="_blank" rel="noopener" className={buttonClass('ghost', 'md')}>
                Halaman publik <ExternalLink />
              </a>
            )}
            {editable &&
              (c.isActive ? (
                <Button variant="danger" onClick={() => setArchiving(true)}>
                  <Archive /> Arsipkan
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
                  <ArchiveRestore /> Pulihkan
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

      <Card className="grid grid-cols-1 gap-6 p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <StatusRail status={c.currentStatus} stages={c.stages} size="lg" />
        <dl className="flex flex-wrap gap-x-6 gap-y-3 border-t border-line pt-4 text-[13px] md:flex-col md:gap-3 md:border-l md:border-t-0 md:pl-6 md:pt-0">
          <div>
            <dt className="kicker">Pengikut</dt>
            <dd className="mt-0.5 inline-flex items-center gap-1.5 font-medium text-ink num">
              <Users className="size-3.5 text-muted" aria-hidden /> {c._count.follows}
            </dd>
          </div>
          <div>
            <dt className="kicker">Aktivitas terakhir</dt>
            <dd className="mt-0.5 font-medium text-ink num">{fmtDateTime(c.lastActivityAt)}</dd>
          </div>
        </dl>
      </Card>

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

      <div>
        {tab === 'linimasa' && (
          <StageEditor caseId={c.id} stages={c.stages} currentStatus={c.currentStatus} editable={editable} onChanged={refresh} />
        )}
        {tab === 'sumber' && <SourcesManager caseId={c.id} sources={c.sources} stages={c.stages} editable={editable} onChanged={refresh} />}
        {tab === 'detail' && (
          <div className="max-w-4xl">
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
          <Card className="overflow-hidden">
            <CardHeader title="Riwayat" description="Riwayat ini tampil publik di halaman kasus (50 entri terakhir)." />
            {c.revisions.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">Belum ada riwayat.</p>
            ) : (
              <ol className="divide-y divide-line">
                {c.revisions.map((r) => (
                  <li key={r.id} className="grid grid-cols-1 gap-1.5 px-5 py-3.5 transition-colors hover:bg-ink/[0.03] sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-4">
                    <div className="font-mono text-xs text-muted num sm:pt-0.5">{fmtDateTime(r.createdAt)}</div>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm text-ink">
                        <Badge tone={r.action === 'STATUS_CHANGED' ? 'ink' : r.action === 'CORRECTION' ? 'outline' : 'neutral'}>
                          {ACTION_LABEL[r.action] ?? r.action}
                        </Badge>
                        <span className="min-w-0">{r.summary}</span>
                      </p>
                      {r.reason && <p className="tile mt-2 px-3 py-2 text-[13px] text-ink-soft">{r.reason}</p>}
                      {r.user && <p className="mt-1.5 text-xs text-muted">oleh {r.user.name}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
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
