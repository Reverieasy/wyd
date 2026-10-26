import { createElement } from 'react';
import { getWidgetApi } from './nativeWidgetApi.android';
import { loadWidgetSnapshot } from './widgetData.android';
import { MOMENT_WIDGET_NAME, emptyWidget, type WidgetSettings, type WidgetSnapshot } from './widgetModel';
import { widgetStorage } from './widgetStorage';

let revision = 0;
let redactionMode: 'setup' | 'signed-out' = 'signed-out';
let refreshTask: Promise<void> = Promise.resolve();
function render(snapshot: WidgetSnapshot, width: number, height: number) {
  // Loading widget primitives before the native module check would crash Expo Go
  // and old installed builds, even when no widget has been added.
  const { MomentWidget } = require('./MomentWidget.android') as typeof import('./MomentWidget.android');
  return createElement(MomentWidget, { snapshot, width, height });
}
export const widgetService = {
  isAvailable: () => getWidgetApi() !== null,
  getSettings: widgetStorage.getSettings.bind(widgetStorage),
  async saveSettings(userId: string, settings: WidgetSettings) {
    revision++;
    await widgetStorage.saveSettings(userId, settings);
    if (!settings.enabled) { await this.clear('setup'); return; }
    // Saving a preference must not wait for network queries or a photo download.
    // Refresh separately so the controlled switch can acknowledge the save now.
    void this.refresh().catch(() => undefined);
  },
  async addToHomeScreen() {
    return await getWidgetApi()?.requestPinWidget({ widgetName: MOMENT_WIDGET_NAME }) ?? false;
  },
  async refresh() {
    const ownRevision = revision;
    const api = getWidgetApi();
    if (!api) return;
    refreshTask = refreshTask.catch(() => undefined).then(async () => {
      const widgets = await api.getWidgetInfo(MOMENT_WIDGET_NAME);
      if (!widgets.length || ownRevision !== revision) return;
      const snapshot = await loadWidgetSnapshot().catch(() => emptyWidget('unavailable'));
      await Promise.all(widgets.map(widget => api.requestWidgetUpdateById({ widgetName: MOMENT_WIDGET_NAME, widgetId: widget.widgetId,
        renderWidget: info => render(ownRevision === revision ? snapshot : emptyWidget(redactionMode), info.width, info.height),
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
    const widgets = await api.getWidgetInfo(MOMENT_WIDGET_NAME);
    await Promise.all(widgets.map(widget => api.requestWidgetUpdateById({ widgetName: MOMENT_WIDGET_NAME, widgetId: widget.widgetId,
      renderWidget: info => render(emptyWidget(mode), info.width, info.height),
    })));
  },
};
