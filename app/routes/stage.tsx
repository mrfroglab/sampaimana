import { data, Link } from 'react-router';
import { ArrowLeft, BadgeCheck, ExternalLink, Link2 } from 'lucide-react';
import type { Route } from './+types/stage';
import { ApiError, publicGet } from '~/lib/api';
import { seo } from '~/lib/seo';
import { SOURCE_TYPE_LABEL, STAGE_STATUS_LABEL, STATUS_LABEL, fmtDate, fmtShort, hostOf } from '~/lib/format';
import type { Article, Stage } from '~/lib/types';
import { Badge } from '~/components/ui';

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
  return (
    <article className="container-page max-w-3xl pt-10">
      <Link to={`/kasus/${stage.case.slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> {stage.case.title}
      </Link>

      <header className="mt-8 border-b border-line pb-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="kicker text-accent-ink">Tahap {STATUS_LABEL[stage.stageType]}</span>
          <Badge>{STAGE_STATUS_LABEL[stage.status]}</Badge>
        </div>
        <h1 className="mt-4 font-serif text-headline font-medium tracking-[-0.02em] text-ink">
          {a?.title ?? stage.title ?? STATUS_LABEL[stage.stageType]}
        </h1>
        <p className="mt-4 text-sm text-muted">
          {fmtDate(stage.startedAt)}
          {stage.endedAt && ` – ${fmtDate(stage.endedAt)}`}
          {a?.author && <> · Ditulis oleh {a.author.name}</>}
          {a?.updatedAt && a.updatedAt !== a.publishedAt && <> · Diperbarui {fmtShort(a.updatedAt)}</>}
        </p>
      </header>

      {a ? (
        <div className="prose-editorial mt-8">
          {a.content.split(/\n{2,}/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      ) : (
        <p className="mt-8 text-muted">Redaksi belum menerbitkan penjelasan untuk tahap ini.</p>
      )}

      {stage.sources.length > 0 && (
        <section className="mt-14 border-t-2 border-ink pt-4">
          <h2 className="kicker text-ink">Sumber</h2>
          <ol className="mt-3 space-y-3">
            {stage.sources.map((s, i) => (
              <li key={s.id} className="grid grid-cols-[28px_1fr] gap-2">
                <span className="font-mono text-sm text-faint">{i + 1}.</span>
                <div>
                  <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="link text-ink">
                    {s.title}
                    <ExternalLink className="ml-1 inline size-3 text-faint" />
                  </a>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                    {s.isVerified ? <BadgeCheck className="size-3.5 text-ok" /> : <Link2 className="size-3.5" />}
                    {s.publisher || hostOf(s.url)} · {SOURCE_TYPE_LABEL[s.type]}
                    {s.isVerified && ' · terverifikasi'}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <aside className="mt-14 border border-line bg-raised p-5 text-[13px] leading-relaxed text-muted">
        Artikel ini ditulis redaksi Sampai Mana berdasarkan sumber yang tercantum. Penyebutan nama tidak berarti seseorang bersalah
        sebelum ada putusan berkekuatan hukum tetap.{' '}
        <Link to={`/kasus/${stage.case.slug}`} className="link">
          Ajukan koreksi
        </Link>{' '}
        bila menemukan kekeliruan.
      </aside>
    </article>
  );
}
