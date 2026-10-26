import { getWidgetApi } from './nativeWidgetApi.android';

const api = getWidgetApi();
if (api) {
  const { widgetTaskHandler } = require('./widgetTaskHandler.android') as typeof import('./widgetTaskHandler.android');
  api.registerWidgetTaskHandler(widgetTaskHandler);
}
