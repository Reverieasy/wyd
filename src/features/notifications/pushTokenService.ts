import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { getSupabase } from '@/src/lib/supabase';

const tokenKey = 'watchu-doin:expo-push-token';

export const pushTokenService = {
  async register(token: string) {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;
    const { error } = await getSupabase().rpc('register_push_token', {
      p_expo_push_token: token,
      p_platform: Platform.OS,
      p_device_identifier: null,
    });
    if (error) throw error;
    await AsyncStorage.setItem(tokenKey, token);
  },

  async disableCurrent() {
    const token = await AsyncStorage.getItem(tokenKey);
    if (!token) return;
    const { error } = await getSupabase().rpc('disable_push_token', { p_expo_push_token: token });
    if (error) throw error;
    await AsyncStorage.removeItem(tokenKey);
  },
};
