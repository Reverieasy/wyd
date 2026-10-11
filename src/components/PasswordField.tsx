import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/src/theme';
import { TextField } from './TextField';

type Props = Omit<ComponentProps<typeof TextField>, 'secureTextEntry'>;

export function PasswordField(props: Props) {
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

const styles = StyleSheet.create({
  wrap: { position: 'relative', width: '100%' },
  input: { paddingRight: 52 },
  button: { alignItems: 'center', height: 56, justifyContent: 'center', position: 'absolute', right: spacing[8], top: 0, width: 40 },
});
