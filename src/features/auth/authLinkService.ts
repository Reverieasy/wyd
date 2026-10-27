import { authService } from './authService';
import { authCallbackRoute, clearAuthCallbackParameters } from './authRedirects';

export type AuthLinkResult =
  | { kind: 'ignored' }
  | { kind: 'success'; session: NonNullable<Awaited<ReturnType<typeof authService.setSession>>>; recovery: boolean }
  | { kind: 'error'; message: string; recovery: boolean };

function callbackParameters(url: URL) {
  const parameters = new URLSearchParams(url.search);
  const fragment = new URLSearchParams(url.hash.replace(/^#/, ''));
  fragment.forEach((value, key) => {
    if (!parameters.has(key)) parameters.set(key, value);
  });
  return parameters;
}

export const authLinkService = {
  isAuthCallbackUrl(value: string) {
    return authCallbackRoute(value) !== null;
  },

  async handle(value: string): Promise<AuthLinkResult> {
    const route = authCallbackRoute(value);
    if (!route) return { kind: 'ignored' };
    const recovery = route === 'reset-password';
    const kind = recovery ? 'password reset' : 'confirmation';

    try {
      const url = new URL(value);
      const parameters = callbackParameters(url);
      const authError = parameters.get('error');
      const errorCode = parameters.get('error_code');
      const errorDescription = parameters.get('error_description');
      if (authError || errorCode || errorDescription) {
        const expired = `${errorCode ?? ''} ${errorDescription ?? ''}`.toLowerCase().includes('expired');
        return {
          kind: 'error',
          recovery,
          message: expired
            ? `That ${kind} link has expired or has already been used. Request a new one and try again.`
            : `We couldn't verify that ${kind} link. Request a new one and try again.`,
        };
      }

      const accessToken = parameters.get('access_token');
      const refreshToken = parameters.get('refresh_token');
      if (!accessToken || !refreshToken) {
        return { kind: 'error', recovery, message: 'That link is incomplete or has already been used.' };
      }

      const session = await authService.setSession(accessToken, refreshToken);
      if (!session) return { kind: 'error', recovery, message: "We couldn't start your session. Please try the link again." };
      await authService.clearPendingVerificationEmail().catch(() => undefined);
      return { kind: 'success', session, recovery };
    } catch {
      return { kind: 'error', recovery, message: `We couldn't verify that ${kind} link. Please request a new one.` };
    } finally {
      clearAuthCallbackParameters(value);
    }
  },
};
