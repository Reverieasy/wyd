import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import type { ActivityItem } from '@/src/models';
import { reactionEmoji } from '@/src/models';
import { relativeTime } from '@/src/state/appStore';
import { colors, radii, spacing } from '@/src/theme';
import { Avatar } from './Avatar';
import { AppText } from './primitives/AppText';

type Props = { item: ActivityItem; onPress?: () => void };

function copy(item: ActivityItem) {
  if (item.kind === 'moment') return 'Sent you a moment.';
  if (item.kind === 'nudge') {
    if (item.nudgeStatus === 'responded') return item.nudgeDirection === 'outgoing' ? 'Answered your nudge.' : 'You answered this nudge.';
    return 'Wants to see what you are doing.';
  }
  if (item.kind === 'reaction') return `Reacted ${item.reaction ? reactionEmoji[item.reaction] : ''} to your moment.`;
  if (item.kind === 'connection_request') return 'Sent you a connection request.';
  return 'Accepted your connection request.';
}

export function ActivityRow({ item, onPress }: Props) {
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} onPress={onPress} style={({ pressed }) => [styles.row, pressed && onPress && styles.pressed]}>
      <Avatar name={item.actor.displayName} uri={item.actor.avatarUrl ?? undefined} size={44} />
      <View style={styles.copy}>
        <AppText variant="label14">{item.actor.displayName}</AppText>
        <AppText variant="body14" tone="secondary">{copy(item)}</AppText>
        <AppText variant="caption11" tone="secondary">{relativeTime(item.createdAt)}</AppText>
      </View>
      {!item.read ? <View accessibilityLabel="Unread" style={styles.unread} /> : null}
      {onPress ? <MaterialIcons color={colors.text.secondary} name="chevron-right" size={22} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', backgroundColor: colors.background.card, borderColor: colors.border.default, borderRadius: radii[18], borderWidth: 1, flexDirection: 'row', gap: spacing[12], minHeight: 82, padding: spacing[12] },
  copy: { flex: 1, gap: spacing[2] },
  unread: { backgroundColor: colors.background.accent, borderRadius: radii.full, height: 8, width: 8 },
  pressed: { opacity: 0.78 },
});
