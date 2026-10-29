import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef, useState } from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { ActionButton, AppText, FlowHeader, Screen } from '@/src/components';
import { PersonQrCard } from '@/src/components/PersonQrCard';
import { downloadQrCardWeb, qrCardExportMessage } from '@/src/features/connections/qrCardExport';
import { useAppStore } from '@/src/state/appStore';

export default function MyQrRoute() {
  const { state } = useAppStore();
  const profile = state.server.profile, session = state.server.session;
  const width = Math.min(360, useWindowDimensions().width - 48);
  const card = useRef<View>(null), pending = useRef(false), current = useRef(profile?.id); current.current = profile?.id;
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [height, setHeight] = useState(0), [message, setMessage] = useState<string | null>(null);
  useEffect(() => { setReady(false); setMessage(null); }, [profile?.id, profile?.handle, profile?.avatarUrl]);
  const save = async () => {
    if (!profile || !session || pending.current || (Platform.OS !== 'web' && (!ready || !height))) return;
    const ownerId = profile.id;
    const assertCurrent = () => { if (current.current !== ownerId) throw new Error('Your account changed.'); };
    pending.current = true; setBusy(true); setMessage(null);
    let uri: string | null = null;
    try {
      if (Platform.OS === 'web') await downloadQrCardWeb(profile, session.access_token, assertCurrent);
      else {
        const { requestPermissionsAsync, Asset } = await import('expo-media-library');
        const permission = await requestPermissionsAsync(true);
        if (!permission.granted) throw new Error('Allow saving photos.');
        assertCurrent();
        const viewShot = await import('react-native-view-shot');
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        uri = await viewShot.captureRef(card, { format: 'png', quality: 1, result: 'tmpfile', width: 1080, height: Math.round(height * 1080 / width) });
        assertCurrent(); await Asset.create(uri.startsWith('file://') ? uri : `file://${uri}`);
      }
      if (current.current === ownerId) setMessage(Platform.OS === 'web' ? 'QR card downloaded. You can share the PNG externally.' : 'QR card saved to your gallery. You can share it externally.');
    } catch (error) { if (current.current === ownerId) setMessage(qrCardExportMessage(error)); }
    finally {
      if (uri) { const viewShot = await import('react-native-view-shot'); viewShot.releaseCapture(uri); }
      pending.current = false; if (current.current === ownerId) setBusy(false);
    }
  };
  if (!profile) return <Screen><FlowHeader title="My QR code" /><AppText>Sign in to create your QR card.</AppText></Screen>;
  return <Screen scroll contentStyle={{ gap: 18, paddingBottom: 32 }}><FlowHeader title="My QR code" /><AppText tone="secondary">Download your card and share it to your friends.</AppText>
    <View style={{ alignItems: 'center' }}><PersonQrCard key={`${profile.id}:${profile.handle}:${profile.avatarUrl}`} ref={card} profile={profile} accessToken={session?.access_token} width={width} onReady={setReady} onLayout={event => setHeight(event.nativeEvent.layout.height)} /></View>
    <ActionButton label="Download QR card" icon={<MaterialIcons name="download" color="white" size={20} />} loading={busy} disabled={!session || (Platform.OS !== 'web' && (!ready || !height))} onPress={() => void save()} />
    {message ? <AppText accessibilityLiveRegion="polite" tone="secondary">{message}</AppText> : null}
    <AppText variant="caption11" tone="secondary">Your name and photo are included in the downloaded image. The code opens your username in watchudoin? and still requires a connection request. Download a new card if you change your username.</AppText>
  </Screen>;
}
