import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActionButton, AppText, FlowHeader, Screen, TextField } from '@/src/components';
import { circleService } from '@/src/features/circles/circleService';

export default function CreateCircleRoute() {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const create = async () => {
    if (pending.current || !name.trim()) return;
    pending.current = true; setBusy(true); setError(null);
    try { const circle = await circleService.create(name); router.replace({ pathname: '/(flows)/circles/[id]', params: { id: circle.id } }); }
    catch (err) { setError(circleService.errorMessage(err)); }
    finally { pending.current = false; setBusy(false); }
  };
  return <Screen scroll keyboardShouldPersistTaps="handled"><FlowHeader title="Create circle" /><AppText variant="title24">Give your circle a name.</AppText><AppText tone="secondary">You’ll be the host. Share a code or link, then approve the people you want to join.</AppText>
    <TextField accessibilityLabel="Circle name" placeholder="e.g. The weekend crew" value={name} onChangeText={setName} maxLength={40} editable={!busy} autoCapitalize="sentences" />
    <AppText variant="caption11" tone="secondary">{name.length}/40 characters</AppText>
    {error ? <AppText accessibilityRole="alert" style={{ color: '#DA645B' }}>{error}</AppText> : null}
    <ActionButton label="Create circle" loading={busy} disabled={!name.trim()} onPress={() => void create()} />
  </Screen>;
}
