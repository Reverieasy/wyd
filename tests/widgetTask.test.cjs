const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function source(file, mocks) {
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, setTimeout, clearTimeout, require: id => Object.hasOwn(mocks, id) ? mocks[id] : require(id) });
  return module.exports;
}
const model = source('src/features/widgets/widgetModel.ts', {});
const settle = () => new Promise(resolve => setImmediate(resolve));

function harness(send = async () => ({ id: 'nudge' }), sendPush = async () => undefined) {
  const renders = [], calls = [];
  const controls = { snapshot: { ...model.emptyWidget('waiting'), ownerId: 'owner', personId: 'friend', name: 'Friend' }, session: { user: { id: 'owner' } }, settings: { enabled: true, personId: 'friend' }, offline: false, cleared: 0 };
  const { widgetTaskHandler } = source('src/features/widgets/widgetTaskHandler.android.tsx', {
    '@/src/lib/supabase': { getSupabase: () => ({ auth: { getSession: async () => ({ data: { session: controls.session } }) } }) },
    '@/src/features/activity/nudgeService': { nudgeService: { async send(id) { calls.push(id); return send(); }, errorMessage: error => error.message } },
    '@/src/features/notifications/notificationService': { notificationService: { sendPush } },
    './MomentWidget.android': { MomentWidget: 'Widget' },
    './widgetData.android': { async loadWidgetSnapshot() { if (controls.offline) throw Error('offline'); return controls.snapshot; } },
    './widgetModel': model,
    './widgetAppearance': { readWidgetAppearance: async () => 'dark' },
    './widgetStorage': { widgetStorage: { getSettings: async () => controls.settings, async clearPhoto() { controls.cleared++; } } },
    './nativeWidgetApi.android': { getWidgetApi: () => ({ getWidgetInfo: async () => [] }) },
  });
  const props = { widgetInfo: { widgetName: 'WydMoment', widgetId: 1, width: 320, height: 145 }, widgetAction: 'WIDGET_CLICK', clickAction: 'NUDGE_PERSON', clickActionData: { ownerId: 'owner', personId: 'friend' }, renderWidget: element => renders.push(element.props) };
  return { run: overrides => widgetTaskHandler({ ...props, ...overrides }), controls, renders, calls };
}

test('widget Nudge sends to the selected person once and shows sending and success', async () => {
  const h = harness(); await h.run();
  assert.deepEqual(h.calls, ['friend']); assert.equal(h.renders[0].button, 'sending'); assert.equal(h.renders.at(-1).button, 'sent');
});

test('headless task shows nudge success immediately and stays alive until push delivery settles', async () => {
  let finishPush, finished = false;
  const h = harness(undefined, () => new Promise(resolve => { finishPush = resolve; }));
  const task = h.run().then(() => { finished = true; });
  await settle();
  assert.equal(h.renders.at(-1).button, 'sent');
  assert.equal(finished, false);
  finishPush();
  await task;
  assert.equal(finished, true);
});

test('a stale widget click cannot send to another account or a previous person', async () => {
  for (const data of [{ ownerId: 'other', personId: 'friend' }, { ownerId: 'owner', personId: 'previous' }]) {
    const h = harness(); await h.run({ clickActionData: data }); assert.equal(h.calls.length, 0);
  }
});

test('repeated clicks while a nudge is pending do not duplicate the request', async () => {
  let finish; const h = harness(() => new Promise(resolve => { finish = resolve; }));
  const first = h.run(); await settle(); await h.run(); assert.equal(h.calls.length, 1);
  finish({ id: 'nudge' }); await first;
});

test('disabling the widget during sending cannot repaint the previous private photo', async () => {
  let finish; const h = harness(() => new Promise(resolve => { finish = resolve; }));
  const task = h.run(); await settle(); h.controls.snapshot = model.emptyWidget();
  finish({ id: 'nudge' }); await task; assert.equal(h.renders.at(-1).snapshot.photoData, null); assert.equal(h.renders.at(-1).snapshot.personId, null);
});

test('offline refresh renders a placeholder instead of stale private data', async () => {
  const h = harness(); h.controls.offline = true; await h.run({ widgetAction: 'WIDGET_UPDATE' });
  assert.equal(h.renders.at(-1).snapshot.mode, 'unavailable'); assert.equal(h.calls.length, 0);
});

test('removing the last widget deletes its cached photo', async () => {
  const h = harness(); await h.run({ widgetAction: 'WIDGET_DELETED' }); assert.equal(h.controls.cleared, 1); assert.equal(h.renders.length, 0);
});
