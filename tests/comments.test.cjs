const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks) {
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, Error, require: id => Object.hasOwn(mocks, id) ? mocks[id] : require(id) });
  return module.exports;
}
function service(rpc) {
  return load('src/features/comments/commentService.ts', {
    '@/src/lib/supabase': { getSupabase: () => ({ rpc, from: () => ({ select: () => ({ in: async () => ({ data: [] }) }) }) }) },
    '@/src/lib/serviceError': { ServiceError: class extends Error { constructor(message, code) { super(message); this.code = code; } }, readableServiceError: e => e },
    '@/src/features/profiles/profileService': { mapProfile: row => ({ avatarUrl: row.avatar_path }) },
  });
}
test('comments reject blank and oversized text while accepting 500 emoji characters', async () => {
  const { validateComment, commentService } = service(() => { throw Error('Invalid input reached network'); });
  assert.equal(validateComment('  Hi!  '), 'Hi!');
  assert.equal(validateComment('💜'.repeat(500)), '💜'.repeat(500));
  for (const text of [' ', '\n\t', 'x'.repeat(501)]) await assert.rejects(commentService.add('moment', text, 'request'), /between 1 and 500/);
});
test('comment pages use a timestamp and ID cursor without dropping same-time rows', async () => {
  const calls = [];
  const rows = Array.from({ length: 31 }, (_, i) => ({ id: String(i), update_id: 'moment', user_id: 'author', body: 'hello', created_at: '2026-10-26T00:00:00Z', display_name: 'Ara', username: 'ara' }));
  const { commentService } = service(async (name, args) => { calls.push({ name, args }); return { data: rows }; });
  const first = await commentService.list('moment');
  assert.equal(first.items.length, 30); assert.equal(first.hasMore, true); assert.equal(first.cursor.id, '29');
  await commentService.list('moment', first.cursor);
  assert.equal(calls[1].args.p_before_id, '29'); assert.equal(calls[1].args.p_before_created_at, rows[0].created_at);
});
test('posting retains its retry key and the server sets the author', async () => {
  const calls = [];
  const { commentService } = service(async (name, args) => { calls.push({ name, args }); return { data: 'request' }; });
  await commentService.add('moment', ' hello ', 'request');
  await commentService.add('moment', ' hello ', 'request');
  assert.deepEqual(calls.map(x => x.args.p_id), ['request', 'request']);
  assert.equal(calls[0].args.p_body, 'hello'); assert.equal(Object.hasOwn(calls[0].args, 'user_id'), false);
});
test('comment permission errors give a useful message without an unexpected service error', async () => {
  const { commentService } = service(async () => ({ error: { message: 'comment_moment_unavailable' } }));
  await assert.rejects(commentService.list('hidden'), /no longer available/);
});

function ui(t, overrides = {}) {
  const hooks = [];
  let cursor = 0, effects = [], uuid = 0;
  const react = {
    useRef(initial) { const i = cursor++; return hooks[i] ??= { current: initial }; },
    useState(initial) { const i = cursor++; if (!(i in hooks)) hooks[i] = initial; return [hooks[i], next => { hooks[i] = typeof next === 'function' ? next(hooks[i]) : next; }]; },
    useCallback(fn, deps) { const i = cursor++; if (!hooks[i] || deps.some((value, j) => !Object.is(value, hooks[i].deps[j]))) hooks[i] = { deps, fn }; return hooks[i].fn; },
    useEffect(run, deps) { const i = cursor++, old = hooks[i]; if (!old || deps.some((value, j) => !Object.is(value, old.deps[j]))) effects.push(() => { old?.cleanup?.(); hooks[i] = { deps, cleanup: run() }; }); },
  };
  const comments = [
    { id: 'own', userId: 'me', displayName: 'Me', body: 'My reply', createdAt: 'now' },
    { id: 'other', userId: 'friend', displayName: 'Ara', body: 'Hello!', createdAt: 'earlier' },
  ];
  const api = { async list() { return { items: comments, cursor: null, hasMore: false }; }, async add() {}, async remove() {}, ...overrides };
  const mocks = {
    react,
    'expo-router': { useFocusEffect: fn => react.useEffect(fn, [fn]) },
    'expo-crypto': { randomUUID: () => 'request-' + ++uuid },
    'react-native': { View: 'View', Pressable: 'Pressable', ScrollView: 'ScrollView', ActivityIndicator: 'ActivityIndicator', StyleSheet: { create: value => value } },
    '@expo/vector-icons/Feather': { __esModule: true, default: 'Feather' },
    'expo-linear-gradient': { LinearGradient: 'LinearGradient' },
    '@/src/features/comments/commentService': { commentService: api, COMMENT_MAX_LENGTH: 500 },
    '@/src/state/appStore': { relativeTime: () => '1 minute' },
    '@/src/theme/ThemeProvider': { useThemeStyles: factory => { const colors = { background: {}, text: {}, border: {} }; return { colors, styles: factory({ colors }) }; } },
  };
  for (const name of ['ActionButton', 'Avatar', 'ConfirmationDialog', 'TextField']) mocks['./' + name] = { [name]: name };
  mocks['./primitives/AppText'] = { AppText: 'AppText' };
  const { MomentComments } = load('src/components/MomentComments.tsx', mocks);
  const render = () => { cursor = 0; effects = []; const tree = MomentComments({ updateId: 'moment', userId: 'me' }); effects.forEach(fn => fn()); return tree; };
  const nodes = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
  t.after(() => hooks.forEach(hook => hook?.cleanup?.()));
  return { render, nodes, flush: () => new Promise(resolve => setImmediate(resolve)) };
}
test('Messenger comments show profiles, oldest-first bubbles, and an icon-only send control', async t => {
  const app = ui(t); app.render(); await app.flush();
  const nodes = app.nodes(app.render());
  assert.equal(nodes.filter(n => n.type === 'Avatar').length, 2);
  assert.deepEqual(nodes.filter(n => n.type === 'AppText' && ['Hello!', 'My reply'].includes(n.props.children)).map(n => n.props.children), ['Hello!', 'My reply']);
  const send = nodes.find(n => n.props?.accessibilityLabel === 'Send comment');
  assert.equal(send.props.disabled, true);
  assert.equal(app.nodes(send).some(n => n.type === 'Feather' && n.props.name === 'send'), true);
  assert.equal(nodes.filter(n => n.props?.accessibilityLabel?.startsWith('Delete your comment')).length, 1);
});
test('failed comment sends preserve the draft, reuse the retry ID, and suppress double taps', async t => {
  const requests = []; let finish;
  const app = ui(t, { add: async (...args) => { requests.push(args); if (requests.length === 1) await new Promise((_, reject) => { finish = reject; }); } });
  app.render(); await app.flush();
  app.nodes(app.render()).find(n => n.type === 'TextField').props.onChangeText('A reply');
  const send = app.nodes(app.render()).find(n => n.props?.accessibilityLabel === 'Send comment');
  const pending = send.props.onPress(); send.props.onPress();
  assert.equal(requests.length, 1);
  finish(Error('Offline')); await pending; await app.flush();
  assert.equal(app.nodes(app.render()).find(n => n.type === 'TextField').props.value, 'A reply');
  app.nodes(app.render()).find(n => n.props?.accessibilityLabel === 'Send comment').props.onPress();
  await app.flush();
  assert.equal(requests[0][2], requests[1][2]);
  assert.equal(app.nodes(app.render()).find(n => n.type === 'TextField').props.value, '');
});
