import { Platform } from 'react-native';

export type AuthCallbackRoute = 'email-confirmed' | 'reset-password';

function webOrigin() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    const origin = new URL(window.location.origin);
    return ['http:', 'https:'].includes(origin.protocol) ? origin.origin : null;
  } catch { return null; }
}

export function authRedirectUrl(route: AuthCallbackRoute) {
  const origin = webOrigin();
  return origin ? `${origin}/${route}` : `watchudoin://${route}`;
}

export function authCallbackRoute(value: string): AuthCallbackRoute | null {
  try {
    const url = new URL(value);
    const route = (url.protocol === 'watchudoin:' ? `${url.hostname}${url.pathname}` : url.pathname).replace(/^\/+|\/+$/g, '');
    if (route !== 'email-confirmed' && route !== 'reset-password') return null;
    if (url.protocol === 'watchudoin:') return route;
    const origin = webOrigin();
    return origin && url.origin === origin ? route : null;
  } catch { return null; }
}

// Keep email credentials out of browser history after the callback is handled.
export function clearAuthCallbackParameters(value: string) {
  if (!webOrigin() || !authCallbackRoute(value)) return;
  try {
    const url = new URL(value);
    if (new URL(window.location.href).href !== url.href) return;
    const hash = new URLSearchParams(url.hash.slice(1));
    for (const key of ['access_token', 'refresh_token', 'token_type', 'expires_in', 'expires_at', 'type', 'code', 'token_hash', 'error', 'error_code', 'error_description']) {
      url.searchParams.delete(key); hash.delete(key);
    }
    url.hash = hash.toString();
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  } catch { /* The verified session remains usable if history access is restricted. */ }
}
