import { Pressable, StyleSheet, View } from 'react-native';

import type { Reaction, ReactionType } from '@/src/models';
import { reactionEmoji, reactionTypes } from '@/src/models';
import { colors, radii, spacing } from '@/src/theme';
import { AppText } from './primitives/AppText';

type Props = {
  reactions: Reaction[];
  currentUserId: string;
  interactive?: boolean;
  busy?: boolean;
  onSelect?: (reaction: ReactionType) => void;
};

export function ReactionBar({ reactions, currentUserId, interactive = true, busy = false, onSelect }: Props) {
  const mine = reactions.find((item) => item.userId === currentUserId)?.type;
  if (!interactive && reactions.length === 0) return null;

  const visibleTypes = interactive
    ? reactionTypes
    : reactionTypes.filter((type) => reactions.some((item) => item.type === type));

  return (
    <View accessibilityLabel="Reactions" style={styles.row}>
      {visibleTypes.map((type) => {
        const count = reactions.filter((item) => item.type === type).length;
        return (
          <Pressable
            accessibilityLabel={`React ${type}`}
            accessibilityRole={interactive ? 'button' : undefined}
            disabled={!interactive || busy}
            key={type}
            onPress={() => onSelect?.(type)}
            style={[styles.reaction, mine === type && styles.selected]}
          >
            <AppText variant="body16">{reactionEmoji[type]}</AppText>
            {count > 0 ? <AppText variant="caption11" tone="secondary">{count}</AppText> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing[4] },
  reaction: { alignItems: 'center', borderRadius: radii.full, flexDirection: 'row', gap: spacing[2], minHeight: 44, minWidth: 44, paddingHorizontal: spacing[8] },
  selected: { backgroundColor: colors.background.accentSoft },
});
