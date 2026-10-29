import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { ActionButton, AppText, Avatar, FlowHeader, Screen } from '@/src/components';
import { normalizePersonUsername } from '@/src/features/connections/personQr';
import { personQrStorage } from '@/src/features/connections/personQrStorage';
import { profileService } from '@/src/features/profiles/profileService';
import { connectionService } from '@/src/features/connections/connectionService';
import { notificationService } from '@/src/features/notifications/notificationService';
import { useAppStore } from '@/src/state/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import type { User } from '@/src/models';

export default function AddPersonRoute() {
  const params = useLocalSearchParams<{ username?: string }>();
  const username = normalizePersonUsername(params.username);
  const { state, actions } = useAppStore(); const { colors } = useTheme();
  const userId = state.server.profile?.id;
  const [person, setPerson] = useState<User | null>(null), [loading, setLoading] = useState(false), [busy, setBusy] = useState(false), [sent, setSent] = useState(false), [error, setError] = useState<string | null>(null);
  const pending = useRef(false), current = useRef(userId); current.current = userId;
  useEffect(() => {
    let active = true; setPerson(null); setSent(false); setError(null);
    if (!username) { setError('This person link is invalid. Ask them for a new QR card.'); return; }
    if (!userId) { void personQrStorage.save(username).catch(() => undefined); return; }
    setLoading(true);
    void profileService.findExactUsername(username).then(value => {
      if (!active) return;
      if (!value) setError('This username is no longer available. Ask them for their latest QR card.');
      else if (value.id === userId) setError('This is your own QR code. Share your card with someone else to connect.');
      else setPerson(value);
    }).catch(() => { if (active) setError('This person could not be loaded. Check your connection and scan again.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [username, userId]);
  const entry = state.server.connections.find(item => item.person.id === person?.id);
  const authenticate = async (signup: boolean) => { if (username) await personQrStorage.save(username); router.push(signup ? '/(onboarding)/create-account' : '/(onboarding)/sign-in'); };
  const request = async () => {
    if (!userId || !person || pending.current || entry?.connection.status === 'accepted' || entry?.connection.status === 'pending') return;
    const ownerId = userId; pending.current = true; setBusy(true); setError(null);
    try {
      const result = await connectionService.request(ownerId, person, 'friend');
      if (current.current !== ownerId) return;
      setSent(true);
      void notificationService.sendPush('connection_request', result.connection.id).catch(() => undefined);
      void actions.refreshConnections();
    } catch (err) { if (current.current === ownerId) setError(err instanceof Error ? err.message : 'Your request could not be sent. Try again.'); }
    finally { pending.current = false; if (current.current === ownerId) setBusy(false); }
  };
  return <Screen scroll contentStyle={{ gap: 18 }}><FlowHeader title="Add your person" />
    {!userId && username ? <><AppText variant="title24">Connect with @{username}</AppText><AppText tone="secondary">Sign in or create an account to view this person and send a request. Your scanned username will be kept while you sign in.</AppText><ActionButton label="Sign in" emphasis="gradient" onPress={() => void authenticate(false).catch(() => setError('Could not keep this QR link. Try again.'))} /><ActionButton label="Create account" variant="secondary" onPress={() => void authenticate(true).catch(() => setError('Could not keep this QR link. Try again.'))} /></> : null}
    {loading ? <AppText tone="secondary">Finding your person…</AppText> : null}
    {userId && person ? <View style={{ backgroundColor: colors.background.card, borderWidth: 1, borderColor: colors.border.default, padding: 22, borderRadius: 22, alignItems: 'center', gap: 12 }}><Avatar name={person.displayName} uri={person.avatarUrl ?? undefined} size={82} /><AppText variant="title24">{person.displayName}</AppText><AppText tone="secondary">@{person.handle}</AppText>
      {entry?.connection.status === 'accepted' ? <AppText>Already in your Close People.</AppText> : entry?.connection.status === 'pending' && entry.direction === 'incoming' ? <ActionButton label="Accept their request" loading={state.server.busy} onPress={() => void actions.acceptConnection(entry.connection.id)} /> : sent || entry?.connection.status === 'pending' ? <AppText accessibilityLiveRegion="polite">Request sent. Waiting for them to accept.</AppText> : <><AppText tone="secondary">They’ll need to accept before you can share private Moments.</AppText><ActionButton label="Send connection request" loading={busy} onPress={() => void request()} /></>}
    </View> : null}
    {error ? <AppText accessibilityRole="alert">{error}</AppText> : null}
    {state.server.error ? <AppText accessibilityRole="alert">{state.server.error}</AppText> : null}
    {userId ? <ActionButton label="Back to your people" variant="secondary" onPress={() => router.replace('/(tabs)/people')} /> : null}
  </Screen>;
}
