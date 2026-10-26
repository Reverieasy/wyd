import type { NudgeRowType } from '@/src/lib/database.types';
import { readableServiceError, ServiceError } from '@/src/lib/serviceError';
import { getSupabase } from '@/src/lib/supabase';

const messages: Record<string, string> = {
  AUTH_REQUIRED: 'Sign in again to send a nudge.',
  nudge_invalid_recipient: 'Choose someone else to nudge.',
  nudge_not_connected: 'You can only nudge an accepted connection.',
  nudge_cooldown: 'You nudged them recently. Wait 10 seconds between nudges.',
  nudge_not_found: 'That nudge is no longer available.',
  nudge_not_pending: 'That nudge has already been answered.',
  nudge_response_invalid: 'Send this moment to the person who nudged you.',
  terms_required: 'Accept the current Terms of Use before sending a nudge.',
};

function mapError(error: unknown) {
  const fallback = readableServiceError(error);
  const raw = error instanceof Error
    ? error.message
    : typeof error === 'object' && error && 'message' in error && typeof error.message === 'string'
      ? error.message
      : '';
  const code = Object.keys(messages).find((candidate) => raw.includes(candidate));
  return code ? new ServiceError(messages[code], code, error) : fallback;
}

function first(data: NudgeRowType[] | null, message: string) {
  if (!data?.[0]) throw new ServiceError(message, 'nudge_missing');
  return data[0];
}

export const nudgeService = {
  errorMessage(error: unknown) {
    return mapError(error).message;
  },

  async send(recipientId: string) {
    const { data, error } = await getSupabase().rpc('send_nudge', { p_recipient_id: recipientId });
    if (error) throw mapError(error);
    return first(data, 'The nudge could not be sent. Please try again.');
  },

  async markSeen(nudgeId: string) {
    const { data, error } = await getSupabase().rpc('mark_nudge_seen', { p_nudge_id: nudgeId });
    if (error) throw mapError(error);
    return first(data, 'That nudge is no longer available.');
  },

  async markResponded(nudgeId: string, updateId: string) {
    const { data, error } = await getSupabase().rpc('mark_nudge_responded', {
      p_nudge_id: nudgeId,
      p_update_id: updateId,
    });
    if (error) throw mapError(error);
    return first(data, 'That nudge could not be marked as answered.');
  },

  async getPendingForReceiver(nudgeId: string, receiverId: string) {
    const { data, error } = await getSupabase()
      .from('nudges')
      .select('*')
      .eq('id', nudgeId)
      .eq('receiver_id', receiverId)
      .eq('status', 'pending')
      .maybeSingle();
    if (error) throw mapError(error);
    return data;
  },
};
