export function normalizePersonUsername(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const username = value.trim().replace(/^@/, '').toLowerCase();
  return /^[a-z0-9._]{3,24}$/.test(username) ? username : null;
}
export function personQrLink(handle: string) {
  const username = normalizePersonUsername(handle);
  if (!username) throw new Error('A valid username is needed to create your QR code.');
  return `watchudoin://add-person?username=${encodeURIComponent(username)}`;
}
export function parsePersonQr(input: string): string | null {
  if (typeof input !== 'string' || input.length > 512) return null;
  try {
    const url = new URL(input.trim());
    if (url.protocol !== 'watchudoin:' || url.hostname !== 'add-person' || !['', '/'].includes(url.pathname) || url.username || url.password || url.port || url.hash || url.searchParams.getAll('username').length !== 1 || [...url.searchParams.keys()].some(key => key !== 'username')) return null;
    return normalizePersonUsername(url.searchParams.get('username'));
  } catch { return null; }
}
