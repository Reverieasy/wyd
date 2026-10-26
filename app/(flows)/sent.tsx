import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { ActionButton, AppText, Avatar, MomentPhoto, Screen } from '@/src/components';
import { useAppStore } from '@/src/state/appStore';

export default function SentRoute() {
  const { colors, gradients, styles } = useThemeStyles(makeStyles);
  const { state } = useAppStore();
  const update = state.server.updates.find(item => item.id === state.server.lastSentUpdateId);
  const recipients = state.server.connections.filter(({ person }) => update?.recipientIds.includes(person.id)).map(({ person }) => person);
  const names = recipients.length === 1 ? recipients[0].displayName : recipients.length ? 'Your ' + recipients.length + ' people' : 'Your people';
  return <Screen scroll contentStyle={styles.content}><View style={styles.center}><AppText style={styles.title}>Sent</AppText><AppText style={styles.subtitle}>{names} got a little window into your day.</AppText>{update ? <View style={styles.photo}><MomentPhoto photo={{ uri: update.photoUrl }} height={170} radius={22} /></View> : null}<View style={styles.to}>{recipients[0] ? <Avatar name={recipients[0].displayName} uri={recipients[0].avatarUrl ?? undefined} size={34} /> : null}<AppText style={styles.recipient}>to {recipients.length === 1 ? names : 'Close People'} · just now</AppText></View></View><View style={styles.actions}><ActionButton label="Back home" onPress={() => router.replace('/(tabs)/people')} /><ActionButton label="Send another" variant="secondary" onPress={() => router.replace('/(tabs)/camera')} /></View></Screen>;
}
const makeStyles = ({ colors, gradients }: Theme) => StyleSheet.create({ content: { flexGrow: 1, justifyContent: 'space-between', paddingTop: 70, paddingBottom: 40 }, center: { alignItems: 'center', gap: 10 }, title: { fontSize: 28, lineHeight: 40, color: colors.text.heading, fontFamily: 'PlusJakartaSans_700Bold' }, subtitle: { fontSize: 13, color: colors.text.secondary, textAlign: 'center' }, photo: { width: 266, marginTop: 26 }, to: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }, recipient: { fontSize: 11 }, actions: { gap: 10, paddingTop: 80 } });
