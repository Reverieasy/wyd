import type { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import type { PhotoAsset } from '@/src/models';
import { colors, radii, spacing } from '@/src/theme';
import { Avatar } from './Avatar';
import { MomentPhoto } from './MomentPhoto';
import { AppText } from './primitives/AppText';

export type UpdateCardData = {
  personName: string;
  avatarUri?: string;
  photo: PhotoAsset;
  status: string;
  statusEmoji?: string;
  timeAgo: string;
  caption?: string | null;
};

type Props = UpdateCardData & { style?: ViewStyle; footer?: ReactNode; onPhotoError?: () => void };

export function UpdateCard({
  personName,
  avatarUri,
  photo,
  status,
  statusEmoji,
  timeAgo,
  caption,
  style,
  footer,
  onPhotoError,
}: Props) {
  return (
    <View style={[styles.card, style]}>
      <MomentPhoto photo={photo} onLoadError={onPhotoError} />
      <View style={styles.meta}>
        <Avatar name={personName} uri={avatarUri} size={36} />
        <View style={styles.metaCopy}>
          <AppText variant="label14">{personName}</AppText>
          <AppText variant="body14" tone="secondary">
            {status} {statusEmoji} {'\u00B7'} {timeAgo}
          </AppText>
        </View>
      </View>
      {caption ? <AppText variant="body14">{caption}</AppText> : null}
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.card,
    borderRadius: radii[28],
    gap: spacing[12],
    padding: spacing[12],
    width: '100%',
  },
  meta: { alignItems: 'center', flexDirection: 'row', gap: spacing[10] },
  metaCopy: { gap: spacing[2] },
});
