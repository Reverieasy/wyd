import type { SupabaseClient } from '@supabase/supabase-js';

export const RETENTION_DAYS = 30;
export const retentionCutoff = (now: number) => new Date(now - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

export async function cleanupExpiredMoments(admin: SupabaseClient, now = Date.now()) {
  const cutoff = retentionCutoff(now);
  let deleted = 0;
  let filesDeleted = 0;
  for (let batch = 0; batch < 5; batch++) {
    const [records, objects] = await Promise.all([
      admin.from('updates').select('id,photo_path').lte('created_at', cutoff).order('created_at', { ascending: true }).limit(100),
      admin.rpc('list_expired_moment_objects', { p_cutoff: cutoff, p_limit: 200 }),
    ]);
    if (records.error || objects.error) throw new Error('lookup_failed');
    const expired = records.data ?? [];
    const names = (objects.data ?? []) as { name: string }[];
    if (!expired.length && !names.length) break;
    const paths = [...new Set([...expired.map(row => row.photo_path as string), ...names.map(row => row.name)].filter(Boolean))];
    if (paths.length) {
      const { error } = await admin.storage.from('moment-photos').remove(paths);
      if (error) throw new Error('photo_cleanup_failed');
      filesDeleted += paths.length;
    }
    // Delete records only after Storage confirms removal. Repeating a batch is safe.
    if (expired.length) {
      const { error } = await admin.from('updates').delete().in('id', expired.map(row => row.id)).lte('created_at', cutoff);
      if (error) throw new Error('database_cleanup_failed');
      deleted += expired.length;
    }
    // An old object can also be referenced by another update; remove dangling rows.
    if (names.length) {
      const { error } = await admin.from('updates').delete().in('photo_path', names.map(row => row.name));
      if (error) throw new Error('database_cleanup_failed');
    }
  }
  return { deleted, files_deleted: filesDeleted, retention_days: RETENTION_DAYS };
}
