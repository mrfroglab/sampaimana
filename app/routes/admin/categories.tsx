import { useState, type FormEvent } from 'react';
import { useRevalidator } from 'react-router';
import { FolderTree, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Route } from './+types/categories';
import { Alert, Button, CategoryTag, Dialog, EmptyState, Field, Input, PageSkeleton, useToast } from '~/components/ui';
import {
  AdminPageHeader,
  ConfirmDialog,
  TableCard,
  dialogFooterClass,
  rowClass,
  tdClass,
  thClass,
  theadClass,
  useCanEdit,
} from '~/components/admin/shared';
import { cx } from '~/lib/format';
import { ApiError, publicGet } from '~/lib/api';
import { seo } from '~/lib/seo';
import { api, requireUser } from '~/lib/session';
import type { Category } from '~/lib/types';

export const meta: Route.MetaFunction = () => seo({ title: 'Kategori', noindex: true });

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  await requireUser(request, ['SUPER_ADMIN', 'EDITOR', 'VIEWER']);
  const res = await publicGet<Category[]>('/api/categories');
  return { categories: res.data };
}

export function HydrateFallback() {
  return <PageSkeleton />;
}

const PRESETS = ['#b42318', '#1d4ed8', '#b45309', '#15803d', '#7e22ce', '#0f766e', '#be185d', '#57534e'];

function CategoryDialog({ category, onClose, onDone }: { category: Category | null; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(category?.name ?? '');
  const [color, setColor] = useState(category?.color ?? '#57534e');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      if (category) await api.patch(`/api/admin/categories/${category.id}`, { name: name.trim(), color });
      else await api.post('/api/admin/categories', { name: name.trim(), color });
      toast(category ? 'Kategori diperbarui.' : 'Kategori dibuat.');
      onDone();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) setErrors({ ...err.fieldErrors, _form: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title={category ? 'Ubah kategori' : 'Kategori baru'}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        {errors._form && <Alert tone="danger">{errors._form}</Alert>}
        <Field label="Nama" htmlFor="cat-name" error={errors.name} hint={category ? `Slug tetap: ${category.slug}` : 'Slug URL dibuat otomatis dari nama.'}>
          <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} invalid={!!errors.name} />
        </Field>
        <Field label="Warna penanda" htmlFor="cat-color" error={errors.color}>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id="cat-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-11 w-14 cursor-pointer rounded-xl border border-line bg-raised p-1 [&::-moz-color-swatch]:rounded-lg [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0"
            />
            <Input value={color} onChange={(e) => setColor(e.target.value)} className="w-28 font-mono text-sm" aria-label="Kode warna hex" />
          </div>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Warna siap pakai">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setColor(p)}
                aria-label={p}
                aria-pressed={color.toLowerCase() === p}
                className="size-7 rounded-full border-2 border-raised outline outline-1 outline-line-strong transition-[outline-color] hover:outline-ink/40 aria-pressed:outline-2 aria-pressed:outline-ink"
                style={{ background: p }}
              />
            ))}
          </div>
        </Field>
        <div className="tile flex items-center justify-between gap-3 px-4 py-3">
          <span className="kicker">Pratinjau</span>
          <CategoryTag name={name.trim() || 'Nama kategori'} color={color} showColor />
        </div>
        <div className={dialogFooterClass}>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" loading={busy}>
            Simpan
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export default function AdminCategories({ loaderData }: Route.ComponentProps) {
  const { categories } = loaderData;
  const editable = useCanEdit();
  const revalidator = useRevalidator();
  const toast = useToast();
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [removing, setRemoving] = useState<Category | null>(null);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker={`${categories.length} kategori`}
        title="Kategori"
        description="Kategori yang masih dipakai kasus aktif maupun arsip tidak bisa dihapus."
        actions={
          editable && (
            <Button onClick={() => setEditing('new')}>
              <Plus /> Kategori
            </Button>
          )
        }
      />
      {categories.length === 0 ? (
        <EmptyState title="Belum ada kategori" icon={<FolderTree />} />
      ) : (
        <TableCard>
          <table className="w-full border-collapse text-sm">
            <thead className={theadClass}>
              <tr>
                <th className={thClass}>Kategori</th>
                <th className={cx(thClass, 'max-sm:hidden')}>Slug</th>
                <th className={cx(thClass, 'text-right')}>Kasus aktif</th>
                {editable && (
                  <th className={thClass}>
                    <span className="sr-only">Aksi</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {categories.map((c) => (
                <tr key={c.id} className={rowClass}>
                  <td className={tdClass}>
                    <CategoryTag name={c.name} color={c.color} showColor />
                    <p className="mt-0.5 truncate pl-3.5 font-mono text-xs text-muted sm:hidden">/{c.slug}</p>
                  </td>
                  <td className={cx(tdClass, 'font-mono text-xs text-muted max-sm:hidden')}>/{c.slug}</td>
                  <td className={cx(tdClass, 'whitespace-nowrap text-right text-ink-soft num')}>{c.caseCount ?? 0}</td>
                  {editable && (
                    <td className={cx(tdClass, 'w-24 whitespace-nowrap text-right')}>
                      <div className="inline-flex gap-0.5">
                        <Button size="icon-sm" variant="ghost" className="text-muted" aria-label={`Ubah ${c.name}`} onClick={() => setEditing(c)}>
                          <Pencil />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="text-muted hover:bg-danger-wash hover:text-danger"
                          aria-label={`Hapus ${c.name}`}
                          onClick={() => setRemoving(c)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}

      {editing && (
        <CategoryDialog
          key={editing === 'new' ? 'new' : editing.id}
          category={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onDone={() => revalidator.revalidate()}
        />
      )}
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={`Hapus kategori “${removing?.name ?? ''}”?`}
        confirmLabel="Hapus"
        danger
        onConfirm={async () => {
          if (!removing) return;
          try {
            await api.del(`/api/admin/categories/${removing.id}`);
            toast('Kategori dihapus.');
            setRemoving(null);
            revalidator.revalidate();
          } catch (err) {
            toast(err instanceof Error ? err.message : 'Gagal menghapus.', 'danger');
            setRemoving(null);
          }
        }}
      />
    </div>
  );
}
