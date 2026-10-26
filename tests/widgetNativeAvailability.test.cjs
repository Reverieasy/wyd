const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function harness(constants, nativeModule) {
  let imports = 0;
  const api = { registerWidgetTaskHandler() {} };
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/features/widgets/nativeWidgetApi.android.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, require(id) {
    if (id === 'expo-constants') return { __esModule: true, default: constants };
    if (id === 'react-native') return { TurboModuleRegistry: { get: () => nativeModule } };
    if (id === 'react-native-android-widget') { imports++; return api; }
    throw Error(id);
  } });
  return { get: module.exports.getWidgetApi, api, imports: () => imports };
}

test('SDK 57 standalone manifests with expoGoConfig still register their installed widget module', () => {
  const h = harness({ appOwnership: null, expoGoConfig: { name: 'watchu doin?', slug: 'wyd' } }, {});
  assert.equal(h.get(), h.api);
  assert.equal(h.get(), h.api);
  assert.equal(h.imports(), 1);
});

test('Expo Go and old builds never load the unavailable native widget library', () => {
  for (const h of [harness({ appOwnership: 'expo' }, {}), harness({ appOwnership: null, expoGoConfig: {} }, null)]) {
    assert.equal(h.get(), null);
    assert.equal(h.imports(), 0);
  }
});
