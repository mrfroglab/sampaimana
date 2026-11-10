import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import type { Route } from './+types/login';
import { seo } from '~/lib/seo';
import { safeNext } from '~/lib/format';
import { ApiError, login, loginSecondFactor } from '~/lib/session';
import { useAuthConfig } from '~/lib/authConfig';
import { AuthShell } from '~/components/AuthShell';
import { Alert, Button, Field, Input } from '~/components/ui';

export const meta: Route.MetaFunction = () => seo({ title: 'Masuk', path: '/masuk', noindex: true });

export default function Login() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const config = useAuthConfig();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mfaTicket, setMfaTicket] = useState<string | null>(null);
  const [useRecovery, setUseRecovery] = useState(false);
  const next = safeNext(params.get('next'));

  const fail = (err: unknown) =>
    setError(err instanceof ApiError ? err.message : 'Tidak dapat masuk. Periksa koneksi Anda.');

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const result = await login(String(form.get('email')), String(form.get('password')));
      if (result.mfaTicket) setMfaTicket(result.mfaTicket);
      else navigate(next, { replace: true });
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!mfaTicket) return;
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await loginSecondFactor(mfaTicket, String(form.get('code')));
      navigate(next, { replace: true });
    } catch (err) {
      // An expired ticket means starting over from the password step.
      if (err instanceof ApiError && /berakhir/.test(err.message)) setMfaTicket(null);
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  if (mfaTicket) {
    return (
      <AuthShell kicker="Verifikasi dua langkah" title="Masukkan kode" aside={<>Akun ini dilindungi verifikasi dua langkah.</>}>
        <form onSubmit={submitCode} className="space-y-4">
          {error && <Alert tone="danger">{error}</Alert>}
          {useRecovery ? (
            <Field label="Kode pemulihan" htmlFor="code" hint="Format xxxx-xxxx. Setiap kode hanya bisa dipakai sekali.">
              <Input id="code" name="code" key="recovery" autoComplete="off" required autoFocus className="font-mono" />
            </Field>
          ) : (
            <Field label="Kode 6 digit dari aplikasi autentikator" htmlFor="code">
              <Input
                id="code"
                name="code"
                key="totp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={7}
                required
                autoFocus
                className="font-mono text-lg"
              />
            </Field>
          )}
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            Verifikasi
          </Button>
        </form>
        <div className="mt-6 flex flex-wrap justify-between gap-2 border-t border-line pt-5 text-sm text-muted">
          <button type="button" className="link" onClick={() => setUseRecovery((v) => !v)}>
            {useRecovery ? 'Pakai kode dari aplikasi' : 'Pakai kode pemulihan'}
          </button>
          <button
            type="button"
            className="link"
            onClick={() => {
              setMfaTicket(null);
              setError(null);
            }}
          >
            Kembali
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      kicker="Masuk"
      title="Selamat datang kembali"
      aside={<>Ikuti kasus yang Anda pedulikan. Kami kabari setiap kali ada perkembangan.</>}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert tone="danger">{error}</Alert>}
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
        </Field>
        <Field label="Kata sandi" htmlFor="password">
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Masuk
        </Button>
      </form>
      {config?.registrationOpen !== false && (
        <p className="mt-6 border-t border-line pt-5 text-center text-sm text-muted">
          Belum punya akun?{' '}
          <Link to={`/daftar${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`} className="link font-medium text-ink">
            Daftar sebagai kontributor
          </Link>
        </p>
      )}
    </AuthShell>
  );
}
