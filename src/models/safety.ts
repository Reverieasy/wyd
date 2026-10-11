import type { User } from './user';

export const TERMS_VERSION = '2026-09-25';

export type TermsStatus = {
  currentVersion: string;
  acceptedAt: string | null;
};

export type ReportReason = 'harassment' | 'inappropriate' | 'spam' | 'impersonation' | 'threats' | 'other';
export type SupportCategory = 'bug' | 'account' | 'safety' | 'notification' | 'other';
export type BlockedUser = User & { blockedAt: string };
