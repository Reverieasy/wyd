import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionButton, AppText, Avatar, FlowHeader, Screen, TextField } from '@/src/components';
import { useAppStore } from '@/src/state/appStore';
import { spacing } from '@/src/theme';
import * as ImagePicker from 'expo-image-picker';
import { readableServiceError } from '@/src/lib/serviceError';

export default function EditProfileRoute() {
  const { state, actions } = useAppStore();
  const profile = state.server.profile;
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [username, setUsername] = useState(profile?.handle ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  useEffect(() => { actions.clearServerFeedback(); }, []);
  if (!profile) return null;

  const save = async () => {
    if (await actions.updateProfile({ displayName, username, bio })) router.back();
  };
  const choosePhoto = async () => {
    if (picking || state.server.busy) return;
    setPicking(true); setPhotoError(null); actions.clearServerFeedback();
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1, exif: false });
      if (!result.canceled && result.assets[0]) {
        const photo = result.assets[0];
        await actions.updateAvatar({ uri: photo.uri, width: photo.width, height: photo.height, source: 'library', mimeType: photo.mimeType ?? null });
      }
    } catch (error) { setPhotoError(readableServiceError(error).message); }
    finally { setPicking(false); }
  };

  return (
    <Screen scroll keyboardShouldPersistTaps="handled" contentStyle={styles.content}>
      <FlowHeader title="Edit profile" />
      <View style={styles.avatar}><Avatar name={displayName || profile.displayName} uri={profile.avatarUrl ?? undefined} size={88} /></View>
      <ActionButton label="Change profile photo" variant="secondary" loading={picking} disabled={state.server.busy} onPress={() => void choosePhoto()} />
      {photoError ? <AppText accessibilityRole="alert" style={styles.error}>{photoError}</AppText> : null}
      <View style={styles.field}><AppText variant="label14">Name</AppText><TextField autoCapitalize="words" maxLength={40} value={displayName} onChangeText={setDisplayName} /></View>
      <View style={styles.field}><AppText variant="label14">Username</AppText><TextField autoCapitalize="none" autoCorrect={false} maxLength={24} value={username} onChangeText={setUsername} /></View>
      <View style={styles.field}><AppText variant="label14">Bio</AppText><TextField accessibilityLabel="Bio" multiline maxLength={160} placeholder="A little about you" value={bio} onChangeText={setBio} /><AppText variant="caption11" tone="secondary">{bio.length}/160</AppText></View>
      {state.server.error ? <AppText variant="body14" style={styles.error}>{state.server.error}</AppText> : null}
      <ActionButton label="Save profile" loading={state.server.busy && !picking} disabled={picking} onPress={() => void save()} />
    </Screen>
  );
}

const styles = StyleSheet.create({ content: { gap: spacing[24], paddingBottom: spacing[40] }, avatar: { alignItems: 'center' }, field: { gap: spacing[8] }, error: { color: '#B42318' } });
