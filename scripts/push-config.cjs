// Firebase files stay local or in EAS file environment variables. Never embed a
// service-account key in the app: Expo keeps that credential on its push server.
function configurePush(config, env, files) {
  const projectId = (env.EXPO_PUBLIC_EAS_PROJECT_ID || config.extra?.eas?.projectId || '').trim();
  if (projectId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) throw Error('EXPO_PUBLIC_EAS_PROJECT_ID must be your Expo project UUID.');
  const explicitFile = env.GOOGLE_SERVICES_JSON || config.android?.googleServicesFile;
  const googleServicesFile = explicitFile || (files.exists('.push/google-services.json') ? '.push/google-services.json' : undefined);
  if (googleServicesFile) {
    if (!files.exists(googleServicesFile)) throw Error('The configured GOOGLE_SERVICES_JSON file does not exist.');
    const firebase = files.read(googleServicesFile);
    if (firebase.type === 'service_account' || firebase.private_key) throw Error('Use google-services.json here, not a private service-account key.');
    const client = firebase.client?.find(item => item.client_info?.android_client_info?.package_name === config.android?.package);
    if (!firebase.project_info?.project_number || !firebase.project_info?.project_id || !client?.client_info?.mobilesdk_app_id) throw Error('Firebase must contain an Android app registered as ' + config.android?.package + '.');
  }
  return {
    ...config,
    android: { ...config.android, ...(googleServicesFile ? { googleServicesFile } : {}) },
    extra: {
      ...config.extra,
      ...(projectId ? { eas: { ...config.extra?.eas, projectId } } : {}),
      pushNotifications: { androidConfigured: Boolean(projectId && googleServicesFile) },
    },
  };
}
function configureProjectPush(config, env) {
  const fs = require('node:fs'), path = require('node:path');
  const root = path.resolve(__dirname, '..');
  return configurePush(config, env, {
    exists: file => fs.existsSync(path.resolve(root, file)),
    read: file => JSON.parse(fs.readFileSync(path.resolve(root, file), 'utf8')),
  });
}
module.exports = { configurePush, configureProjectPush };
