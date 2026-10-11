# Observability Strategy

- Development builds use the sanitized `src/lib/logger.ts` console adapter.
- Production user messages are mapped to network, permission, authentication, validation, unavailable-content, and temporary-error categories.
- Edge Function failures are available in Supabase server logs; push delivery status is recorded without captions, photo URLs, or access tokens.
- No third-party crash-reporting SDK is installed. Choose and review one before broader production rollout if operational needs justify sending diagnostics to another provider.
- Never log passwords, access/refresh tokens, signed URLs, private photo paths, captions, report details, or support-request text.
- Incident reports should record build version, device/Android version, timestamps, route, and non-sensitive error code.
