import { useEffect, useRef, useState } from 'react';
import { publicGet } from './api';

export interface AuthConfig {
  registrationOpen: boolean;
  turnstileSiteKey: string | null;
}

let cached: Promise<AuthConfig> | null = null;

/** Public sign-up settings from the API. Fetched once per page load; null while loading. */
export const loadAuthConfig = () => {
  if (!cached) {
    cached = publicGet<AuthConfig>('/api/auth/config')
      .then((r) => r.data)
      .catch(() => {
        cached = null;
        return { registrationOpen: true, turnstileSiteKey: null };
      });
  }
  return cached;
};

export function useAuthConfig() {
  const [config, setConfig] = useState<AuthConfig | null>(null);
  useEffect(() => {
    let alive = true;
    loadAuthConfig().then((c) => alive && setConfig(c));
    return () => {
      alive = false;
    };
  }, []);
  return config;
}

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id: string) => void;
    };
  }
}

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptLoad: Promise<void> | null = null;
const loadScript = () => {
  if (!scriptLoad) {
    scriptLoad = new Promise((resolve, reject) => {
      const el = Object.assign(document.createElement('script'), { src: SCRIPT, async: true, defer: true });
      el.onload = () => resolve();
      el.onerror = () => {
        scriptLoad = null;
        reject(new Error('Turnstile gagal dimuat'));
      };
      document.head.appendChild(el);
    });
  }
  return scriptLoad;
};

/**
 * Renders a Cloudflare Turnstile widget into the returned ref when a site key is set.
 * `token` is the current answer (null until solved); `reset` asks for a new one after a failed submit.
 */
export function useTurnstile(siteKey: string | null | undefined) {
  const ref = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!siteKey || !ref.current) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        widget.current = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
          language: 'id',
          callback: (t: string) => setToken(t),
          'expired-callback': () => setToken(null),
          'error-callback': () => setToken(null),
        });
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, [siteKey]);

  const reset = () => {
    setToken(null);
    if (widget.current && window.turnstile) window.turnstile.reset(widget.current);
  };

  return { ref, token, reset, failed, enabled: Boolean(siteKey) };
}
