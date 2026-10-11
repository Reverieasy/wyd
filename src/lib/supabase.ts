import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from './database.types';
import { environment, validatePublicEnvironment } from './environment';
import { ServiceError } from './serviceError';

validatePublicEnvironment();
const supabaseUrl = environment.supabaseUrl;
const supabasePublishableKey = environment.supabasePublishableKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);
const REQUEST_TIMEOUT_MS = 20_000;

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  if (init?.signal) return fetch(input, init);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try { return await fetch(input, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timeout); }
}

let client: SupabaseClient<Database> | null = null;

if (isSupabaseConfigured) {
  client = createClient<Database>(supabaseUrl!, supabasePublishableKey!, {
    global: { fetch: fetchWithTimeout },
    auth: {
      ...(Platform.OS === 'web' ? {} : { storage: AsyncStorage }),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (state) => {
      if (state === 'active') client?.auth.startAutoRefresh();
      else client?.auth.stopAutoRefresh();
    });
  }
}

export function getSupabase() {
  if (!client) {
    throw new ServiceError(
      'Supabase is not configured. Add the Expo public URL and publishable key to a local .env file.',
      'supabase_not_configured',
    );
  }
  return client;
}
