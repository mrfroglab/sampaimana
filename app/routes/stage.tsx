import { data, Link } from 'react-router';
import { ArrowLeft, CalendarDays, Check, ExternalLink, FileText, Scale } from 'lucide-react';
import type { Route } from './+types/stage';
import { ApiError, publicGet } from '~/lib/api';
import { seo } from '~/lib/seo';
import { SOURCE_TYPE_LABEL, STAGE_STATUS_LABEL, STATUS_LABEL, fmtDate, fmtShort, hostOf } from '~/lib/format';
import type { Article, Stage } from '~/lib/types';
import { Badge, Breadcrumbs, EmptyState, LinkButton } from '~/components/ui';

type StageWithArticle = Stage & {
  article: Article | null;
  case: { title: string; slug: string; caseNumber: string };
};

export async function loader({ params }: Route.LoaderArgs) {
  try {
    const res = await publicGet<StageWithArticle>(
      `/api/cases/${encodeURIComponent(params.slug)}/stages/${encodeURIComponent(params.stageId)}`,
    );
    return { stage: res.data };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) throw data('Tidak ditemukan', { status: 404 });
    throw err;
  }
}

export const meta: Route.MetaFunction = ({ data: d }) =>
  d
    ? seo({
        title: d.stage.article?.title ?? `${STATUS_LABEL[d.stage.stageType]} — ${d.stage.case.title}`,
        description: d.stage.article?.content.slice(0, 160) ?? d.stage.case.title,
        path: `/kasus/${d.stage.case.slug}/tahap/${d.stage.id}`,
        type: 'article',
      })
    : seo({ title: 'Tidak ditemukan', noindex: true });

export default function StagePage({ loaderData }: Route.ComponentProps) {
  const { stage } = loaderData;
  const a = stage.article;
  const caseHref = `/kasus/${stage.case.slug}`;
  const statusTone = stage.status === 'AKTIF' ? 'ink' : stage.status === 'SELESAI' ? 'neutral' : 'outline';
  return (
    <article className="container-page max-w-3xl pb-20">
      <header className="pb-8 pt-8 sm:pt-12">
        <Breadcrumbs
          items={[
            { to: '/kasus', label: 'Kasus' },
            { to: caseHref, label: stage.case.title },
            { label: `Tahap ${STATUS_LABEL[stage.stageType]}` },
          ]}
        />
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-medium text-ink">Tahap {STATUS_LABEL[stage.stageType]}</span>
          <Badge tone={statusTone}>{STAGE_STATUS_LABEL[stage.status]}</Badge>
          <span className="min-w-0 break-all font-mono text-[12px] text-muted">{stage.case.caseNumber}</span>
        </div>
        <h1 className="mt-3 text-heading font-semibold text-ink [overflow-wrap:anywhere] sm:text-heading-lg">
          {a?.title ?? stage.title ?? STATUS_LABEL[stage.stageType]}
        </h1>
        <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" aria-hidden />
            {fmtDate(stage.startedAt)}
            {stage.endedAt && ` – ${fmtDate(stage.endedAt)}`}
          </span>
          {a?.author && (
            <>
              <span aria-hidden className="text-faint">
                ·
              </span>
              <span>Ditulis oleh {a.author.name}</span>
            </>
          )}
          {a?.updatedAt && a.updatedAt !== a.publishedAt && (
            <>
              <span aria-hidden className="text-faint">
                ·
              </span>
              <span>Diperbarui {fmtShort(a.updatedAt)}</span>
            </>
          )}
        </p>
      </header>

      {a ? (
        <div className="card px-5 py-6 sm:px-10 sm:py-10">
          <div className="prose-editorial">
            {a.content.split(/\n{2,}/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState icon={<FileText />} title="Belum ada penjelasan">
          Redaksi belum menerbitkan penjelasan untuk tahap ini.
        </EmptyState>
      )}

      {stage.sources.length > 0 && (
        <section aria-labelledby="sumber" className="card mt-6 overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
            <h2 id="sumber" className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
              Sumber
            </h2>
            <Badge className="num">{stage.sources.length}</Badge>
          </div>
          <ol className="divide-y divide-line">
            {stage.sources.map((s, i) => (
              <li key={s.id} className="grid grid-cols-[24px_minmax(0,1fr)] gap-2 px-5 py-3.5 sm:px-6">
                <span className="pt-px font-mono text-[13px] text-muted num">{i + 1}.</span>
                <div className="min-w-0">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-sm font-medium leading-snug text-ink decoration-line-strong underline-offset-[3px] [overflow-wrap:anywhere] hover:underline"
                  >
                    {s.title}
                    <ExternalLink className="ml-1 inline size-3 -translate-y-px text-muted" aria-hidden />
                  </a>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] text-muted">
                    <span className="min-w-0 max-w-full truncate">{s.publisher || hostOf(s.url)}</span>
                    <span aria-hidden className="text-faint">
                      ·
                    </span>
                    <span>{SOURCE_TYPE_LABEL[s.type]}</span>
                    {s.isVerified && (
                      <Badge tone="outline">
                        <Check aria-hidden /> Terverifikasi
                      </Badge>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <aside className="mt-6 flex gap-3 rounded-2xl border border-line bg-alt px-5 py-4 text-[13px] leading-relaxed text-muted">
        <Scale className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          Artikel ini ditulis redaksi Sampai Mana berdasarkan sumber yang tercantum. Penyebutan nama tidak berarti seseorang bersalah
          sebelum ada putusan berkekuatan hukum tetap.{' '}
          <Link to={caseHref} className="link text-ink">
            Ajukan koreksi
          </Link>{' '}
          bila menemukan kekeliruan.
        </p>
      </aside>

      <div className="mt-8">
        <LinkButton to={caseHref} variant="ghost" className="-ml-3">
          <ArrowLeft /> Kembali ke kasus
        </LinkButton>
      </div>
    </article>
  );
}
