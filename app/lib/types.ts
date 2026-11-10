export type CaseStatus = 'PELAPORAN' | 'PENYIDIKAN' | 'PENUNTUTAN' | 'PERSIDANGAN' | 'PUTUSAN';
export type StageStatus = 'PENDING' | 'AKTIF' | 'SELESAI';
export type Role = 'SUPER_ADMIN' | 'EDITOR' | 'VIEWER' | 'CONTRIBUTOR';
export type SourceType = 'OFFICIAL' | 'COURT' | 'MEDIA' | 'OTHER';
export type ContributionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type CorrectionStatus = 'OPEN' | 'RESOLVED' | 'REJECTED';

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: PageMeta & { unread?: number };
  stats?: Record<string, number | null>;
  errors?: { path: string; message: string }[];
}

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  emailNotifications: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon?: string;
  caseCount?: number;
  count?: number;
}

export interface Defendant {
  id?: string;
  name: string;
  role: string;
  description?: string | null;
}

export interface Source {
  id: string;
  caseId: string;
  stageId: string | null;
  title: string;
  url: string;
  publisher: string | null;
  type: SourceType;
  publishedAt: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  verifiedBy?: { name: string } | null;
  createdAt: string;
}

export interface ArticleSummary {
  id: string;
  title: string;
  publishedAt: string;
  updatedAt?: string;
}

export interface Article extends ArticleSummary {
  content: string;
  author?: { name: string };
}

export interface Stage {
  id: string;
  caseId: string;
  stageType: CaseStatus;
  status: StageStatus;
  title: string | null;
  summary: string | null;
  startedAt: string;
  endedAt: string | null;
  dueAt: string | null;
  article: ArticleSummary | Article | null;
  sources: Source[];
}

export interface Revision {
  id: string;
  action: string;
  summary: string;
  reason: string | null;
  createdAt: string;
  user?: { name: string } | null;
  changes?: Record<string, { from: unknown; to: unknown }> | null;
}

export interface CaseListItem {
  id: string;
  slug: string;
  caseNumber: string;
  title: string;
  summary: string | null;
  description: string;
  currentStatus: CaseStatus;
  institution: string | null;
  court: string | null;
  region: string | null;
  filedAt: string | null;
  /** Halaman "Detil Perkara" di SIPP pengadilan, bila ada. */
  sippUrl?: string | null;
  lastActivityAt: string;
  createdAt: string;
  category: Category;
  defendants: Defendant[];
  activeStage: { stageType: CaseStatus; startedAt: string; dueAt: string | null; title: string | null } | null;
  followerCount: number;
  sourceCount: number;
  stageCount: number;
}

export interface CaseDetail extends Omit<CaseListItem, 'activeStage' | 'sourceCount' | 'stageCount'> {
  stages: Stage[];
  sources: Source[];
  revisions: Revision[];
  following: boolean;
}

export interface Stats {
  totals: { cases: number; ongoing: number; decided: number; sources: number; verifiedSources: number; followers: number };
  byStatus: Record<CaseStatus, number>;
  byCategory: (Category & { count: number })[];
  stageDurations: { stageType: CaseStatus; avgDays: number | null; medianDays: number | null; count: number }[];
  longestActive: {
    stageType: CaseStatus;
    startedAt: string;
    dueAt: string | null;
    daysRunning: number;
    case: { slug: string; title: string; caseNumber: string };
  }[];
  recentUpdates: {
    id: string;
    action: string;
    summary: string;
    createdAt: string;
    case: { slug: string; title: string; currentStatus: CaseStatus };
  }[];
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface Contribution {
  id: string;
  caseId: string;
  description: string;
  proposedStage: CaseStatus | null;
  status: ContributionStatus;
  proofLinks: string[];
  proofFiles: { index?: number; fileName: string; mimeType: string; size: number }[];
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  case: { id?: string; title: string; slug: string; caseNumber: string; currentStatus?: CaseStatus };
}

/** Mixed into admin case shapes: the API now returns `sippUrl` on every case. */
export interface WithSippUrl {
  sippUrl?: string | null;
}

/* ---------- SIPP import (paste-based) ---------- */

export interface SippParty {
  role: string;
  name: string;
}

export interface SippHearing {
  /** YYYY-MM-DD */
  date: string;
  time: string | null;
  agenda: string | null;
  room: string | null;
}

/** Result of reading a pasted SIPP "Detil Perkara" page. Every field may be null/empty. */
export interface SippParsed {
  caseNumber: string | null;
  court: string | null;
  classification: string | null;
  registeredAt: string | null;
  statusText: string | null;
  parties: SippParty[];
  schedule: SippHearing[];
  verdictDate: string | null;
  verdictSummary: string | null;
  warnings: string[];
}

/** A proposed (not yet stored) stage. `key` is a stable hash used to pick proposals on apply. */
export interface SippProposal {
  key: string;
  stageType: CaseStatus;
  status: StageStatus;
  title: string;
  summary: string;
  startedAt: string;
  dueAt: string | null;
}

export interface SippPreview {
  parsed: SippParsed;
  proposals: SippProposal[];
  warnings: string[];
}

export interface SippApplyResult {
  created: Stage[];
  case: { id: string; slug: string; currentStatus: CaseStatus };
}
