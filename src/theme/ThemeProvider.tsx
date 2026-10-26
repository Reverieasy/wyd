import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { colors as lightColors, gradients as lightGradients } from './colors';

export type ThemeColors = { [K in keyof typeof lightColors]: { [P in keyof typeof lightColors[K]]: string } };
export type ThemeGradients = { [K in keyof typeof lightGradients]: readonly [string, string] };
export type Theme = { colors: ThemeColors; gradients: ThemeGradients; isDark: boolean };
type Mode = 'light' | 'dark' | 'system';
const KEY = 'wyd.appearance.v1';
const darkColors: ThemeColors = {
  background: { app: '#141119', card: '#211B29', subtle: '#2B2334', accent: '#B394FF', accentSoft: '#362447', loveSoft: '#452537', camera: '#121214', cameraPreview: '#2B2B30' },
  text: { primary: '#F5EFFB', secondary: '#B5A9C0', heading: '#E2CEFF', onAccent: '#FFFFFF', onCameraMuted: '#B6B0B2' },
  border: { default: '#44384E', selected: '#B394FF' },
  brand: { ink: '#F5EFFB', muted: '#C0AECF', dark: '#17131F', light: '#FFF8F1' },
};
const light: Theme = { colors: lightColors, gradients: lightGradients, isDark: false };
const dark: Theme = { colors: darkColors, gradients: { action: ['#6C2CF5', '#8553AD'], title: ['#BD9CFF', '#E6BBD5'], soft: ['#362447', '#302338'] }, isDark: true };
const ThemeContext = createContext({ ...dark, mode: 'dark' as Mode, setMode: (_mode: Mode) => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const [mode, updateMode] = useState<Mode>('dark');
  const changed = useRef(false);
  const writes = useRef(Promise.resolve());
  useEffect(() => { void AsyncStorage.getItem(KEY).then(value => {
    if (!changed.current && (value === 'light' || value === 'dark' || value === 'system')) updateMode(value);
  }).catch(() => undefined); }, []);
  const isDark = mode === 'dark' || (mode === 'system' && scheme === 'dark');
  const value = useMemo(() => ({ ...(isDark ? dark : light), mode, setMode: (next: Mode) => {
    changed.current = true;
    updateMode(next);
    writes.current = writes.current.then(() => AsyncStorage.setItem(KEY, next)).catch(() => undefined);
  } }), [isDark, mode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
export function useThemeStyles<T>(factory: (theme: Theme) => T) {
  const theme = useTheme();
  const styles = useMemo(() => factory(theme), [factory, theme.colors, theme.gradients]);
  return { ...theme, styles };
}
