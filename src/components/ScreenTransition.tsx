import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

export function ScreenTransition({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle>; enabled?: boolean }) {
  return <View style={[{ flex: 1 }, style]}>{children}</View>;
}
