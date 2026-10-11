import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionButton, AppText, Screen, ScreenHeader } from '@/src/components';
import { useAppStore } from '@/src/state/appStore';
import { colors, radii, spacing } from '@/src/theme';

export default function NudgeFlowRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { state, actions } = useAppStore();
  const requested = useRef(false);
  const nudge = state.server.nudges.find((item) => item.id === params.id)
    ?? state.server.nudges.find((item) => item.status === 'pending');

  useEffect(() => {
    if (nudge && !nudge.seenAt && !requested.current) {
      requested.current = true;
      void actions.markNudgeSeen(nudge.id);
    }
  }, [actions, nudge]);

  if (!nudge) {
    return (
      <Screen contentStyle={styles.screen}>
        <ScreenHeader eyebrow="Nudge" />
        <View style={styles.card}>
          <AppText variant="title20" style={styles.centerText}>This nudge is no longer available.</AppText>
        </View>
        <ActionButton label="Back to activity" onPress={() => router.replace('/(tabs)/activity')} />
      </Screen>
    );
  }

  const respond = () => {
    actions.prepareNudgeResponse(nudge.id, nudge.senderId);
    router.replace('/(tabs)/camera');
  };

  if (nudge.status !== 'pending') {
    return (
      <Screen contentStyle={styles.screen}>
        <ScreenHeader eyebrow="Nudge" />
        <View style={styles.card}>
          <AppText variant="display32">{'\u{1F44B}'}</AppText>
          <AppText variant="title20" style={styles.centerText}>You answered {nudge.sender.displayName}</AppText>
          <AppText variant="body14" tone="secondary" style={styles.centerText}>That little moment is on its way.</AppText>
        </View>
        <ActionButton label="Back to activity" onPress={() => router.replace('/(tabs)/activity')} />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.screen}>
      <ScreenHeader eyebrow="Nudge" />
      <View style={styles.card}>
        <AppText variant="display32">{'\u{1F44B}'}</AppText>
        <AppText variant="title20" style={styles.centerText}>{nudge.sender.displayName} wants a little update</AppText>
        <AppText variant="body14" tone="secondary" style={styles.centerText}>Show what you're doing when you can.</AppText>
      </View>
      <View style={styles.actions}>
        <ActionButton label="Open camera" onPress={respond} />
        <ActionButton label="Later" variant="secondary" onPress={() => router.replace('/(tabs)/activity')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing[32] },
  card: { alignItems: 'center', backgroundColor: colors.background.loveSoft, borderRadius: radii[28], gap: spacing[24], marginTop: spacing[40], paddingHorizontal: spacing[28], paddingVertical: spacing[40] },
  centerText: { textAlign: 'center' },
  actions: { gap: spacing[16] },
});
