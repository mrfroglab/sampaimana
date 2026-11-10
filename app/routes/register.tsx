import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import type { Route } from './+types/register';
import { seo } from '~/lib/seo';
import { ApiError, register } from '~/lib/session';
import { useAuthConfig, useTurnstile } from '~/lib/authConfig';
import { AuthShell } from '~/components/AuthShell';
import { Alert, Button, Field, Input, LinkButton } from '~/components/ui';
import { safeNext } from '~/lib/format';

export const meta: Route.MetaFunction = () => seo({ title: 'Daftar', path: '/daftar' });

export default function Register() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const config = useAuthConfig();
  const turnstile = useTurnstile(config?.turnstileSiteKey);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (turnstile.enabled && !turnstile.token) {
      setErrors({ _: 'Selesaikan verifikasi anti-bot terlebih dahulu.' });
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      await register(
        String(form.get('name')),
        String(form.get('email')),
        String(form.get('password')),
        turnstile.token ?? undefined,
      );
      navigate(safeNext(params.get('next')), { replace: true });
    } catch (err) {
      setErrors(err instanceof ApiError ? { ...err.fieldErrors, _: err.message } : { _: 'Pendaftaran gagal. Coba lagi.' });
      // A Turnstile token is single-use.
      turnstile.reset();
    } finally {
      setBusy(false);
    }
  };

  if (config && !config.registrationOpen) {
    return (
      <AuthShell kicker="Daftar" title="Pendaftaran ditutup" aside={<>Akun baru saat ini hanya dibuat oleh redaksi.</>}>
        <div className="space-y-4">
          <Alert>
            Pendaftaran akun baru sedang ditutup. Anda tetap bisa membaca semua kasus tanpa akun, atau mengirim koreksi
            dari halaman kasus.
          </Alert>
          <div className="flex gap-2">
            <LinkButton to="/kasus" variant="outline">
              Lihat kasus
            </LinkButton>
            <LinkButton to="/masuk" variant="ghost">
              Masuk
            </LinkButton>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      kicker="Daftar"
      title="Buat akun"
      aside={
        <>
          Dengan akun, Anda bisa mengikuti kasus dan mengirim kabar perkembangan{' '}
          <span className="text-muted">untuk diverifikasi redaksi.</span>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {errors._ && !errors.name && !errors.email && !errors.password && <Alert tone="danger">{errors._}</Alert>}
        <Field label="Nama" htmlFor="name" error={errors.name} hint="Ditampilkan ke redaksi saat Anda berkontribusi.">
          <Input id="name" name="name" autoComplete="name" required minLength={2} invalid={!!errors.name} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required invalid={!!errors.email} />
        </Field>
        <Field
          label="Kata sandi"
          htmlFor="password"
          error={errors.password}
          hint="Minimal 8 karakter. Kata sandi yang pernah bocor di internet akan ditolak."
        >
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} invalid={!!errors.password} />
        </Field>
        {turnstile.enabled && (
          <div>
            {/* Turnstile owns this node's children; React must not render into it. */}
            <div ref={turnstile.ref} className="min-h-[65px]" />
            {turnstile.failed && (
              <p className="mt-1 text-[13px] text-ember-ink">Verifikasi anti-bot gagal dimuat. Matikan pemblokir iklan lalu muat ulang.</p>
            )}
          </div>
        )}
        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!config}>
          Buat akun
        </Button>
        <p className="text-xs leading-relaxed text-muted">
          Dengan mendaftar, Anda setuju mengirim informasi yang benar dan dapat dipertanggungjawabkan. Baca{' '}
          <Link to="/tentang#kontribusi" className="link">
            kebijakan kontribusi
          </Link>
          .
        </p>
      </form>
      <p className="mt-6 border-t border-line pt-5 text-center text-sm text-muted">
        Sudah punya akun?{' '}
        <Link to="/masuk" className="link font-medium text-ink">
          Masuk
        </Link>
      </p>
    </AuthShell>
  );
}
