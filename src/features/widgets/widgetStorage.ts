import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultWidgetSettings, type WidgetSettings, type WidgetSnapshot } from './widgetModel';

const PHOTO_KEY = 'wyd.widget.photo.v1';
const settingsKey = (userId: string) => `wyd.widget.settings.v1:${userId}`;
export const widgetStorage = {
  async getSettings(userId: string): Promise<WidgetSettings> {
    try {
      const raw = await AsyncStorage.getItem(settingsKey(userId));
      if (!raw) return { ...defaultWidgetSettings };
      const value = JSON.parse(raw);
      return { enabled: value.enabled === true, personId: typeof value.personId === 'string' ? value.personId : null };
    } catch { return { ...defaultWidgetSettings }; }
  },
  async saveSettings(userId: string, settings: WidgetSettings) {
    await AsyncStorage.setItem(settingsKey(userId), JSON.stringify(settings));
    await this.clearPhoto();
  },
  async getPhoto(userId: string): Promise<WidgetSnapshot | null> {
    try {
      const raw = await AsyncStorage.getItem(PHOTO_KEY);
      if (!raw) return null;
      const value = JSON.parse(raw) as WidgetSnapshot;
      return value.ownerId === userId && typeof value.photoData === 'string' && value.photoData.startsWith('data:image/jpeg;base64,') ? value : null;
    } catch { return null; }
  },
  async savePhoto(snapshot: WidgetSnapshot) { await AsyncStorage.setItem(PHOTO_KEY, JSON.stringify(snapshot)); },
  async clearPhoto() { await AsyncStorage.removeItem(PHOTO_KEY); },
};
