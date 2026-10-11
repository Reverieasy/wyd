# Environments

## Public client variables

- `EXPO_PUBLIC_APP_ENV`: `development`, `preview`, or `production`.
- `EXPO_PUBLIC_SUPABASE_URL`: HTTPS URL for the intended Supabase project.
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: public client key only.
- `EXPO_PUBLIC_SUPABASE_PROJECT_REF`: expected project reference; production startup rejects a mismatched URL.
- `EXPO_PUBLIC_EAS_PROJECT_ID`: linked Expo project ID used for EAS and push-token registration.

Values prefixed with `EXPO_PUBLIC_` are embedded in the app. Never put service-role keys, Expo access tokens, Firebase service-account credentials, signing credentials, or cleanup secrets in these variables.

## Server-only variables

Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions. `CLEANUP_CRON_SECRET` must be added as an Edge Function secret and sent only by the scheduled cleanup request.

## Build behavior

EAS profiles set the environment name and expected Supabase project reference. Production builds require the linked EAS project ID and should receive the publishable Supabase URL/key through the selected EAS environment. The app does not contain a fallback development backend.
