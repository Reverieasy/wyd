const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { patchRenderer, removeImageProvider } = require('../plugins/withPrivateWidgetImages');

const dependencyRoot = path.dirname(require.resolve('react-native-android-widget/package.json'));
const renderer = fs.readFileSync(path.join(dependencyRoot, 'android/src/main/java/com/reactnativeandroidwidget/RNWidget.java'), 'utf8');

test('native widget uses direct bitmaps for light, dark and fallback rendering without a shared image URI', () => {
  const result = patchRenderer(renderer);
  assert.equal((result.match(/remoteWidgetView\.setImageViewBitmap\(/g) ?? []).length, 3);
  assert.equal(/setImageViewUri\(|saveBitmapToDisk\(widgetId,/.test(result), false);
  assert.equal(patchRenderer(result), result);
});

test('native renderer changes fail prebuild instead of silently reintroducing the image provider', () => {
  assert.throws(() => patchRenderer(renderer.replaceAll('rn_widget_image_light', 'changed_light_image')), /renderer changed/);
});

test('manifest removes the unprotected widget image provider and preserves other providers', () => {
  const manifest = { manifest: { $: {}, application: [{ $: { 'android:name': '.MainApplication' }, provider: [
    { $: { 'android:name': 'com.reactnativeandroidwidget.RNWidgetImageProvider', 'android:exported': 'true' } },
    { $: { 'android:name': 'private-avatar-provider', 'android:exported': 'false' } },
  ] }] } };
  removeImageProvider(manifest);
  removeImageProvider(manifest);
  const providers = manifest.manifest.application[0].provider;
  assert.equal(providers.length, 2);
  assert.equal(providers.find(provider => provider.$['android:name'] === 'com.reactnativeandroidwidget.RNWidgetImageProvider').$['tools:node'], 'remove');
  assert.equal(providers.find(provider => provider.$['android:name'] === 'private-avatar-provider').$['android:exported'], 'false');
});
