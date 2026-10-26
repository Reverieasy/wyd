import { MotionPressable as Pressable } from './MotionPressable';
import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import { StyleSheet, View } from 'react-native';
import type { ActivityItem } from '@/src/models';
import { reactionEmoji } from '@/src/models';
import { relativeTime } from '@/src/state/appStore';
import { cardShadow } from '@/src/theme';
import { Avatar } from './Avatar';
import { AppText } from './primitives/AppText';
import { FigmaArtwork } from './FigmaArtwork';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
function copy(item: ActivityItem) {
  if (item.kind === 'moment') return 'posted a new moment';
  if (item.kind === 'nudge') return item.nudgeStatus === 'responded' ? 'answered a Nudge' : item.nudgeDirection === 'outgoing' ? 'got your Nudge' : 'nudged you';
  if (item.kind === 'reaction') return 'reacted to your moment';
  if (item.kind === 'connection_request') return 'sent you a request';
  return 'accepted your request';
}
export function ActivityRow({ item, onPress }: { item: ActivityItem; onPress?: () => void }) {
  const { colors, gradients, styles } = useThemeStyles(makeStyles);
  const reaction = item.kind === 'reaction';
  const symbol = reaction ? item.reaction ? reactionEmoji[item.reaction] : '♥' : item.kind === 'nudge' ? '👋' : '+';
  return <Pressable accessibilityRole={onPress ? 'button' : undefined} onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}>
    <Avatar name={item.actor.displayName} uri={item.actor.avatarUrl ?? undefined} size={42} palette={reaction ? 1 : 0} /><View style={styles.copy}><AppText variant="label12" numberOfLines={2}>{item.actor.displayName} {copy(item)}</AppText><AppText style={styles.time}>{relativeTime(item.createdAt)} ago</AppText></View>
    <View style={styles.badge}><View style={StyleSheet.absoluteFill}><FigmaArtwork name={reaction ? 'pink32' : 'badge32'} size={32} /></View><View pointerEvents="none">{item.kind === 'moment' ? <MaterialIcons name="photo-camera" size={19} color={colors.background.accent} /> : <AppText style={styles.symbol}>{symbol}</AppText>}</View></View>{!item.read ? <View accessibilityLabel="Unread" style={styles.unread} /> : null}
  </Pressable>;
}
const makeStyles = ({ colors, gradients }: Theme) => StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.background.card, minHeight: 66, ...cardShadow }, copy: { flex: 1, gap: 3 }, time: { color: colors.text.secondary, fontSize: 10, lineHeight: 13 }, badge: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }, symbol: { color: colors.background.accent, fontSize: 15 }, unread: { position: 'absolute', width: 5, height: 5, borderRadius: 3, top: 8, right: 8, backgroundColor: colors.background.accent } });
