/**
 * URL du backend Nest vue par le navigateur.
 * - En Docker avec proxy Nginx : VITE_USE_RELATIVE_API=true → chaîne vide (même origine).
 * - Sinon : VITE_API_URL au build. Jamais « backend » seul : le navigateur ne résout pas ce hostname.
 */
export function getApiBaseUrl(): string {
  const useRelative = import.meta.env.VITE_USE_RELATIVE_API === 'true';
  if (useRelative) {
    return '';
  }

  const bakedRaw = import.meta.env.VITE_API_URL as string | undefined;
  const baked = typeof bakedRaw === 'string' ? bakedRaw.trim() : '';

  const browserBackendPort =
    (import.meta.env.VITE_BROWSER_BACKEND_PORT as string | undefined)?.trim() || '';

  const fallback =
    (import.meta.env.VITE_FALLBACK_API_URL as string | undefined)?.trim() ||
    `http://localhost:${browserBackendPort || '3000'}`;

  /** Corrige une URL qui pointe vers le service Docker « backend » (ou chaîne type backend:3000). */
  function rewriteDockerBackendHost(input: string): string | null {
    if (!input) return null;
    const hasScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(input);
    const normalized = hasScheme ? input : `http://${input}`;
    try {
      const u = new URL(normalized);
      if (u.hostname !== 'backend') return null;
      const containerPort = u.port || '3000';
      const hostPort = browserBackendPort || containerPort;

      if (typeof window !== 'undefined' && window.location?.hostname) {
        const h = window.location.hostname;
        const host =
          h === 'localhost' || h === '127.0.0.1' ? 'localhost' : h;
        return `${u.protocol}//${host}:${hostPort}`;
      }
      return `http://localhost:${hostPort}`;
    } catch {
      return null;
    }
  }

  const rewritten = rewriteDockerBackendHost(baked);
  if (rewritten) {
    return rewritten.replace(/\/$/, '');
  }

  if (typeof window === 'undefined' || !window.location?.hostname) {
    return baked.replace(/\/$/, '') || fallback.replace(/\/$/, '');
  }

  const host = window.location.hostname;
  const onLoopback = host === 'localhost' || host === '127.0.0.1';

  const looksLikeDockerBackend =
    /^https?:\/\/backend(?::\d+)?(\/|$)/i.test(baked) ||
    /\bbackend:\d+\b/.test(baked) ||
    /^backend(?::\d+)?\/?$/i.test(baked);

  if (looksLikeDockerBackend && onLoopback) {
    const again = rewriteDockerBackendHost(
      baked.includes('://') ? baked : `http://${baked}`,
    );
    return (again || fallback).replace(/\/$/, '');
  }

  if (looksLikeDockerBackend && !onLoopback) {
    const proto = window.location.protocol || 'http:';
    const pubPort = browserBackendPort || '30080';
    return `${proto}//${host}:${pubPort}`.replace(/\/$/, '');
  }

  return (baked || fallback).replace(/\/$/, '');
}

/** Base pour Socket.IO : même origine si API relative. */
export function getRealtimeBaseUrl(): string {
  const base = getApiBaseUrl();
  if (base) return base;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}

export const API_BASE_URL = getApiBaseUrl();
