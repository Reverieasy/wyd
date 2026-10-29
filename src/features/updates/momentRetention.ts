export const MOMENT_RETENTION_DAYS = 30;
export const MOMENT_RETENTION_MS = MOMENT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
export function momentDeletionLabel(createdAt: string, now = Date.now()) {
  const remaining = Date.parse(createdAt) + MOMENT_RETENTION_MS - now;
  if (!Number.isFinite(remaining) || remaining <= 0 || remaining > 48 * 60 * 60 * 1000) return null;
  if (remaining > 24 * 60 * 60 * 1000) return 'Deletes in 2 days';
  if (remaining < 60 * 60 * 1000) return 'Deletes in under 1h';
  return `Deletes in ${Math.ceil(remaining / (60 * 60 * 1000))}h`;
}
export function isMomentRetained(createdAt: string, now = Date.now()) {
  const timestamp = Date.parse(createdAt);
  return Number.isFinite(timestamp) && timestamp + MOMENT_RETENTION_MS > now;
}
