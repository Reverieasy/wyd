import { createElement } from 'react';
import { getWidgetApi } from './nativeWidgetApi.android';
import { loadWidgetSnapshot } from './widgetData.android';
import { momentWidgetNames, widgetNames, widgetDesignForName, emptyWidget, type WidgetDesign, type WidgetSettings, type WidgetSnapshot } from './widgetModel';
import { widgetStorage } from './widgetStorage';
import { readWidgetAppearance } from './widgetAppearance';
import type { AppearanceMode } from '@/src/theme/appearance';

let revision = 0;
let redactionMode: 'setup' | 'signed-out' = 'signed-out';
let refreshTask: Promise<void> = Promise.resolve();
function render(snapshot: WidgetSnapshot, width: number, height: number, mode: AppearanceMode) {
  // Loading widget primitives before the native module check would crash Expo Go
  // and old installed builds, even when no widget has been added.
  const { MomentWidget } = require('./MomentWidget.android') as typeof import('./MomentWidget.android');
  const view = (isDark: boolean) => createElement(MomentWidget, { snapshot, width, height, isDark });
  return mode === 'system' ? { light: view(false), dark: view(true) } : view(mode === 'dark');
}
async function placedWidgets(api: NonNullable<ReturnType<typeof getWidgetApi>>) {
  return (await Promise.all(momentWidgetNames.map(async widgetName =>
    (await api.getWidgetInfo(widgetName)).map(widget => ({ ...widget, widgetName }))))).flat();
}
export const widgetService = {
  isAvailable: () => getWidgetApi() !== null,
  getSettings: widgetStorage.getSettings.bind(widgetStorage),
  async hasPlacedWidget(userId: string) {
    const api = getWidgetApi();
    if (!api) return false;
    const settings = await widgetStorage.getSettings(userId);
    return Boolean(settings.enabled && settings.personId && (await placedWidgets(api)).length);
  },
  async saveSettings(userId: string, settings: WidgetSettings) {
    revision++;
    await widgetStorage.saveSettings(userId, settings);
    if (!settings.enabled) { await this.clear('setup'); return; }
    // Saving a preference must not wait for network queries or a photo download.
    // Refresh separately so the controlled switch can acknowledge the save now.
    void this.refresh().catch(() => undefined);
  },
  async addToHomeScreen(design: WidgetDesign = 'small') {
    return await getWidgetApi()?.requestPinWidget({ widgetName: widgetNames[design] }) ?? false;
  },
  async refresh() {
    const ownRevision = revision;
    const api = getWidgetApi();
    if (!api) return;
    refreshTask = refreshTask.catch(() => undefined).then(async () => {
      const widgets = await placedWidgets(api);
      if (!widgets.length || ownRevision !== revision) return;
      const [snapshot, mode] = await Promise.all([loadWidgetSnapshot().catch(() => emptyWidget('unavailable')), readWidgetAppearance()]);
      await Promise.all(widgets.map(widget => api.requestWidgetUpdateById({ widgetName: widget.widgetName, widgetId: widget.widgetId,
        renderWidget: info => render({ ...(ownRevision === revision ? snapshot : emptyWidget(redactionMode)), design: widgetDesignForName(widget.widgetName)! }, info.width, info.height, mode),
      })));
    });
    return refreshTask;
  },
  async clear(mode: 'setup' | 'signed-out' = 'signed-out') {
    revision++;
    redactionMode = mode;
    await widgetStorage.clearPhoto();
    const api = getWidgetApi();
    if (!api) return;
    const widgets = await placedWidgets(api);
    const appearance = await readWidgetAppearance();
    await Promise.all(widgets.map(widget => api.requestWidgetUpdateById({ widgetName: widget.widgetName, widgetId: widget.widgetId,
      renderWidget: info => render({ ...emptyWidget(mode), design: widgetDesignForName(widget.widgetName)! }, info.width, info.height, appearance),
    })));
  },
};
