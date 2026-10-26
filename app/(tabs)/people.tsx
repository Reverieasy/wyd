import { MotionPressable as Pressable } from '@/src/components/MotionPressable';
import Feather from '@expo/vector-icons/Feather';
﻿import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton, AppText, Avatar } from '@/src/components';
import { CircleFeedCard } from '@/src/components/CircleFeedCard';
import { BrandWordmark } from '@/src/components/BrandWordmark';
import { NudgeAvatar } from '@/src/components/NudgeAvatar';
import { SoftEntrance } from '@/src/components/SoftEntrance';
import { useCircles } from '@/src/features/circles/useCircles';
import { useAppStore } from '@/src/state/appStore';
import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';

export default function PeopleRoute() {
  const { colors, styles } = useThemeStyles(makeStyles);
  const { state, actions } = useAppStore();
  const wordmarkSize = Math.min(24, Math.max(20, (useWindowDimensions().width - 80) / 13));
  const actionsRef = useRef(actions); actionsRef.current = actions;
  const profile = state.server.profile;
  const { circles, error: circleError } = useCircles();
  const [selectedCircle, setSelectedCircle] = useState<string | null>(null);
  const activeCircle = circles.some(circle => circle.status === 'member' && circle.id === selectedCircle) ? selectedCircle : null;
  const people = state.server.connections.filter(({ connection }) => connection.status === 'accepted');
  const [showCircles, setShowCircles] = useState(false);
  const [now, setNow] = useState(Date.now());
  useFocusEffect(useCallback(() => { setNow(Date.now()); void actionsRef.current.refreshUpdates(); void actionsRef.current.refreshActivity(); }, []));
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(timer); }, []);
  const current = state.server.updates.filter(item => (!item.expiresAt || Date.parse(item.expiresAt) > now) && (!activeCircle || item.circleIds?.includes(activeCircle)));
  const header = <SoftEntrance style={styles.headerContent}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Open settings" onPress={() => router.push('/(flows)/settings')} style={styles.settingsButton}><Feather name="settings" size={25} color={styles.appName.color} /></Pressable>
      <View style={styles.brand}><BrandWordmark size={wordmarkSize} /></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Open your profile" onPress={() => router.push('/(tabs)/you')} style={styles.profileButton}><Avatar name={profile?.displayName ?? 'You'} uri={profile?.avatarUrl ?? undefined} size={38} /></Pressable>
    </View>
    <View style={styles.peopleSection}>
      <ScrollView horizontal accessibilityLabel="Close people" showsHorizontalScrollIndicator={false} contentContainerStyle={styles.people}>
        <Pressable accessibilityRole="button" accessibilityLabel="Add a close person" onPress={() => router.push('/(onboarding)/connect')} style={styles.personItem}><View style={styles.avatarSpace}><View style={styles.addAvatar}><Feather name="plus" color={colors.background.accent} size={25} /></View></View><AppText style={styles.personLabel}>Add</AppText></Pressable>
        {people.map(({ person }, index) => <NudgeAvatar key={person.id} variant="home" size={56} name={person.displayName} uri={person.avatarUrl ?? undefined} palette={index} busy={state.server.nudgeSendingTo === person.id} disabled={state.server.nudgeSendingTo !== null && state.server.nudgeSendingTo !== person.id} onPress={() => router.push({ pathname: '/(flows)/person/[id]', params: { id: person.id } })} onNudge={() => actions.sendNudge(person.id)} />)}
      </ScrollView>
    </View>
    {state.server.message ? <AppText accessibilityLiveRegion="polite" style={styles.feedback}>{state.server.message}</AppText> : null}
    {state.server.error ? <View style={{ gap: 8 }}><AppText accessibilityRole="alert" style={styles.error}>{state.server.error}</AppText>{!state.server.termsStatus?.acceptedAt ? <ActionButton label="Review Terms" variant="secondary" onPress={() => router.push('/(flows)/terms')} /> : null}</View> : null}
    <View style={{ gap: 8 }}>
      <View style={styles.circleHeading}><Pressable accessibilityRole="button" accessibilityLabel="Choose your circle" accessibilityState={{ expanded: showCircles }} onPress={() => setShowCircles(value => !value)} style={styles.circleTitleButton}><AppText style={styles.heading}>Your circle</AppText><Feather name={showCircles ? 'chevron-up' : 'chevron-down'} size={20} color={styles.heading.color} /></Pressable><View style={styles.circleActions}><Pressable accessibilityRole="button" accessibilityLabel="Create circle" style={styles.circleAction} onPress={() => router.push('/(flows)/circles/create')}><AppText style={styles.circleActionText}>Create circle</AppText></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Join circle" style={styles.circleAction} onPress={() => router.push('/join-circle')}><AppText style={styles.circleActionText}>Join</AppText></Pressable></View></View>
      {showCircles ? <><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {[{ id: null, name: 'All photos' }, ...circles.filter(circle => circle.status === 'member')].map(circle => <Pressable key={circle.id ?? 'all'} accessibilityRole="button" accessibilityState={{ selected: activeCircle === circle.id }} onPress={() => setSelectedCircle(circle.id)} style={{ minHeight: 38, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 19, borderWidth: 1, borderColor: activeCircle === circle.id ? colors.border.selected : colors.border.default, backgroundColor: activeCircle === circle.id ? colors.background.accentSoft : colors.background.card }}><AppText variant="caption11">{circle.name}</AppText></Pressable>)}
      </ScrollView><Pressable accessibilityRole="button" style={styles.seeAll} onPress={() => router.push('/(flows)/circles')}><AppText style={styles.circleActionText}>Manage circles</AppText></Pressable></> : null}
      {circles.some(circle => circle.hostId === profile?.id && circle.pendingCount > 0) ? <Pressable accessibilityRole="button" style={styles.seeAll} onPress={() => router.push('/(flows)/circles')}><AppText style={styles.circleActionText}>You have circle join requests to review</AppText></Pressable> : null}
      {circleError ? <AppText variant="caption11" accessibilityRole="alert" style={styles.error}>{circleError}</AppText> : null}
    </View>
  </SoftEntrance>;
  return <SafeAreaView edges={['top']} style={styles.safe}><FlatList
    data={current} keyExtractor={item => item.id} renderItem={({ item }) => <CircleFeedCard update={item} />}
    ListHeaderComponent={header} contentContainerStyle={styles.content} ItemSeparatorComponent={() => <View style={{ height: 22 }} />}
    ListEmptyComponent={<View style={styles.feedEmpty}><AppText tone="secondary">{state.server.updatesLoading ? 'Loading your circle…' : 'Your circle’s photos will appear here when they share with you.'}</AppText></View>}
    ListFooterComponent={<View style={styles.footer}>{state.server.updatesError ? <><AppText accessibilityRole="alert" style={styles.error}>{state.server.updatesError}</AppText><ActionButton label="Try again" variant="secondary" onPress={() => void actions.refreshUpdates()} /></> : null}{state.server.updatesHasMore ? <ActionButton label="Load more moments" variant="secondary" loading={state.server.updatesLoadingMore} onPress={() => void actions.loadMoreUpdates()} /> : current.length ? <AppText variant="caption11" tone="secondary" style={{ textAlign: 'center' }}>You're all caught up.</AppText> : null}</View>}
    onEndReached={() => { if (!state.server.updatesLoading && !state.server.updatesError) void actions.loadMoreUpdates(); }} onEndReachedThreshold={0.35}
    refreshing={state.server.updatesLoading} onRefresh={() => void actions.refreshUpdates()} showsVerticalScrollIndicator={false}
  /></SafeAreaView>;
}
const makeStyles = ({ colors, isDark }: Theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: isDark ? colors.background.app : '#FEFDFE' }, content: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 16, width: '100%', maxWidth: 600, alignSelf: 'center' }, headerContent: { gap: 0, marginBottom: 10 }, header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 }, brand: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 7 }, appName: { flexShrink: 1, fontSize: 21, lineHeight: 30, letterSpacing: -0.9, color: isDark ? colors.text.primary : '#100C26', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  settingsButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: isDark ? colors.border.default : '#F0ECFA', backgroundColor: isDark ? colors.background.card : '#FCFAFF', alignItems: 'center', justifyContent: 'center' },
  profileButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: isDark ? colors.border.default : '#ECE8F1', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background.card },
  heading: { fontSize: 22, lineHeight: 32, letterSpacing: -0.8, fontFamily: 'PlusJakartaSans_800ExtraBold', color: isDark ? colors.text.primary : '#100C26' },
  peopleSection: { paddingTop: 2, paddingBottom: 4 }, people: { gap: 0, paddingHorizontal: 0, paddingBottom: 4 }, personItem: { alignItems: 'center', gap: 4, width: 80 }, avatarSpace: { width: 66, height: 72, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 5 }, addAvatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: isDark ? colors.border.default : '#E7D9FF', backgroundColor: isDark ? colors.background.accentSoft : '#F5EFFF', alignItems: 'center', justifyContent: 'center' }, personLabel: { fontSize: 12, lineHeight: 18, color: isDark ? colors.text.primary : '#100C26' },
  circleHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' }, circleTitleButton: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 6 }, circleActions: { flexDirection: 'row', gap: 5 }, circleAction: { minHeight: 44, paddingHorizontal: 11, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? colors.background.accentSoft : '#F7F2FF' }, circleActionText: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: colors.background.accent },
  seeAll: { minHeight: 44, justifyContent: 'center' }, feedback: { color: colors.background.accent, textAlign: 'center' }, error: { color: '#DA645B' }, feedEmpty: { paddingVertical: 24 }, footer: { paddingVertical: 24, gap: 12 },
});
