import type { ConfigContext, ExpoConfig } from 'expo/config';
const { configureProjectPush } = require('./scripts/push-config.cjs');

export default ({ config }: ConfigContext): ExpoConfig => {
  return configureProjectPush({
    ...config,
    name: config.name ?? 'watchudoin?',
    slug: config.slug ?? 'wyd',
  }, process.env);
};
