import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Switch, View } from 'react-native';
import { ActionButton, AppText, Avatar, FlowHeader, Screen } from '@/src/components';
import { MotionPressable } from '@/src/components/MotionPressable';
import { widgetService } from '@/src/features/widgets/widgetService';
import { parseWidgetDesign, widgetCells, widgetDesigns, widgetLabels, widgetStatus, widgetTime, type WidgetDesign } from '@/src/features/widgets/widgetModel';
import { WidgetDesignPreview } from '@/src/features/widgets/WidgetDesignPreview';
import { useAppStore } from '@/src/state/appStore';
import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';

export default function WidgetRoute() {
  const { state } = useAppStore();
  const { colors, styles } = useThemeStyles(makeStyles);
  const userId = state.server.profile?.id;
  const people = state.server.connections.filter(entry => entry.connection.status === 'accepted').map(entry => entry.person);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [design, setDesign] = useState<WidgetDesign>('small');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const pending = useRef(false);
  const available = Platform.OS === 'android' && widgetService.isAvailable();
  useEffect(() => {
    let active = true;
    setReady(false);
    if (!userId) return;
    void widgetService.getSettings(userId).then(settings => {
      if (active) { setSelectedId(settings.personId); setEnabled(settings.enabled); setDesign(parseWidgetDesign(settings.design)); setReady(true); }
    }).catch(() => { if (active) setMessage('Could not load your widget preferences. Try reopening this screen.'); });
    return () => { active = false; };
  }, [userId]);
  const person = people.find(item => item.id === selectedId) ?? people[0];
  const update = state.server.updates.find(item => item.senderId === person?.id && (!item.expiresAt || Date.parse(item.expiresAt) > Date.now()));
  const save = async (nextEnabled: boolean, pin = false) => {
    if (!userId || !person || !available || pending.current) return;
    pending.current = true; setBusy(true); setMessage(null);
    try {
      await widgetService.saveSettings(userId, { enabled: nextEnabled, personId: person.id, design });
      setEnabled(nextEnabled);
      if (pin) {
        const accepted = await widgetService.addToHomeScreen(design);
        setMessage(accepted ? `Finish adding the ${widgetLabels[design]} widget in the Android prompt. Its default size is ${widgetCells[design]}.` : `Long-press your Android home screen, choose Widgets, then find watchudoin? - ${widgetLabels[design]}.`);
      } else setMessage(nextEnabled ? 'Your widget has been updated.' : 'Your home-screen widget is now cleared.');
    } catch { setMessage('The widget could not be updated. Open the app and try again.'); }
    finally { pending.current = false; setBusy(false); }
  };
  const chooseDesign = async (next: WidgetDesign) => {
    if (!userId || !ready || pending.current || next === design) return;
    const previous = design;
    pending.current = true; setBusy(true); setDesign(next); setMessage(null);
    try {
      await widgetService.saveSettings(userId, { enabled, personId: person?.id ?? null, design: next });
    } catch { setDesign(previous); setMessage('Could not save the widget size. Try again.'); }
    finally { pending.current = false; setBusy(false); }
  };
  const myReaction = update?.reactions.find(reaction => reaction.userId === userId)?.type;

  return <Screen scroll contentStyle={styles.content}>
    <FlowHeader title="Home screen widget" />
    <View style={{ gap: 6 }}><AppText variant="title20">Your person, at a glance.</AppText><AppText tone="secondary">Keep their latest moment on your Android home screen.</AppText></View>
    <View style={{ gap: 10 }}><AppText variant="label14">Choose a widget size</AppText><View style={styles.designs}>{widgetDesigns.map(item => <MotionPressable key={item} accessibilityRole="radio" accessibilityLabel={`${widgetLabels[item]} widget ${widgetCells[item]}`} accessibilityState={{ checked: design === item, disabled: busy || !ready }} disabled={busy || !ready} onPress={() => void chooseDesign(item)} style={[styles.design, design === item && { borderColor: colors.border.selected, backgroundColor: colors.background.accentSoft }]}><AppText variant="label14">{widgetLabels[item]}</AppText><AppText variant="caption11" tone="secondary">{widgetCells[item]}</AppText><MaterialIcons name={design === item ? 'check-circle' : 'radio-button-unchecked'} size={18} color={design === item ? colors.background.accent : colors.text.secondary} /></MotionPressable>)}</View></View>
    <AppText variant="label12" tone="secondary">PREVIEW</AppText>
    <WidgetDesignPreview design={design} name={person?.displayName ?? 'Your person'} status={update ? widgetStatus(update.statusText) : 'No moment yet'} time={widgetTime(update?.createdAt ?? null)} photoUrl={update?.photoUrl} myReaction={myReaction === 'heart' ? myReaction : null} isNew={Boolean(update && !update.seenAt)} />
    <AppText variant="caption11" tone="secondary">{widgetLabels[design]} starts at {widgetCells[design]}. The layout adapts when resized.</AppText>
    <AppText variant="caption11" tone="secondary">Their shared photo will be visible on your home screen. All copies use your selected person and follow your app appearance setting.</AppText>
    <View style={styles.row}><View style={{ flex: 1, gap: 4 }}><AppText variant="label14">Show my person on the widget</AppText><AppText variant="caption11" tone="secondary">Turn off to clear the photo from your widgets.</AppText></View><Switch accessibilityLabel="Show my person on the widget" value={enabled} disabled={!available || !person || busy || !ready} trackColor={{ false: colors.border.default, true: colors.background.accent }} onValueChange={value => void save(value)} /></View>
    <View style={{ gap: 12 }}><AppText variant="label14">Choose your person</AppText>{people.map((item, index) => <MotionPressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: item.id === person?.id, disabled: busy }} disabled={busy} onPress={() => setSelectedId(item.id)} style={[styles.person, item.id === person?.id && { borderColor: colors.border.selected }]}><Avatar name={item.displayName} uri={item.avatarUrl ?? undefined} size={42} palette={index} /><View style={{ flex: 1, gap: 3 }}><AppText variant="label14">{item.displayName}</AppText><AppText variant="caption11" tone="secondary">@{item.handle}</AppText></View><MaterialIcons name={item.id === person?.id ? 'radio-button-checked' : 'radio-button-unchecked'} size={23} color={colors.background.accent} /></MotionPressable>)}</View>
    {!people.length ? <ActionButton label="Find your person" onPress={() => router.push('/(onboarding)/connect')} /> : null}
    {available ? <View style={{ gap: 10 }}><ActionButton label="Add to home screen" disabled={!person || !ready} loading={busy} onPress={() => void save(true, true)} />{enabled ? <ActionButton label="Update widget" variant="secondary" disabled={!person || !ready || busy} onPress={() => void save(true)} /> : null}</View> : <AppText tone="secondary">{Platform.OS === 'android' ? 'Install the updated Android app build to add this widget. It is unavailable in Expo Go and older builds.' : 'This widget is available in the Android app. Open this screen on your Android phone to add it.'}</AppText>}
    {message ? <AppText accessibilityLiveRegion="polite" style={styles.message}>{message}</AppText> : null}
    <AppText variant="caption11" tone="secondary">Tap the photo to view the full moment. The camera opens Send yours. Medium and Large include a quick heart and Nudge. A purple dot marks a new moment. Android refreshes widgets periodically while the app is closed.</AppText>
  </Screen>;
}
const makeStyles = ({ colors }: Theme) => StyleSheet.create({
  content: { gap: 20, paddingBottom: 40 },
  designs: { flexDirection: 'row', gap: 8 }, design: { flex: 1, gap: 5, alignItems: 'center', paddingVertical: 13, borderRadius: 18, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.background.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, person: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.background.card, padding: 12 }, message: { color: colors.background.accent },
});
