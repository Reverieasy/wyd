export const MOMENT_RETENTION_DAYS = 30;
export const MOMENT_RETENTION_MS = MOMENT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
export function isMomentRetained(createdAt: string, now = Date.now()) {
  const timestamp = Date.parse(createdAt);
  return Number.isFinite(timestamp) && timestamp + MOMENT_RETENTION_MS > now;
}
