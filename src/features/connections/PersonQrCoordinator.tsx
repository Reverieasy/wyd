import { router, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useAppStore } from '@/src/state/appStore';
import { personQrStorage } from './personQrStorage';

export function PersonQrCoordinator() {
  const { state } = useAppStore();
  const userId = state.server.profile?.id;
  const segments = useSegments();
  const current = useRef(segments); current.current = segments;
  const handled = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!userId) { handled.current = null; return; }
    if (handled.current === userId) return;
    void personQrStorage.get().then(async username => {
      if (!active) return;
      handled.current = userId;
      if (!username) return;
      if (current.current[0] !== 'add-person') router.push({ pathname: '/add-person', params: { username } });
      await personQrStorage.clear().catch(() => undefined);
    });
    return () => { active = false; };
  }, [userId]);
  return null;
}
