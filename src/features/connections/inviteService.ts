import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';

import { readableServiceError, ServiceError } from '@/src/lib/serviceError';
import { getSupabase } from '@/src/lib/supabase';
import type { ConnectionInvite, InviteRedemption, RelationshipType } from '@/src/models';

const inviteMessages = {
  invite_invalid: "That invite code isn't valid.",
  invite_expired: 'That invite has expired. Ask them for a new code.',
  invite_own_code: "You can't use your own invite code.",
  connection_exists: "You're already connected.",
  connection_pending: 'You already sent a request to this person.',
  incoming_request_exists: 'This person already sent you a request.',
  invite_rate_limited: 'Too many attempts. Try again in a few minutes.',
  AUTH_REQUIRED: 'Sign in again to use invite codes.',
  INVALID_RELATIONSHIP_TYPE: 'Choose a valid relationship type.',
} as const;

type InviteErrorCode = keyof typeof inviteMessages;

function inviteError(error: unknown) {
  const fields = typeof error === 'object' && error
    ? ['message', 'details', 'hint', 'code'].flatMap((key) => {
        const value = key in error ? error[key as keyof typeof error] : null;
        return typeof value === 'string' ? [value] : [];
      })
    : [];
  const backendText = fields.join(' ');
  const code = (Object.keys(inviteMessages) as InviteErrorCode[]).find((candidate) =>
    backendText.includes(candidate),
  );
  if (code) return new ServiceError(inviteMessages[code], code, error);
  return readableServiceError(error);
}

function mapInvite(row: { code: string; expires_at: string }): ConnectionInvite {
  return { code: row.code, expiresAt: row.expires_at };
}

export const inviteService = {
  async getMyInvite(): Promise<ConnectionInvite | null> {
    const { data, error } = await getSupabase().rpc('get_my_invite');
    if (error) throw inviteError(error);
    return data?.[0] ? mapInvite(data[0]) : null;
  },

  async redeemInvite(code: string, relationshipType: RelationshipType): Promise<InviteRedemption> {
    const { data, error } = await getSupabase().rpc('redeem_invite', {
      p_code: code,
      p_relationship_type: relationshipType,
    });
    if (error) throw inviteError(error);
    const result = data?.[0];
    if (!result) throw new ServiceError('The invite was redeemed, but no connection was returned.', 'invite_result_missing');
    return {
      connectionId: result.connection_id,
      invitedUserId: result.invited_user_id,
      connectionStatus: result.connection_status,
    };
  },

  async regenerateInvite(): Promise<ConnectionInvite> {
    const { data, error } = await getSupabase().rpc('regenerate_invite');
    if (error) throw inviteError(error);
    const invite = data?.[0];
    if (!invite) throw new ServiceError('A new invite code was not returned.', 'invite_result_missing');
    return mapInvite(invite);
  },

  async shareInvite(invite: ConnectionInvite) {
    await Share.share({
      title: 'Join me on watchu doin?',
      message: `Join me on watchu doin? My invite code is ${invite.code}.`,
    });
  },

  async copyInvite(invite: ConnectionInvite) {
    await Clipboard.setStringAsync(invite.code);
  },

  errorMessage(error: unknown) {
    return inviteError(error).message;
  },
};
