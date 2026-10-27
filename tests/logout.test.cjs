const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function loadSource(file, mocks) {
  const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, { module, exports: module.exports, require: id => Object.hasOwn(mocks, id) ? mocks[id] : require(id) });
  return module.exports;
}

function profileHarness(signOut) {
  const hooks = [];
  let cursor = 0;
  const navigation = [];
  const state = { server: { profile: { id: 'user', displayName: 'Person', handle: 'person', bio: '' }, connections: [], error: null } };
  const Profile = loadSource('app/(tabs)/you.tsx', {
    react: {
      ...require('react'),
      useState(initial) { const index = cursor++; if (!(index in hooks)) hooks[index] = initial; return [hooks[index], value => { hooks[index] = value; }]; },
      useRef(initial) { const index = cursor++; return hooks[index] ??= { current: initial }; },
    },
    'expo-router': { router: { replace: value => navigation.push(value) } },
    'react-native': { View: 'View', Pressable: 'Pressable', StyleSheet: { create: value => value } },
    '@expo/vector-icons/MaterialIcons': { __esModule: true, default: 'Icon' },
    '@expo/vector-icons/Feather': { __esModule: true, default: 'Icon' },
    'expo-linear-gradient': { LinearGradient: 'LinearGradient' },
    '@/src/components': Object.fromEntries(['ActionButton', 'AppText', 'Avatar', 'Screen', 'SettingRow'].map(name => [name, name])),
    '@/src/components/ConfirmationDialog': { ConfirmationDialog: 'ConfirmationDialog' },
    '@/src/features/profiles/useProfileStats': { useProfileStats: () => ({ stats: null, error: null }) },
    '@/src/features/circles/useCircles': { useCircles: () => ({ circles: [], loading: false, error: null }) },
    '@/src/state/appStore': { useAppStore: () => ({ state, actions: { signOut, clearServerFeedback() { state.server.error = null; } } }) },
    '@/src/theme': { colors: { text: { heading: '#000', secondary: '#777' } } },
    '@/src/theme/ThemeProvider': { useThemeStyles: factory => { const theme = { colors: { text: { heading: '#000', secondary: '#777' }, background: { app: '#fff', card: '#fff', accentSoft: '#eee' }, border: { default: '#ddd' } } }; return { ...theme, styles: factory(theme) }; } },
  }).default;
  function elements(node) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(elements);
    return [node, ...elements(node.props?.children)];
  }
  function render() { cursor = 0; return elements(Profile()); }
  function dialog() { return render().find(node => node.type === 'ConfirmationDialog').props; }
  function open() { render().find(node => node.type === 'SettingRow' && node.props.label === 'Log out').props.onPress(); }
  return { open, dialog, navigation, state };
}

const settle = () => new Promise(resolve => setImmediate(resolve));

test('logout opens a cross-platform confirmation and Cancel leaves the session alone', () => {
  let calls = 0;
  const page = profileHarness(async () => { calls++; return true; });
  assert.equal(page.dialog().visible, false);
  page.open();
  assert.equal(page.dialog().visible, true);
  page.dialog().onCancel();
  assert.equal(page.dialog().visible, false);
  assert.equal(calls, 0);
  assert.deepEqual(page.navigation, []);
});

test('confirming logout navigates to login only after sign-out succeeds', async () => {
  let finish;
  let calls = 0;
  const page = profileHarness(() => { calls++; return new Promise(resolve => { finish = resolve; }); });
  page.open();
  page.dialog().onConfirm();
  page.dialog().onConfirm();
  assert.equal(calls, 1);
  assert.equal(page.dialog().busy, true);
  assert.deepEqual(page.navigation, []);
  finish(true);
  await settle();
  assert.deepEqual(page.navigation, ['/(onboarding)/sign-in']);
  assert.equal(page.dialog().visible, false);
  assert.equal(page.dialog().busy, false);
});

test('a failed sign-out keeps the confirmation open and allows retry', async () => {
  const page = profileHarness(async () => { page.state.server.error = 'Try again.'; return false; });
  page.open();
  page.dialog().onConfirm();
  await settle();
  assert.equal(page.dialog().visible, true);
  assert.equal(page.dialog().busy, false);
  assert.equal(page.dialog().error, 'Try again.');
  assert.deepEqual(page.navigation, []);
});

test('auth logout targets only the current session', async () => {
  let options;
  const { authService } = loadSource('src/features/auth/authService.ts', {
    './authRedirects': { authRedirectUrl: route => `watchudoin://${route}` },
    '@react-native-async-storage/async-storage': { __esModule: true, default: {} },
    '@/src/lib/supabase': { getSupabase: () => ({ auth: { async signOut(value) { options = value; return { error: null }; } } }) },
    '@/src/lib/serviceError': { ServiceError: Error, readableServiceError: error => error },
  });
  await authService.signOut();
  assert.equal(options.scope, 'local');
});
