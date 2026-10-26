import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Redirect, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ActionButton, AppText, Avatar, FlowHeader, MomentPhoto, Screen, StatusChip, TextField } from '@/src/components';
import { statusDetails, useAppStore } from '@/src/state/appStore';

const statuses = ['studying', 'chilling', 'working'] as const;
export default function PreviewRoute() {
  const { colors, gradients, styles } = useThemeStyles(makeStyles);
  const { state, actions } = useAppStore();
  const draft = state.local.draft;
  const circleCount = draft.circleIds?.length ?? 0;
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef(false);
  const people = state.server.connections.filter(({ connection, person }) => connection.status === 'accepted' && draft.recipientIds.includes(person.id)).map(({ person }) => person);
  const send = async () => {
    if (pending.current) return;
    pending.current = true;
    setSubmitting(true);
    try {
      const id = await actions.sendDraft();
      if (id) router.replace('/(flows)/sent');
      else setSubmitting(false);
    } finally { pending.current = false; }
  };
  const sendLabel = draft.sending ? draft.sendStage === 'preparing' ? 'Preparing photo…' : draft.sendStage === 'uploading' ? 'Uploading photo…' : 'Sending moment…' : 'Send moment';
  if (!draft.photo && submitting && state.server.lastSentUpdateId) return <Redirect href="/(flows)/sent" />;
  if (!draft.photo) return <Screen><FlowHeader title="Preview" /><AppText tone="secondary">Take a photo to share a little moment.</AppText><ActionButton label="Open camera" onPress={() => router.replace('/(tabs)/camera')} /></Screen>;
  return <Screen scroll keyboardShouldPersistTaps="handled" contentStyle={styles.content}><FlowHeader title="Preview" />
    <View style={styles.photo}><MomentPhoto photo={{ uri: draft.photo.uri }} height={248} radius={22} /><Pressable accessibilityRole="button" accessibilityLabel="Edit photo" disabled={draft.sending} onPress={() => router.push('/(flows)/edit-photo')} style={styles.edit}><MaterialIcons name="edit" size={17} color={colors.text.heading} /><AppText style={styles.editText}>Edit</AppText></Pressable></View>
    <View style={styles.section}><AppText style={styles.label}>How are you feeling?</AppText><View style={styles.statuses}>{statuses.map(status => <StatusChip key={status} label={statusDetails[status].symbol + ' ' + statusDetails[status].label} selected={draft.status === status} tone="neutral" onPress={() => actions.setDraftStatus(status)} style={styles.status} />)}</View></View>
    <View style={styles.section}><AppText style={styles.label}>Add a caption (optional)</AppText><View><TextField accessibilityLabel="Moment caption" maxLength={150} placeholder="A little note about your day" value={draft.caption} onChangeText={actions.setDraftCaption} editable={!draft.sending} style={{ paddingRight: 44 }} />{draft.caption ? <Pressable accessibilityRole="button" accessibilityLabel="Clear caption" disabled={draft.sending} onPress={() => actions.setDraftCaption('')} style={styles.clear}><MaterialIcons name="close" size={17} color={colors.text.secondary} /></Pressable> : null}</View></View>
    <View style={styles.section}><AppText style={styles.label}>Send to</AppText><Pressable accessibilityRole="button" accessibilityLabel="Choose who receives this moment" disabled={draft.sending} onPress={() => router.push('/(flows)/recipients')} style={styles.recipients}><View style={styles.avatars}>{people.slice(0, 3).map((person, index) => <View key={person.id} style={{ marginLeft: index ? -14 : 0 }}><Avatar name={person.displayName} uri={person.avatarUrl ?? undefined} size={36} palette={index} /></View>)}</View><View style={{ flex: 1 }}><AppText variant="label12">{circleCount ? circleCount + (circleCount === 1 ? ' circle' : ' circles') : people.length === 1 ? people[0].displayName : people.length ? 'Close People' : 'Choose your people'}</AppText><AppText style={styles.peopleCount}>{people.length} {people.length === 1 ? 'close person' : 'close people'}{circleCount ? ' + approved circle members' : ''}{draft.isQuiet ? ' · quietly' : ''}</AppText></View><MaterialIcons name="chevron-right" size={18} color={colors.text.secondary} /></Pressable></View>
    {draft.error ? <AppText style={styles.error}>{draft.error}</AppText> : null}
    {!state.server.termsStatus?.acceptedAt ? <Pressable accessibilityRole="button" onPress={() => router.push('/(flows)/terms')} style={{ minHeight: 44, justifyContent: 'center' }}><AppText style={{ color: colors.background.accent, fontSize: 11 }}>Review and accept Terms before sending →</AppText></Pressable> : null}
    <ActionButton label={sendLabel} loading={draft.sending || submitting} disabled={(!people.length && !circleCount) || !state.server.termsStatus?.acceptedAt} onPress={() => void send()} />
  </Screen>;
}
const makeStyles = ({ colors, gradients }: Theme) => StyleSheet.create({ content: { gap: 26, paddingTop: 8, paddingBottom: 32 }, photo: { marginHorizontal: -6 }, edit: { position: 'absolute', right: 16, bottom: 4, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 66, borderRadius: 22, backgroundColor: colors.background.card, borderWidth: 1, borderColor: colors.border.default }, editText: { fontSize: 10, color: colors.text.heading }, section: { gap: 10 }, label: { color: colors.text.heading, fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold' }, statuses: { flexDirection: 'row', gap: 8 }, status: { flex: 1, minWidth: 0, paddingHorizontal: 6, backgroundColor: colors.background.card }, clear: { position: 'absolute', right: 4, width: 44, height: 54, alignItems: 'center', justifyContent: 'center' }, recipients: { flexDirection: 'row', gap: 14, alignItems: 'center', minHeight: 58, borderRadius: 18, backgroundColor: colors.background.card, borderWidth: 1, borderColor: colors.border.default, padding: 10 }, avatars: { flexDirection: 'row' }, peopleCount: { fontSize: 10, color: colors.text.secondary }, error: { color: '#B42318' } });
