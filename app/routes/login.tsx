import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import type { Route } from './+types/login';
import { seo } from '~/lib/seo';
import { safeNext } from '~/lib/format';
import { ApiError, login } from '~/lib/session';
import { AuthShell } from '~/components/AuthShell';
import { Alert, Button, Field, Input } from '~/components/ui';

export const meta: Route.MetaFunction = () => seo({ title: 'Masuk', path: '/masuk', noindex: true });

export default function Login() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const next = safeNext(params.get('next'));

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await login(String(form.get('email')), String(form.get('password')));
      navigate(next, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Tidak dapat masuk. Periksa koneksi Anda.');
    } finally {
      setBusy(false);
    }
  };

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
      <p className="mt-6 border-t border-line pt-5 text-center text-sm text-muted">
        Belum punya akun?{' '}
        <Link to={`/daftar${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`} className="link font-medium text-ink">
          Daftar sebagai kontributor
        </Link>
      </p>
    </AuthShell>
  );
}
