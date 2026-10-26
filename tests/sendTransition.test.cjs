const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.join(__dirname, '..');
const settle = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }

// Execute the real store action with controlled network boundaries.
const source = fs.readFileSync(path.join(root, 'src/state/appStore.tsx'), 'utf8');
const ast = ts.createSourceFile('appStore.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let sendAction;
(function find(node) {
  if (ts.isPropertyAssignment(node) && node.name.getText(ast) === 'sendDraft') sendAction = node.initializer.getText(ast);
  ts.forEachChild(node, find);
})(ast);
assert.ok(sendAction);

function sendHarness({ responseNudgeId = null, sendError = null } = {}) {
  const uploaded = deferred(), feed = deferred(), activity = deferred(), nudge = deferred();
  const events = [];
  const state = { server: { profile: { id: 'owner' }, session: { user: { id: 'owner' } }, termsStatus: { acceptedAt: 'today' }, connections: [{ connection: { status: 'accepted' }, person: { id: 'friend' } }] }, local: { draft: { photo: { uri: 'file:///photo.jpg' }, recipientIds: ['friend'], caption: '', status: 'studying', sending: false, clientRequestId: null, respondingToNudgeId: responseNudgeId } } };
  const context = { state, stateRef: { current: state }, sendingRef: { current: false }, Crypto: { randomUUID: () => 'request' }, statusDetails: { studying: { label: 'Studying' } },
    dispatch(event) { events.push(event); },
    updateService: { async send() { events.push('upload'); await uploaded.promise; if (sendError) throw sendError; return { row: { id: 'saved', sender_id: 'owner', photo_path: 'owner/photo.jpg' }, photoUrl: 'https://example/photo' }; }, errorMessage: error => error.message },
    loadUpdates() { events.push('feed'); return feed.promise; }, loadActivity() { events.push('activity'); return activity.promise; },
    nudgeService: { markResponded() { events.push('nudge'); return nudge.promise; }, errorMessage: error => error.message },
    notificationService: { async sendPush() { events.push('push'); } }, async offerNotificationPrompt() {},
  };
  const output = ts.transpileModule(`module.exports = ${sendAction}`, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} }; vm.runInNewContext(output, { ...context, module });
  return { send: module.exports, uploaded, feed, activity, nudge, events, state };
}

test('successful send returns immediately after saving, without waiting for feed or activity refresh', async () => {
  const h = sendHarness(); const result = h.send();
  assert.equal(h.events.some(e => e.type === 'UPDATE_SENT'), false);
  h.uploaded.resolve();
  assert.equal(await Promise.race([result, settle().then(() => 'blocked')]), 'saved');
  assert.ok(h.events.some(e => e.type === 'UPDATE_SENT' && e.update.id === 'saved'));
  assert.ok(h.events.includes('feed')); assert.ok(h.events.includes('activity'));
  h.feed.resolve(); h.activity.resolve(); await settle();
});

test('answering a nudge updates activity after marking it responded without delaying Sent', async () => {
  const h = sendHarness({ responseNudgeId: 'nudge' }); const result = h.send(); h.uploaded.resolve();
  assert.equal(await Promise.race([result, settle().then(() => 'blocked')]), 'saved');
  assert.ok(h.events.includes('nudge')); assert.equal(h.events.includes('activity'), false);
  h.nudge.resolve(); await settle(); assert.ok(h.events.includes('activity'));
  h.feed.resolve(); h.activity.resolve(); await settle();
});

test('upload failure preserves the draft and never reports a successful send', async () => {
  const h = sendHarness({ sendError: new Error('Upload failed') }); const result = h.send(); h.uploaded.resolve();
  assert.equal(await result, null); assert.ok(h.state.local.draft.photo);
  assert.equal(h.events.some(e => e.type === 'UPDATE_SENT'), false);
  assert.ok(h.events.some(e => e.type === 'DRAFT_ERROR' && e.error === 'Upload failed'));
  assert.equal(h.events.includes('feed'), false);
});

test('duplicate taps cannot upload the same draft twice', async () => {
  const h = sendHarness(); const result = h.send(); assert.equal(await h.send(), null);
  assert.equal(h.events.filter(e => e === 'upload').length, 1);
  h.uploaded.resolve(); assert.equal(await result, 'saved'); h.feed.resolve(); h.activity.resolve(); await settle();
});

test('background refresh failure cannot turn a saved moment into a failed draft', async () => {
  const h = sendHarness(); const result = h.send(); h.uploaded.resolve(); assert.equal(await result, 'saved');
  h.feed.reject(new Error('Refresh failed')); h.activity.reject(new Error('Refresh failed')); await settle();
  assert.equal(h.events.some(e => e.type === 'DRAFT_ERROR'), false);
});

test('preview redirects to Sent instead of flashing the empty-camera screen after the draft clears', async () => {
  const hooks = []; let cursor = 0; const network = deferred(); const navigation = [];
  const state = { server: { connections: [], termsStatus: { acceptedAt: 'today' }, lastSentUpdateId: null }, local: { draft: { photo: { uri: 'file:///photo.jpg' }, recipientIds: [], sending: false, caption: '' } } };
  const theme = { colors: { text: { heading: '', secondary: '' }, background: { card: '', accent: '' }, border: { default: '' } } };
  const mocks = {
    react: { ...require('react'), useState(initial) { const i = cursor++; if (!(i in hooks)) hooks[i] = initial; return [hooks[i], value => { hooks[i] = value; }]; }, useRef(initial) { const i = cursor++; return hooks[i] ??= { current: initial }; } },
    'react-native': { Pressable: 'Pressable', View: 'View', StyleSheet: { create: v => v } },
    'expo-router': { Redirect: 'Redirect', router: { replace: href => navigation.push(href) } },
    '@expo/vector-icons/MaterialIcons': { __esModule: true, default: 'Icon' },
    '@/src/components': Object.fromEntries(['ActionButton', 'AppText', 'Avatar', 'FlowHeader', 'MomentPhoto', 'Screen', 'StatusChip', 'TextField'].map(name => [name, name])),
    '@/src/theme/ThemeProvider': { useThemeStyles: factory => ({ ...theme, styles: factory(theme) }) },
    '@/src/state/appStore': { statusDetails: { studying: { symbol: '', label: '' }, chilling: { symbol: '', label: '' }, working: { symbol: '', label: '' } }, useAppStore: () => ({ state, actions: { sendDraft: () => network.promise } }) },
  };
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(path.join(root, 'app/(flows)/preview.tsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, require: id => Object.hasOwn(mocks, id) ? mocks[id] : require(id) });
  const render = () => { cursor = 0; return module.exports.default(); };
  render().props.children.find(node => node?.type === 'ActionButton').props.onPress();
  state.local.draft.photo = null; state.server.lastSentUpdateId = 'saved';
  const transition = render(); assert.equal(transition.type, 'Redirect'); assert.equal(transition.props.href, '/(flows)/sent');
  network.resolve('saved'); await settle(); assert.deepEqual(navigation, ['/(flows)/sent']);
});
