import { readableServiceError } from '@/src/lib/serviceError';
import { getSupabase } from '@/src/lib/supabase';
import type { TermsStatus } from '@/src/models';

export const legalService = {
  async getTermsStatus(): Promise<TermsStatus> {
    const { data, error } = await getSupabase().rpc('get_terms_status');
    if (error) throw readableServiceError(error);
    const row = data?.[0];
    return {
      currentVersion: row?.current_version ?? '2026-09-25',
      acceptedAt: row?.accepted_at ?? null,
    };
  },

  async acceptTerms(version: string): Promise<string> {
    const { data, error } = await getSupabase().rpc('accept_terms', { p_version: version });
    if (error) throw readableServiceError(error);
    return data;
  },
};
