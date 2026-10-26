const fs = require('node:fs/promises');
const path = require('node:path');
const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

// react-native-android-widget 0.22.1 normally exposes rendered widget images
// through an exported, unprotected content provider. Our small, non-collection
// widget can use Android's RemoteViews bitmap transport without that provider.
function patchRenderer(source) {
  const replacements = [
    [/Uri bitmapUri = saveBitmapToDisk\(widgetId, "light", bitmap\);\s*remoteWidgetView\.setImageViewUri\(R\.id\.rn_widget_image_light, bitmapUri\);/, 'remoteWidgetView.setImageViewBitmap(R.id.rn_widget_image_light, bitmap);'],
    [/Uri darkBitmapUri = saveBitmapToDisk\(widgetId, "dark", darkBitmap\);\s*remoteWidgetView\.setImageViewUri\(R\.id\.rn_widget_image_dark, darkBitmapUri\);/, 'remoteWidgetView.setImageViewBitmap(R.id.rn_widget_image_dark, darkBitmap);'],
    [/remoteWidgetView\.setImageViewUri\(R\.id\.rn_widget_image_dark, bitmapUri\);/, 'remoteWidgetView.setImageViewBitmap(R.id.rn_widget_image_dark, bitmap);'],
  ];
  let result = source;
  for (const [pattern, replacement] of replacements) {
    if (pattern.test(result)) result = result.replace(pattern, replacement);
    else if (!result.includes(replacement)) throw new Error('Widget renderer changed; review the private bitmap transport before building.');
  }
  if (/setImageViewUri\(|saveBitmapToDisk\(widgetId,/.test(result)) throw new Error('Widget renderer still uses the public image provider.');
  return result;
}

function removeImageProvider(manifest) {
  manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
  const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
  const name = 'com.reactnativeandroidwidget.RNWidgetImageProvider';
  app.provider = (app.provider ?? []).filter(provider => provider.$['android:name'] !== name);
  app.provider.push({ $: { 'android:name': name, 'tools:node': 'remove' } });
  return manifest;
}

function withPrivateWidgetImages(config) {
  config = withAndroidManifest(config, mod => {
    mod.modResults = removeImageProvider(mod.modResults);
    return mod;
  });
  return withDangerousMod(config, ['android', async mod => {
    const packageFile = require.resolve('react-native-android-widget/package.json', { paths: [mod.modRequest.projectRoot] });
    const dependency = JSON.parse(await fs.readFile(packageFile, 'utf8'));
    if (dependency.version !== '0.22.1') throw new Error('Review private widget images before upgrading react-native-android-widget.');
    const renderer = path.join(path.dirname(packageFile), 'android/src/main/java/com/reactnativeandroidwidget/RNWidget.java');
    const original = await fs.readFile(renderer, 'utf8');
    const patched = patchRenderer(original);
    if (patched !== original) await fs.writeFile(renderer, patched);
    return mod;
  }]);
}

module.exports = withPrivateWidgetImages;
module.exports.patchRenderer = patchRenderer;
module.exports.removeImageProvider = removeImageProvider;
