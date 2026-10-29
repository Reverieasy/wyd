const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const test = require('node:test');
const model = require('../src/features/widgets/widgetModel.ts');
const storeSource = fs.readFileSync('src/state/appStore.tsx','utf8');
const ast = ts.createSourceFile('appStore.tsx', storeSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let reducerSource, prepareSource;
(function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'reducer') reducerSource = node.getText(ast);
  if (ts.isPropertyAssignment(node) && node.name.getText(ast) === 'prepareWidgetReply') prepareSource = node.initializer.getText(ast);
  ts.forEachChild(node, visit);
})(ast);
function evaluate(code, context = {}) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { module, exports: module.exports, ...context });
  return module.exports;
}
function store() {
  const stateRef = { current: {
    server: { initializing: false, session: { user: { id: 'owner' } }, profile: { id: 'owner' }, connections: [{ connection: { status: 'accepted' }, person: { id: 'friend' } }] },
    local: { draft: { photo: { uri: 'old-photo' }, status: 'studying', recipientIds: ['other'], circleIds: ['circle'], caption: 'old caption', respondingToNudgeId: 'old-nudge', sending: false, sendStage: 'idle', clientRequestId: 'old-request', error: 'old-error' } },
  } };
  const events = [], sendingRef = { current: false };
  const reducer = evaluate(reducerSource + '\nmodule.exports = reducer;');
  const prepare = evaluate('module.exports = ' + prepareSource, { stateRef, sendingRef, dispatch(event) { events.push(event); stateRef.current = reducer(stateRef.current, event); } });
  return { stateRef, sendingRef, events, prepare, reducer };
}
test('Send yours addresses a fresh camera draft only to the selected person', () => {
  const h = store(); assert.equal(h.prepare('owner','friend'), true);
  const draft = h.stateRef.current.local.draft;
  assert.deepEqual([...draft.recipientIds], ['friend']); assert.deepEqual([...draft.circleIds], []);
  assert.equal(draft.photo, null); assert.equal(draft.status, null); assert.equal(draft.caption, '');
  assert.equal(draft.respondingToNudgeId, null); assert.equal(draft.clientRequestId, null); assert.equal(draft.sending, false);
  assert.deepEqual(h.events.map(e => e.type), ['PREPARE_WIDGET_REPLY']);
});
test('a stale account, removed connection, own person or active send cannot prepare a reply', () => {
  for (const scenario of ['account','removed','pending','self','sending','sending-ref']) {
    const h = store(); const state = h.stateRef.current;
    if (scenario === 'account') state.server.session.user.id = 'other-account';
    if (scenario === 'removed') state.server.connections = [];
    if (scenario === 'pending') state.server.connections[0].connection.status = 'pending';
    if (scenario === 'self') state.server.connections[0].person.id = 'owner';
    if (scenario === 'sending') state.local.draft.sending = true;
    if (scenario === 'sending-ref') h.sendingRef.current = true;
    const previous = JSON.stringify(state.local.draft);
    assert.equal(h.prepare('owner', scenario === 'self' ? 'owner' : 'friend'), false, scenario);
    assert.equal(JSON.stringify(h.stateRef.current.local.draft), previous); assert.equal(h.events.length, 0);
  }
  const h = store(); const before = h.stateRef.current;
  assert.equal(h.reducer(before, { type: 'PREPARE_WIDGET_REPLY', userId: 'other', personId: 'friend' }), before);
});
function route(store, params = { owner: 'owner', person: 'friend' }) {
  const slots = [], deps = [], effects = []; let cursor = 0;
  const mocks = {
    react: {
      useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
      useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = value; }]; },
      useEffect(run, next) { const i = cursor++; if (!deps[i] || next.some((v,j) => deps[i][j] !== v)) { deps[i] = next; effects.push(run); } },
    },
    'expo-router': { Redirect: 'Redirect', router: {}, useLocalSearchParams: () => params },
    'react-native': { ActivityIndicator: 'Spinner' },
    '@/src/components': Object.fromEntries(['Screen','FlowHeader','AppText','ActionButton'].map(n => [n,n])),
    '@/src/state/appStore': { useAppStore: () => ({ state: store.stateRef.current, actions: { prepareWidgetReply: store.prepare } }) },
    '@/src/theme/ThemeProvider': { useTheme: () => ({ colors: { background: { accent: '#7733FF' } } }) },
  };
  const Component = evaluate(fs.readFileSync('app/widget-reply.tsx','utf8'), { require: id => Object.hasOwn(mocks,id) ? mocks[id] : require(id) }).default;
  return () => { cursor = 0; const tree = Component(); effects.splice(0).forEach(run => run()); return tree; };
}
test('cold widget reply waits for hydration, prepares once, then opens the camera', () => {
  const h = store(); h.stateRef.current.server.initializing = true; h.stateRef.current.server.profile = null;
  const render = route(h); assert.notEqual(render().type, 'Redirect'); assert.equal(h.events.length, 0);
  h.stateRef.current.server.initializing = false; h.stateRef.current.server.profile = { id: 'owner' };
  render(); const ready = render(); assert.equal(ready.type, 'Redirect'); assert.equal(ready.props.href, '/(tabs)/camera');
  render(); assert.equal(h.events.length, 1);
});
test('invalid widget reply routes never navigate to the camera or alter the draft', () => {
  for (const params of [{ owner: 'other', person: 'friend' }, { owner: 'owner', person: 'removed' }, { owner: ['owner'], person: 'friend' }, {}]) {
    const h = store(); const render = route(h, params); render(); assert.notEqual(render().type, 'Redirect'); assert.equal(h.events.length, 0);
  }
});
test('widget reply URLs contain only encoded account and recipient context, and empty widgets open settings', () => {
  const uri = model.widgetReplyUri({ ...model.emptyWidget('waiting'), ownerId: 'owner/a', personId: 'friend&b' });
  assert.equal(uri, 'watchudoin://widget-reply?owner=owner%2Fa&person=friend%26b');
  for (const mode of ['setup','signed-out','unavailable']) assert.equal(model.widgetReplyUri(model.emptyWidget(mode)), 'watchudoin://widget-settings');
});
