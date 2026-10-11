export type ConnectionInvite = {
  code: string;
  expiresAt: string | null;
};

export type InviteRedemption = {
  connectionId: string;
  invitedUserId: string;
  connectionStatus: 'pending';
};
