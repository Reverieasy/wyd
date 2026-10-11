import { mapProfile } from '@/src/features/profiles/profileService';
import { readableServiceError } from '@/src/lib/serviceError';
import { getSupabase } from '@/src/lib/supabase';
import type { BlockedUser, ReportReason, SupportCategory } from '@/src/models';

export const safetyService = {
  async removeConnection(connectionId: string) {
    const { data, error } = await getSupabase().rpc('remove_connection', { p_connection_id: connectionId });
    if (error) throw readableServiceError(error);
    return data;
  },

  async blockUser(personId: string) {
    const { data, error } = await getSupabase().rpc('block_user', { p_user_id: personId });
    if (error) throw readableServiceError(error);
    return data;
  },

  async unblockUser(personId: string) {
    const { data, error } = await getSupabase().rpc('unblock_user', { p_user_id: personId });
    if (error) throw readableServiceError(error);
    return data;
  },

  async listBlockedUsers(): Promise<BlockedUser[]> {
    const { data, error } = await getSupabase().rpc('list_blocked_users');
    if (error) throw readableServiceError(error);
    return (data ?? []).map((row) => ({ ...mapProfile(row), blockedAt: row.blocked_at }));
  },

  async reportUser(personId: string, reason: ReportReason, details?: string) {
    const { data, error } = await getSupabase().rpc('report_user', {
      p_user_id: personId,
      p_reason: reason,
      p_details: details?.trim() || undefined,
    });
    if (error) throw readableServiceError(error);
    return data;
  },

  async reportMoment(updateId: string, reason: ReportReason, details?: string) {
    const { data, error } = await getSupabase().rpc('report_moment', {
      p_update_id: updateId,
      p_reason: reason,
      p_details: details?.trim() || undefined,
    });
    if (error) throw readableServiceError(error);
    return data;
  },

  async submitSupportRequest(category: SupportCategory, message: string) {
    const { data, error } = await getSupabase().rpc('submit_support_request', {
      p_category: category,
      p_details: message.trim(),
    });
    if (error) throw readableServiceError(error);
    return data;
  },
};
