import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAppStore } from '@/src/state/appStore';
import { circleService } from './circleService';
import type { Circle } from './circleModel';

export function useCircles() {
  const { state } = useAppStore();
  const userId = state.server.profile?.id;
  const currentUser = useRef(userId); currentUser.current = userId;
  const [result, setResult] = useState<{ userId: string; circles: Circle[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    if (!userId) return;
    const own = ++sequence.current; setLoading(true); setError(null);
    try { const circles = await circleService.list(userId); if (currentUser.current === userId && own === sequence.current) setResult({ userId, circles }); }
    catch (err) { if (currentUser.current === userId && own === sequence.current) setError(circleService.errorMessage(err)); }
    finally { if (currentUser.current === userId && own === sequence.current) setLoading(false); }
  }, [userId]);
  useFocusEffect(useCallback(() => {
    void refresh();
    const timer = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 30_000);
    return () => { clearInterval(timer); sequence.current++; };
  }, [refresh]));
  return { circles: result && result.userId === userId ? result.circles : [], loading, error, refresh };
}
