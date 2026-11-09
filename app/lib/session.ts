/**
 * Browser-only session store.
 *
 * The access token lives in memory only (never localStorage). On load we ask
 * the API for a new one using the httpOnly refresh cookie. All authenticated
 * requests go through `authFetch`, which refreshes once on 401.
 */
import { useSyncExternalStore } from 'react';
import { redirect } from 'react-router';
import { ApiError, parseEnvelope, withQuery, type Query } from './api';
import type { ApiEnvelope, Role, User } from './types';

type Status = 'loading' | 'authenticated' | 'anonymous';
interface State {
  status: Status;
  user: User | null;
}

let state: State = { status: 'loading', user: null };
let accessToken: string | null = null;
let refreshing: Promise<boolean> | null = null;
let initialised: Promise<boolean> | null = null;
const listeners = new Set<() => void>();

const setState = (next: State) => {
  state = next;
  listeners.forEach((l) => l());
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const SERVER_STATE: State = { status: 'loading', user: null };

export const useSession = () =>
  useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  );

const applySession = (data: { user: User; accessToken: string }) => {
  accessToken = data.accessToken;
  setState({ status: 'authenticated', user: data.user });
};

const clearSession = () => {
  accessToken = null;
  setState({ status: 'anonymous', user: null });
};

const refresh = () => {
  if (!refreshing) {
    refreshing = fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin' })
      .then(async (res) => {
        if (!res.ok) {
          clearSession();
          return false;
        }
        const body = (await res.json()) as ApiEnvelope<{ user: User; accessToken: string } | null>;
        if (!body.data) {
          clearSession();
          return false;
        }
        applySession(body.data);
        return true;
      })
      .catch(() => {
        clearSession();
        return false;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
};

/** Resolves once the initial session check has finished. Safe to call many times. */
export const ensureSession = () => {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (!initialised) initialised = refresh();
  return initialised.then(() => state.status === 'authenticated');
};

export const getUser = () => state.user;

export async function authFetch<T>(path: string, init: RequestInit & { query?: Query } = {}) {
  await ensureSession();
  const { query, ...rest } = init;
  const doFetch = () => {
    const headers = new Headers(rest.headers);
    headers.set('Accept', 'application/json');
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    if (rest.body && !(rest.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    return fetch(withQuery(path, query), { ...rest, headers, credentials: 'same-origin' });
  };
  let res = await doFetch();
  if (res.status === 401 && accessToken) {
    if (await refresh()) res = await doFetch();
  }
  return parseEnvelope<T>(res);
}

export const api = {
  get: <T>(path: string, query?: Query) => authFetch<T>(path, { query }),
  post: <T>(path: string, body?: unknown) =>
    authFetch<T>(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body?: unknown) => authFetch<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) => authFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  del: <T>(path: string, body?: unknown) =>
    authFetch<T>(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }),
};

/** Downloads a protected file (e.g. contribution proof) using the bearer token. */
export async function downloadProtected(path: string, fileName: string) {
  await ensureSession();
  const res = await fetch(path, { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} });
  if (!res.ok) throw new ApiError(res.status, 'File tidak dapat diunduh.');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: fileName });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function login(email: string, password: string) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'same-origin',
  });
  const body = await parseEnvelope<{ user: User; accessToken: string }>(res);
  initialised = Promise.resolve(true);
  applySession(body.data);
  return body.data.user;
}

export async function register(name: string, email: string, password: string) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
    credentials: 'same-origin',
  });
  const body = await parseEnvelope<{ user: User; accessToken: string }>(res);
  initialised = Promise.resolve(true);
  applySession(body.data);
  return body.data.user;
}

export async function logout() {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
  initialised = Promise.resolve(false);
  clearSession();
}

export const updateUser = (user: User) => setState({ status: 'authenticated', user });
export const replaceSession = (data: { user: User; accessToken: string }) => applySession(data);

/** For clientLoaders: redirects to /masuk when signed out, or home when the role is not allowed. */
export async function requireUser(request: Request, roles?: Role[]) {
  const ok = await ensureSession();
  if (!ok || !state.user) {
    const url = new URL(request.url);
    throw redirect(`/masuk?next=${encodeURIComponent(url.pathname + url.search)}`);
  }
  if (roles && !roles.includes(state.user.role)) throw redirect('/');
  return state.user;
}

export { ApiError };
