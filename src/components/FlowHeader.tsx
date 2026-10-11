import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '@/src/theme';
import { AppText } from './primitives/AppText';

export function FlowHeader({ title, close = false }: { title: string; close?: boolean }) {
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

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 48 },
  control: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
});
