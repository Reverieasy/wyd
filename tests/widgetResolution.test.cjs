const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { resolve } = require('metro-resolver');

const widgets = path.resolve(__dirname, '../src/features/widgets');
const context = {
  originModulePath: path.join(widgets, 'WidgetCoordinator.tsx'),
  sourceExts: ['js', 'jsx', 'json', 'ts', 'tsx'],
  preferNativePlatform: true,
  mainFields: ['react-native', 'browser', 'main'],
  getPackageForModule: () => null,
  isAssetFile: () => false,
  fileSystemLookup(file) {
    if (!fs.existsSync(file)) return { exists: false };
    return { exists: true, type: fs.statSync(file).isDirectory() ? 'd' : 'f', realPath: fs.realpathSync(file) };
  },
};

test('Metro loads the native widget service for the actual Android app imports', () => {
  assert.equal(resolve(context, './widgetService', 'android').filePath, path.join(widgets, 'widgetService.android.ts'));
});

test('Metro keeps the unsupported widget fallback on web and iOS', () => {
  for (const platform of ['web', 'ios']) {
    assert.equal(resolve(context, './widgetService', platform).filePath, path.join(widgets, 'widgetService.ts'));
  }
});
