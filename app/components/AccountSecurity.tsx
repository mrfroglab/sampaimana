import { useCallback, useEffect, useState } from 'react';
import { Laptop, ShieldCheck, Smartphone } from 'lucide-react';
import { ApiError, api, updateUser } from '~/lib/session';
import type { User } from '~/lib/types';
import { Alert, Badge, Button, CardHeader, Dialog, Field, Input, RelTime, Skeleton, useToast } from '~/components/ui';

const STAFF = ['SUPER_ADMIN', 'EDITOR', 'VIEWER'];

/** "Chrome · Windows" from a user-agent string; good enough to recognise a device. */
export function deviceLabel(ua?: string | null) {
  if (!ua) return 'Perangkat tidak dikenal';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Peramban';
  const os = /Android/.test(ua)
    ? 'Android'
    : /iPhone|iPad/.test(ua)
      ? 'iOS'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Mac OS X/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : null;
  return os ? `${browser} · ${os}` : browser;
}

function RecoveryCodes({ codes }: { codes: string[] }) {
  const toast = useToast();
  const text = codes.join('\n');
  return (
    <div className="space-y-3">
      <Alert tone="warn" title="Simpan kode ini sekarang">
        Kode pemulihan hanya ditampilkan sekali. Pakai salah satunya bila ponsel Anda hilang. Setiap kode hanya berlaku
        satu kali.
      </Alert>
      <ol className="grid grid-cols-2 gap-2 rounded-2xl border border-line bg-alt p-4 font-mono text-sm text-ink">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigator.clipboard.writeText(text).then(() => toast('Kode disalin.'))}
        >
          Salin
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const url = URL.createObjectURL(new Blob([`Kode pemulihan Sampai Mana\n\n${text}\n`], { type: 'text/plain' }));
            Object.assign(document.createElement('a'), { href: url, download: 'sampaimana-kode-pemulihan.txt' }).click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
        >
          Unduh .txt
        </Button>
      </div>
    </div>
  );
}

type Setup = { secret: string; otpauthUrl: string; qrSvg: string };

function TwoFactor({ user }: { user: User }) {
  const toast = useToast();
  const enabled = Boolean(user.twoFactorEnabled);
  const [mode, setMode] = useState<null | 'setup' | 'disable' | 'regenerate'>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    setMode(null);
    setSetup(null);
    setCodes(null);
    setError(null);
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Terjadi kesalahan. Coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  const startSetup = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get('password'));
    run(async () => {
      const res = await api.post<Setup>('/api/auth/2fa/setup', { password });
      setSetup(res.data);
    });
  };

  const confirmSetup = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get('code'));
    run(async () => {
      const res = await api.post<{ recoveryCodes: string[] }>('/api/auth/2fa/enable', { code });
      setCodes(res.data.recoveryCodes);
      updateUser({ ...user, twoFactorEnabled: true });
      toast('Verifikasi dua langkah aktif.');
    });
  };

  const confirmWithCode = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = { password: String(form.get('password')), code: String(form.get('code')) };
    run(async () => {
      if (mode === 'disable') {
        await api.post('/api/auth/2fa/disable', body);
        updateUser({ ...user, twoFactorEnabled: false });
        toast('Verifikasi dua langkah dimatikan.');
        close();
      } else {
        const res = await api.post<{ recoveryCodes: string[] }>('/api/auth/2fa/recovery-codes', body);
        setCodes(res.data.recoveryCodes);
      }
    });
  };

  const staff = STAFF.includes(user.role);

  return (
    <section className="card overflow-hidden">
      <CardHeader
        title="Verifikasi dua langkah"
        description="Selain kata sandi, minta kode dari aplikasi autentikator (Google Authenticator, Aegis, 1Password, dll.) saat masuk."
        action={enabled ? <Badge tone="ink">Aktif</Badge> : <Badge>Nonaktif</Badge>}
      />
      <div className="space-y-4 p-5">
        {!enabled && staff && (
          <Alert tone="warn">Akun redaksi bisa mengubah data kasus. Sangat disarankan mengaktifkan verifikasi dua langkah.</Alert>
        )}
        <div className="flex flex-wrap gap-2">
          {enabled ? (
            <>
              <Button variant="outline" onClick={() => setMode('regenerate')}>
                Buat ulang kode pemulihan
              </Button>
              <Button variant="ghost" onClick={() => setMode('disable')}>
                Matikan
              </Button>
            </>
          ) : (
            <Button onClick={() => setMode('setup')}>
              <ShieldCheck /> Aktifkan
            </Button>
          )}
        </div>
      </div>

      <Dialog
        open={mode === 'setup'}
        onClose={close}
        title="Aktifkan verifikasi dua langkah"
        description={codes ? undefined : setup ? 'Pindai kode QR, lalu masukkan kode 6 digit yang muncul.' : 'Konfirmasi kata sandi Anda dulu.'}
      >
        <div className="space-y-4">
          {error && <Alert tone="danger">{error}</Alert>}
          {codes ? (
            <>
              <RecoveryCodes codes={codes} />
              <div className="flex justify-end">
                <Button onClick={close}>Sudah saya simpan</Button>
              </div>
            </>
          ) : setup ? (
            <form onSubmit={confirmSetup} className="space-y-4">
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                <img
                  src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(setup.qrSvg)}`}
                  alt="Kode QR untuk aplikasi autentikator"
                  className="size-44 shrink-0 rounded-2xl border border-line bg-white p-2"
                />
                <div className="min-w-0 space-y-2 text-sm text-muted">
                  <p>Tidak bisa memindai? Masukkan kunci ini secara manual:</p>
                  <code className="block break-all rounded-lg bg-sunk px-3 py-2 font-mono text-[13px] text-ink">{setup.secret}</code>
                </div>
              </div>
              <Field label="Kode 6 digit" htmlFor="setup-code">
                <Input id="setup-code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required autoFocus className="font-mono" />
              </Field>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={close}>
                  Batal
                </Button>
                <Button type="submit" loading={busy}>
                  Aktifkan
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={startSetup} className="space-y-4">
              <Field label="Kata sandi" htmlFor="setup-password">
                <Input id="setup-password" name="password" type="password" autoComplete="current-password" required autoFocus />
              </Field>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={close}>
                  Batal
                </Button>
                <Button type="submit" loading={busy}>
                  Lanjut
                </Button>
              </div>
            </form>
          )}
        </div>
      </Dialog>

      <Dialog
        open={mode === 'disable' || mode === 'regenerate'}
        onClose={close}
        title={mode === 'disable' ? 'Matikan verifikasi dua langkah' : 'Buat ulang kode pemulihan'}
        description={codes ? undefined : 'Masukkan kata sandi dan kode dari aplikasi (atau kode pemulihan).'}
      >
        <div className="space-y-4">
          {error && <Alert tone="danger">{error}</Alert>}
          {codes ? (
            <>
              <RecoveryCodes codes={codes} />
              <div className="flex justify-end">
                <Button onClick={close}>Selesai</Button>
              </div>
            </>
          ) : (
            <form onSubmit={confirmWithCode} className="space-y-4">
              <Field label="Kata sandi" htmlFor="confirm-password">
                <Input id="confirm-password" name="password" type="password" autoComplete="current-password" required autoFocus />
              </Field>
              <Field label="Kode" htmlFor="confirm-code">
                <Input id="confirm-code" name="code" autoComplete="one-time-code" required className="font-mono" />
              </Field>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={close}>
                  Batal
                </Button>
                <Button type="submit" variant={mode === 'disable' ? 'danger' : 'primary'} loading={busy}>
                  {mode === 'disable' ? 'Matikan' : 'Buat kode baru'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Dialog>
    </section>
  );
}

type Session = { id: string; userAgent: string | null; lastActiveAt: string; signedInAt: string; current: boolean };

function Sessions() {
  const toast = useToast();
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .get<Session[]>('/api/auth/sessions')
      .then((r) => setSessions(r.data))
      .catch(() => setSessions([]));
  }, []);
  useEffect(load, [load]);

  const revoke = async (id: string | 'others') => {
    setBusy(id);
    try {
      if (id === 'others') await api.post('/api/auth/sessions/revoke-others');
      else await api.del(`/api/auth/sessions/${id}`);
      toast(id === 'others' ? 'Semua perangkat lain dikeluarkan.' : 'Perangkat dikeluarkan.');
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Gagal', 'danger');
    } finally {
      setBusy(null);
    }
  };

  const others = sessions?.filter((s) => !s.current).length ?? 0;

  return (
    <section className="card overflow-hidden">
      <CardHeader
        title="Perangkat yang masuk"
        description="Keluarkan perangkat yang tidak Anda kenali, lalu ganti kata sandi."
        action={
          others > 0 ? (
            <Button variant="outline" size="sm" loading={busy === 'others'} onClick={() => revoke('others')}>
              Keluarkan semua yang lain
            </Button>
          ) : undefined
        }
      />
      <ul className="divide-y divide-line">
        {sessions === null &&
          [0, 1].map((i) => (
            <li key={i} className="p-5">
              <Skeleton className="h-10 w-full" />
            </li>
          ))}
        {sessions?.map((s) => {
          const mobile = /Android|iPhone|iPad|Mobile/.test(s.userAgent ?? '');
          const Icon = mobile ? Smartphone : Laptop;
          return (
            <li key={s.id} className="flex items-center gap-4 px-5 py-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-line text-muted [&_svg]:size-4">
                <Icon />
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                  {deviceLabel(s.userAgent)}
                  {s.current && <Badge tone="ember">Perangkat ini</Badge>}
                </p>
                <p className="text-[13px] text-muted">
                  Aktif <RelTime date={s.lastActiveAt} /> · masuk <RelTime date={s.signedInAt} />
                </p>
              </div>
              {!s.current && (
                <Button variant="ghost" size="sm" loading={busy === s.id} onClick={() => revoke(s.id)}>
                  Keluarkan
                </Button>
              )}
            </li>
          );
        })}
        {sessions?.length === 0 && <li className="px-5 py-4 text-sm text-muted">Tidak ada sesi aktif lain.</li>}
      </ul>
    </section>
  );
}

export function AccountSecurity({ user }: { user: User }) {
  return (
    <>
      <TwoFactor user={user} />
      <Sessions />
    </>
  );
}
