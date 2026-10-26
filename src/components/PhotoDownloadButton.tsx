import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image, type ImageSource } from 'expo-image';
import Feather from '@expo/vector-icons/Feather';
import { authorizePhotoExport, downloadPhotoWeb, exportDimensions, PHOTO_WATERMARK, photoExportMessage, requestGalleryAccess, saveCapturedPhoto } from '@/src/features/updates/photoExportService';
import { useAppStore } from '@/src/state/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import { AppText } from './primitives/AppText';

export function PhotoDownloadButton({ updateId }: { updateId: string }) {
  const { state } = useAppStore(), { colors } = useTheme();
  const userId = state.server.session?.user.id;
  const currentUser = useRef(userId); currentUser.current = userId;
  const [busy, setBusy] = useState(false), [message, setMessage] = useState<string | null>(null);
  const [source, setSource] = useState<ImageSource | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [laidOut, setLaidOut] = useState(false);
  const captureView = useRef<View>(null), pending = useRef(false), capturing = useRef(false);
  const viewport = useWindowDimensions();
  const ratio = dimensions ? dimensions.width / dimensions.height : 1;
  const viewWidth = Math.min(viewport.width - 40, (viewport.height - 160) * ratio);
  useEffect(() => { setSource(null); setDimensions(null); setBusy(false); pending.current = false; }, [userId, updateId]);
  useEffect(() => {
    if (!source || !dimensions || !laidOut || capturing.current || !userId) return;
    capturing.current = true;
    let uri: string | null = null;
    void (async () => {
      const viewShot = await import('react-native-view-shot');
      try {
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        if (currentUser.current !== userId) throw new Error('Your account changed. Please try again.');
        uri = await viewShot.captureRef(captureView, { format: 'jpg', quality: 0.95, result: 'tmpfile', ...dimensions });
        await saveCapturedPhoto(uri, updateId, userId);
        if (currentUser.current === userId) setMessage('Saved to your gallery.');
      } catch (err) { if (currentUser.current === userId) setMessage(photoExportMessage(err)); }
      finally {
        if (uri) viewShot.releaseCapture(uri);
        capturing.current = false; pending.current = false;
        if (currentUser.current === userId) { setSource(null); setBusy(false); }
      }
    })().catch(() => { capturing.current = false; pending.current = false; setSource(null); setBusy(false); setMessage('Install the updated app build to save photos.'); });
  }, [source, dimensions, laidOut, userId, updateId]);
  const save = async () => {
    if (!userId || pending.current) return;
    pending.current = true; setBusy(true); setMessage(null); setDimensions(null); setLaidOut(false);
    try {
      if (Platform.OS === 'web') { await downloadPhotoWeb(updateId, userId); setMessage('Download started.'); pending.current = false; setBusy(false); }
      else {
        await requestGalleryAccess();
        const authorized = await authorizePhotoExport(updateId, userId);
        if (currentUser.current !== userId) return;
        setSource(authorized);
      }
    } catch (err) { pending.current = false; setBusy(false); setMessage(photoExportMessage(err)); }
  };
  return <View style={{ gap: 4, alignSelf: 'flex-start' }}>
    <Pressable accessibilityRole="button" accessibilityLabel={busy ? 'Saving photo' : 'Download photo with watermark'} accessibilityState={{ busy, disabled: busy || !userId }} disabled={busy || !userId} onPress={() => void save()} style={[styles.button, { backgroundColor: colors.background.accentSoft }]}>{busy ? <ActivityIndicator size="small" color={colors.background.accent} /> : <Feather name="download" color={colors.background.accent} size={21} />}</Pressable>
    {message ? <AppText accessibilityLiveRegion="polite" variant="caption11" tone="secondary">{message}</AppText> : null}
    <Modal transparent visible={source !== null} animationType="none" onRequestClose={() => {}}><View style={styles.backdrop}>
      <View ref={captureView} collapsable={false} onLayout={() => setLaidOut(true)} style={{ width: viewWidth, height: viewWidth / ratio, backgroundColor: 'black' }}>
        {source ? <Image source={source} contentFit="contain" cachePolicy="none" allowDownscaling={false} style={StyleSheet.absoluteFill} onLoad={event => setDimensions(exportDimensions(event.source.width, event.source.height))} onError={() => { pending.current = false; setBusy(false); setSource(null); setMessage('Could not load this photo. Please try again.'); }} /> : null}
        {dimensions ? <AppText allowFontScaling={false} style={[styles.watermark, { fontSize: Math.max(10, viewWidth * 0.032), right: viewWidth * 0.02, bottom: viewWidth / ratio * 0.02 }]}>{PHOTO_WATERMARK}</AppText> : null}
      </View><ActivityIndicator size="small" color="white" /><AppText style={{ color: 'white' }}>Saving your photo…</AppText>
    </View></Modal>
  </View>;
}
const styles = StyleSheet.create({ button: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }, backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 20, backgroundColor: 'rgba(0,0,0,0.8)' }, watermark: { position: 'absolute', color: 'rgba(255,255,255,0.94)', fontFamily: 'Nunito_900Black', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 } });
