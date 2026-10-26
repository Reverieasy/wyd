import * as Clipboard from 'expo-clipboard';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Share, View } from 'react-native';
import { ActionButton, AppText, Avatar, FlowHeader, Screen, TextField } from '@/src/components';
import { ConfirmationDialog } from '@/src/components/ConfirmationDialog';
import { circleService } from '@/src/features/circles/circleService';
import { circleInviteLink, type CircleDetail } from '@/src/features/circles/circleModel';
import { useAppStore } from '@/src/state/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';

type Confirmation = { kind: 'delete' | 'leave' | 'remove'; userId?: string; name?: string };
export default function CircleDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, actions } = useAppStore();
  const { colors } = useTheme();
  const userId = state.server.profile?.id;
  const [result, setResult] = useState<{ id: string; userId: string; data: CircleDetail | null } | null>(null);
  const detail = result?.id === id && result.userId === userId ? result.data : null;
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<{ id: string; userId: string; code: string } | null>(null);
  const code = inviteResult?.id === id && inviteResult.userId === userId ? inviteResult.code : null;
  const [confirm, setConfirm] = useState<Confirmation | null>(null);
  const pending = useRef(false), sequence = useRef(0);
  const refresh = useCallback(async () => {
    if (!id || !userId) return;
    const own = ++sequence.current; setLoading(true);
    try { const detail = await circleService.detail(id, userId); if (own === sequence.current) { setResult({ id, userId, data: detail }); if (detail) setName(detail.circle.name); } }
    catch (err) { if (own === sequence.current) setError(circleService.errorMessage(err)); }
    finally { if (own === sequence.current) setLoading(false); }
  }, [id, userId]);
  useFocusEffect(useCallback(() => { void refresh(); return () => { sequence.current++; }; }, [refresh]));
  const run = async (operation: () => Promise<unknown>, success?: string) => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(null); setMessage(null);
    try { await operation(); if (success) setMessage(success); await refresh(); }
    catch (err) { setError(circleService.errorMessage(err)); }
    finally { pending.current = false; setBusy(false); }
  };
  const share = async (kind: 'code' | 'link' | 'share' | 'rotate') => {
    await run(async () => {
      const invite = await circleService.invite(id, kind === 'rotate');
      if (userId) setInviteResult({ id, userId, code: invite.code });
      const display = invite.code.toUpperCase().match(/.{1,8}/g)!.join('-');
      const link = circleInviteLink(invite.code);
      if (kind === 'code') await Clipboard.setStringAsync(display);
      if (kind === 'link') await Clipboard.setStringAsync(link);
      if (kind === 'share') await Share.share({ message: `Request to join ${detail?.circle.name} on Wyd?\n${link}\nCircle code: ${display}\nThe host will need to approve your request.` });
    }, kind === 'rotate' ? 'New invite created. Previous codes and links no longer work.' : kind === 'share' ? undefined : 'Invite copied.');
  };
  const circle = detail?.circle;
  const host = circle?.hostId === userId;
  if (loading && !circle) return <Screen><FlowHeader title="Your circle" /><AppText tone="secondary">Loading circle…</AppText></Screen>;
  if (!circle) return <Screen><FlowHeader title="Your circle" /><AppText>{error ?? 'This circle is no longer available.'}</AppText><ActionButton label="Back to circles" onPress={() => router.replace('/(flows)/circles')} /></Screen>;
  const member = circle.status === 'member';
  const confirmAction = async () => {
    if (!confirm) return;
    await run(async () => {
      if (confirm.kind === 'remove') await circleService.removeMember(id, confirm.userId!);
      else { await (confirm.kind === 'delete' ? circleService.delete(id) : circleService.leave(id)); router.replace('/(flows)/circles'); }
      setConfirm(null);
    });
  };
  return <Screen scroll keyboardShouldPersistTaps="handled"><FlowHeader title={circle.name} />
    <AppText tone="secondary">{host ? 'You are the host. Only you can approve join requests.' : member ? `${circle.memberCount} members · A little space for your people.` : circle.status === 'pending' ? 'Your request is pending. The host must approve you before you can see members or share moments.' : 'The host declined your join request.'}</AppText>
    {host ? <View style={{ gap: 10 }}><AppText variant="label14">Circle name</AppText><TextField accessibilityLabel="Circle name" value={name} onChangeText={setName} maxLength={40} editable={!busy} /><ActionButton label="Save name" variant="secondary" disabled={busy || !name.trim() || name.trim() === circle.name} onPress={() => void run(() => circleService.rename(id, name), 'Circle name updated.')} /></View> : null}
    {host ? <View style={{ gap: 12 }}><AppText variant="title20">Join requests ({detail.requests.length})</AppText>{!detail.requests.length ? <AppText tone="secondary">No pending requests.</AppText> : null}{detail.requests.map(request => <View key={request.id} style={{ gap: 10, padding: 14, borderRadius: 18, backgroundColor: colors.background.card, borderWidth: 1, borderColor: colors.border.default }}><View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><Avatar name={request.person?.displayName ?? 'New person'} uri={request.person?.avatarUrl ?? undefined} size={42} /><View style={{ flex: 1 }}><AppText variant="label14">{request.person?.displayName ?? 'New person'}</AppText><AppText variant="caption11" tone="secondary">{request.person ? `@${request.person.handle}` : 'Profile unavailable'}</AppText></View></View><View style={{ flexDirection: 'row', gap: 10 }}><ActionButton label="Accept" style={{ flex: 1 }} disabled={busy} onPress={() => void run(() => circleService.review(id, request.id, true), 'Member accepted.')} /><ActionButton label="Decline" style={{ flex: 1 }} variant="secondary" disabled={busy} onPress={() => void run(() => circleService.review(id, request.id, false), 'Request declined.')} /></View></View>)}</View> : null}
    {member ? <><View style={{ gap: 12 }}><AppText variant="title20">Invite people</AppText><AppText tone="secondary">Invite anyone, including people outside Close people. Links open Wyd on phones where it is installed. Every join request still needs host approval.</AppText>{code ? <AppText selectable style={{ textAlign: 'center', color: colors.background.accent, fontSize: 14 }}>{code.toUpperCase().match(/.{1,8}/g)!.join('-')}</AppText> : null}<ActionButton label="Copy invite code" disabled={busy} onPress={() => void share('code')} /><ActionButton label="Copy invite link" variant="secondary" disabled={busy} onPress={() => void share('link')} /><ActionButton label="Share invite" variant="secondary" disabled={busy} onPress={() => void share('share')} />{host ? <ActionButton label="Replace invite code and link" variant="secondary" disabled={busy} onPress={() => void share('rotate')} /> : null}<AppText variant="caption11" tone="secondary">Invite codes expire after 7 days. Replacing the code invalidates the previous link.</AppText></View>
    <View style={{ gap: 12 }}><AppText variant="title20">Members ({circle.memberCount})</AppText>{detail.members.map(item => <View key={item.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}><Avatar name={item.person?.displayName ?? 'Member'} uri={item.person?.avatarUrl ?? undefined} size={42} /><View style={{ flex: 1, gap: 3 }}><AppText variant="label14">{item.userId === userId ? 'You' : item.person?.displayName ?? 'Member'}</AppText><AppText variant="caption11" tone="secondary">{item.userId === circle.hostId ? 'Host' : item.person ? `@${item.person.handle}` : 'Member'}</AppText></View>{host && item.userId !== userId ? <ActionButton label="Remove" variant="secondary" disabled={busy} onPress={() => setConfirm({ kind: 'remove', userId: item.userId, name: item.person?.displayName ?? 'this member' })} /> : null}</View>)}</View>
    <ActionButton label="Share a moment with this circle" disabled={busy || circle.memberCount < 2} onPress={() => { actions.setDraftRecipients([]); actions.setDraftCircles([id]); router.push('/(tabs)/camera'); }} />
    {circle.memberCount < 2 ? <AppText variant="caption11" tone="secondary">Accept another member to start sharing moments.</AppText> : null}
    <ActionButton label={host ? 'Delete circle' : 'Leave circle'} variant="secondary" disabled={busy} onPress={() => setConfirm({ kind: host ? 'delete' : 'leave' })} /></> : null}
    {error ? <AppText accessibilityRole="alert" style={{ color: '#DA645B' }}>{error}</AppText> : null}{message ? <AppText accessibilityLiveRegion="polite" style={{ color: colors.background.accent }}>{message}</AppText> : null}
    <ActionButton label="Refresh circle" variant="secondary" loading={loading} disabled={busy} onPress={() => void refresh()} />
    <ConfirmationDialog visible={!!confirm} busy={busy} error={error} title={confirm?.kind === 'delete' ? 'Delete this circle?' : confirm?.kind === 'leave' ? 'Leave this circle?' : `Remove ${confirm?.name ?? 'member'}?`} message={confirm?.kind === 'delete' ? 'This removes the circle, its membership, and pending requests for everyone.' : 'Circle moments will no longer be available through this membership.'} confirmLabel={confirm?.kind === 'delete' ? 'Delete circle' : confirm?.kind === 'leave' ? 'Leave circle' : 'Remove'} onConfirm={() => void confirmAction()} onCancel={() => { if (!busy) setConfirm(null); }} />
  </Screen>;
}
