import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import { CameraView, type CameraType, type FlashMode, useCameraPermissions } from 'expo-camera';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Pressable, StyleSheet, View } from 'react-native';

import { ActionButton, AppText, Avatar, Screen } from '@/src/components';
import { ShutterArtwork } from '@/src/components/FigmaArtwork';
import { nudgeService } from '@/src/features/activity/nudgeService';
import { logger } from '@/src/lib/logger';
import { useAppStore } from '@/src/state/appStore';
import { radii, spacing } from '@/src/theme';

export default function CameraRoute() {
  const { colors, gradients, styles } = useThemeStyles(makeStyles);
  const { state, actions } = useAppStore();
  const params = useLocalSearchParams<{ recipient?: string; nudge?: string }>();
  const cameraRef = useRef<CameraView>(null);
  const preparedLinkRef = useRef<string | null>(null);
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [zoom, setZoom] = useState(0);
  const [focused, setFocused] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [ready, setReady] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const people = state.server.connections.filter(({ connection }) => connection.status === 'accepted');
  const selectedPeople = people.filter(({ person }) => state.local.draft.recipientIds.includes(person.id));
  const circleCount = state.local.draft.circleIds?.length ?? 0;
  const recipientLabel = circleCount ? circleCount + (circleCount === 1 ? ' circle' : ' circles') : selectedPeople.length === 1 ? selectedPeople[0].person.displayName : 'Close People';

  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => {
      setFocused(false);
      setReady(false);
    };
  }, []));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      setAppActive(nextState === 'active');
      if (nextState === 'active') void getPermission();
    });
    return () => subscription.remove();
  }, [getPermission]);

  useEffect(() => {
    const recipientId = typeof params.recipient === 'string' ? params.recipient : null;
    const nudgeId = typeof params.nudge === 'string' ? params.nudge : null;
    const userId = state.server.profile?.id;
    if (!recipientId || !nudgeId || !userId) return;
    const key = `${nudgeId}:${recipientId}`;
    if (preparedLinkRef.current === key) return;
    preparedLinkRef.current = key;
    void nudgeService.getPendingForReceiver(nudgeId, userId).then((nudge) => {
      if (nudge?.sender_id === recipientId) actions.prepareNudgeResponse(nudgeId, recipientId);
      else setError('This nudge is no longer available. You can still send a new moment.');
    }).catch(() => setError('This nudge could not be opened. You can still send a new moment.'));
  }, [actions, params.nudge, params.recipient, state.server.profile?.id]);

  const capture = async () => {
    if (!cameraRef.current || !ready || working) return;
    setWorking(true);
    setError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9, skipProcessing: false });
      actions.setDraftPhoto({
        uri: photo.uri,
        source: 'camera',
        width: photo.width,
        height: photo.height,
        mimeType: 'image/jpeg',
      });
      actions.setDraftQuiet(state.local.preferences.quietUpdatesEnabled);
      router.push('/(flows)/preview');
    } catch {
      setError('The camera could not take that photo. Please try again.');
    } finally {
      setWorking(false);
    }
  };

  const chooseFromLibrary = async () => {
    if (working) return;
    setWorking(true);
    setError(null);
    try {
      const current = await ImagePicker.getMediaLibraryPermissionsAsync();
      const mediaPermission = current.granted ? current : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!mediaPermission.granted) {
        setError('Photo access is needed to choose a picture from your library.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
        selectionLimit: 1,
      });
      const asset = result.canceled ? null : result.assets[0];
      if (!asset) return;
      actions.setDraftPhoto({
        uri: asset.uri,
        source: 'library',
        width: asset.width,
        height: asset.height,
        mimeType: asset.mimeType ?? null,
      });
      actions.setDraftQuiet(state.local.preferences.quietUpdatesEnabled);
      router.push('/(flows)/preview');
    } catch {
      setError('The photo library could not be opened. Please try again.');
    } finally {
      setWorking(false);
    }
  };

  const flipCamera = () => {
    if (working) return;
    setReady(false);
    setZoom(0);
    setFacing(current => current === 'back' ? 'front' : 'back');
  };

  if (!permission) {
    return <Screen dark contentStyle={styles.centered}><ActivityIndicator color={colors.text.onAccent} /></Screen>;
  }

  if (!permission.granted) {
    return (
      <Screen dark contentStyle={styles.permissionScreen}>
        <StatusBar style="light" />
        <Pressable accessibilityLabel="Close camera" accessibilityRole="button" hitSlop={12} onPress={() => router.replace('/(tabs)/people')}>
          <AppText variant="title24" tone="onAccent">x</AppText>
        </Pressable>
        <View style={styles.permissionCopy}>
          <AppText variant="title24" tone="onAccent" style={styles.centerText}>Camera access</AppText>
          <AppText variant="body16" style={styles.permissionMessage}>Allow camera access to share a moment as it happens.</AppText>
        </View>
        <View style={styles.permissionActions}>
          <ActionButton label={permission.canAskAgain ? 'Allow camera' : 'Open settings'} onPress={() => permission.canAskAgain ? void requestPermission() : void Linking.openSettings()} />
          <ActionButton label="Choose from library" variant="secondary" loading={working} onPress={() => void chooseFromLibrary()} />
          {error ? <AppText variant="body14" style={styles.error}>{error}</AppText> : null}
        </View>
      </Screen>
    );
  }

  return (
    <Screen dark contentStyle={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <Pressable accessibilityLabel="Close camera" accessibilityRole="button" style={styles.control} onPress={() => router.replace('/(tabs)/people')}><MaterialIcons name="close" color="white" size={25} /></Pressable>
        <View style={{ flex: 1 }} />
        <Pressable accessibilityRole="button" accessibilityLabel={'Flash: ' + flash + '. Tap to change.'} onPress={() => setFlash(value => value === 'off' ? 'on' : value === 'on' ? 'auto' : 'off')} style={styles.control}><MaterialIcons name={flash === 'off' ? 'flash-off' : flash === 'auto' ? 'flash-auto' : 'flash-on'} size={23} color="white" /></Pressable>
        <Pressable accessibilityLabel="Flip camera" accessibilityRole="button" disabled={working} style={styles.control} onPress={flipCamera}>
          <MaterialIcons name="flip-camera-android" size={23} color="white" />
        </Pressable>
      </View>
      <View style={styles.preview}>
        {focused && appActive ? (
          <CameraView
            active={focused && appActive}
            facing={facing}
            flash={flash}
            zoom={zoom}
            mode="picture"
            onCameraReady={() => setReady(true)}
            onMountError={(event) => { logger.error('camera_mount', event); setError('The camera could not start. Try again or choose a photo.'); }}
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        {!ready ? <ActivityIndicator color={colors.text.onAccent} /> : null}
        <Pressable accessibilityRole="button" accessibilityLabel="Choose recipients" onPress={() => router.push('/(flows)/recipients')} style={styles.recipients}><Avatar name={selectedPeople[0]?.person.displayName ?? 'You'} uri={selectedPeople[0]?.person.avatarUrl ?? undefined} size={30} /><View><AppText style={styles.recipientTitle}>To: {recipientLabel}</AppText><AppText style={styles.recipientCount}>{circleCount ? 'Approved circle members' : selectedPeople.length + (selectedPeople.length === 1 ? ' person' : ' people')}</AppText></View></Pressable>
        <View style={styles.zoom}><Pressable accessibilityRole="button" accessibilityLabel="Zoom out" style={styles.zoomButton} onPress={() => setZoom(value => Math.max(0, value - 0.1))}><AppText tone="onAccent">−</AppText></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Reset zoom" style={styles.zoomButton} onPress={() => setZoom(0)}><AppText style={{ color: 'white', fontSize: 10 }}>{zoom === 0 ? '1×' : Math.round(zoom * 100) + '%'}</AppText></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Zoom in" style={styles.zoomButton} onPress={() => setZoom(value => Math.min(1, value + 0.1))}><AppText tone="onAccent">+</AppText></Pressable></View>
      </View>
      {error ? <AppText variant="body14" style={styles.error}>{error}</AppText> : null}
      <View style={styles.captureArea}>
        <Pressable accessibilityLabel="Choose photo from library" accessibilityRole="button" disabled={working} onPress={() => void chooseFromLibrary()} style={styles.libraryButton}><MaterialIcons name="photo-library" size={24} color="white" /></Pressable>
        <Pressable accessibilityLabel="Take photo" accessibilityRole="button" accessibilityState={{ disabled: !ready || working, busy: working }} disabled={!ready || working} onPress={() => void capture()} style={[styles.shutterOuter, (!ready || working) && styles.disabled]}>
          {working ? <ActivityIndicator color={colors.text.onAccent} /> : <ShutterArtwork />}
        </Pressable>
        <Pressable accessibilityLabel="Flip camera beside shutter" accessibilityRole="button" disabled={working} onPress={flipCamera} style={styles.libraryButton}>
          <MaterialIcons name="flip-camera-android" size={24} color="white" />
        </Pressable>
      </View>
    </Screen>
  );
}

const makeStyles = ({ colors, gradients }: Theme) => StyleSheet.create({
  screen: { gap: 10, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 40 },
  control: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  recipients: { position: 'absolute', top: 4, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.45)' },
  recipientTitle: { color: 'white', fontSize: 11 }, recipientCount: { color: 'white', fontSize: 9 },
  zoom: { position: 'absolute', bottom: 16, alignSelf: 'center', flexDirection: 'row', borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.42)' },
  zoomButton: { minWidth: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  centered: { alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  preview: { alignItems: 'center', backgroundColor: colors.background.cameraPreview, borderRadius: radii[22], flex: 1, justifyContent: 'center', minHeight: 300, overflow: 'hidden' },
  captureArea: { alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row', paddingHorizontal: 18, paddingTop: 16 },
  libraryButton: { alignItems: 'center', justifyContent: 'center', height: 48, width: 48, borderRadius: 16, backgroundColor: colors.background.cameraPreview },
  shutterOuter: { alignItems: 'center', borderRadius: radii.full, height: 82, justifyContent: 'center', width: 82 },
  shutterInner: { backgroundColor: colors.background.card, borderRadius: radii.full, height: 62, width: 62 },
  disabled: { opacity: 0.5 },
  error: { color: '#FFB4B4', textAlign: 'center' },
  permissionScreen: { justifyContent: 'space-between', paddingBottom: spacing[32] },
  permissionCopy: { alignItems: 'center', gap: spacing[12] },
  permissionMessage: { color: colors.text.onCameraMuted, textAlign: 'center' },
  permissionActions: { gap: spacing[12] },
});
