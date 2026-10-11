import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ActionButton, AppText, BrandLogo, PasswordField, Screen, TextField } from '@/src/components';
import { useAppStore } from '@/src/state/appStore';
import { colors, spacing } from '@/src/theme';

export default function SignInRoute() {
  const { state, actions } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async () => {
    actions.clearServerFeedback();
    if (await actions.signIn(email, password)) router.replace('/(tabs)/people');
  };

  return (
    <Screen scroll keyboardShouldPersistTaps="handled" contentStyle={styles.screen}>
      <View style={styles.logo}><BrandLogo /></View>
      <View style={styles.heading}>
        <AppText variant="title24">Welcome back.</AppText>
        <AppText variant="body16" tone="secondary">Log in to see the little moments you've missed.</AppText>
      </View>
      <View style={styles.form}>
        <TextField autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="Email address" value={email} onChangeText={setEmail} />
        <PasswordField autoCapitalize="none" autoComplete="current-password" placeholder="Password" value={password} onChangeText={setPassword} />
      </View>
      {state.server.error ? <AppText variant="body14" style={styles.error}>{state.server.error}</AppText> : null}
      <ActionButton label="Log in" loading={state.server.busy} disabled={!state.server.configured || !email || !password} onPress={() => void submit()} />
      <Pressable accessibilityRole="button" onPress={() => router.push('/(onboarding)/create-account')} style={styles.link}>
        <AppText variant="label14" style={styles.linkText}>New here? Create an account</AppText>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 0, paddingTop: spacing[48] },
  logo: { alignItems: 'center', marginBottom: spacing[40] },
  heading: { gap: spacing[8], marginBottom: spacing[28] },
  form: { gap: spacing[12], marginBottom: spacing[28] },
  error: { color: '#B42318', marginBottom: spacing[12] },
  link: { alignItems: 'center', padding: spacing[20] },
  linkText: { color: colors.background.accent },
});
