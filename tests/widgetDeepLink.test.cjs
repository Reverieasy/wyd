const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

test('opening a widget photo on a cold launch waits for the signed-in profile before loading the moment', async (t) => {
  const hooks = [], requests = [];
  t.after(() => { for (const hook of hooks) hook?.cleanup?.(); });
  let cursor = 0, effects = [], finish;
  const state = { server: { profile: null, updates: [], error: null } };
  const actions = {
    refreshUpdates() {}, markUpdateSeen() {},
    async refreshUpdate(id) {
      requests.push(id);
      await new Promise(resolve => { finish = resolve; });
      state.server.updates = [{ id, senderId: 'friend', sender: { displayName: 'Friend' }, photoUrl: 'private-photo', reactions: [], seenAt: 'already-seen', createdAt: new Date().toISOString() }];
    },
  };
  const mocks = {
    react: {
      useCallback: fn => fn,
      useState(initial) { const index = cursor++; if (!(index in hooks)) hooks[index] = initial; return [hooks[index], value => { hooks[index] = value; }]; },
      useRef(initial) { const index = cursor++; return hooks[index] ??= { current: initial }; },
      useEffect(run, dependencies) {
        const index = cursor++, previous = hooks[index];
        if (!previous || dependencies.some((value, i) => !Object.is(value, previous.dependencies[i]))) {
          effects.push(() => { previous?.cleanup?.(); hooks[index] = { dependencies, cleanup: run() }; });
        }
      },
    },
    'expo-router': { router: {}, useLocalSearchParams: () => ({ id: 'from-widget' }) },
    'react-native': { View: 'View', Pressable: 'Pressable', StyleSheet: { create: value => value } },
    'expo-status-bar': { StatusBar: 'StatusBar' },
    '@expo/vector-icons/MaterialIcons': { __esModule: true, default: 'Icon' },
    '@expo/vector-icons/Feather': { __esModule: true, default: 'Icon' },
    '@/src/components/BrandWordmark': { BrandWordmark: 'BrandWordmark' },
    '@/src/components': Object.fromEntries(['ActionButton', 'AppText', 'Avatar', 'MomentPhoto', 'ReactionBar', 'Screen'].map(name => [name, name])),
    '@/src/state/appStore': { useAppStore: () => ({ state, actions }), relativeTime: () => 'Just now' },
    '@/src/theme': { spacing: {} },
    '@/src/features/updates/momentRetention': require('../src/features/updates/momentRetention.ts'),
    '@/src/components/MomentComments': { MomentComments: 'MomentComments' },
    '@/src/components/FullScreenMomentPhoto': { FullScreenMomentPhoto: 'FullScreenMomentPhoto' },
    '@/src/components/PhotoDownloadButton': { PhotoDownloadButton: 'PhotoDownloadButton' },
    '@/src/theme/ThemeProvider': { useThemeStyles: factory => { const colors = { background: { app: '#fff' }, border: {}, text: {} }; return { colors, styles: factory({ colors }) }; } },
  };
  const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../app/(flows)/moment/[id].tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, { module, exports: module.exports, setTimeout, clearTimeout, require: id => Object.hasOwn(mocks, id) ? mocks[id] : require(id) });
  const render = () => { cursor = 0; effects = []; const tree = module.exports.default(); effects.forEach(run => run()); return tree; };
  render();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(requests.length, 0);
  state.server.profile = { id: 'owner' };
  render();
  assert.deepEqual(requests, ['from-widget']);
  finish();
  await new Promise(resolve => setImmediate(resolve));
  const tree = render();
  const nodes = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
  assert.equal(nodes(tree).some(node => node.type === 'MomentPhoto' && node.props.photo.uri === 'private-photo'), true);
  render();
  assert.equal(requests.length, 1);
});
