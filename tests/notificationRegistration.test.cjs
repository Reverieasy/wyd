const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
function harness(configured = true) {
  const calls = []; let tokenListener, handler, removed = false;
  const projectId = '12345678-1234-1234-1234-123456789abc';
  const native = {
    AndroidImportance: { HIGH: 4 }, setNotificationHandler: value => { handler = value; },
    async setNotificationChannelAsync(id, config) { calls.push(['channel', id, config.importance]); },
    async getPermissionsAsync() { calls.push(['getPermission']); return { granted: true }; },
    async requestPermissionsAsync() { calls.push(['requestPermission']); return { granted: true }; },
    async getExpoPushTokenAsync(options) { calls.push(['token', options.projectId]); return { data: 'ExponentPushToken[test]' }; },
    addPushTokenListener(fn) { tokenListener = fn; return { remove() { removed = true; } }; },
  };
  const mocks = {
    'expo-constants': { __esModule: true, default: { expoConfig: { extra: { eas: { projectId }, pushNotifications: { androidConfigured: configured } } } } },
    'expo-device': { isDevice: true }, 'expo-notifications': native,
    'react-native': { Platform: { OS: 'android' }, Linking: {} },
    '@/src/lib/supabase': {}, './notificationTypes': {},
  };
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('src/features/notifications/notificationService.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, process: { env: {} }, require: id => mocks[id] });
  return { service: module.exports.notificationService, calls, handler: () => handler, emitToken: () => tokenListener({ type: 'android', data: 'rotated-device-token' }), removed: () => removed };
}
test('an incomplete Firebase build never asks for unusable phone notification permission', async () => {
  const h = harness(false);
  assert.equal(await h.service.permissionState(), 'unavailable');
  assert.equal(await h.service.requestPermission(), 'unavailable');
  await assert.rejects(h.service.getExpoPushToken(), /Firebase is not configured/);
  assert.equal(h.calls.length, 0);
});
test('the Android high-importance channel exists before notification permission is requested', async () => {
  const h = harness(); assert.equal(await h.service.requestPermission(), 'granted');
  assert.deepEqual(h.calls, [['channel', 'watchudoin-updates', 4], ['requestPermission']]);
  assert.equal(await h.service.getExpoPushToken(), 'ExponentPushToken[test]');
  assert.equal(h.calls.at(-1)[1], '12345678-1234-1234-1234-123456789abc');
});
test('device-token changes request re-registration and the listener is cleaned up', () => {
  const h = harness(); let count = 0;
  const stop = h.service.listenForTokenChanges(() => count++);
  h.emitToken(); assert.equal(count, 1);
  stop(); assert.equal(h.removed(), true);
});
test('foreground push receipt leaves presentation to the in-app activity banner', async () => {
  const h = harness(); const presentation = await h.handler().handleNotification();
  assert.equal(presentation.shouldShowBanner, false);
  assert.equal(presentation.shouldShowList, false);
  assert.equal(presentation.shouldPlaySound, false);
});
