const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks = {}) {
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, require: id => Object.hasOwn(mocks, id) ? mocks[id] : require(id) });
  return module.exports;
}
const model = load('src/features/widgets/widgetModel.ts');
const settle = () => new Promise(resolve => setImmediate(resolve));
function harness(available = true, appearance = 'dark') {
  const rendered = [], representations = []; let cleared = 0, loadCalls = 0, resolveSnapshot;
  const snapshot = { ...model.emptyWidget('moment'), ownerId: 'owner', personId: 'friend', updateId: 'moment', photoData: 'private photo', expiresAt: new Date(Date.now() + 60_000).toISOString() };
  const pendingSnapshot = new Promise(resolve => { resolveSnapshot = resolve; });
  const api = { getWidgetInfo: async () => [{ widgetId: 1 }], requestPinWidget: async () => true, async requestWidgetUpdateById(options) { const view = await options.renderWidget({ width: 320, height: 145 }); representations.push(view); rendered.push((view.dark ?? view).props.snapshot); } };
  const { widgetService } = load('src/features/widgets/widgetService.android.ts', {
    './nativeWidgetApi.android': { getWidgetApi: () => available ? api : null },
    './widgetData.android': { loadWidgetSnapshot: () => { loadCalls++; return pendingSnapshot; } },
    './widgetModel': model,
    './widgetAppearance': { readWidgetAppearance: async () => appearance },
    './widgetStorage': { widgetStorage: { async getSettings() { return { enabled: false, personId: null }; }, async saveSettings() {}, async clearPhoto() { cleared++; } } },
    ...(available ? { './MomentWidget.android': { MomentWidget: 'Widget' } } : {}),
  });
  return { service: widgetService, rendered, representations, finish: () => resolveSnapshot(snapshot), cleared: () => cleared, loadCalls: () => loadCalls };
}

test('Expo Go and older builds never import or invoke the missing native widget renderer', async () => {
  const h = harness(false); assert.equal(h.service.isAvailable(), false);
  await h.service.refresh(); await h.service.clear(); assert.equal(await h.service.addToHomeScreen(), false);
  assert.equal(h.loadCalls(), 0); assert.equal(h.cleared(), 1);
});

test('System appearance supplies native day and night variants, including redaction on logout', async () => {
  const h = harness(true, 'system'); h.finish(); await h.service.refresh();
  assert.equal(h.representations.at(-1).light.props.isDark, false);
  assert.equal(h.representations.at(-1).dark.props.isDark, true);
  await h.service.clear();
  for (const variant of Object.values(h.representations.at(-1))) assert.equal(variant.props.snapshot.photoData, null);
});
test('an explicit app appearance overrides the phone theme for the widget', async () => {
  for (const appearance of ['dark', 'light']) {
    const h = harness(true, appearance); h.finish(); await h.service.refresh();
    assert.equal(h.representations.at(-1).props.isDark, appearance === 'dark');
  }
});

test('logout redacts a photo refresh that was already in flight', async () => {
  const h = harness(); const refreshing = h.service.refresh(); await settle(); assert.equal(h.loadCalls(), 1);
  await h.service.clear(); h.finish(); await refreshing;
  assert.ok(h.rendered.length >= 2); assert.ok(h.rendered.every(snapshot => snapshot.photoData === null));
});

test('disabling clears widgets immediately without waiting for a slow earlier refresh', async () => {
  const h = harness(); const refreshing = h.service.refresh(); await settle();
  const disabled = h.service.saveSettings('owner', { enabled: false, personId: 'friend' });
  assert.notEqual(await Promise.race([disabled.then(() => 'cleared'), settle().then(() => 'blocked')]), 'blocked');
  assert.equal(h.rendered.at(-1).mode, 'setup'); h.finish(); await refreshing;
  assert.equal(h.rendered.at(-1).photoData, null);
});

test('pinning reports whether the native launcher accepted the request', async () => {
  const h = harness(); assert.equal(await h.service.addToHomeScreen(), true);
});

test('enabling acknowledges the saved preference without waiting for a photo download', async () => {
  const h = harness();
  const saving = h.service.saveSettings('owner', { enabled: true, personId: 'friend' });
  assert.equal(await Promise.race([saving.then(() => 'saved'), settle().then(() => 'blocked')]), 'saved');
  await settle();
  assert.equal(h.loadCalls(), 1);
  h.finish();
  await h.service.refresh();
  assert.equal(h.rendered.at(-1).personId, 'friend');
});
