import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Switch, View } from 'react-native';
import { ActionButton, AppText, Avatar, FlowHeader, MomentPhoto, Screen } from '@/src/components';
import { MotionPressable } from '@/src/components/MotionPressable';
import { widgetService } from '@/src/features/widgets/widgetService';
import { widgetStatus, widgetTime } from '@/src/features/widgets/widgetModel';
import { useAppStore } from '@/src/state/appStore';
import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';

export default function WidgetRoute() {
  const { state } = useAppStore();
  const { colors, styles } = useThemeStyles(makeStyles);
  const userId = state.server.profile?.id;
  const people = state.server.connections.filter(entry => entry.connection.status === 'accepted').map(entry => entry.person);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const pending = useRef(false);
  const available = Platform.OS === 'android' && widgetService.isAvailable();
  useEffect(() => {
    let active = true;
    if (!userId) return;
    void widgetService.getSettings(userId).then(settings => {
      if (active) { setSelectedId(settings.personId); setEnabled(settings.enabled); setReady(true); }
    });
    return () => { active = false; };
  }, [userId]);
  const person = people.find(item => item.id === selectedId) ?? people[0];
  const update = state.server.updates.find(item => item.senderId === person?.id && (!item.expiresAt || Date.parse(item.expiresAt) > Date.now()));
  const save = async (nextEnabled: boolean, pin = false) => {
    if (!userId || !person || !available || pending.current) return;
    pending.current = true; setBusy(true); setMessage(null);
    try {
      await widgetService.saveSettings(userId, { enabled: nextEnabled, personId: person.id });
      setEnabled(nextEnabled);
      if (pin) {
        const accepted = await widgetService.addToHomeScreen();
        setMessage(accepted ? 'Finish adding the widget in the Android prompt.' : 'Long-press your Android home screen, choose Widgets, then find Wyd? - Your person.');
      } else setMessage(nextEnabled ? 'Your widget has been updated.' : 'Your home-screen widget is now cleared.');
    } catch { setMessage('The widget could not be updated. Open the app and try again.'); }
    finally { pending.current = false; setBusy(false); }
  };

  return <Screen scroll contentStyle={styles.content}>
    <FlowHeader title="Home screen widget" />
    <View style={{ gap: 6 }}><AppText variant="title20">Your person, a glance away.</AppText><AppText tone="secondary">Keep their latest shared photo on your Android home screen and send a quick Nudge.</AppText></View>
    <AppText variant="label12" tone="secondary">PREVIEW</AppText>
    <View style={styles.preview}>
      <View style={styles.photo}>{update ? <MomentPhoto photo={{ uri: update.photoUrl }} height={128} radius={22} /> : <AppText style={styles.placeholder}>PHOTO</AppText>}</View>
      <View style={styles.details}><AppText numberOfLines={1} variant="title20" style={styles.previewName}>{person?.displayName ?? 'Your person'}</AppText><AppText numberOfLines={1} style={styles.previewStatus}>{update ? widgetStatus(update.statusText) : 'No moment yet'}</AppText><AppText style={styles.time}>{widgetTime(update?.createdAt ?? null)}</AppText><View style={styles.nudge}><AppText style={styles.nudgeLabel}>Nudge</AppText></View></View>
    </View>
    <AppText variant="caption11" tone="secondary">Their shared photo will be visible on your home screen. All copies of this widget use the person you choose here.</AppText>
    <View style={styles.row}><View style={{ flex: 1, gap: 4 }}><AppText variant="label14">Show my person on the widget</AppText><AppText variant="caption11" tone="secondary">Turn off to clear the photo from your widgets.</AppText></View><Switch accessibilityLabel="Show my person on the widget" value={enabled} disabled={!available || !person || busy || !ready} trackColor={{ false: colors.border.default, true: colors.background.accent }} onValueChange={value => void save(value)} /></View>
    <View style={{ gap: 12 }}><AppText variant="label14">Choose your person</AppText>{people.map((item, index) => <MotionPressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: item.id === person?.id, disabled: busy }} disabled={busy} onPress={() => setSelectedId(item.id)} style={[styles.person, item.id === person?.id && { borderColor: colors.border.selected }]}><Avatar name={item.displayName} uri={item.avatarUrl ?? undefined} size={42} palette={index} /><View style={{ flex: 1, gap: 3 }}><AppText variant="label14">{item.displayName}</AppText><AppText variant="caption11" tone="secondary">@{item.handle}</AppText></View><MaterialIcons name={item.id === person?.id ? 'radio-button-checked' : 'radio-button-unchecked'} size={23} color={colors.background.accent} /></MotionPressable>)}</View>
    {!people.length ? <ActionButton label="Find your person" onPress={() => router.push('/(onboarding)/connect')} /> : null}
    {available ? <View style={{ gap: 10 }}><ActionButton label="Add to home screen" disabled={!person || !ready} loading={busy} onPress={() => void save(true, true)} />{enabled ? <ActionButton label="Update widget" variant="secondary" disabled={!person || !ready || busy} onPress={() => void save(true)} /> : null}</View> : <AppText tone="secondary">{Platform.OS === 'android' ? 'Install the updated Android app build to add this widget. It is unavailable in Expo Go and older builds.' : 'This widget is available in the Android app. Open this screen on your Android phone to add it.'}</AppText>}
    {message ? <AppText accessibilityLiveRegion="polite" style={styles.message}>{message}</AppText> : null}
    <AppText variant="caption11" tone="secondary">Tap the widget photo to open its moment. Its Nudge button sends with one tap. Android refreshes widgets periodically while the app is closed, so new photos and expiration changes may take time to appear.</AppText>
  </Screen>;
}
const makeStyles = ({ colors }: Theme) => StyleSheet.create({
  content: { gap: 20, paddingBottom: 40 }, preview: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 10, flexDirection: 'row', gap: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E9E3E7' },
  photo: { width: '43%', height: 128, borderRadius: 22, backgroundColor: '#F6F3F1', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  placeholder: { color: '#8A828C', fontSize: 12 }, details: { flex: 1, gap: 5 }, previewName: { color: '#241E2C' }, previewStatus: { color: '#241E2C', fontSize: 13 }, time: { color: '#8A828C', fontSize: 10 },
  nudge: { marginTop: 4, backgroundColor: '#7251DB', borderRadius: 18, minHeight: 40, justifyContent: 'center', alignItems: 'center' }, nudgeLabel: { color: '#FFFFFF', fontSize: 16, fontFamily: 'PlusJakartaSans_600SemiBold' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, person: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.background.card, padding: 12 }, message: { color: colors.background.accent },
});
