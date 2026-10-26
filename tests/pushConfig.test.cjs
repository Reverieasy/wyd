const assert = require('node:assert/strict');
const test = require('node:test');
const { configurePush } = require('../scripts/push-config.cjs');
const config = { android: { package: 'com.watchudoin.app' }, extra: { existing: true } };
const projectId = '12345678-1234-1234-1234-123456789abc';
const firebase = { project_info: { project_id: 'test-project', project_number: '123' }, client: [{ client_info: { mobilesdk_app_id: '1:123:android:test', android_client_info: { package_name: 'com.watchudoin.app' } } }] };
const files = value => ({ exists: () => Boolean(value), read: () => value });

test('missing push credentials keep the app working with in-app alerts', () => {
  const result = configurePush(config, {}, files(null));
  assert.equal(result.extra.pushNotifications.androidConfigured, false);
  assert.equal(result.extra.existing, true);
  assert.equal(result.android.googleServicesFile, undefined);
});
test('Android push needs both the Expo project and the correct Firebase Android client', () => {
  assert.equal(configurePush(config, {}, files(firebase)).extra.pushNotifications.androidConfigured, false);
  const result = configurePush(config, { EXPO_PUBLIC_EAS_PROJECT_ID: projectId }, files(firebase));
  assert.equal(result.extra.pushNotifications.androidConfigured, true);
  assert.equal(result.extra.eas.projectId, projectId);
  assert.equal(result.android.googleServicesFile, '.push/google-services.json');
  assert.equal(JSON.stringify(result).includes('mobilesdk_app_id'), false);
});
test('wrong package, missing files, malformed IDs, and private keys fail before a bad APK is built', () => {
  assert.throws(() => configurePush(config, { EXPO_PUBLIC_EAS_PROJECT_ID: 'app-name' }, files(firebase)), /UUID/);
  assert.throws(() => configurePush(config, { GOOGLE_SERVICES_JSON: 'missing.json' }, files(null)), /does not exist/);
  assert.throws(() => configurePush(config, {}, files({ project_info: firebase.project_info, client: [] })), /com.watchudoin.app/);
  assert.throws(() => configurePush(config, {}, files({ type: 'service_account', private_key: 'private' })), /not a private/);
});
test('EAS file environment variables and already linked project IDs are supported', () => {
  const result = configurePush({ ...config, extra: { eas: { projectId } } }, { GOOGLE_SERVICES_JSON: '/build/firebase-config' }, files(firebase));
  assert.equal(result.android.googleServicesFile, '/build/firebase-config');
  assert.equal(result.extra.pushNotifications.androidConfigured, true);
});

test('the actual Expo config resolves the same Firebase and push settings as the validated helper', () => {
  const fs = require('node:fs');
  const actual = require('@expo/config').getConfig(process.cwd(), { skipPlugins: true }).exp;
  const expected = configurePush(require('../app.json').expo, process.env, { exists: fs.existsSync, read: file => JSON.parse(fs.readFileSync(file, 'utf8')) });
  assert.equal(actual.android.googleServicesFile, expected.android.googleServicesFile);
  assert.equal(actual.extra.pushNotifications?.androidConfigured, expected.extra.pushNotifications.androidConfigured);
  assert.equal(actual.extra.eas?.projectId, expected.extra.eas?.projectId);
});
