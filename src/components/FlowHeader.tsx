import { MotionPressable as Pressable } from './MotionPressable';
import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';


import { AppText } from './primitives/AppText';

export function FlowHeader({ title, close = false }: { title: string; close?: boolean }) {
  const { colors, gradients, styles } = useThemeStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Pressable accessibilityLabel={close ? 'Close' : 'Go back'} accessibilityRole="button" hitSlop={12} onPress={() => router.back()} style={styles.control}>
        <MaterialIcons color={colors.text.primary} name={close ? 'close' : 'arrow-back'} size={24} />
      </Pressable>
      <AppText variant="label14">{title}</AppText>
      <View style={styles.control} />
    </View>
  );
}

const makeStyles = ({ colors, gradients }: Theme) => StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 48 },
  control: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
});
