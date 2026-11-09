import { useEffect, useState } from 'react';
import { data, Link, useNavigate } from 'react-router';
import {
  ArrowRight,
  BadgeCheck,
  BellPlus,
  BellRing,
  CalendarClock,
  Check,
  ExternalLink,
  FileText,
  Link2,
  MessageSquareWarning,
  Scale,
  Send,
  Share2,
} from 'lucide-react';
import type { Route } from './+types/case';
import { ApiError, publicGet, publicPost } from '~/lib/api';
import { seo } from '~/lib/seo';
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
} from '~/lib/format';
import type { CaseDetail, Source, Stage } from '~/lib/types';
import { api, useSession } from '~/lib/session';
import { StatusRail } from '~/components/StatusRail';
import { RevisionList } from '~/components/RevisionList';
import { Alert, Badge, Button, CategoryTag, Dialog, Field, Input, LinkButton, RelTime, Select, Textarea, useToast } from '~/components/ui';

export async function loader({ params }: Route.LoaderArgs) {
  try {
    const res = await publicGet<CaseDetail>(`/api/cases/${encodeURIComponent(params.slug)}`);
    return { item: res.data };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) throw data('Kasus tidak ditemukan', { status: 404 });
    throw err;
  }
}

export const meta: Route.MetaFunction = ({ data: d }) => {
  if (!d) return seo({ title: 'Kasus tidak ditemukan', noindex: true });
  const c = d.item;
  return seo({
    title: c.title,
    description: `${STATUS_LABEL[c.currentStatus]} · ${c.summary || c.description.slice(0, 150)}`,
    path: `/kasus/${c.slug}`,
    type: 'article',
  });
};

function SourceItem({ source }: { source: Source }) {
  return (
    <li className="flex gap-3 py-2.5">
      {source.isVerified ? (
        <BadgeCheck className="mt-0.5 size-4 shrink-0 text-ok" aria-label="Terverifikasi" />
      ) : (
        <Link2 className="mt-0.5 size-4 shrink-0 text-faint" aria-hidden />
      )}
      <div className="min-w-0">
        <a href={source.url} target="_blank" rel="noopener noreferrer nofollow" className="link text-[14.5px] leading-snug text-ink">
          {source.title}
          <ExternalLink className="ml-1 inline size-3 -translate-y-px text-faint" aria-hidden />
        </a>
        <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted">
          <span>{source.publisher || hostOf(source.url)}</span>
          <span aria-hidden>·</span>
          <span>{SOURCE_TYPE_LABEL[source.type]}</span>
          {source.publishedAt && (
            <>
              <span aria-hidden>·</span>
              <span>{fmtShort(source.publishedAt)}</span>
            </>
          )}
          {source.isVerified && (
            <>
              <span aria-hidden>·</span>
              <span className="text-ok">terverifikasi redaksi</span>
            </>
          )}
        </p>
      </div>
    </li>
  );
}

function TimelineStage({ stage, slug, isLatest }: { stage: Stage; slug: string; isLatest: boolean }) {
  const active = stage.status === 'AKTIF';
  // An active PUTUSAN stage is the final state, not something still "running".
  const verdict = active && stage.stageType === 'PUTUSAN';
  const end = stage.endedAt ?? (active && !verdict ? new Date().toISOString() : null);
  const duration = end ? daysBetween(stage.startedAt, end) : null;
  const overdue = active && stage.dueAt && new Date(stage.dueAt) < new Date();
  return (
    <li className="group relative grid grid-cols-[22px_1fr] gap-x-5 pb-10 last:pb-0 sm:grid-cols-[110px_22px_1fr]">
      <div className="hidden pt-0.5 text-right sm:block">
        <p className="font-mono text-[12px] text-ink num">{fmtShort(stage.startedAt)}</p>
        {stage.endedAt && <p className="mt-0.5 font-mono text-[11px] text-faint num">s.d. {fmtShort(stage.endedAt)}</p>}
      </div>
      <div className="relative flex justify-center">
        <span
          className={cx(
            'relative z-10 mt-1 size-[14px] rounded-full border-2',
            active ? (stage.stageType === 'PUTUSAN' ? 'border-ink bg-ink' : 'animate-pulse-dot border-accent bg-accent') : stage.status === 'SELESAI' ? 'border-ink bg-ink' : 'border-line-strong bg-paper',
          )}
        />
        <span className="absolute bottom-[-6px] top-5 w-[2px] bg-line-strong group-last:hidden" aria-hidden />
      </div>
      <div className={cx('min-w-0 pb-1', isLatest && 'rounded-[3px]')}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="kicker text-ink">{STATUS_LABEL[stage.stageType]}</span>
          <Badge tone={active ? (stage.stageType === 'PUTUSAN' ? 'ink' : 'accent') : stage.status === 'SELESAI' ? 'neutral' : 'warn'}>
            {verdict ? 'Diputus' : STAGE_STATUS_LABEL[stage.status]}
          </Badge>
          <span className="font-mono text-[11px] text-muted sm:hidden">{fmtShort(stage.startedAt)}</span>
        </div>
        {stage.title && <h3 className="mt-2 font-serif text-[1.4rem] leading-snug text-ink">{stage.title}</h3>}
        {stage.summary && <p className="mt-2 leading-relaxed text-ink-soft">{stage.summary}</p>}

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted">
          {duration !== null && (
            <span>
              {active ? 'Berjalan' : 'Berlangsung'} <span className="text-ink-soft">{fmtDuration(duration)}</span>
            </span>
          )}
          {stage.dueAt && (
            <span className={cx('inline-flex items-center gap-1', overdue && 'font-medium text-warn')}>
              <CalendarClock className="size-3.5" />
              {overdue ? 'Lewat tenggat' : 'Tenggat'} {fmtDate(stage.dueAt)}
            </span>
          )}
        </div>

        {stage.article && (
          <Link
            to={`/kasus/${slug}/tahap/${stage.id}`}
            className="group mt-4 flex items-start gap-3 border border-line bg-raised p-4 transition-colors hover:border-ink"
          >
            <FileText className="mt-0.5 size-5 shrink-0 text-accent" />
            <span className="min-w-0">
              <span className="kicker">Penjelasan redaksi</span>
              <span className="mt-1 block font-serif text-[1.1rem] leading-snug text-ink group-hover:underline">{stage.article.title}</span>
            </span>
            <ArrowRight className="ml-auto mt-1 size-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}

        {stage.sources.length > 0 && (
          <div className="mt-4">
            <p className="kicker">Sumber tahap ini</p>
            <ul className="mt-1 divide-y divide-line">
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
      <span className={cx('font-mono text-xs num', isFollowing ? 'text-muted' : 'text-paper/70')}>{count}</span>
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
          <div className="flex justify-end gap-2 pt-2">
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

  return (
    <article>
      <header className="border-b border-line paper-grain">
        <div className="container-page pb-10 pt-8">
          <nav aria-label="Remah roti" className="flex items-center gap-2 text-[13px] text-muted">
            <Link to="/kasus" className="hover:text-ink">
              Kasus
            </Link>
            <span aria-hidden>/</span>
            <Link to={`/kasus?category=${item.category.slug}`} className="hover:text-ink">
              {item.category.name}
            </Link>
          </nav>

          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
            <CategoryTag name={item.category.name} color={item.category.color} />
            <span className="font-mono text-[12px] text-muted">{item.caseNumber}</span>
          </div>
          <h1 className="mt-3 max-w-4xl font-serif text-headline font-medium tracking-[-0.02em] text-ink">{item.title}</h1>
          {item.summary && <p className="mt-4 max-w-3xl font-serif text-xl leading-relaxed text-ink-soft">{item.summary}</p>}

          <div className="mt-6 flex flex-wrap gap-2">
            <FollowButton item={item} />
            <ShareButton title={item.title} />
            <LinkButton to={`/kontribusi/baru?kasus=${item.slug}`} variant="ghost">
              <Send className="size-4" /> Kirim kabar terbaru
            </LinkButton>
          </div>

          <div className="mt-10 border border-line-strong bg-raised p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="kicker">Sampai mana sekarang</p>
                <p className="mt-2 font-serif text-[1.9rem] leading-tight text-ink">
                  {decided ? (
                    <>Telah diputus {active && <span className="text-muted">· {fmtDate(active.startedAt)}</span>}</>
                  ) : (
                    <>
                      Tahap <span className="text-accent-ink">{STATUS_LABEL[item.currentStatus].toLowerCase()}</span>,{' '}
                      <span className="whitespace-nowrap">{fmtDuration(runningDays)}</span>
                    </>
                  )}
                </p>
                <p className="mt-1 text-sm text-muted">{STATUS_HINT[item.currentStatus]}</p>
              </div>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                {totalDays !== null && (
                  <>
                    <dt className="text-muted">{decided ? 'Lama proses' : 'Sejak awal'}</dt>
                    <dd className="text-right font-mono text-ink num">{fmtDuration(totalDays)}</dd>
                  </>
                )}
                {active?.dueAt && !decided && (
                  <>
                    <dt className="text-muted">Tenggat tahap</dt>
                    <dd className={cx('text-right font-mono num', overdue ? 'text-warn' : 'text-ink')}>{fmtShort(active.dueAt)}</dd>
                  </>
                )}
                <dt className="text-muted">Diperbarui</dt>
                <dd className="text-right font-mono text-ink">
                  <RelTime date={item.lastActivityAt} />
                </dd>
              </dl>
            </div>
            <StatusRail status={item.currentStatus} stages={item.stages} size="lg" className="mt-8" />
            {overdue && (
              <p className="mt-6 border-l-2 border-warn pl-3 text-sm text-warn">
                Tahap ini melewati tenggat {fmtDate(active!.dueAt)}. Redaksi belum menerima kabar perkembangan baru.
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="container-page mt-12 grid gap-14 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <section aria-labelledby="latar">
            <h2 id="latar" className="kicker text-ink">
              Latar perkara
            </h2>
            <div className="mt-3 max-w-3xl font-serif text-[1.13rem] leading-[1.75] text-ink-soft">
              {item.description.split(/\n{2,}/).map((p, i) => (
                <p key={i} className={i ? 'mt-4' : ''}>
                  {p}
                </p>
              ))}
            </div>
          </section>

          <section aria-labelledby="linimasa" className="mt-14">
            <div className="flex items-end justify-between border-t-2 border-ink pt-3">
              <div>
                <p className="kicker">Terbaru di atas</p>
                <h2 id="linimasa" className="mt-1 font-serif text-[1.65rem] text-ink">
                  Linimasa perkara
                </h2>
              </div>
              <p className="font-mono text-xs text-muted">{item.stages.length} tahap</p>
            </div>
            <ol className="mt-8">
              {stagesDesc.map((s, i) => (
                <TimelineStage key={s.id} stage={s} slug={item.slug} isLatest={i === 0} />
              ))}
            </ol>
          </section>

          <section aria-labelledby="riwayat" className="mt-16">
            <div className="flex items-end justify-between border-t-2 border-ink pt-3">
              <div>
                <p className="kicker">Transparansi redaksi</p>
                <h2 id="riwayat" className="mt-1 font-serif text-[1.65rem] text-ink">
                  Riwayat perubahan
                </h2>
              </div>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Setiap perubahan status, tahapan, sumber, dan koreksi dicatat di sini beserta alasannya.
            </p>
            <div className="mt-4">
              <RevisionList revisions={item.revisions} />
            </div>
          </section>
        </div>

        <aside className="space-y-10 lg:sticky lg:top-24 lg:self-start">
          <section>
            <h2 className="kicker text-ink">Pihak terkait</h2>
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {item.defendants.map((d) => (
                <li key={d.id ?? d.name} className="py-3">
                  <p className="font-serif text-[1.1rem] text-ink">{d.name}</p>
                  <p className="mt-0.5 text-[13px] text-muted">{d.role}</p>
                  {d.description && <p className="mt-1 text-[13px] text-ink-soft">{d.description}</p>}
                </li>
              ))}
            </ul>
            <p className="mt-3 flex gap-2 text-[12.5px] leading-relaxed text-muted">
              <Scale className="mt-0.5 size-3.5 shrink-0" />
              Semua pihak dianggap tidak bersalah sampai ada putusan berkekuatan hukum tetap.
            </p>
          </section>

          <section>
            <h2 className="kicker text-ink">Fakta perkara</h2>
            <dl className="mt-3 space-y-3 text-sm">
              {(
                [
                  ['Nomor perkara', item.caseNumber, true],
                  ['Lembaga penangan', item.institution],
                  ['Pengadilan', item.court],
                  ['Wilayah', item.region],
                  ['Mulai', item.filedAt && fmtDate(item.filedAt)],
                ] as const
              )
                .filter(([, v]) => v)
                .map(([k, v, mono]) => (
                  <div key={k}>
                    <dt className="text-xs text-muted">{k}</dt>
                    <dd className={cx('mt-0.5 text-ink', mono && 'break-all font-mono text-[13px]')}>{v}</dd>
                  </div>
                ))}
            </dl>
          </section>

          {item.sources.length > 0 && (
            <section>
              <h2 className="kicker text-ink">Sumber umum</h2>
              <ul className="mt-2 divide-y divide-line">
                {item.sources.map((s) => (
                  <SourceItem key={s.id} source={s} />
                ))}
              </ul>
            </section>
          )}

          <section className="border border-line bg-raised p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-ink">
              <BadgeCheck className="size-4 text-ok" /> {verified} sumber terverifikasi
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              Menemukan kekeliruan, atau Anda pihak yang disebut? Gunakan hak jawab Anda.
            </p>
            <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => setCorrectionOpen(true)}>
              <MessageSquareWarning className="size-4" /> Ajukan koreksi
            </Button>
          </section>
        </aside>
      </div>

      <CorrectionDialog open={correctionOpen} onClose={() => setCorrectionOpen(false)} slug={item.slug} />
    </article>
  );
}
