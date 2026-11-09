import { Link, useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import type { Route } from './+types/case-new';
import { PageSkeleton, useToast } from '~/components/ui';
import { CaseForm } from '~/components/admin/CaseForm';
import { AdminPageHeader } from '~/components/admin/shared';
import { publicGet } from '~/lib/api';
import { seo } from '~/lib/seo';
import { api, requireUser } from '~/lib/session';
import type { Category } from '~/lib/types';

export const meta: Route.MetaFunction = () => seo({ title: 'Kasus baru', noindex: true });

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  await requireUser(request, ['SUPER_ADMIN', 'EDITOR']);
  const categories = await publicGet<Category[]>('/api/categories');
  return { categories: categories.data };
}

export function HydrateFallback() {
  return <PageSkeleton />;
}

export default function AdminCaseNew({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const toast = useToast();
  return (
    <div className="space-y-8">
      <Link to="/redaksi/kasus" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Semua kasus
      </Link>
      <AdminPageHeader
        kicker="Kasus baru"
        title="Mulai memantau kasus"
        description="Tahapan pertama dibuat otomatis sesuai tahap saat ini. Setelah disimpan, Anda bisa melengkapi linimasa, sumber, dan artikel penjelasan."
      />
      <div className="max-w-3xl">
        <CaseForm
          categories={loaderData.categories}
          submitLabel="Simpan dan lanjutkan"
          onSubmit={async (payload) => {
            const { reason: _reason, ...body } = payload;
            const res = await api.post<{ id: string }>('/api/admin/cases', body);
            toast('Kasus dibuat. Lengkapi linimasa dan sumbernya.');
            navigate(`/redaksi/kasus/${res.data.id}`);
          }}
        />
      </div>
    </div>
  );
}
