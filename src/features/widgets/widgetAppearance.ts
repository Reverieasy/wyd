import AsyncStorage from '@react-native-async-storage/async-storage';
import { APPEARANCE_STORAGE_KEY, parseAppearance } from '@/src/theme/appearance';

export async function readWidgetAppearance() {
  try { return parseAppearance(await AsyncStorage.getItem(APPEARANCE_STORAGE_KEY)); }
  catch { return 'dark' as const; }
}
