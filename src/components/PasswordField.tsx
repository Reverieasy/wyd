import { MotionPressable as Pressable } from './MotionPressable';
import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/src/theme';
import { TextField } from './TextField';

type Props = Omit<ComponentProps<typeof TextField>, 'secureTextEntry'>;

export function PasswordField(props: Props) {
  const { colors, gradients, styles } = useThemeStyles(makeStyles);
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.wrap}>
      <TextField {...props} secureTextEntry={!visible} style={styles.input} />
      <Pressable
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        accessibilityRole="button"
        hitSlop={10}
        onPress={() => setVisible((current) => !current)}
        style={styles.button}
      >
        <MaterialIcons color={colors.text.secondary} name={visible ? 'visibility-off' : 'visibility'} size={22} />
      </Pressable>
    </View>
  );
}

const makeStyles = ({ colors, gradients }: Theme) => StyleSheet.create({
  wrap: { position: 'relative', width: '100%' },
  input: { paddingRight: 52 },
  button: { alignItems: 'center', height: 56, justifyContent: 'center', position: 'absolute', right: spacing[8], top: 0, width: 40 },
});
