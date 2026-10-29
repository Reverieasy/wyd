import { widgetStorage } from './widgetStorage';
import type { WidgetDesign, WidgetSettings } from './widgetModel';
export const widgetService = {
  isAvailable: () => false,
  getSettings: widgetStorage.getSettings.bind(widgetStorage),
  async hasPlacedWidget(_userId: string) { return false; },
  async saveSettings(userId: string, settings: WidgetSettings) { await widgetStorage.saveSettings(userId, settings); },
  async addToHomeScreen(_design: WidgetDesign = 'small') { return false; },
  async refresh() {},
  async clear() { await widgetStorage.clearPhoto(); },
};
