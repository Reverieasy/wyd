import Constants from 'expo-constants';
import { TurboModuleRegistry } from 'react-native';
type WidgetApi = typeof import('react-native-android-widget');
let api: WidgetApi | undefined;
export function getWidgetApi(): WidgetApi | null {
  // SDK 57 also exposes expoGoConfig for embedded standalone app manifests.
  // Its presence does not identify Expo Go and must not suppress registration.
  if (Constants.appOwnership === 'expo' || !TurboModuleRegistry.get('AndroidWidget')) return null;
  return api ??= require('react-native-android-widget') as WidgetApi;
}
