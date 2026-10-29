import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizePersonUsername } from './personQr';
const KEY = 'wyd.pending-person-qr.v1';
export const personQrStorage = {
  async get() { return normalizePersonUsername(await AsyncStorage.getItem(KEY).catch(() => null)); },
  async save(value: string) { const username = normalizePersonUsername(value); if (username) await AsyncStorage.setItem(KEY, username); },
  async clear() { await AsyncStorage.removeItem(KEY); },
};
