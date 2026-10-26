import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useReducedMotion } from './SoftEntrance';

export function ReactionBurst({ emoji }: { emoji: string }) {
  const progress = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: 1050, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [emoji, progress, reduced]);
  if (reduced) return null;
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.layer}>
    {Array.from({ length: 9 }, (_, index) => <Animated.Text key={index} style={[styles.emoji, {
      left: `${8 + index * 10}%`,
      opacity: progress.interpolate({ inputRange: [0, 0.12, 0.7, 1], outputRange: [0, 1, 1, 0] }),
      transform: [
        { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -140 - index % 3 * 50] }) },
        { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, index % 2 ? 22 : -22] }) },
        { scale: progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.5, 1.1, 0.85] }) },
        { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', index % 2 ? '18deg' : '-18deg'] }) },
      ],
    }]}>{emoji}</Animated.Text>)}
  </View>;
}
const styles = StyleSheet.create({ layer: { position: 'absolute', left: 0, right: 0, bottom: 26, height: 1, zIndex: 10 }, emoji: { position: 'absolute', bottom: 0, fontSize: 28 } });
