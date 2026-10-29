import { MotionPressable as Pressable } from './MotionPressable';
import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRef, useState } from 'react';
import { ReactionBurst } from './ReactionBurst';
import Feather from '@expo/vector-icons/Feather';

import type { Reaction, ReactionType } from '@/src/models';
import { reactionEmoji, reactionTypes } from '@/src/models';
import { radii, spacing } from '@/src/theme';
import { AppText } from './primitives/AppText';

type Props = {
  reactions: Reaction[];
  currentUserId: string;
  interactive?: boolean;
  busy?: boolean;
  onSelect?: (reaction: ReactionType) => Promise<boolean>;
  compact?: boolean;
};

export function ReactionBar({ reactions, currentUserId, interactive = true, busy = false, onSelect, compact = false }: Props) {
  const { colors, gradients, styles } = useThemeStyles(makeStyles);
  const pending = useRef(false);
  const [sending, setSending] = useState<ReactionType | null>(null);
  const [burst, setBurst] = useState<{ type: ReactionType; id: number } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const select = async (type: ReactionType) => {
    if (pending.current || busy || !interactive || !onSelect) return;
    pending.current = true; setSending(type);
    try { if (await onSelect(type)) { setBurst(previous => ({ type, id: (previous?.id ?? 0) + 1 })); setPickerOpen(false); } }
    finally { pending.current = false; setSending(null); }
  };
  const mine = reactions.find((item) => item.userId === currentUserId)?.type;
  if (!interactive && reactions.length === 0 && !compact) return null;

  const visibleTypes = interactive
    ? reactionTypes
    : reactionTypes.filter((type) => reactions.some((item) => item.type === type));

  if (compact) return <View style={styles.compactWrap}>
    <Pressable accessibilityRole={interactive ? 'button' : undefined} accessibilityLabel={interactive ? 'Choose a reaction' : `${reactions.length} reactions`} accessibilityState={{ disabled: !interactive || busy || sending !== null, expanded: pickerOpen, selected: Boolean(mine) }} disabled={!interactive || busy || sending !== null} onPress={() => setPickerOpen(value => !value)} style={styles.compactButton}>
      {sending ? <ActivityIndicator size="small" color={colors.background.accent} /> : reactions.length || mine ? <AppText style={{ fontSize: 25, lineHeight: 32 }}>{reactionEmoji[mine ?? reactions[0].type]}</AppText> : <Feather name="heart" color={colors.text.secondary} size={23} />}
      <AppText style={styles.compactCount}>{reactions.length}</AppText>
    </Pressable>
    {pickerOpen && interactive ? <View accessibilityLabel="Choose a reaction" style={styles.picker}>{reactionTypes.map(type => <Pressable key={type} accessibilityRole="button" accessibilityLabel={`React ${type}`} accessibilityState={{ selected: mine === type, disabled: busy || sending !== null }} disabled={busy || sending !== null} onPress={() => void select(type)} style={[styles.pickerItem, mine === type && styles.selected]}><AppText variant="body16">{reactionEmoji[type]}</AppText></Pressable>)}</View> : null}
    {burst ? <ReactionBurst key={burst.id} emoji={reactionEmoji[burst.type]} /> : null}
  </View>;

  return (
    <View accessibilityLabel="Reactions" style={styles.row}>
      {visibleTypes.map((type) => {
        const count = reactions.filter((item) => item.type === type).length;
        return (
          <Pressable
            pressScale={0.9}
            accessibilityLabel={`React ${type}`}
            accessibilityRole={interactive ? 'button' : undefined}
            accessibilityState={{ selected: mine === type, disabled: !interactive || busy || sending !== null, busy: sending === type }}
            disabled={!interactive || busy || sending !== null}
            key={type}
            onPress={() => void select(type)}
            style={[styles.reaction, mine === type && styles.selected]}
          >
            {sending === type ? <ActivityIndicator size="small" color={colors.background.accent} /> : <AppText variant="body16">{reactionEmoji[type]}</AppText>}
            {count > 0 ? <AppText variant="caption11" tone="secondary">{count}</AppText> : null}
          </Pressable>
        );
      })}
      {burst ? <ReactionBurst key={burst.id} emoji={reactionEmoji[burst.type]} /> : null}
    </View>
  );
}

const makeStyles = ({ colors, gradients }: Theme) => StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing[4] },
  reaction: { alignItems: 'center', borderRadius: radii.full, flexDirection: 'row', gap: spacing[2], minHeight: 44, minWidth: 44, paddingHorizontal: spacing[8] },
  selected: { backgroundColor: colors.background.accentSoft },
  compactWrap: { position: 'relative', zIndex: 2 }, compactButton: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 44, minWidth: 50 }, compactCount: { color: colors.text.secondary, fontSize: 12 },
  picker: { position: 'absolute', left: 0, bottom: 48, flexDirection: 'row', flexWrap: 'wrap', width: 220, padding: 5, gap: 2, borderRadius: 28, backgroundColor: colors.background.card, borderWidth: 1, borderColor: colors.border.default, boxShadow: '0px 4px 18px rgba(30, 16, 55, 0.12)' },
  pickerItem: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
});
