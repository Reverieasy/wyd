const path = require('node:path');
require('@expo/env').loadProjectEnv(process.cwd(), { silent: true });
try {
  const config = require('@expo/config').getConfig(process.cwd(), { skipPlugins: true }).exp;
  const hasProject = Boolean(config.extra.eas?.projectId);
  const hasFirebase = Boolean(config.android.googleServicesFile);
  console.log('Expo project: ' + (hasProject ? 'linked' : 'missing — sign in with EAS and link this app'));
  console.log('Firebase Android file: ' + (hasFirebase ? 'valid for com.watchudoin.app' : 'missing — save it to .push/google-services.json'));
  console.log('Local push configuration: ' + (config.extra.pushNotifications.androidConfigured ? 'ready for a new Android build' : 'incomplete'));
  console.log('FCM V1 server credential: verify it is uploaded to this Expo project using EAS credentials.');
  console.log('Guide: ' + path.resolve('docs/BACKGROUND_NOTIFICATIONS.md'));
  process.exitCode = hasProject && hasFirebase ? 0 : 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
