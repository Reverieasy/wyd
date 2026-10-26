import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
export { useReducedMotion } from './MotionProvider';

export function SoftEntrance({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={style}>{children}</View>;
}
