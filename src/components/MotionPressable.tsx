import { Pressable, type PressableProps } from 'react-native';

type Props = PressableProps & { pressScale?: number };

// Keep the shared touch target API without adding press animation or state.
export function MotionPressable({ pressScale: _pressScale, ...props }: Props) {
  return <Pressable {...props} />;
}
