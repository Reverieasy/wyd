import { useThemeStyles, type Theme } from '@/src/theme/ThemeProvider';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ActionButton, AppText, BrandLogo, PasswordField, Screen, TextField } from '@/src/components';
import { GradientText } from '@/src/components/GradientText';
import { profileService } from '@/src/features/profiles/profileService';
import { useAppStore } from '@/src/state/appStore';


export default function CreateAccountRoute() {
  const { colors, gradients, styles } = useThemeStyles(makeStyles);
  const { state, actions } = useAppStore();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [availability, setAvailability] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  const normalized = username.trim().toLowerCase();
  const validUsername = /^[a-z0-9._]{3,24}$/.test(normalized);
  useEffect(() => {
    setAvailability('idle');
    if (!validUsername || !state.server.configured) return;
    let active = true;
    const timer = setTimeout(() => { setAvailability('checking'); void profileService.isUsernameAvailable(normalized).then(value => { if (active) setAvailability(value ? 'available' : 'taken'); }).catch(() => { if (active) setAvailability('error'); }); }, 450);
    return () => { active = false; clearTimeout(timer); };
  }, [normalized, validUsername, state.server.configured]);
  const submit = async () => { actions.clearServerFeedback(); const result = await actions.signUp({ email, password, username: normalized }); if (result === 'signed-in') router.replace('/(onboarding)/connect'); if (result === 'confirmation-required') router.replace('/(onboarding)/check-email'); };
  return <Screen scroll keyboardShouldPersistTaps="handled" contentStyle={styles.screen}>
    <View style={styles.heading}><BrandLogo size={135} /><GradientText style={styles.title}>Create your account</GradientText><AppText style={styles.subtitle}>Pick a username your people can find.</AppText></View>
    <View style={styles.form}><AppText style={styles.label}>EMAIL</AppText><TextField accessibilityLabel="Email address" autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="you@example.com" value={email} onChangeText={setEmail} /><AppText style={[styles.label, styles.next]}>USERNAME</AppText><TextField accessibilityLabel="Username" autoCapitalize="none" autoCorrect={false} maxLength={24} placeholder="Your username" value={username} onChangeText={setUsername} /><AppText style={[styles.label, styles.next]}>PASSWORD</AppText><PasswordField accessibilityLabel="Password" autoCapitalize="none" autoComplete="new-password" placeholder="At least 8 characters" value={password} onChangeText={setPassword} /></View>
    <AppText accessibilityLiveRegion="polite" style={[styles.availability, { color: availability === 'available' ? '#278459' : availability === 'taken' ? '#B42318' : colors.text.secondary }]}>{availability === 'available' ? '@' + normalized + ' is available' : availability === 'taken' ? 'That username is already taken.' : availability === 'checking' ? 'Checking username…' : availability === 'error' ? 'Availability could not be checked. We’ll check when you sign up.' : username && !validUsername ? 'Use 3–24 letters, numbers, periods or underscores.' : ' '}</AppText>
    {state.server.error ? <AppText style={styles.error}>{state.server.error}</AppText> : null}
    <ActionButton emphasis="gradient" label="Create account" loading={state.server.busy} disabled={!state.server.configured || !email.trim() || !validUsername || password.length < 8 || availability === 'taken' || availability === 'checking'} onPress={() => void submit()} />
    <Pressable accessibilityRole="button" style={styles.link} onPress={() => router.replace('/(onboarding)/sign-in')}><AppText style={styles.linkText}>Already have an account? Log in</AppText></Pressable>
    <View style={styles.legal}><AppText style={styles.legalCopy}>By continuing, you agree to our </AppText><Pressable accessibilityRole="link" onPress={() => router.push('/(flows)/terms')}><AppText style={styles.legalLink}>Terms</AppText></Pressable><AppText style={styles.legalCopy}> & </AppText><Pressable accessibilityRole="link" onPress={() => router.push('/(flows)/privacy-policy')}><AppText style={styles.legalLink}>Privacy Policy</AppText></Pressable></View>
  </Screen>;
}
const makeStyles = ({ colors, gradients }: Theme) => StyleSheet.create({ screen: { gap: 0, paddingTop: 48, paddingBottom: 36 }, heading: { alignItems: 'center', marginBottom: 38 }, title: { fontSize: 26, lineHeight: 34, marginTop: 8, fontFamily: 'PlusJakartaSans_700Bold', textAlign: 'center' }, subtitle: { fontSize: 13, color: colors.text.secondary }, form: { gap: 8 }, next: { marginTop: 6 }, label: { fontSize: 10, color: colors.text.secondary, fontFamily: 'PlusJakartaSans_700Bold' }, availability: { minHeight: 44, fontSize: 11, paddingTop: 10, paddingHorizontal: 16 }, link: { alignItems: 'center', minHeight: 72, justifyContent: 'center' }, linkText: { color: colors.background.accent, fontSize: 12 }, legal: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }, legalCopy: { fontSize: 10, color: colors.text.secondary }, legalLink: { fontSize: 10, color: colors.background.accent, paddingVertical: 14 }, error: { color: '#B42318', marginBottom: 12 } });
