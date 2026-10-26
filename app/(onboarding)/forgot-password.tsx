import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActionButton, AppText, FlowHeader, Screen, TextField } from '@/src/components';
import { authService } from '@/src/features/auth/authService';
import { readableServiceError } from '@/src/lib/serviceError';

export default function ForgotPasswordRoute() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const send = async () => { setBusy(true); setError(null); try { await authService.requestPasswordReset(email); setSent(true); } catch (err) { setError(readableServiceError(err).message); } finally { setBusy(false); } };
  return <Screen scroll keyboardShouldPersistTaps="handled"><FlowHeader title="Reset your password" /><View style={{ gap: 12 }}><AppText variant="title24">{sent ? 'Check your email.' : 'A fresh start.'}</AppText><AppText tone="secondary">{sent ? 'If an account uses this email, a reset link is on its way. Open it on the device with Wyd installed.' : 'Enter your account email and we’ll send you a password reset link.'}</AppText></View>{!sent ? <><TextField accessibilityLabel="Account email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="you@example.com" value={email} onChangeText={setEmail} /><ActionButton label="Send reset link" disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())} loading={busy} onPress={() => void send()} /></> : null}{error ? <AppText style={styles.error}>{error}</AppText> : null}</Screen>;
}
const styles = StyleSheet.create({ error: { color: '#B42318' } });
