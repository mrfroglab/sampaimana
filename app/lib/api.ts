import type { ApiEnvelope } from './types';

export class ApiError extends Error {
  status: number;
  errors?: { path: string; message: string }[];
  constructor(status: number, message: string, errors?: { path: string; message: string }[]) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
  /** Field → message map for form display. */
  get fieldErrors(): Record<string, string> {
    return Object.fromEntries((this.errors ?? []).map((e) => [e.path, e.message]));
  }
}

const isServer = typeof window === 'undefined';

/** Server-side loaders talk to the API over the internal network; the browser uses same-origin /api. */
export const apiBase = () =>
  isServer ? (process.env.API_INTERNAL_URL || 'http://localhost:5000').replace(/\/$/, '') : '';

const parse = async <T>(res: Response): Promise<ApiEnvelope<T>> => {
  const text = await res.text();
  let body: ApiEnvelope<T> | null = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON */
  }
  if (!res.ok || !body?.success) {
    throw new ApiError(
      res.status,
      body?.message || (res.status >= 500 ? 'Server sedang bermasalah. Coba lagi sebentar lagi.' : 'Permintaan gagal.'),
      body?.errors,
    );
  }
  return body;
};

export type Query = Record<string, string | number | boolean | undefined | null>;

export const withQuery = (path: string, query?: Query) => {
  if (!query) return path;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
};

/** Public, unauthenticated request usable from loaders (SSR) and the browser. */
export async function publicGet<T>(path: string, query?: Query, init?: RequestInit) {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}${withQuery(path, query)}`, {
      ...init,
      headers: { Accept: 'application/json', ...(init?.headers || {}) },
    });
  } catch {
    throw new ApiError(503, 'Tidak dapat terhubung ke server data.');
  }
  return parse<T>(res);
}

export async function publicPost<T>(path: string, body: unknown) {
  const res = await fetch(`${apiBase()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  return parse<T>(res);
}

export { parse as parseEnvelope };
