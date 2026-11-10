import type { ReactNode } from 'react';
import { ApiError, publicGet } from '~/lib/api';
import { STATUS_LABEL, STATUS_ORDER } from '~/lib/format';
import {
  C,
  MONO,
  SITE_HOST,
  cardShell,
  cleanText,
  dotSep,
  h,
  renderPng,
  statusRail,
  wordmark,
  type RailStation,
} from '~/lib/og.server';
import type { CaseDetail } from '~/lib/types';
import type { Route } from './+types/case-og';

const SLUG_RE = /^[a-z0-9-]{1,120}$/;
const CACHE_MAX = 200;
const cache = new Map<string, Buffer>();

/** Card inner width: 1200 - 2*48 inset - 2px border - 2*52 padding. */
const RAIL_W = 998;

const HEADERS = {
  'Content-Type': 'image/png',
  'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
};

const png = (body: Buffer) => new Response(new Uint8Array(body), { headers: HEADERS });
const fallback = () => new Response(null, { status: 302, headers: { Location: '/og.png', 'Cache-Control': 'public, max-age=300' } });

/** Title font size steps down with length; the box clamps to 3 lines. */
const titleSize = (len: number) => (len <= 30 ? 64 : len <= 60 ? 56 : len <= 110 ? 48 : 42);

function stations(c: CaseDetail): RailStation[] {
  const idx = STATUS_ORDER.indexOf(c.currentStatus);
  const visited = new Set(c.stages?.map((s) => s.stageType) ?? STATUS_ORDER.slice(0, idx + 1));
  return STATUS_ORDER.map((s, i) => ({
    label: STATUS_LABEL[s],
    state: i === idx ? 'current' : i < idx ? (visited.has(s) ? 'past' : 'skipped') : 'future',
  }));
}

function card(c: CaseDetail): ReactNode {
  const title = cleanText(c.title, 200) || 'Kasus hukum';
  const caseNumber = cleanText(c.caseNumber, 60);
  const category = cleanText(c.category?.name, 40);
  const where = cleanText([c.institution, c.court].filter(Boolean).join(' · ') || c.region || 'Pelacak publik kasus hukum', 70);

  return cardShell([
    // top row
    h('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44 }, [
      wordmark(),
      category &&
        h('div', { display: 'flex', alignItems: 'center', fontSize: 24, fontWeight: 500, color: C.muted }, [
          dotSep(10, C.ink),
          h('div', { display: 'flex', marginLeft: 12 }, category),
        ]),
    ]),
    // title + case number
    h('div', { display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center', paddingTop: 12, paddingBottom: 12 }, [
      h(
        'div',
        {
          display: 'block',
          fontSize: titleSize(title.length),
          fontWeight: 600,
          letterSpacing: '-0.01em',
          lineHeight: 1.08,
          color: C.ink,
          lineClamp: 3,
          textOverflow: 'ellipsis',
          wordBreak: 'break-word',
        },
        title,
      ),
      caseNumber && h('div', { display: 'flex', marginTop: 20, fontFamily: MONO, fontSize: 24, color: C.muted }, `No. ${caseNumber}`),
    ]),
    // status rail
    h('div', { display: 'flex', marginTop: 8 }, statusRail({ stations: stations(c), done: c.currentStatus === 'PUTUSAN', width: RAIL_W })),
    // bottom row
    h(
      'div',
      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, paddingTop: 20, borderTop: `1px solid ${C.line}` },
      [
        h('div', { display: 'flex', fontSize: 24, color: C.muted, maxWidth: 640, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }, where),
        h('div', { display: 'flex', fontFamily: MONO, fontSize: 24, color: C.ink }, SITE_HOST),
      ],
    ),
  ]);
}

export async function loader({ params }: Route.LoaderArgs) {
  const slug = params.slug ?? '';
  if (!SLUG_RE.test(slug)) throw new Response('Not found', { status: 404 });

  let c: CaseDetail;
  try {
    c = (await publicGet<CaseDetail>(`/api/cases/${slug}`)).data;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) throw new Response('Not found', { status: 404 });
    return fallback();
  }

  // the API also sends updatedAt, which CaseDetail does not declare
  const updatedAt = (c as CaseDetail & { updatedAt?: string }).updatedAt;
  const key = `${slug}:${updatedAt || c.lastActivityAt}:${c.currentStatus}`;
  const hit = cache.get(key);
  if (hit) {
    // refresh recency (Map keeps insertion order)
    cache.delete(key);
    cache.set(key, hit);
    return png(hit);
  }

  try {
    const body = await renderPng(card(c));
    cache.set(key, body);
    while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
    return png(body);
  } catch (e) {
    console.error('[og] render failed for', slug, e);
    return fallback();
  }
}
