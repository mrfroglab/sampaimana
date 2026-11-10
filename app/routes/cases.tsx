import { useEffect, useRef } from 'react';
import { Form, Link, useNavigation, useSubmit } from 'react-router';
import { Check, Download, Search, SearchX, X } from 'lucide-react';
import type { Route } from './+types/cases';
import { publicGet } from '~/lib/api';
import { seo } from '~/lib/seo';
import { STATUS_LABEL, STATUS_ORDER, cx, fmtNum } from '~/lib/format';
import type { CaseListItem, CaseStatus, Category } from '~/lib/types';
import { CaseCard } from '~/components/CaseCard';
import { EmptyState, Input, LinkButton, PageHeader, Pagination, Select, buttonClass } from '~/components/ui';

const SORTS = [
  ['updated', 'Baru diperbarui'],
  ['newest', 'Baru dipantau'],
  ['oldest', 'Paling lama berjalan'],
  ['title', 'Judul A–Z'],
] as const;

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim() || '';
  const status = url.searchParams.getAll('status').flatMap((s) => s.split(',')).filter((s) => STATUS_ORDER.includes(s as CaseStatus));
  const category = url.searchParams.get('category') || '';
  const sortParam = url.searchParams.get('sort') || 'updated';
  const sort = SORTS.some(([k]) => k === sortParam) ? sortParam : 'updated';
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);

  const [cases, categories] = await Promise.all([
    publicGet<CaseListItem[]>('/api/cases', { q, status: status.join(','), category, sort, page, limit: 12 }),
    publicGet<Category[]>('/api/categories'),
  ]);
  return { cases: cases.data, meta: cases.meta!, categories: categories.data, filters: { q, status, category, sort, page } };
}

export const meta: Route.MetaFunction = ({ data }) => {
  const q = data?.filters.q;
  return seo({
    title: q ? `Pencarian “${q}”` : 'Semua kasus',
    description: 'Telusuri kasus hukum publik menurut tahap, kategori, dan pembaruan terakhir.',
    path: '/kasus',
  });
};

export default function Cases({ loaderData }: Route.ComponentProps) {
  const { cases, meta, categories, filters } = loaderData;
  const submit = useSubmit();
  const navigation = useNavigation();
  const formRef = useRef<HTMLFormElement>(null);
  const searching = navigation.state === 'loading' && navigation.location?.pathname === '/kasus';
  const hasFilters = Boolean(filters.q || filters.status.length || filters.category);

  const qs = (overrides: Record<string, string | string[] | number | undefined>) => {
    const params = new URLSearchParams();
    const merged = { q: filters.q, category: filters.category, sort: filters.sort, status: filters.status, ...overrides };
    Object.entries(merged).forEach(([k, v]) => {
      if (Array.isArray(v)) v.forEach((x) => params.append(k, x));
      else if (v !== undefined && v !== '' && !(k === 'sort' && v === 'updated') && !(k === 'page' && String(v) === '1')) params.set(k, String(v));
    });
    const s = params.toString();
    return s ? `/kasus?${s}` : '/kasus';
  };

  // Keep the search box in sync when navigating via links.
  useEffect(() => {
    const input = formRef.current?.elements.namedItem('q') as HTMLInputElement | null;
    if (input && input.value !== filters.q) input.value = filters.q;
  }, [filters.q]);

  const autoSubmit = () => formRef.current && submit(formRef.current, { preventScrollReset: true, replace: true });

  return (
    <div className="container-page pb-20">
      <PageHeader
        kicker="Arsip pemantauan"
        title="Semua kasus"
        description="Telusuri kasus hukum publik menurut tahap, kategori, dan pembaruan terakhir."
        actions={
          <a href="/api/cases/export.csv" className={buttonClass('outline')} download>
            <Download /> Unduh CSV
          </a>
        }
      />

      <Form ref={formRef} method="get" className="card z-30 p-3 sm:p-4 lg:sticky lg:top-20">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input
              name="q"
              type="search"
              defaultValue={filters.q}
              placeholder="Cari judul, nomor perkara, lembaga, atau nama pihak"
              aria-label="Cari kasus"
              className="pl-10"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 lg:flex">
            <Select name="category" defaultValue={filters.category} onChange={autoSubmit} aria-label="Kategori" className="min-w-0 lg:w-48">
              <option value="">Semua kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select name="sort" defaultValue={filters.sort} onChange={autoSubmit} aria-label="Urutkan" className="min-w-0 lg:w-52">
              {SORTS.map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <fieldset className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
          <legend className="sr-only">Tahap</legend>
          <span className="mr-1 text-[13px] text-muted" aria-hidden>
            Tahap
          </span>
          {STATUS_ORDER.map((s) => {
            const checked = filters.status.includes(s);
            return (
              <label
                key={s}
                className={cx(
                  'inline-flex h-8 cursor-pointer select-none items-center rounded-full px-3 text-[13px] font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
                  checked ? 'bg-ink text-on-ink hover:bg-ink/85' : 'bg-ink/[0.06] text-ink-soft hover:bg-ink/[0.1] hover:text-ink',
                )}
              >
                <input type="checkbox" name="status" value={s} defaultChecked={checked} onChange={autoSubmit} className="sr-only" />
                {checked && <Check className="-ml-0.5 mr-1 size-3.5" aria-hidden />}
                {STATUS_LABEL[s]}
              </label>
            );
          })}
          {hasFilters && (
            <Link to="/kasus" className={buttonClass('ghost', 'sm', 'ml-auto text-muted')}>
              <X /> Hapus filter
            </Link>
          )}
        </fieldset>
      </Form>

      <p className={cx('mt-8 text-sm text-muted transition-opacity', searching && 'opacity-50')} aria-live="polite">
        <span className="font-medium text-ink num">{fmtNum(meta.total)}</span> kasus
        {filters.q && (
          <>
            {' '}
            untuk “<span className="text-ink [overflow-wrap:anywhere]">{filters.q}</span>”
          </>
        )}
      </p>

      <div className={cx('mt-4 transition-opacity', searching && 'opacity-50')}>
        {cases.length === 0 ? (
          <EmptyState
            icon={<SearchX />}
            title="Tidak ada kasus yang cocok"
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <LinkButton to="/kasus" variant="outline" size="sm">
                  Lihat semua kasus
                </LinkButton>
                <LinkButton to="/kontribusi/baru" variant="ghost" size="sm">
                  Kirim kontribusi
                </LinkButton>
              </div>
            }
          >
            Coba kata kunci lain atau longgarkan filter. Tahu kasus yang belum kami pantau? Ceritakan lewat formulir kontribusi.
          </EmptyState>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {cases.map((c) => (
              <CaseCard key={c.id} item={c} className="min-w-0" />
            ))}
          </div>
        )}
      </div>

      <div className="mt-10">
        <Pagination page={meta.page} totalPages={meta.totalPages} hrefFor={(p) => qs({ page: p })} />
      </div>
    </div>
  );
}
