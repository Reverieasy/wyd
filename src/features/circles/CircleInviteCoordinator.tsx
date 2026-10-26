import { router, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useAppStore } from '@/src/state/appStore';
import { circleInviteStorage } from './circleInviteStorage';

export function CircleInviteCoordinator() {
  const { state } = useAppStore();
  const userId = state.server.profile?.id;
  const segments = useSegments();
  const currentSegments = useRef(segments);
  currentSegments.current = segments;
  const handled = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!userId) { handled.current = null; return; }
    if (handled.current === userId) return;
    void circleInviteStorage.get().then(async code => {
      if (!active) return;
      handled.current = userId;
      if (!code) return;
      // Route before clearing: navigation must not cancel and consume an invite.
      if (currentSegments.current[0] !== 'join-circle') router.push({ pathname: '/join-circle', params: { code } });
      await circleInviteStorage.clear().catch(() => undefined);
    });
    return () => { active = false; };
  }, [userId]);
  return null;
}
