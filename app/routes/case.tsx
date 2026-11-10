import { useEffect, useState } from 'react';
import { data, Link, useNavigate } from 'react-router';
import type { ReactNode } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  BellPlus,
  BellRing,
  CalendarClock,
  Check,
  CodeXml,
  Clock,
  ExternalLink,
  FileText,
  MessageSquareWarning,
  Scale,
  Send,
  Share2,
} from 'lucide-react';
import type { Route } from './+types/case';
import { ApiError, publicGet, publicPost } from '~/lib/api';
import { SITE_URL, seo } from '~/lib/seo';
import {
  SOURCE_TYPE_LABEL,
  STAGE_STATUS_LABEL,
  STATUS_HINT,
  STATUS_LABEL,
  cx,
  daysBetween,
  fmtDate,
  fmtDuration,
  fmtShort,
  hostOf,
  slugify,
} from '~/lib/format';
import type { CaseDetail, Source, Stage } from '~/lib/types';
import { api, useSession } from '~/lib/session';
import { StatusRail } from '~/components/StatusRail';
import { RevisionList } from '~/components/RevisionList';
import {
  Alert,
  Badge,
  Breadcrumbs,
  Button,
  CategoryTag,
  Dialog,
  Field,
  Input,
  LinkButton,
  RelTime,
  Select,
  StatBlock,
  Textarea,
  useToast,
} from '~/components/ui';

export async function loader({ params }: Route.LoaderArgs) {
  try {
    const res = await publicGet<CaseDetail>(`/api/cases/${encodeURIComponent(params.slug)}`);
    return { item: res.data };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) throw data('Kasus tidak ditemukan', { status: 404 });
    throw err;
  }
}

function caseJsonLd(c: CaseDetail): Record<string, unknown>[] {
  const url = `${SITE_URL}/kasus/${c.slug}`;
  const firstStage = [...c.stages].sort((a, b) => +new Date(a.startedAt) - +new Date(b.startedAt))[0];
  const citations = [...c.sources, ...c.stages.flatMap((s) => s.sources)]
    .filter((s) => s.isVerified)
    .map((s) => ({ '@type': 'CreativeWork', name: s.title, url: s.url }));
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: c.title,
      description: c.summary || c.description.slice(0, 200),
      datePublished: c.createdAt || firstStage?.startedAt,
      dateModified: c.lastActivityAt,
      url,
      mainEntityOfPage: url,
      inLanguage: 'id-ID',
      about: c.category.name,
      image: `${SITE_URL}/kasus/${c.slug}/og.png`,
      publisher: {
        '@type': 'Organization',
        name: 'Sampai Mana',
        url: SITE_URL,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon-512.png` },
      },
      ...(citations.length > 0 && { citation: citations }),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Beranda', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Kasus', item: `${SITE_URL}/kasus` },
        { '@type': 'ListItem', position: 3, name: c.title, item: url },
      ],
    },
  ];
}

export const meta: Route.MetaFunction = ({ data: d }) => {
  if (!d) return seo({ title: 'Kasus tidak ditemukan', noindex: true });
  const c = d.item;
  return seo({
    title: c.title,
    description: `${STATUS_LABEL[c.currentStatus]} · ${c.summary || c.description.slice(0, 150)}`,
    path: `/kasus/${c.slug}`,
    type: 'article',
    image: `/kasus/${c.slug}/og.png`,
    jsonLd: caseJsonLd(c),
  });
};

/** Card with a header strip. Renders an h2 so the outline stays h1 → h2 → h3. */
function SectionCard({
  id,
  title,
  description,
  action,
  className,
  children,
}: {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={cx('card overflow-hidden', className)}>
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 id={id} className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function SourceItem({ source }: { source: Source }) {
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="text-sm font-medium leading-snug text-ink decoration-line-strong underline-offset-[3px] [overflow-wrap:anywhere] hover:underline"
      >
        {source.title}
        <ExternalLink className="ml-1 inline size-3 -translate-y-px text-muted" aria-hidden />
      </a>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] text-muted">
        <span className="min-w-0 max-w-full truncate">{source.publisher || hostOf(source.url)}</span>
        <span aria-hidden className="text-faint">
          ·
        </span>
        <span>{SOURCE_TYPE_LABEL[source.type]}</span>
        {source.publishedAt && (
          <>
            <span aria-hidden className="text-faint">
              ·
            </span>
            <span className="num">{fmtShort(source.publishedAt)}</span>
          </>
        )}
        {source.isVerified && (
          <Badge tone="outline">
            <Check aria-hidden /> Terverifikasi
          </Badge>
        )}
      </div>
    </li>
  );
}

function TimelineStage({ stage, slug }: { stage: Stage; slug: string }) {
  const active = stage.status === 'AKTIF';
  // An active PUTUSAN stage is the final state, not something still "running".
  const verdict = active && stage.stageType === 'PUTUSAN';
  const end = stage.endedAt ?? (active && !verdict ? new Date().toISOString() : null);
  const duration = end ? daysBetween(stage.startedAt, end) : null;
  const overdue = active && stage.dueAt && new Date(stage.dueAt) < new Date();
  const tone = active ? 'ink' : stage.status === 'SELESAI' ? 'neutral' : 'outline';
  return (
    <li className="group relative grid grid-cols-[12px_minmax(0,1fr)] gap-x-4 pb-8 last:pb-0 sm:gap-x-5" aria-current={active ? 'step' : undefined}>
      <div className="relative flex justify-center" aria-hidden>
        <span
          className={cx(
            'relative z-10 mt-1.5 size-2.5 rounded-full',
            active
              ? 'bg-ink ring-4 ring-ink/10'
              : stage.status === 'SELESAI'
                ? 'bg-ink'
                : 'border border-line-strong bg-raised',
          )}
        />
        <span className="absolute -bottom-1.5 top-[22px] w-px bg-line group-last:hidden" />
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <h3 className="text-sm font-semibold text-ink">{STATUS_LABEL[stage.stageType]}</h3>
          <Badge tone={tone}>{verdict ? 'Diputus' : STAGE_STATUS_LABEL[stage.status]}</Badge>
          <span className="font-mono text-[12px] text-muted num">
            {fmtShort(stage.startedAt)}
            {stage.endedAt && ` – ${fmtShort(stage.endedAt)}`}
          </span>
        </div>
        {stage.title && (
          <p className="mt-2 text-subheading font-semibold leading-snug tracking-[-0.015em] text-ink">{stage.title}</p>
        )}
        {stage.summary && <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{stage.summary}</p>}

        {(duration !== null || stage.dueAt) && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
            {duration !== null && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5" aria-hidden />
                {active ? 'Berjalan' : 'Berlangsung'} <span className="text-ink-soft">{fmtDuration(duration)}</span>
              </span>
            )}
            {stage.dueAt && (
              <span className={cx('inline-flex items-center gap-1.5', overdue && 'font-medium text-ember')}>
                <CalendarClock className="size-3.5" aria-hidden />
                {overdue ? 'Lewat tenggat' : 'Tenggat'} {fmtDate(stage.dueAt)}
              </span>
            )}
          </div>
        )}

        {stage.article && (
          <Link
            to={`/kasus/${slug}/tahap/${stage.id}`}
            className="group/article mt-4 flex items-center gap-3 rounded-lg border border-line p-3 transition-colors hover:border-line-strong hover:bg-ink/[0.03]"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink/[0.06] text-ink">
              <FileText className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] text-muted">Penjelasan redaksi</span>
              <span className="mt-0.5 block text-sm font-medium leading-snug text-ink">{stage.article.title}</span>
            </span>
            <ArrowRight
              className="size-4 shrink-0 text-muted transition-transform group-hover/article:translate-x-0.5 group-hover/article:text-ink"
              aria-hidden
            />
          </Link>
        )}

        {stage.sources.length > 0 && (
          <div className="tile mt-4 p-4">
            <p className="kicker">Sumber tahap ini</p>
            <ul className="mt-3 divide-y divide-line">
              {stage.sources.map((s) => (
                <SourceItem key={s.id} source={s} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </li>
  );
}

function FollowButton({ item }: { item: CaseDetail }) {
  const { status } = useSession();
  const toast = useToast();
  const navigate = useNavigate();
  const [following, setFollowing] = useState<boolean | null>(null);
  const [count, setCount] = useState(item.followerCount);
  const [busy, setBusy] = useState(false);
  const isFollowing = following ?? item.following;

  // The server render is anonymous; refresh the follow state once signed in.
  useEffect(() => {
    if (status !== 'authenticated') return;
    let alive = true;
    api
      .get<CaseDetail>(`/api/cases/${item.slug}`)
      .then((r) => {
        if (!alive) return;
        setFollowing(r.data.following);
        setCount(r.data.followerCount);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [status, item.slug]);

  const toggle = async () => {
    if (status !== 'authenticated') {
      navigate(`/masuk?next=${encodeURIComponent(`/kasus/${item.slug}`)}`);
      return;
    }
    setBusy(true);
    try {
      const res = isFollowing
        ? await api.del<{ following: boolean; followerCount: number }>(`/api/cases/${item.slug}/follow`)
        : await api.post<{ following: boolean; followerCount: number }>(`/api/cases/${item.slug}/follow`);
      setFollowing(res.data.following);
      setCount(res.data.followerCount);
      toast(res.data.following ? 'Anda akan diberi tahu setiap ada perkembangan.' : 'Berhenti mengikuti kasus ini.');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Gagal', 'danger');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant={isFollowing ? 'outline' : 'primary'} onClick={toggle} loading={busy} aria-pressed={isFollowing}>
      {isFollowing ? <BellRing className="size-4" /> : <BellPlus className="size-4" />}
      {isFollowing ? 'Mengikuti' : 'Ikuti kasus'}
      <span className={cx('text-xs num', isFollowing ? 'text-muted' : 'text-on-ink/60')}>{count}</span>
    </Button>
  );
}

function ShareButton({ title }: { title: string }) {
  const toast = useToast();
  const [done, setDone] = useState(false);
  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* cancelled */
      }
    }
    await navigator.clipboard.writeText(url);
    setDone(true);
    toast('Tautan disalin.');
    setTimeout(() => setDone(false), 2000);
  };
  return (
    <Button variant="outline" onClick={share}>
      {done ? <Check className="size-4" /> : <Share2 className="size-4" />}
      Bagikan
    </Button>
  );
}

const RELATIONS = [
  ['PIHAK_TERKAIT', 'Saya pihak yang disebut dalam kasus ini'],
  ['KUASA_HUKUM', 'Saya kuasa hukum pihak terkait'],
  ['JURNALIS', 'Saya jurnalis / peneliti'],
  ['PUBLIK', 'Saya pembaca'],
] as const;

function CorrectionDialog({ open, onClose, slug }: { open: boolean; onClose: () => void; slug: string }) {
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState<string | null>(null);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setErrors({});
    try {
      const res = await publicPost(`/api/cases/${slug}/corrections`, Object.fromEntries(form));
      setSent(res.message ?? 'Terkirim.');
    } catch (err) {
      if (err instanceof ApiError) setErrors({ ...err.fieldErrors, _: err.message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={open}
      onClose={() => {
        onClose();
        setSent(null);
      }}
      title="Ajukan koreksi atau hak jawab"
      description="Redaksi meninjau setiap permintaan. Bila disetujui, catatannya tampil di riwayat perubahan kasus."
    >
      {sent ? (
        <div className="space-y-4">
          <Alert tone="ok" title="Permintaan diterima">
            {sent}
          </Alert>
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          {errors._ && <Alert tone="danger">{errors._}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama" htmlFor="c-name" error={errors.name}>
              <Input id="c-name" name="name" required autoComplete="name" invalid={!!errors.name} />
            </Field>
            <Field label="Email" htmlFor="c-email" error={errors.email} hint="Tidak ditampilkan publik.">
              <Input id="c-email" name="email" type="email" required autoComplete="email" invalid={!!errors.email} />
            </Field>
          </div>
          <Field label="Hubungan Anda dengan kasus" htmlFor="c-rel" error={errors.relation}>
            <Select id="c-rel" name="relation" defaultValue="" required invalid={!!errors.relation}>
              <option value="" disabled>
                Pilih…
              </option>
              {RELATIONS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Apa yang perlu dikoreksi?" htmlFor="c-msg" error={errors.message} hint="Sebutkan bagian yang keliru dan sertakan rujukan bila ada.">
            <Textarea id="c-msg" name="message" rows={6} required minLength={20} invalid={!!errors.message} />
          </Field>
          {/* honeypot */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" loading={busy}>
              <Send className="size-4" /> Kirim permintaan
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

// Metric values on the status card are dates/durations, so step StatBlock down a size.
const statFit = '[&_dd:first-of-type]:text-heading-sm sm:[&_dd:first-of-type]:text-heading';

export default function CasePage({ loaderData }: Route.ComponentProps) {
  const { item } = loaderData;
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const stagesDesc = [...item.stages].sort((a, b) => +new Date(b.startedAt) - +new Date(a.startedAt));
  const active = item.stages.find((s) => s.status === 'AKTIF' && s.stageType === item.currentStatus) ?? stagesDesc[0];
  const decided = item.currentStatus === 'PUTUSAN';
  const runningDays = active ? daysBetween(active.startedAt) : 0;
  const totalDays = item.filedAt ? daysBetween(item.filedAt, decided && active ? active.startedAt : new Date()) : null;
  const overdue = !decided && active?.dueAt && new Date(active.dueAt) < new Date();
  const verified = [...item.sources, ...item.stages.flatMap((s) => s.sources)].filter((s) => s.isVerified).length;
  const facts = (
    [
      ['Nomor perkara', item.caseNumber, true],
      ['Lembaga penangan', item.institution],
      ['Pengadilan', item.court],
      ['Wilayah', item.region],
      ['Mulai', item.filedAt && fmtDate(item.filedAt)],
    ] as const
  ).filter(([, v]) => v);

  return (
    <article className="container-page pb-20">
      <header className="pb-8 pt-8 sm:pb-10 sm:pt-12">
        <Breadcrumbs
          items={[
            { to: '/kasus', label: 'Kasus' },
            { to: `/kasus?category=${item.category.slug}`, label: item.category.name },
            { label: item.caseNumber },
          ]}
        />

        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2">
          <CategoryTag name={item.category.name} color={item.category.color} />
          <span className="h-3.5 w-px bg-line-strong" aria-hidden />
          <span className="min-w-0 break-all font-mono text-[13px] text-muted">{item.caseNumber}</span>
        </div>
        <h1 className="mt-3 max-w-4xl text-heading font-semibold text-ink [overflow-wrap:anywhere] sm:text-heading-lg">{item.title}</h1>
        {item.summary && <p className="mt-4 max-w-3xl text-body-lg leading-relaxed text-muted">{item.summary}</p>}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <FollowButton item={item} />
          <ShareButton title={item.title} />
          <LinkButton to={`/tanam?kasus=${item.slug}`} variant="outline">
            <CodeXml className="size-4" /> Tanam
          </LinkButton>
          <LinkButton to={`/kontribusi/baru?kasus=${item.slug}`} variant="ghost">
            <Send className="size-4" /> Kirim kabar terbaru
          </LinkButton>
        </div>
      </header>

      {/* Where the case stands right now */}
      <section aria-labelledby="posisi" className="card p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="posisi" className="kicker">
            Sampai mana sekarang
          </h2>
          {overdue && <Badge tone="warn">Lewat tenggat</Badge>}
        </div>
        <p className="mt-2 text-heading-sm font-semibold text-ink sm:text-heading">
          {decided ? (
            <>
              Telah diputus
              {active && <span className="text-muted"> · {fmtDate(active.startedAt)}</span>}
            </>
          ) : (
            <>
              Tahap {STATUS_LABEL[item.currentStatus].toLowerCase()},{' '}
              <span className="whitespace-nowrap text-muted">{fmtDuration(runningDays)}</span>
            </>
          )}
        </p>
        <p className="mt-1.5 text-sm text-muted">{STATUS_HINT[item.currentStatus]}</p>

        <StatusRail status={item.currentStatus} stages={item.stages} size="lg" className="mt-8 sm:mt-10" />

        <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-line pt-6 sm:grid-cols-3">
          {totalDays !== null && (
            <StatBlock
              label={decided ? 'Lama proses' : 'Sejak awal'}
              value={fmtDuration(totalDays)}
              hint={item.filedAt ? `Mulai ${fmtShort(item.filedAt)}` : undefined}
              className={statFit}
            />
          )}
          {active?.dueAt && !decided && (
            <StatBlock
              label="Tenggat tahap"
              value={<span className={cx(overdue && 'text-ember')}>{fmtShort(active.dueAt)}</span>}
              hint={overdue ? 'Sudah terlewati' : undefined}
              className={statFit}
            />
          )}
          <StatBlock label="Diperbarui" value={<RelTime date={item.lastActivityAt} />} className={statFit} />
        </dl>

        {overdue && (
          <div className="mt-6">
            <Alert tone="warn">
              Tahap ini melewati tenggat {fmtDate(active!.dueAt)}. Redaksi belum menerima kabar perkembangan baru.
            </Alert>
          </div>
        )}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        <div className="min-w-0 space-y-6">
          <SectionCard id="latar" title="Latar perkara">
            <div className="prose-editorial max-w-3xl px-5 py-5 sm:px-6 sm:py-6">
              {item.description.split(/\n{2,}/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            id="linimasa"
            title="Linimasa perkara"
            description="Terbaru di atas"
            action={<Badge className="num">{item.stages.length} tahap</Badge>}
          >
            <ol className="px-5 py-6 sm:px-6">
              {stagesDesc.map((s) => (
                <TimelineStage key={s.id} stage={s} slug={item.slug} />
              ))}
            </ol>
          </SectionCard>

          <SectionCard
            id="riwayat"
            title="Riwayat perubahan"
            description="Setiap perubahan status, tahapan, sumber, dan koreksi dicatat di sini beserta alasannya."
          >
            <div className="px-5 py-5 sm:px-6">
              <RevisionList revisions={item.revisions} />
            </div>
          </SectionCard>
        </div>

        <aside className="flex min-w-0 flex-col gap-6">
          <SectionCard id="pihak" title="Pihak terkait">
            {item.defendants.length > 0 ? (
              <ul className="divide-y divide-line">
                {item.defendants.map((d) => (
                  <li key={d.id ?? d.name} className="px-5 py-3.5">
                    <p className="text-[15px] font-medium text-ink">
                      {d.slug ? (
                        <Link to={`/orang/${d.slug}`} className="hover:underline">
                          {d.name}
                        </Link>
                      ) : (
                        d.name
                      )}
                    </p>
                    <p className="mt-0.5 text-[13px] text-muted">{d.role}</p>
                    {d.description && <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{d.description}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-4 text-sm text-muted">Belum ada pihak yang dicatat.</p>
            )}
            <p className="flex gap-2 border-t border-line bg-alt px-5 py-4 text-[13px] leading-relaxed text-muted">
              <Scale className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              Semua pihak dianggap tidak bersalah sampai ada putusan berkekuatan hukum tetap.
            </p>
          </SectionCard>

          <SectionCard id="fakta" title="Fakta perkara">
            <dl className="divide-y divide-line">
              {facts.map(([k, v, mono]) => (
                <div key={k} className="px-5 py-3">
                  <dt className="text-[13px] text-muted">{k}</dt>
                  <dd className={cx('mt-0.5 text-sm text-ink', mono && 'break-all font-mono text-[13px]')}>
                    {k === 'Lembaga penangan' && item.institution && slugify(item.institution) ? (
                      <Link to={`/instansi/${slugify(item.institution)}`} className="hover:underline">
                        {v}
                      </Link>
                    ) : (
                      v
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </SectionCard>

          {item.sources.length > 0 && (
            <SectionCard id="sumber" title="Sumber umum" action={<Badge className="num">{item.sources.length}</Badge>}>
              <ul className="divide-y divide-line px-5 py-4">
                {item.sources.map((s) => (
                  <SourceItem key={s.id} source={s} />
                ))}
              </ul>
            </SectionCard>
          )}

          <section aria-labelledby="koreksi" className="card p-5 lg:sticky lg:top-24">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink/[0.06] text-ink">
                <BadgeCheck className="size-4" aria-hidden />
              </span>
              <p className="text-sm font-medium text-ink">
                <span className="num">{verified}</span> sumber terverifikasi
              </p>
            </div>
            <h2 id="koreksi" className="mt-4 text-[15px] font-semibold tracking-[-0.01em] text-ink">
              Koreksi & hak jawab
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              Menemukan kekeliruan, atau Anda pihak yang disebut? Gunakan hak jawab Anda.
            </p>
            <Button variant="outline" className="mt-4 w-full" onClick={() => setCorrectionOpen(true)}>
              <MessageSquareWarning className="size-4" /> Ajukan koreksi
            </Button>
          </section>
        </aside>
      </div>

      <CorrectionDialog open={correctionOpen} onClose={() => setCorrectionOpen(false)} slug={item.slug} />
    </article>
  );
}
