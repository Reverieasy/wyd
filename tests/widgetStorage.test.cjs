const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const test = require('node:test');
const model = require('../src/features/widgets/widgetModel.ts');
function harness() {
  const values = new Map(); const module = { exports: {} };
  const storage = { getItem: async key => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); }, removeItem: async key => { values.delete(key); } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/widgets/widgetStorage.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    module, exports: module.exports, require: id => id === './widgetModel' ? model : { __esModule: true, default: storage },
  });
  return { values, storage: module.exports.widgetStorage };
}
test('old styles migrate to the new sizes while preserving the person and enabled setting', async () => {
  const h = harness(); h.values.set('wyd.widget.settings.v1:owner', JSON.stringify({ enabled: true, personId: 'friend' }));
  assert.equal((await h.storage.getSettings('owner')).design, 'small');
  for (const [design, expected] of [['portrait', 'small'], ['wide', 'medium'], ['reactions', 'large']]) {
    h.values.set('wyd.widget.settings.v1:owner', JSON.stringify({ enabled: true, personId: 'friend', design }));
    const saved = await h.storage.getSettings('owner');
    assert.equal(saved.design, expected); assert.equal(saved.personId, 'friend'); assert.equal(saved.enabled, true);
  }
  for (const design of model.widgetDesigns) {
    await h.storage.saveSettings('owner', { enabled: true, personId: 'friend', design });
    assert.equal((await h.storage.getSettings('owner')).design, design);
    assert.equal((await h.storage.getSettings('other')).design, 'small');
  }
  h.values.set('wyd.widget.settings.v1:owner', JSON.stringify({ design: 'old-or-invalid' }));
  assert.equal((await h.storage.getSettings('owner')).design, 'small');
});
test('clearing removes both old and new private thumbnail caches', async () => {
  const h = harness(); h.values.set('wyd.widget.photo.v1','old photo'); h.values.set('wyd.widget.photo.v2','new photo');
  await h.storage.clearPhoto(); assert.equal(h.values.size, 0);
});
