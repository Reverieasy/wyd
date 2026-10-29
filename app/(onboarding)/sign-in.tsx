import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ActionButton, AppText, BrandLogo, PasswordField, Screen, TextField } from '@/src/components';
import { GradientText } from '@/src/components/GradientText';
import { useAppStore } from '@/src/state/appStore';

import { LoginLoading } from '@/src/components/LoginLoading';

export default function SignInRoute() {
  const { colors, gradients, styles } = useThemeStyles(makeStyles);
  const { state, actions } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const pending = useRef(false);
  const submit = async () => {
    if (pending.current || !email.trim() || !password) return;
    pending.current = true; setLoggingIn(true); actions.clearServerFeedback();
    try { if (await actions.signIn(email, password)) router.replace('/(tabs)/people'); }
    finally { pending.current = false; setLoggingIn(false); }
  };
  return <Screen scroll keyboardShouldPersistTaps="handled" contentStyle={styles.screen}>
    <LoginLoading visible={loggingIn} />
    <View style={styles.heading}><BrandLogo size={142} /><GradientText style={styles.title}>Welcome</GradientText><AppText style={styles.subtitle}>See the little moments you've missed.</AppText></View>
    <View style={styles.form}><AppText style={styles.label}>EMAIL</AppText><TextField accessibilityLabel="Email address" autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="you@example.com" value={email} onChangeText={setEmail} /><AppText style={[styles.label, { marginTop: 6 }]}>PASSWORD</AppText><PasswordField accessibilityLabel="Password" autoCapitalize="none" autoComplete="current-password" placeholder="Password" value={password} onChangeText={setPassword} onSubmitEditing={() => void submit()} /></View>
    <Pressable accessibilityRole="button" style={styles.forgot} onPress={() => router.push('/(onboarding)/forgot-password')}><AppText style={styles.linkText}>Forgot password?</AppText></Pressable>
    {state.server.error ? <AppText style={styles.error}>{state.server.error}</AppText> : null}
    <ActionButton emphasis="gradient" label="Log in" loading={state.server.busy} disabled={!state.server.configured || !email.trim() || !password} onPress={() => void submit()} />
    <Pressable accessibilityRole="button" style={styles.link} onPress={() => router.push('/(onboarding)/create-account')}><AppText style={styles.linkText}>New here? Create an account</AppText></Pressable>
    <View style={styles.privacy}><AppText variant="label12">Private by default.</AppText><AppText style={styles.privacyCopy}>Only people you connect with can see your moments.</AppText></View>
  </Screen>;
}
const makeStyles = ({ colors, gradients }: Theme) => StyleSheet.create({ screen: { gap: 0, paddingTop: 70, paddingBottom: 40 }, heading: { alignItems: 'center', marginBottom: 56 }, title: { fontSize: 28, lineHeight: 39, marginTop: 10, fontFamily: 'Nunito_800ExtraBold' }, subtitle: { fontSize: 13, color: colors.text.secondary, textAlign: 'center' }, form: { gap: 8 }, label: { fontSize: 10, color: colors.text.secondary, fontFamily: 'PlusJakartaSans_700Bold' }, forgot: { minHeight: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 4 }, link: { minHeight: 72, justifyContent: 'center', alignItems: 'center' }, linkText: { color: colors.background.accent, fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold' }, privacy: { padding: 20, gap: 8, borderRadius: 22, backgroundColor: colors.background.subtle, borderColor: colors.border.default, borderWidth: 1, marginTop: 18 }, privacyCopy: { fontSize: 11, color: colors.text.secondary }, error: { color: '#B42318', marginBottom: 12 } });
