import { ServiceError } from './serviceError';

export type AppEnvironment = 'development' | 'preview' | 'production';

const rawEnvironment = process.env.EXPO_PUBLIC_APP_ENV?.trim();
export const appEnvironment: AppEnvironment = rawEnvironment === 'production' || rawEnvironment === 'preview'
  ? rawEnvironment
  : 'development';

export const environment = {
  app: appEnvironment,
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL?.trim(),
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim(),
  supabaseProjectRef: process.env.EXPO_PUBLIC_SUPABASE_PROJECT_REF?.trim(),
};

export function validatePublicEnvironment() {
  if (!environment.supabaseUrl || !environment.supabasePublishableKey) return;
  let host: string;
  try { host = new URL(environment.supabaseUrl).host; }
  catch { throw new ServiceError('The app service configuration is invalid.', 'invalid_environment'); }
  if (!environment.supabaseUrl.startsWith('https://') || !host.endsWith('.supabase.co')) {
    throw new ServiceError('The app service configuration is invalid.', 'invalid_environment');
  }
  if (appEnvironment === 'production' && (!environment.supabaseProjectRef || host !== `${environment.supabaseProjectRef}.supabase.co`)) {
    throw new ServiceError('The production service configuration does not match this build.', 'invalid_environment');
  }
}
