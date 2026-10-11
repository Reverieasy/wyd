import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ActionButton, AppText, BrandLogo, PasswordField, Screen, TextField } from '@/src/components';
import { useAppStore } from '@/src/state/appStore';
import { colors, spacing } from '@/src/theme';

export default function CreateAccountRoute() {
  const { state, actions } = useAppStore();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const submit = async () => {
    actions.clearServerFeedback();
    const result = await actions.signUp({ email, password, username });
    if (result === 'signed-in') router.replace('/(onboarding)/connect');
    if (result === 'confirmation-required') router.replace('/(onboarding)/check-email');
  };

  return (
    <Screen scroll keyboardShouldPersistTaps="handled" contentStyle={styles.screen}>
      <View style={styles.logo}><BrandLogo /></View>
      <View style={styles.heading}>
        <AppText variant="title24">Create your account</AppText>
        <AppText variant="body16" tone="secondary">Pick a username people can use to find you.</AppText>
      </View>
      <View style={styles.form}>
        <TextField autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="Email address" value={email} onChangeText={setEmail} />
        <TextField autoCapitalize="none" autoCorrect={false} maxLength={24} placeholder="Username" value={username} onChangeText={setUsername} />
        <PasswordField autoCapitalize="none" autoComplete="new-password" placeholder="Password" value={password} onChangeText={setPassword} />
      </View>
      {state.server.error ? <AppText variant="body14" style={styles.error}>{state.server.error}</AppText> : null}
      <ActionButton label="Create account" loading={state.server.busy} disabled={!state.server.configured || !email || !username || !password} onPress={() => void submit()} />
      <Pressable accessibilityRole="button" onPress={() => router.replace('/(onboarding)/sign-in')} style={styles.link}>
        <AppText variant="label14" style={styles.linkText}>Already have an account? Log in</AppText>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 0, paddingTop: spacing[32] },
  logo: { alignItems: 'center', marginBottom: spacing[32] },
  heading: { gap: spacing[8], marginBottom: spacing[28] },
  form: { gap: spacing[12], marginBottom: spacing[28] },
  error: { color: '#B42318', marginBottom: spacing[12] },
  link: { alignItems: 'center', padding: spacing[20] },
  linkText: { color: colors.background.accent },
});
