import type { RealtimeChannel } from '@supabase/supabase-js';

import { getSupabase } from '@/src/lib/supabase';
import { parseRealtimeEvent, type AppRealtimeEvent } from './realtimeEvents';

type Callbacks = {
  onEvent: (event: AppRealtimeEvent) => void;
  onConnected: () => void;
};

let activeChannel: RealtimeChannel | null = null;
let activeUserId: string | null = null;
let generation = 0;

export const realtimeService = {
  async start(userId: string, accessToken: string, callbacks: Callbacks) {
    await this.stop();
    const ownGeneration = ++generation;
    activeUserId = userId;
    const client = getSupabase();
    client.realtime.setAuth(accessToken);
    const channel = client
      .channel(`user:${userId}`, { config: { private: true } })
      .on('broadcast', { event: 'app_changed' }, ({ payload }) => {
        if (ownGeneration !== generation || activeUserId !== userId) return;
        const event = parseRealtimeEvent(payload);
        if (event) callbacks.onEvent(event);
      })
      .subscribe((status) => {
        if (ownGeneration !== generation || activeUserId !== userId) return;
        if (status === 'SUBSCRIBED') callbacks.onConnected();
      });
    activeChannel = channel;
  },

  updateAuth(accessToken: string) {
    getSupabase().realtime.setAuth(accessToken);
  },

  async stop() {
    generation += 1;
    activeUserId = null;
    const channel = activeChannel;
    activeChannel = null;
    if (channel) await getSupabase().removeChannel(channel);
  },
};
