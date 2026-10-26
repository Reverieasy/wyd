import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { profileService } from './profileService';
import { useAppStore } from '@/src/state/appStore';
import { readableServiceError } from '@/src/lib/serviceError';

export function useProfileStats() {
  const { state } = useAppStore();
  const userId = state.server.profile?.id;
  const [result, setResult] = useState<{ userId: string; data: Awaited<ReturnType<typeof profileService.getMyStats>> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useFocusEffect(useCallback(() => {
    let active = true; setError(null);
    if (userId) void profileService.getMyStats().then(data => { if (active) setResult({ userId, data }); }).catch(err => { if (active) setError(readableServiceError(err).message); });
    return () => { active = false; };
  }, [userId]));
  return { stats: result && result.userId === userId ? result.data : null, error };
}
