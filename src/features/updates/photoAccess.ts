const PHOTO_ROUTE = '/storage/v1/object/authenticated/moment-photos/';

export function createMomentPhotoUrl(projectUrl: string | undefined, path: string): string | null {
  if (!projectUrl || !path) return null;
  const segments = path.split('/');
  if (segments.some(segment => !segment || segment === '.' || segment === '..')) return null;
  return `${projectUrl.replace(/\/+$/, '')}${PHOTO_ROUTE}${segments.map(encodeURIComponent).join('/')}`;
}

export function isAuthenticatedMomentPhoto(uri: string, projectUrl: string | undefined) {
  if (!projectUrl) return false;
  try {
    const url = new URL(uri);
    return url.origin === new URL(projectUrl).origin && (url.pathname.startsWith(PHOTO_ROUTE) || url.pathname.startsWith('/storage/v1/object/authenticated/avatars/'));
  } catch {
    return false;
  }
}

// Credentials are attached only to this project's authenticated Moment endpoint.
// Local previews and other URLs never receive a user's access token.
export function createMomentPhotoSource(
  uri: string | null,
  accessToken: string | undefined,
  projectUrl: string | undefined,
  publishableKey: string | undefined,
): { uri: string; headers?: Record<string, string> } | null {
  if (!uri) return null;
  if (!isAuthenticatedMomentPhoto(uri, projectUrl)) return { uri };
  if (!accessToken) return null;
  return {
    uri,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(publishableKey ? { apikey: publishableKey } : {}),
    },
  };
}
