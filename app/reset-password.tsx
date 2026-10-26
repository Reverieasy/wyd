import { router } from 'expo-router';
import { useState } from 'react';
import { ActionButton, AppText, PasswordField, Screen } from '@/src/components';
import { authService } from '@/src/features/auth/authService';
import { readableServiceError } from '@/src/lib/serviceError';
import { useAppStore } from '@/src/state/appStore';

export default function ResetPasswordRoute() {
  const { state, actions } = useAppStore();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setError(null);
    try { await authService.updatePassword(password); actions.finishRecovery(); actions.clearServerFeedback(); router.replace('/(tabs)/people'); }
    catch (err) { setError(readableServiceError(err).message); } finally { setBusy(false); }
  };
  return <Screen scroll keyboardShouldPersistTaps="handled" contentStyle={{ paddingTop: 70 }}><AppText variant="title24">Choose a new password</AppText><AppText tone="secondary">Use at least 8 characters to protect your little moments.</AppText>{state.server.session && state.server.recoveryActive ? <><PasswordField accessibilityLabel="New password" autoComplete="new-password" placeholder="New password" value={password} onChangeText={setPassword} /><PasswordField accessibilityLabel="Confirm new password" placeholder="Confirm password" value={confirm} onChangeText={setConfirm} /><ActionButton label="Save password" loading={busy} disabled={password.length < 8 || password !== confirm} onPress={() => void save()} /></> : <><AppText tone="secondary">{state.server.error ?? 'Open the password reset link from your email to continue.'}</AppText><ActionButton label="Request a new link" onPress={() => { actions.finishRecovery(); actions.clearServerFeedback(); router.replace('/(onboarding)/forgot-password'); }} /></>}{error ? <AppText style={{ color: '#B42318' }}>{error}</AppText> : null}</Screen>;
}
