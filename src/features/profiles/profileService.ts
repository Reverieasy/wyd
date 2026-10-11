import type { ProfileRowType } from '@/src/lib/database.types';
import { readableServiceError, ServiceError } from '@/src/lib/serviceError';
import { getSupabase } from '@/src/lib/supabase';
import type { User } from '@/src/models';

export function mapProfile(row: ProfileRowType): User {
  return {
    id: row.id,
    handle: row.username,
    displayName: row.display_name,
    avatarPath: row.avatar_path,
    avatarUrl: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const profileService = {
  async getById(id: string) {
    const { data, error } = await getSupabase().from('profiles').select('*').eq('id', id).single();
    if (error) throw readableServiceError(error);
    return mapProfile(data);
  },

  async findExactUsername(username: string) {
    const normalized = username.trim().replace(/^@/, '').toLowerCase();
    if (!normalized) throw new ServiceError('Enter a username.', 'username_required');
    const { data, error } = await getSupabase().rpc('find_profile_by_username', { p_username: normalized });
    if (error) throw readableServiceError(error);
    return data?.[0] ? mapProfile(data[0]) : null;
  },

  async updateProfile(input: { displayName: string; username: string }) {
    const username = input.username.trim().replace(/^@/, '').toLowerCase();
    const displayName = input.displayName.trim();
    if (!displayName) throw new ServiceError('Enter your name.', 'display_name_required');
    if (!/^[a-z0-9._]{3,24}$/.test(username)) {
      throw new ServiceError('Use 3-24 letters, numbers, periods, or underscores.', 'invalid_username');
    }
    const { data, error } = await getSupabase().rpc('update_profile', {
      p_display_name: displayName,
      p_username: username,
    });
    if (error) {
      const raw = error.message;
      if (raw.includes('username_in_use')) throw new ServiceError('That username is already taken.', 'username_in_use', error);
      if (raw.includes('username_rate_limited')) throw new ServiceError('You can change your username once every 7 days.', 'username_rate_limited', error);
      if (raw.includes('invalid_display_name')) throw new ServiceError('Use a name between 1 and 40 characters.', 'invalid_display_name', error);
      throw readableServiceError(error);
    }
    if (!data?.[0]) throw new ServiceError('Your profile could not be updated.', 'profile_update_missing');
    return mapProfile(data[0]);
  },
};
