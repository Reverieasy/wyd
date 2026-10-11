import { authService } from './authService';

export type AuthLinkResult =
  | { kind: 'ignored' }
  | { kind: 'success'; session: NonNullable<Awaited<ReturnType<typeof authService.setSession>>> }
  | { kind: 'error'; message: string };

function callbackParameters(url: URL) {
  const parameters = new URLSearchParams(url.search);
  const fragment = new URLSearchParams(url.hash.replace(/^#/, ''));
  fragment.forEach((value, key) => {
    if (!parameters.has(key)) parameters.set(key, value);
  });
  return parameters;
}

export const authLinkService = {
  isEmailConfirmationUrl(value: string) {
    try {
      const url = new URL(value);
      const route = `${url.hostname}${url.pathname}`.replace(/^\/+|\/+$/g, '');
      return url.protocol === 'watchudoin:' && route === 'email-confirmed';
    } catch {
      return false;
    }
  },

  async handle(value: string): Promise<AuthLinkResult> {
    if (!this.isEmailConfirmationUrl(value)) return { kind: 'ignored' };

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
          message: expired
            ? 'That confirmation link has expired. Request a new one and try again.'
            : "We couldn't confirm that link. Request a new one and try again.",
        };
      }

      const accessToken = parameters.get('access_token');
      const refreshToken = parameters.get('refresh_token');
      if (!accessToken || !refreshToken) {
        return { kind: 'error', message: 'That confirmation link is incomplete or has already been used.' };
      }

      const session = await authService.setSession(accessToken, refreshToken);
      if (!session) return { kind: 'error', message: "We couldn't start your session. Please try the link again." };
      await authService.clearPendingVerificationEmail();
      return { kind: 'success', session };
    } catch {
      return { kind: 'error', message: "We couldn't confirm that link. Please request a new one." };
    }
  },
};
