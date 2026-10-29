const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
function harness() {
  const values = new Map();
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync('src/features/onboarding/firstFriendCelebration.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, require: id => id === './firstUseProgress' ? require('../src/features/onboarding/firstUseProgress.ts') : { __esModule: true, default: { getItem: async key => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); } } } });
  return { observe: module.exports.firstFriendCelebration.observe, values };
}
test('first accepted friend celebrates once, including concurrent refreshes and later reconnects', async () => {
  const h = harness(); assert.equal(await h.observe('a', false), false);
  assert.deepEqual(await Promise.all([h.observe('a', true), h.observe('a', true)]), [true, false]);
  assert.equal(await h.observe('a', false), false); assert.equal(await h.observe('a', true), false);
});
test('opening an account that already has friends does not celebrate', async () => {
  const h = harness(); assert.equal(await h.observe('existing', true), false);
  h.values.set('wyd.first-use.v1:older', JSON.stringify({ connected: true }));
  assert.equal(await h.observe('older', false), false); assert.equal(await h.observe('older', true), false);
});
test('accounts have separate milestones and pending requests do not trigger them', async () => {
  const h = harness(); await h.observe('a', false); await h.observe('b', false);
  assert.equal(await h.observe('a', false), false); assert.equal(await h.observe('a', true), true);
  assert.equal(await h.observe('b', true), true);
});
