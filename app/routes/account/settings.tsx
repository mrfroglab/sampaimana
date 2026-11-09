import { useState } from 'react';
import type { Route } from './+types/settings';
import { ApiError, api, replaceSession, requireUser, updateUser } from '~/lib/session';
import type { User } from '~/lib/types';
import { Alert, Button, Checkbox, Field, Input, PageSkeleton, useToast } from '~/components/ui';

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  return { user: await requireUser(request) };
}

export function HydrateFallback() {
  return <PageSkeleton />;
}

export default function Settings({ loaderData }: Route.ComponentProps) {
  const toast = useToast();
  const [user, setUser] = useState(loaderData.user);
  const [busy, setBusy] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});

  const saveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const res = await api.patch<User>('/api/auth/me', {
        name: String(form.get('name')),
        emailNotifications: form.get('emailNotifications') === 'on',
      });
      setUser(res.data);
      updateUser(res.data);
      toast('Profil disimpan.');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Gagal menyimpan', 'danger');
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    if (form.get('newPassword') !== form.get('confirm')) {
      setPwErrors({ confirm: 'Konfirmasi tidak sama.' });
      return;
    }
    setPwBusy(true);
    setPwErrors({});
    try {
      const res = await api.post<{ user: User; accessToken: string }>('/api/auth/password', {
        currentPassword: form.get('currentPassword'),
        newPassword: form.get('newPassword'),
      });
      replaceSession(res.data);
      formEl.reset();
      toast('Kata sandi diganti. Perangkat lain telah dikeluarkan.');
    } catch (err) {
      if (err instanceof ApiError) setPwErrors({ ...err.fieldErrors, _: err.message });
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <div className="grid max-w-4xl gap-12 md:grid-cols-2">
      <form onSubmit={saveProfile} className="space-y-5">
        <h2 className="font-serif text-2xl text-ink">Profil &amp; notifikasi</h2>
        <Field label="Nama" htmlFor="name">
          <Input id="name" name="name" defaultValue={user.name} required minLength={2} />
        </Field>
        <Field label="Email" htmlFor="email" hint="Email tidak dapat diubah.">
          <Input id="email" value={user.email} disabled readOnly />
        </Field>
        <Checkbox
          name="emailNotifications"
          defaultChecked={user.emailNotifications}
          label="Kirim email saat kasus yang saya ikuti berubah"
          hint="Notifikasi di situs tetap muncul meskipun email dimatikan."
        />
        <Button type="submit" loading={busy}>
          Simpan
        </Button>
      </form>

      <form onSubmit={changePassword} className="space-y-5" noValidate>
        <h2 className="font-serif text-2xl text-ink">Ganti kata sandi</h2>
        {pwErrors._ && !pwErrors.newPassword && <Alert tone="danger">{pwErrors._}</Alert>}
        <Field label="Kata sandi saat ini" htmlFor="currentPassword" error={pwErrors.currentPassword}>
          <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
        </Field>
        <Field label="Kata sandi baru" htmlFor="newPassword" error={pwErrors.newPassword} hint="Minimal 8 karakter.">
          <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
        <Field label="Ulangi kata sandi baru" htmlFor="confirm" error={pwErrors.confirm}>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
        </Field>
        <Button type="submit" variant="outline" loading={pwBusy}>
          Ganti kata sandi
        </Button>
      </form>
    </div>
  );
}
