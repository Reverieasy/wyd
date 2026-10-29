import type { ConnectionWithPerson, ActivityItem, Nudge, Reaction, ReactionType, User } from '@/src/models';
import { getSupabase } from '@/src/lib/supabase';
import { readableServiceError } from '@/src/lib/serviceError';
import { mapProfile } from '@/src/features/profiles/profileService';

const ACTIVITY_PAGE_LIMIT = 30;
export type ActivityCursor = { createdAt: string; id: string };

export type ActivitySnapshot = {
  items: ActivityItem[];
  nudges: Nudge[];
  reactions: Reaction[];
  lastReadAt: string | null;
  cursor: ActivityCursor | null;
  hasMore: boolean;
};

export const activityService = {
  async list(userId: string, connections: ConnectionWithPerson[], cursor: ActivityCursor | null = null): Promise<ActivitySnapshot> {
    const client = getSupabase();
    let ownUpdatesQuery = client.from('updates').select('id').eq('sender_id', userId).order('created_at', { ascending: false }).limit(ACTIVITY_PAGE_LIMIT + 1);
    if (cursor) ownUpdatesQuery = ownUpdatesQuery.lte('created_at', cursor.createdAt);
    const { data: ownUpdates, error: updatesError } = await ownUpdatesQuery;
    if (updatesError) throw readableServiceError(updatesError);
    const ownUpdateIds = ownUpdates.map(({ id }) => id);
    let nudgesQuery = client.from('nudges').select('*').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).order('created_at', { ascending: false }).limit(ACTIVITY_PAGE_LIMIT + 1);
    if (cursor) nudgesQuery = nudgesQuery.lte('created_at', cursor.createdAt);
    let reactionsQuery = ownUpdateIds.length > 0
      ? client.from('reactions').select('*').in('update_id', ownUpdateIds).order('created_at', { ascending: false }).limit(ACTIVITY_PAGE_LIMIT + 1)
      : null;
    if (cursor && reactionsQuery) reactionsQuery = reactionsQuery.lte('created_at', cursor.createdAt);
    const momentsQuery = client.rpc('list_visible_updates', {
      p_cursor_created_at: cursor?.createdAt ?? null,
      p_cursor_id: cursor ? 'ffffffff-ffff-ffff-ffff-ffffffffffff' : null,
      p_limit: ACTIVITY_PAGE_LIMIT,
    });

    const [nudgesResult, reactionsResult, cursorResult, momentsResult, commentsResult] = await Promise.all([
      nudgesQuery,
      ownUpdateIds.length > 0
        ? reactionsQuery!
        : Promise.resolve({ data: [], error: null }),
      client.from('activity_reads').select('*').eq('user_id', userId).maybeSingle(),
      momentsQuery,
      client.rpc('list_comment_notifications', { p_limit: ACTIVITY_PAGE_LIMIT + 1, ...(cursor ? { p_before_created_at: cursor.createdAt } : {}) }),
    ]);
    if (nudgesResult.error) throw readableServiceError(nudgesResult.error);
    if (reactionsResult.error) throw readableServiceError(reactionsResult.error);
    if (cursorResult.error) throw readableServiceError(cursorResult.error);
    if (momentsResult.error) throw readableServiceError(momentsResult.error);
    if (commentsResult.error) throw readableServiceError(commentsResult.error);

    const actorIds = new Set<string>();
    nudgesResult.data.forEach((row) => {
      actorIds.add(row.sender_id);
      if (row.sender_id === userId && row.status === 'responded') actorIds.add(row.receiver_id);
    });
    reactionsResult.data.forEach((row) => actorIds.add(row.user_id));
    momentsResult.data.forEach((row) => actorIds.add(row.sender_id));
    const connectionActors = connections.filter(({ connection, direction }) =>
      (direction === 'incoming' && connection.status === 'pending')
      || (direction === 'outgoing' && connection.status === 'accepted'));
    connectionActors.forEach(({ person }) => actorIds.add(person.id));

    let profiles = new Map<string, User>();
    if (actorIds.size > 0) {
      const { data, error } = await client.from('profiles').select('*').in('id', [...actorIds]);
      if (error) throw readableServiceError(error);
      profiles = new Map(data.map((row) => [row.id, mapProfile(row)]));
    }

    const lastReadAt = cursorResult.data?.last_read_at ?? null;
    const isRead = (createdAt: string) => Boolean(lastReadAt && Date.parse(createdAt) <= Date.parse(lastReadAt));
    const nudges: Nudge[] = nudgesResult.data.filter((row) => row.receiver_id === userId).flatMap((row) => {
      const sender = profiles.get(row.sender_id);
      return sender ? [{
        id: row.id,
        senderId: row.sender_id,
        receiverId: row.receiver_id,
        sender,
        status: row.status,
        createdAt: row.created_at,
        seenAt: row.seen_at,
        respondedAt: row.responded_at,
        responseUpdateId: row.response_update_id,
      }] : [];
    });
    const reactions: Reaction[] = reactionsResult.data.flatMap((row) => {
      const user = profiles.get(row.user_id);
      return user ? [{ id: row.id, updateId: row.update_id, userId: row.user_id, user, type: row.reaction as ReactionType, createdAt: row.created_at }] : [];
    });

    const allItems: ActivityItem[] = [
      ...commentsResult.data.map(row => ({
        id: `comment:${row.id}`, kind: 'comment' as const, updateId: row.update_id, commentReply: row.is_reply === true, createdAt: row.created_at, read: isRead(row.created_at),
        actor: mapProfile({ id: row.user_id, username: row.username, display_name: row.display_name, avatar_path: row.avatar_path, created_at: row.created_at, updated_at: row.created_at, username_changed_at: null }),
      })),
      ...momentsResult.data.filter((update) => update.sender_id !== userId).flatMap((update) => {
        const sender = profiles.get(update.sender_id);
        return sender ? [{
          id: `moment:${update.id}`,
          kind: 'moment' as const,
          actor: sender,
          createdAt: update.created_at,
          read: isRead(update.created_at),
          updateId: update.id,
          quiet: update.is_quiet,
        }] : [];
      }),
      ...nudges.map((nudge) => ({
        id: `nudge:${nudge.id}`,
        kind: 'nudge' as const,
        actor: nudge.sender,
        createdAt: nudge.createdAt,
        read: isRead(nudge.createdAt),
        nudgeId: nudge.id,
        nudgeStatus: nudge.status,
        nudgeDirection: 'incoming' as const,
      })),
      ...nudgesResult.data.filter((row) => row.sender_id === userId && row.status === 'responded').flatMap((row) => {
        const responder = profiles.get(row.receiver_id);
        const createdAt = row.responded_at ?? row.created_at;
        return responder ? [{
          id: `nudge-response:${row.id}`,
          kind: 'nudge' as const,
          actor: responder,
          createdAt,
          read: isRead(createdAt),
          nudgeId: row.id,
          nudgeStatus: row.status,
          nudgeDirection: 'outgoing' as const,
          updateId: row.response_update_id ?? undefined,
        }] : [];
      }),
      ...reactions.map((reaction) => ({
        id: `reaction:${reaction.id}`,
        kind: 'reaction' as const,
        actor: reaction.user,
        createdAt: reaction.createdAt,
        read: isRead(reaction.createdAt),
        updateId: reaction.updateId,
        reaction: reaction.type,
      })),
      ...connectionActors.map(({ connection, person, direction }) => ({
        id: `connection:${connection.id}:${connection.status}`,
        kind: direction === 'incoming' ? 'connection_request' as const : 'connection_accepted' as const,
        actor: person,
        createdAt: connection.acceptedAt ?? connection.createdAt,
        read: isRead(connection.acceptedAt ?? connection.createdAt),
        connectionId: connection.id,
      })),
    ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id.localeCompare(a.id));

    const beforeCursor = cursor
      ? allItems.filter((item) => item.createdAt < cursor.createdAt || (item.createdAt === cursor.createdAt && item.id < cursor.id))
      : allItems;
    const hasMore = beforeCursor.length > ACTIVITY_PAGE_LIMIT;
    const items = beforeCursor.slice(0, ACTIVITY_PAGE_LIMIT);
    const last = items.at(-1);

    return { items, nudges, reactions, lastReadAt, cursor: last ? { createdAt: last.createdAt, id: last.id } : null, hasMore };
  },

  async markRead() {
    const { data, error } = await getSupabase().rpc('mark_activity_read');
    if (error) throw readableServiceError(error);
    return data;
  },
};
