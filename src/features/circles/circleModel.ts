import type { User } from '@/src/models';

export type Circle = { id: string; name: string; hostId: string; createdAt: string; memberCount: number; pendingCount: number; status: 'member' | 'pending' | 'declined' };
export type CircleMember = { userId: string; joinedAt: string; person: User | null };
export type CircleRequest = { id: string; requesterId: string; createdAt: string; person: User | null };
export type CircleDetail = { circle: Circle; members: CircleMember[]; requests: CircleRequest[] };
export type CircleInvitePreview = { circle_id: string; name: string; host_id: string; host_name: string; member_count: number; status: 'none' | 'member' | 'pending' | 'approved' | 'declined' };

export function normalizeCircleCode(input: string) {
  let value = input.trim();
  try { value = new URL(value).searchParams.get('code') ?? value; } catch { /* A raw code is also valid. */ }
  value = value.replace(/[\s-]/g, '').toLowerCase();
  return /^[a-f0-9]{32}$/.test(value) ? value : null;
}

export function circleInviteLink(code: string) {
  const normalized = normalizeCircleCode(code);
  if (!normalized) throw new Error('Invalid circle code');
  return `watchudoin://join-circle?code=${normalized}`;
}
