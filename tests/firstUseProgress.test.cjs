const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const model = require('../src/features/onboarding/firstUseProgress.ts');
test('onboarding advances by outcomes and never loses completed outcomes when photos expire', () => {
  let progress = { ...model.emptyFirstUseProgress };
  assert.equal(model.firstUseStep(progress), 'connect');
  progress = model.advanceFirstUseProgress(progress, { connected: true }); assert.equal(model.firstUseStep(progress), 'moment');
  progress = model.advanceFirstUseProgress(progress, { firstMoment: true }); assert.equal(model.firstUseStep(progress), 'widget');
  progress = model.advanceFirstUseProgress(progress, { firstMoment: false, connected: false }); assert.equal(model.firstUseStep(progress), 'widget');
  progress = model.advanceFirstUseProgress(progress, { widgetAdded: true }); assert.equal(model.firstUseStep(progress), 'done');
  assert.equal(model.firstUseStep(model.parseFirstUseProgress(JSON.stringify(progress))), 'done');
});
test('concurrent progress saves merge without losing outcomes and remain scoped to the account', async () => {
  const data = new Map(); const module = { exports: {} };
  const storage = { getItem: async key => data.get(key) ?? null, setItem: async (key, value) => { data.set(key,value); } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/onboarding/firstUseStorage.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module, exports: module.exports, require: id => id === './firstUseProgress' ? model : { __esModule: true, default: storage } });
  const save = module.exports.firstUseStorage.record;
  await Promise.all([save('a',{ connected: true }), save('a',{ firstMoment: true }), save('b',{ connected: true })]);
  assert.equal(model.firstUseStep(await save('a',{})), 'widget'); assert.equal(model.firstUseStep(await save('b',{})), 'moment');
  assert.equal((await save('a',{ dismissed: true })).dismissed, true);
  assert.equal((await save('a',{})).dismissed, true); assert.equal((await save('b',{})).dismissed, false);
});
