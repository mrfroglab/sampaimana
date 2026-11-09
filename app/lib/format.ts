import type { CaseStatus, Role, SourceType, StageStatus } from './types';

export const STATUS_ORDER: CaseStatus[] = ['PELAPORAN', 'PENYIDIKAN', 'PENUNTUTAN', 'PERSIDANGAN', 'PUTUSAN'];

export const STATUS_LABEL: Record<CaseStatus, string> = {
  PELAPORAN: 'Pelaporan',
  PENYIDIKAN: 'Penyidikan',
  PENUNTUTAN: 'Penuntutan',
  PERSIDANGAN: 'Persidangan',
  PUTUSAN: 'Putusan',
};

export const STATUS_HINT: Record<CaseStatus, string> = {
  PELAPORAN: 'Laporan atau aduan diterima; penyelidikan awal.',
  PENYIDIKAN: 'Penyidik mengumpulkan bukti dan menetapkan tersangka.',
  PENUNTUTAN: 'Berkas lengkap, jaksa menyusun dakwaan.',
  PERSIDANGAN: 'Perkara diperiksa di pengadilan.',
  PUTUSAN: 'Majelis hakim telah menjatuhkan putusan.',
};

export const STAGE_STATUS_LABEL: Record<StageStatus, string> = {
  PENDING: 'Menunggu',
  AKTIF: 'Berjalan',
  SELESAI: 'Selesai',
};

export const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  OFFICIAL: 'Rilis resmi',
  COURT: 'Dokumen pengadilan',
  MEDIA: 'Media',
  OTHER: 'Lainnya',
};

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: 'Super admin',
  EDITOR: 'Editor',
  VIEWER: 'Peninjau',
  CONTRIBUTOR: 'Kontributor',
};

export const isStaff = (role?: Role) => role === 'SUPER_ADMIN' || role === 'EDITOR' || role === 'VIEWER';
export const canEdit = (role?: Role) => role === 'SUPER_ADMIN' || role === 'EDITOR';

const TZ = 'Asia/Jakarta';
const dateFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ });
const shortFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ });
const dateTimeFmt = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TZ,
});
const numFmt = new Intl.NumberFormat('id-ID');

export const fmtDate = (d?: string | Date | null) => (d ? dateFmt.format(new Date(d)) : '—');
export const fmtShort = (d?: string | Date | null) => (d ? shortFmt.format(new Date(d)) : '—');
export const fmtDateTime = (d?: string | Date | null) => (d ? dateTimeFmt.format(new Date(d)) : '—');
export const fmtNum = (n?: number | null) => (n == null ? '—' : numFmt.format(n));

/** YYYY-MM-DD in Jakarta time, for <input type="date">. */
export const toInputDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-CA', { timeZone: TZ }) : '';

export const daysBetween = (from: string | Date, to: string | Date = new Date()) =>
  Math.max(0, Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000));

export const fmtDuration = (days: number) => {
  if (days < 1) return 'kurang dari sehari';
  if (days < 45) return `${days} hari`;
  if (days < 365) return `${Math.round(days / 30)} bulan`;
  const years = Math.floor(days / 365);
  const months = Math.round((days % 365) / 30);
  return months ? `${years} th ${months} bln` : `${years} tahun`;
};

const rtf = new Intl.RelativeTimeFormat('id-ID', { numeric: 'auto' });
export const fmtRelative = (d: string | Date) => {
  const diff = (new Date(d).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return 'baru saja';
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day');
  if (abs < 86400 * 365) return rtf.format(Math.round(diff / (86400 * 30)), 'month');
  return rtf.format(Math.round(diff / (86400 * 365)), 'year');
};

export const fmtBytes = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 ** 2 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 ** 2).toFixed(1)} MB`;

export const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

/** Only allow same-site relative redirects after login. */
export const safeNext = (next: string | null) => (next && next.startsWith('/') && !next.startsWith('//') ? next : '/akun');
