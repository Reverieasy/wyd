import { widgetStorage } from './widgetStorage';
import type { WidgetSettings } from './widgetModel';
export const widgetService = {
  isAvailable: () => false,
  getSettings: widgetStorage.getSettings.bind(widgetStorage),
  async saveSettings(userId: string, settings: WidgetSettings) { await widgetStorage.saveSettings(userId, settings); },
  async addToHomeScreen() { return false; },
  async refresh() {},
  async clear() { await widgetStorage.clearPhoto(); },
};
