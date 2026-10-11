import { readableServiceError, ServiceError } from '@/src/lib/serviceError';
import { getSupabase } from '@/src/lib/supabase';

export const accountService = {
  async deleteAccount(confirmation: string) {
    if (confirmation !== 'DELETE') {
      throw new ServiceError('Type DELETE to confirm.', 'confirmation_required');
    }
    const { data, error } = await getSupabase().functions.invoke('delete-account', {
      body: { confirmation },
    });
    if (error) {
      const response = (error as { context?: Response }).context;
      let code: string | undefined;
      try { code = (await response?.clone().json())?.error; } catch { /* Use the safe fallback below. */ }
      if (code === 'photo_cleanup_failed') throw new ServiceError('Your photos could not be safely removed, so your account was not deleted. Try again.', code, error);
      if (code === 'AUTH_REQUIRED') throw new ServiceError('Your session expired. Sign in again before deleting your account.', code, error);
      throw readableServiceError(error);
    }
    if (!data?.deleted) throw new ServiceError('Your account could not be deleted. Please try again.', 'deletion_failed');
  },
};
