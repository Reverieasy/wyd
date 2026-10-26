import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

export async function setWindowBackground(color: string) {
  // Hot reloads into older installed builds must not import a missing module.
  if (Platform.OS !== 'web' && !requireOptionalNativeModule('ExpoSystemUI')) return;
  const ui = require('expo-system-ui') as typeof import('expo-system-ui');
  await ui.setBackgroundColorAsync(color);
}
