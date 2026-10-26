import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { ActionButton, AppText, FlowHeader, Screen, TextField } from '@/src/components';
import { circleService } from '@/src/features/circles/circleService';
import { normalizeCircleCode, type CircleInvitePreview } from '@/src/features/circles/circleModel';
import { circleInviteStorage } from '@/src/features/circles/circleInviteStorage';
import { useAppStore } from '@/src/state/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';

export default function JoinCircleRoute() {
  const params = useLocalSearchParams<{ code?: string }>();
  const paramCode = typeof params.code === 'string' ? params.code : '';
  const { state } = useAppStore();
  const { colors } = useTheme();
  const userId = state.server.profile?.id;
  const [input, setInput] = useState(paramCode);
  const [preview, setPreview] = useState<CircleInvitePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    let active = true;
    if (!paramCode) return;
    setInput(paramCode);
    if (!userId) { void circleInviteStorage.save(paramCode); return; }
    setBusy(true);
    void circleService.preview(paramCode).then(value => { if (active) setPreview(value); }).catch(err => { if (active) setError(circleService.errorMessage(err)); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [paramCode, userId]);
  const inspect = async () => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(null); setRequested(false);
    try { setPreview(await circleService.preview(input)); }
    catch (err) { setError(circleService.errorMessage(err)); }
    finally { pending.current = false; setBusy(false); }
  };
  const request = async () => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(null);
    try {
      const result = await circleService.requestJoin(input);
      await circleInviteStorage.clear();
      if (result.status === 'member') router.replace({ pathname: '/(flows)/circles/[id]', params: { id: result.circle_id } });
      else setRequested(true);
    } catch (err) { setError(circleService.errorMessage(err)); }
    finally { pending.current = false; setBusy(false); }
  };
  const authenticate = async (signup: boolean) => {
    if (normalizeCircleCode(input)) await circleInviteStorage.save(input);
    router.push(signup ? '/(onboarding)/create-account' : '/(onboarding)/sign-in');
  };
  return <Screen scroll keyboardShouldPersistTaps="handled"><FlowHeader title="Join a circle" /><AppText variant="title24">Your people are a code away.</AppText><AppText tone="secondary">Paste a circle code or invite link. The host must accept your request before you can see the circle’s members or photos.</AppText>
    <TextField accessibilityLabel="Circle invite code or link" value={input} onChangeText={value => { setInput(value); setPreview(null); setRequested(false); setError(null); }} placeholder="Paste code or invite link" autoCapitalize="none" autoCorrect={false} editable={!busy} />
    {!userId ? <View style={{ gap: 10 }}><AppText tone="secondary">Sign in or create an account to request access. Your invite will be kept while you sign in.</AppText><ActionButton label="Sign in" onPress={() => void authenticate(false)} /><ActionButton label="Create account" variant="secondary" onPress={() => void authenticate(true)} /></View> : <ActionButton label="Find circle" loading={busy} disabled={!normalizeCircleCode(input)} onPress={() => void inspect()} />}
    {userId && preview ? <View style={{ gap: 14, padding: 20, borderRadius: 22, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.background.card }}><AppText variant="title20">{preview.name}</AppText><AppText tone="secondary">Hosted by {preview.host_name} · {preview.member_count} {preview.member_count === 1 ? 'member' : 'members'}</AppText>
      {requested || preview.status === 'pending' ? <><AppText accessibilityLiveRegion="polite" style={{ color: colors.background.accent }}>Request sent. Waiting for host approval.</AppText><ActionButton label="View my circles" variant="secondary" onPress={() => router.replace('/(flows)/circles')} /></> : preview.status === 'member' || preview.status === 'approved' ? <ActionButton label="Open circle" onPress={() => router.replace({ pathname: '/(flows)/circles/[id]', params: { id: preview.circle_id } })} /> : <><AppText tone="secondary">{preview.status === 'declined' ? 'Your previous request was declined.' : 'You’ll join only after the host accepts you.'}</AppText><ActionButton label={preview.status === 'declined' ? 'Request again' : 'Request to join'} loading={busy} onPress={() => void request()} /></>}
    </View> : null}
    {error ? <AppText accessibilityRole="alert" style={{ color: '#DA645B' }}>{error}</AppText> : null}
  </Screen>;
}
