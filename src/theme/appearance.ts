export type AppearanceMode = 'light' | 'dark' | 'system';
export const APPEARANCE_STORAGE_KEY = 'wyd.appearance.v1';
export function parseAppearance(value: unknown): AppearanceMode {
  return value === 'light' || value === 'system' ? value : 'dark';
}
