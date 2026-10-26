import { getSupabase } from '@/src/lib/supabase';
import { readableServiceError, ServiceError } from '@/src/lib/serviceError';
import { mapProfile } from '@/src/features/profiles/profileService';
import { normalizeCircleCode, type Circle, type CircleDetail, type CircleInvitePreview } from './circleModel';

const messages: Record<string, string> = {
  circle_name_invalid: 'Give your circle a name between 1 and 40 characters.',
  circle_invite_invalid: 'That circle link or code is invalid, expired, or no longer available.',
  circle_host_required: 'Only the host can do that.', circle_member_required: 'You need host approval to access this circle.',
  circle_request_declined: 'The host declined your request. You can request again tomorrow.',
  circle_request_not_pending: 'This request has already been reviewed. Refresh the circle.',
  circle_not_found: 'This circle is no longer available.', circle_host_cannot_leave: 'The host can delete the circle instead of leaving.',
  circle_cannot_remove_host: 'The host cannot be removed.', circle_full: 'This circle has reached its 50-member limit.',
  circle_limit: 'You can host up to 20 circles.', circle_request_limit: 'You have too many pending circle requests.',
  blocked_relationship: 'This request is unavailable because of a blocked relationship.',
};
function circleError(error: unknown) {
  const raw = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : '';
  const code = Object.keys(messages).find(key => raw.includes(key));
  return code ? new ServiceError(messages[code], code, error) : readableServiceError(error);
}
type Action = 'create' | 'preview' | 'request_join' | 'approve_join' | 'decline_join' | 'invite' | 'rotate_invite' | 'rename' | 'leave' | 'remove_member' | 'delete';
type Arguments = { p_circle_id?: string; p_name?: string; p_code?: string; p_request_id?: string; p_user_id?: string };
async function action<T>(kind: Action, args: Arguments = {}): Promise<T> {
  const { data, error } = await getSupabase().rpc('circle_action', { p_action: kind, ...args });
  if (error) throw circleError(error);
  return data as unknown as T;
}

export const circleService = {
  errorMessage: (error: unknown) => circleError(error).message,
  create: (name: string) => action<{ id: string }>('create', { p_name: name.trim() }),
  async preview(input: string) {
    const code = normalizeCircleCode(input);
    if (!code) throw new ServiceError(messages.circle_invite_invalid, 'circle_invite_invalid');
    return action<CircleInvitePreview>('preview', { p_code: code });
  },
  async requestJoin(input: string) {
    const code = normalizeCircleCode(input);
    if (!code) throw new ServiceError(messages.circle_invite_invalid, 'circle_invite_invalid');
    return action<{ circle_id: string; status: 'member' | 'pending' }>('request_join', { p_code: code });
  },
  invite: (id: string, rotate = false) => action<{ code: string; expires_at: string }>(rotate ? 'rotate_invite' : 'invite', { p_circle_id: id }),
  review: (id: string, requestId: string, approve: boolean) => action(approve ? 'approve_join' : 'decline_join', { p_circle_id: id, p_request_id: requestId }),
  rename: (id: string, name: string) => action('rename', { p_circle_id: id, p_name: name.trim() }),
  leave: (id: string) => action('leave', { p_circle_id: id }),
  removeMember: (id: string, userId: string) => action('remove_member', { p_circle_id: id, p_user_id: userId }),
  delete: (id: string) => action('delete', { p_circle_id: id }),
  async list(userId: string): Promise<Circle[]> {
    const client = getSupabase();
    const result = await client.from('circles').select('*').order('created_at', { ascending: false });
    if (result.error) throw circleError(result.error);
    if (!result.data.length) return [];
    const ids = result.data.map(row => row.id);
    const [members, requests] = await Promise.all([
      client.from('circle_members').select('*').in('circle_id', ids),
      client.from('circle_join_requests').select('*').in('circle_id', ids),
    ]);
    if (members.error) throw circleError(members.error);
    if (requests.error) throw circleError(requests.error);
    return result.data.map(row => {
      const active = members.data.filter(item => item.circle_id === row.id);
      const own = requests.data.find(item => item.circle_id === row.id && item.requester_id === userId);
      return { id: row.id, name: row.name, hostId: row.host_id, createdAt: row.created_at,
        memberCount: active.length, pendingCount: requests.data.filter(item => item.circle_id === row.id && item.status === 'pending').length,
        status: row.host_id === userId || active.some(item => item.user_id === userId) ? 'member' : own?.status === 'declined' ? 'declined' : 'pending' };
    });
  },
  async detail(id: string, userId: string): Promise<CircleDetail | null> {
    const circle = (await this.list(userId)).find(item => item.id === id);
    if (!circle) return null;
    if (circle.status !== 'member') return { circle, members: [], requests: [] };
    const client = getSupabase();
    const [members, requests] = await Promise.all([
      client.from('circle_members').select('*').eq('circle_id', id).order('joined_at'),
      circle.hostId === userId ? client.from('circle_join_requests').select('*').eq('circle_id', id).eq('status', 'pending').order('created_at') : Promise.resolve({ data: [], error: null }),
    ]);
    if (members.error) throw circleError(members.error);
    if (requests.error) throw circleError(requests.error);
    const ids = [...new Set([...members.data.map(item => item.user_id), ...requests.data.map(item => item.requester_id)])];
    const profiles = await client.from('profiles').select('*').in('id', ids);
    if (profiles.error) throw circleError(profiles.error);
    const people = new Map(profiles.data.map(row => [row.id, mapProfile(row)]));
    return { circle, members: members.data.map(row => ({ userId: row.user_id, joinedAt: row.joined_at, person: people.get(row.user_id) ?? null })),
      requests: requests.data.map(row => ({ id: row.id, requesterId: row.requester_id, createdAt: row.created_at, person: people.get(row.requester_id) ?? null })) };
  },
};
