import type { ReactionRowType } from '@/src/lib/database.types';
import { readableServiceError, ServiceError } from '@/src/lib/serviceError';
import { getSupabase } from '@/src/lib/supabase';
import type { ReactionType } from '@/src/models';

const messages: Record<string, string> = {
  AUTH_REQUIRED: 'Sign in again to react.',
  reaction_invalid: 'Choose one of the available reactions.',
  reaction_update_not_visible: 'This moment is no longer available to you.',
  terms_required: 'Accept the current Terms of Use before reacting.',
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

export const reactionService = {
  errorMessage(error: unknown) {
    return mapError(error).message;
  },

  async set(updateId: string, reaction: ReactionType): Promise<ReactionRowType> {
    const { data, error } = await getSupabase().rpc('set_reaction', {
      p_update_id: updateId,
      p_reaction: reaction,
    });
    if (error) throw mapError(error);
    if (!data?.[0]) throw new ServiceError('Your reaction could not be saved.', 'reaction_missing');
    return data[0];
  },
};
