import type { ReactionRowType, UpdateRecipientRowType, UpdateRowType } from '@/src/lib/database.types';
import { readableServiceError } from '@/src/lib/serviceError';
import { getSupabase } from '@/src/lib/supabase';
import { mapProfile } from '@/src/features/profiles/profileService';
import type { MomentUpdate, Reaction, ReactionType, User } from '@/src/models';
import { photoService } from './photoService';

const UPDATE_PAGE_LIMIT = 30;
export type UpdateCursor = { createdAt: string; id: string };
export type UpdatePage = { updates: MomentUpdate[]; cursor: UpdateCursor | null; hasMore: boolean };

function mapUpdate(
  row: UpdateRowType,
  sender: User,
  recipients: UpdateRecipientRowType[],
  reactions: Reaction[],
  photoUrl: string | null,
  userId: string,
): MomentUpdate {
  const links = recipients.filter((item) => item.update_id === row.id);
  const seenAt = row.sender_id === userId
    ? links.find((item) => item.seen_at)?.seen_at ?? null
    : links.find((item) => item.recipient_id === userId)?.seen_at ?? null;
  return {
    id: row.id,
    senderId: row.sender_id,
    sender,
    recipientIds: links.map((item) => item.recipient_id),
    photoPath: row.photo_path,
    photoUrl,
    caption: row.caption,
    statusText: row.status_text,
    isQuiet: row.is_quiet,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    seenAt,
    reactions: reactions.filter((item) => item.updateId === row.id),
  };
}

export const updateQueries = {
  async getVisibleById(userId: string, updateId: string) {
    const page = await this.listVisible(userId, null, updateId);
    return page.updates[0] ?? null;
  },
  async isVisible(updateId: string) {
    const { data, error } = await getSupabase().from('updates').select('id').eq('id', updateId).maybeSingle();
    if (error) throw readableServiceError(error);
    return Boolean(data);
  },

  async listVisible(userId: string, cursor: UpdateCursor | null = null, updateId?: string): Promise<UpdatePage> {
    const client = getSupabase();
    const { data, error } = updateId ? await client.from('updates').select('*').eq('id', updateId) : await client.rpc('list_visible_updates', {
      p_cursor_created_at: cursor?.createdAt ?? null,
      p_cursor_id: cursor?.id ?? null,
      p_limit: UPDATE_PAGE_LIMIT,
    });
    if (error) throw readableServiceError(error);
    const pageRows = (data ?? []) as UpdateRowType[];
    const hasMore = pageRows.length > UPDATE_PAGE_LIMIT;
    const rows = pageRows.slice(0, UPDATE_PAGE_LIMIT);
    if (rows.length === 0) return { updates: [], cursor: null, hasMore: false };

    const senderIds = [...new Set(rows.map((row) => row.sender_id))];
    const [recipientsResult, profilesResult, reactionsResult, circlesResult] = await Promise.all([
      client.from('update_recipients').select('*').in('update_id', rows.map((row) => row.id)),
      client.from('profiles').select('*').in('id', senderIds),
      client.from('reactions').select('*').in('update_id', rows.map((row) => row.id)),
      client.from('circle_updates').select('*').in('update_id', rows.map(row => row.id)),
    ]);
    const { data: recipients, error: recipientsError } = recipientsResult;
    if (recipientsError) throw readableServiceError(recipientsError);
    if (profilesResult.error) throw readableServiceError(profilesResult.error);
    if (reactionsResult.error) throw readableServiceError(reactionsResult.error);
    if (circlesResult.error) throw readableServiceError(circlesResult.error);
    const reactionRows = reactionsResult.data as ReactionRowType[];
    const profileIds = [...new Set([...senderIds, ...reactionRows.map((row) => row.user_id)])];
    const missingProfileIds = profileIds.filter((id) => !profilesResult.data.some((row) => row.id === id));
    const extraProfilesResult = missingProfileIds.length > 0
      ? await client.from('profiles').select('*').in('id', missingProfileIds)
      : { data: [], error: null };
    if (extraProfilesResult.error) throw readableServiceError(extraProfilesResult.error);
    const profiles = new Map([...profilesResult.data, ...extraProfilesResult.data].map((row) => [row.id, mapProfile(row)]));
    const reactions: Reaction[] = reactionRows.flatMap((row) => {
      const user = profiles.get(row.user_id);
      return user ? [{
        id: row.id,
        updateId: row.update_id,
        userId: row.user_id,
        user,
        type: row.reaction as ReactionType,
        createdAt: row.created_at,
      }] : [];
    });

    const updates = rows.flatMap((row) => {
      const sender = profiles.get(row.sender_id);
      return sender ? [{ ...mapUpdate(row, sender, recipients, reactions, photoService.getPhotoUrl(row.photo_path), userId), circleIds: circlesResult.data.filter(link => link.update_id === row.id).map(link => link.circle_id) }] : [];
    });
    const last = rows.at(-1)!;
    return { updates, cursor: { createdAt: last.created_at, id: last.id }, hasMore };
  },
};
