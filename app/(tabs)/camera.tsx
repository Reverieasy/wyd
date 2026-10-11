import { CameraView, type CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Pressable, StyleSheet, View } from 'react-native';

import { ActionButton, AppText, Screen } from '@/src/components';
import { nudgeService } from '@/src/features/activity/nudgeService';
import { logger } from '@/src/lib/logger';
import { useAppStore } from '@/src/state/appStore';
import { colors, radii, spacing } from '@/src/theme';

export default function CameraRoute() {
  const { state, actions } = useAppStore();
  const params = useLocalSearchParams<{ recipient?: string; nudge?: string }>();
  const cameraRef = useRef<CameraView>(null);
  const preparedLinkRef = useRef<string | null>(null);
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [focused, setFocused] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [ready, setReady] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const people = state.server.connections.filter(({ connection }) => connection.status === 'accepted');
  const selectedPeople = people.filter(({ person }) => state.local.draft.recipientIds.includes(person.id));
  const recipientLabel = selectedPeople.length === 1 ? selectedPeople[0].person.displayName : 'your people';

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
      router.push('/(flows)/preview');
    } catch {
      setError('The photo library could not be opened. Please try again.');
    } finally {
      setWorking(false);
    }
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
        <Pressable accessibilityLabel="Close camera" accessibilityRole="button" hitSlop={12} onPress={() => router.replace('/(tabs)/people')}><AppText variant="title24" tone="onAccent">x</AppText></Pressable>
        <AppText variant="label14" tone="onAccent">Update {recipientLabel}</AppText>
        <Pressable accessibilityLabel="Flip camera" accessibilityRole="button" hitSlop={12} onPress={() => setFacing((current) => current === 'back' ? 'front' : 'back')}>
          <AppText variant="title20" tone="onAccent">&#8635;</AppText>
        </Pressable>
      </View>
      <View style={styles.preview}>
        {focused && appActive ? (
          <CameraView
            active={focused && appActive}
            facing={facing}
            mode="picture"
            onCameraReady={() => setReady(true)}
            onMountError={(event) => { logger.error('camera_mount', event); setError('The camera could not start. Try again or choose a photo.'); }}
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        {!ready ? <ActivityIndicator color={colors.text.onAccent} /> : null}
      </View>
      {error ? <AppText variant="body14" style={styles.error}>{error}</AppText> : null}
      <View style={styles.captureArea}>
        <Pressable accessibilityLabel="Take photo" accessibilityRole="button" accessibilityState={{ disabled: !ready || working, busy: working }} disabled={!ready || working} onPress={() => void capture()} style={[styles.shutterOuter, (!ready || working) && styles.disabled]}>
          {working ? <ActivityIndicator color={colors.text.onAccent} /> : <View style={styles.shutterInner} />}
        </Pressable>
        <Pressable accessibilityLabel="Choose photo from library" accessibilityRole="button" disabled={working} onPress={() => void chooseFromLibrary()} style={styles.libraryButton}>
          <AppText variant="label12" tone="onAccent">Choose from library</AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing[16], paddingBottom: spacing[24] },
  centered: { alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  preview: { alignItems: 'center', backgroundColor: colors.background.cameraPreview, borderRadius: radii[28], flex: 1, justifyContent: 'center', minHeight: 420, overflow: 'hidden' },
  captureArea: { alignItems: 'center', gap: spacing[16] },
  libraryButton: { alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingHorizontal: spacing[12] },
  shutterOuter: { alignItems: 'center', borderColor: colors.text.secondary, borderRadius: radii.full, borderWidth: 4, height: 76, justifyContent: 'center', width: 76 },
  shutterInner: { backgroundColor: colors.background.card, borderRadius: radii.full, height: 62, width: 62 },
  disabled: { opacity: 0.5 },
  error: { color: '#FFB4B4', textAlign: 'center' },
  permissionScreen: { justifyContent: 'space-between', paddingBottom: spacing[32] },
  permissionCopy: { alignItems: 'center', gap: spacing[12] },
  permissionMessage: { color: colors.text.onCameraMuted, textAlign: 'center' },
  permissionActions: { gap: spacing[12] },
});
