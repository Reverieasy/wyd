import { getSupabase } from '@/src/lib/supabase';
import { readableServiceError, ServiceError } from '@/src/lib/serviceError';
import { mapProfile } from '@/src/features/profiles/profileService';
import { notificationService } from '@/src/features/notifications/notificationService';

export const COMMENT_MAX_LENGTH = 500;
const PAGE_SIZE = 30;
export type MomentComment = { id: string; updateId: string; userId: string; body: string; createdAt: string; displayName: string; handle: string; avatarUrl?: string | null };
export type CommentCursor = { createdAt: string; id: string };
export type CommentPage = { items: MomentComment[]; cursor: CommentCursor | null; hasMore: boolean };

export function validateComment(input: string) {
  const body = input.trim();
  if (!body || Array.from(body).length > COMMENT_MAX_LENGTH) throw new ServiceError('Write a comment between 1 and 500 characters.', 'comment_invalid');
  return body;
}

function mapError(error: unknown): Error {
  const message = typeof error === 'object' && error && 'message' in error ? String(error.message).toLowerCase() : '';
  const messages: Record<string, string> = {
    comment_moment_unavailable: 'This moment is no longer available to comment on.',
    comment_invalid: 'Write a comment between 1 and 500 characters.',
    comment_rate_limited: 'You’re commenting quickly. Wait a minute and try again.',
    comment_delete_forbidden: 'You can only delete your own comments.',
    terms_required: 'Accept the current Terms before posting a comment.',
  };
  for (const [code, text] of Object.entries(messages)) if (message.includes(code)) return new ServiceError(text, code);
  return readableServiceError(error);
}

export const commentService = {
  async list(updateId: string, cursor: CommentCursor | null = null): Promise<CommentPage> {
    const { data, error } = await getSupabase().rpc('list_moment_comments', {
      p_update_id: updateId, p_limit: PAGE_SIZE + 1,
      ...(cursor ? { p_before_created_at: cursor.createdAt, p_before_id: cursor.id } : {}),
    });
    if (error) throw mapError(error);
    const rows = data ?? [];
    const visible = rows.slice(0, PAGE_SIZE);
    // Avatar requests retain profile RLS. Co-recipients without profile access
    // still get their thread name from the RPC and an initials avatar.
    const authors = [...new Set(visible.map(row => row.user_id))];
    const profiles = authors.length ? await getSupabase().from('profiles').select('*').in('id', authors) : { data: [] };
    const avatars = new Map((profiles.data ?? []).map(profile => [profile.id, mapProfile(profile).avatarUrl]));
    const items = visible.map(row => ({ id: row.id, updateId: row.update_id, userId: row.user_id, body: row.body, createdAt: row.created_at, displayName: row.display_name, handle: row.username, avatarUrl: avatars.get(row.user_id) }));
    const last = items.at(-1);
    return { items, hasMore: rows.length > PAGE_SIZE, cursor: last ? { createdAt: last.createdAt, id: last.id } : null };
  },
  async add(updateId: string, input: string, requestId: string) {
    const body = validateComment(input);
    const { data, error } = await getSupabase().rpc('add_moment_comment', { p_update_id: updateId, p_body: body, p_id: requestId });
    if (error) throw mapError(error);
    if (data) void notificationService.sendPush('comment', data).catch(() => undefined);
    return data;
  },
  async remove(updateId: string, commentId: string) {
    const { error } = await getSupabase().rpc('delete_moment_comment', { p_update_id: updateId, p_id: commentId });
    if (error) throw mapError(error);
  },
};
