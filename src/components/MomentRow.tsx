import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { MomentUpdate, User } from '@/src/models';
import { clockTime } from '@/src/state/appStore';
import { colors, radii, spacing } from '@/src/theme';
import { MomentPhoto } from './MomentPhoto';
import { AppText } from './primitives/AppText';

type Props = { update: MomentUpdate; author: User; compact?: boolean; footer?: ReactNode; showSeen?: boolean; onPhotoError?: () => void };

export function MomentRow({ update, author, compact = false, footer, showSeen = false, onPhotoError }: Props) {
  return (
    <View style={[styles.card, compact && styles.compact]}>
      <View style={styles.row}>
        <MomentPhoto photo={{ uri: update.photoUrl }} height={compact ? 88 : 112} radius={radii[14]} style={styles.photo} onLoadError={onPhotoError} />
        <View style={styles.copy}>
          <AppText variant="caption11" tone="secondary">{clockTime(update.createdAt)}</AppText>
          <AppText variant="label14">{update.statusText ?? 'Moment'}</AppText>
          {!compact && update.caption ? (
            <AppText variant="body14" tone="secondary" numberOfLines={2}>{update.caption}</AppText>
          ) : null}
          {!compact ? <AppText variant="caption11" tone="secondary">from {author.displayName}</AppText> : null}
          {showSeen && update.seenAt ? <AppText variant="caption11" tone="secondary">Seen</AppText> : null}
        </View>
      </View>
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.card,
    borderRadius: radii[20],
    gap: spacing[16],
    minHeight: 112,
    padding: spacing[12],
    width: '100%',
  },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing[16] },
  compact: { minHeight: 100 },
  photo: { flexBasis: 82, flexGrow: 0, flexShrink: 0, width: 82 },
  copy: { flex: 1, gap: spacing[4] },
});
