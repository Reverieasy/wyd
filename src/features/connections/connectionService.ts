import type { ConnectionRowType } from '@/src/lib/database.types';
import { readableServiceError, ServiceError } from '@/src/lib/serviceError';
import { getSupabase } from '@/src/lib/supabase';
import type { Connection, ConnectionWithPerson, RelationshipType, User } from '@/src/models';
import { mapProfile } from '@/src/features/profiles/profileService';

function mapConnection(row: ConnectionRowType): Connection {
  return {
    id: row.id,
    requesterId: row.requester_id,
    addresseeId: row.addressee_id,
    relationshipType: row.relationship_type,
    status: row.status,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at,
  };
}

async function attachPeople(rows: ConnectionRowType[], userId: string): Promise<ConnectionWithPerson[]> {
  const personIds = [...new Set(rows.map((row) => (row.requester_id === userId ? row.addressee_id : row.requester_id)))];
  if (personIds.length === 0) return [];
  const { data, error } = await getSupabase().from('profiles').select('*').in('id', personIds);
  if (error) throw readableServiceError(error);
  const profiles = new Map((data ?? []).map((row) => [row.id, mapProfile(row)]));
  return rows.flatMap((row) => {
    const personId = row.requester_id === userId ? row.addressee_id : row.requester_id;
    const person = profiles.get(personId);
    if (!person) return [];
    return [{
      connection: mapConnection(row),
      person,
      direction: row.addressee_id === userId ? 'incoming' as const : 'outgoing' as const,
    }];
  });
}

export const connectionService = {
  async listForUser(userId: string) {
    const { data, error } = await getSupabase()
      .from('connections')
      .select('*')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    if (error) throw readableServiceError(error);
    return attachPeople(data ?? [], userId);
  },

  async request(userId: string, person: User, relationshipType: RelationshipType) {
    if (userId === person.id) throw new ServiceError('You cannot connect with yourself.', 'self_connection');
    const { data: existing, error: existingError } = await getSupabase()
      .from('connections')
      .select('*')
      .or(`and(requester_id.eq.${userId},addressee_id.eq.${person.id}),and(requester_id.eq.${person.id},addressee_id.eq.${userId})`)
      .maybeSingle();
    if (existingError) throw readableServiceError(existingError);
    if (existing?.status === 'accepted') throw new ServiceError('You are already connected with this person.', 'connection_exists');
    if (existing?.status === 'pending' && existing.requester_id === userId) throw new ServiceError('Your request is already pending.', 'connection_pending');
    if (existing?.status === 'pending') throw new ServiceError('This person already sent you a request. Accept it below.', 'incoming_request_exists');
    if (existing) throw new ServiceError('This connection is not available.', 'connection_unavailable');

    const { data, error } = await getSupabase().from('connections').insert({
      requester_id: userId,
      addressee_id: person.id,
      relationship_type: relationshipType,
      status: 'pending',
    }).select('*').single();
    if (error) throw readableServiceError(error);
    return { connection: mapConnection(data), person, direction: 'outgoing' as const };
  },

  async accept(connectionId: string, userId: string) {
    const { data, error } = await getSupabase().from('connections').update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    }).eq('id', connectionId).eq('addressee_id', userId).eq('status', 'pending').select('*').single();
    if (error) throw readableServiceError(error);
    return mapConnection(data);
  },
};
