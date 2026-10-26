import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeCircleCode } from './circleModel';
const KEY = 'wyd.pending-circle-invite.v1';
export const circleInviteStorage = {
  async get() { return normalizeCircleCode(await AsyncStorage.getItem(KEY).catch(() => '') ?? ''); },
  async save(input: string) { const code = normalizeCircleCode(input); if (code) await AsyncStorage.setItem(KEY, code); },
  async clear() { await AsyncStorage.removeItem(KEY); },
};
