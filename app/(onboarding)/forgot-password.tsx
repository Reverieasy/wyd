import { useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ActionButton, AppText, FlowHeader, Screen, TextField } from '@/src/components';
import { authService } from '@/src/features/auth/authService';
import { readableServiceError } from '@/src/lib/serviceError';
import { useResendCooldown } from '@/src/features/auth/useResendCooldown';

export default function ForgotPasswordRoute() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableAt, setAvailableAt] = useState<number | null>(null);
  const cooldown = useResendCooldown(availableAt);
  const pending = useRef(false);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const send = async () => {
    if (pending.current || !validEmail || cooldown > 0) return;
    pending.current = true; setBusy(true); setError(null);
    try { await authService.requestPasswordReset(email); setSent(true); setAvailableAt(Date.now() + 60_000); }
    catch (err) { setError(readableServiceError(err).message); }
    finally { pending.current = false; setBusy(false); }
  };
  return <Screen scroll keyboardShouldPersistTaps="handled"><FlowHeader title="Reset your password" /><View style={{ gap: 12 }}><AppText variant="title24">{sent ? 'Check your email.' : 'A fresh start.'}</AppText><AppText tone="secondary">{sent ? `If an account uses ${email.trim()}, a reset link is on its way. ${Platform.OS === 'web' ? 'Open it in this browser to choose a new password.' : 'Open it on the phone with watchudoin? installed.'}` : 'Enter your account email and we’ll send you a password reset link.'}</AppText>{sent ? <AppText variant="body14" tone="secondary">Check spam too. Use the newest email—reset links work once.</AppText> : null}</View>{!sent ? <TextField accessibilityLabel="Account email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="you@example.com" value={email} onChangeText={setEmail} editable={!busy} /> : null}<ActionButton label={cooldown > 0 ? `Resend in ${cooldown}s` : sent ? 'Resend reset link' : 'Send reset link'} disabled={!validEmail || cooldown > 0} loading={busy} onPress={() => void send()} />{sent ? <ActionButton label="Use a different email" variant="secondary" disabled={busy} onPress={() => { setSent(false); setError(null); }} /> : null}<ActionButton label="Back to sign in" variant="secondary" disabled={busy} onPress={() => router.replace('/(onboarding)/sign-in')} />{error ? <AppText accessibilityRole="alert" style={styles.error}>{error}</AppText> : null}</Screen>;
}
const styles = StyleSheet.create({ error: { color: '#B42318' } });
