import { type RouteConfig, index, layout, prefix, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('kasus', 'routes/cases.tsx'),
  route('kasus/:slug', 'routes/case.tsx'),
  route('kasus/:slug/tahap/:stageId', 'routes/stage.tsx'),
  route('statistik', 'routes/stats.tsx'),
  route('data', 'routes/data.tsx'),
  route('tentang', 'routes/about.tsx'),
  route('masuk', 'routes/login.tsx'),
  route('daftar', 'routes/register.tsx'),
  route('kontribusi/baru', 'routes/contribute.tsx'),

  ...prefix('akun', [
    layout('routes/account/layout.tsx', [
      index('routes/account/following.tsx'),
      route('notifikasi', 'routes/account/notifications.tsx'),
      route('kontribusi', 'routes/account/contributions.tsx'),
      route('pengaturan', 'routes/account/settings.tsx'),
    ]),
  ]),

  ...prefix('redaksi', [
    layout('routes/admin/layout.tsx', [
      index('routes/admin/overview.tsx'),
      route('kasus', 'routes/admin/cases.tsx'),
      route('kasus/baru', 'routes/admin/case-new.tsx'),
      route('kasus/:id', 'routes/admin/case-edit.tsx'),
      route('moderasi', 'routes/admin/moderation.tsx'),
      route('koreksi', 'routes/admin/corrections.tsx'),
      route('kategori', 'routes/admin/categories.tsx'),
      route('pengguna', 'routes/admin/users.tsx'),
      route('log', 'routes/admin/logs.tsx'),
    ]),
  ]),

  route('sitemap.xml', 'routes/sitemap.ts'),
  route('robots.txt', 'routes/robots.ts'),
  route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig;
