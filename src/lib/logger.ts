type LogDetails = Record<string, boolean | number | string | null | undefined>;

function sanitize(details?: LogDetails) {
  if (!details) return undefined;
  return Object.fromEntries(
    Object.entries(details).filter(([key]) => !/caption|email|name|photo|token|url/i.test(key)),
  );
}

export const logger = {
  error(scope: string, error: unknown, details?: LogDetails) {
    if (!__DEV__) return;
    const summary = error instanceof Error ? error.message : String(error);
    console.error(`[${scope}]`, summary, sanitize(details));
  },
  warn(scope: string, details?: LogDetails) {
    if (!__DEV__) return;
    console.warn(`[${scope}]`, sanitize(details));
  },
};
