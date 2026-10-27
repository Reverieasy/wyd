const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const settle = () => new Promise(resolve => setImmediate(resolve));
const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];

function harness(file) {
  const hooks = [], requests = [], routes = []; let cursor = 0, finish, recoveries = 0;
  const state = { server: { session: { user: { id: 'owner' } }, recoveryActive: true } };
  const React = { ...require('react'), useState(initial) { const i = cursor++; if (!(i in hooks)) hooks[i] = initial; return [hooks[i], value => { hooks[i] = value; }]; }, useRef(initial) { const i = cursor++; return hooks[i] ??= { current: initial }; } };
  const mocks = {
    react: React, 'react-native': { Platform: { OS: 'web' }, View: 'View', StyleSheet: { create: value => value } },
    'expo-router': { router: { replace: path => routes.push(path) } },
    '@/src/components': Object.fromEntries(['ActionButton', 'AppText', 'FlowHeader', 'Screen', 'TextField', 'PasswordField'].map(name => [name, name])),
    '@/src/features/auth/authService': { authService: {
      requestPasswordReset: email => { requests.push(email); return new Promise(resolve => { finish = resolve; }); },
      updatePassword: password => { requests.push(password); return new Promise(resolve => { finish = resolve; }); },
    } },
    '@/src/features/auth/useResendCooldown': { useResendCooldown: at => at ? 60 : 0 },
    '@/src/lib/serviceError': { readableServiceError: error => error },
    '@/src/state/appStore': { useAppStore: () => ({ state, actions: { finishRecovery() { recoveries++; }, clearServerFeedback() {} } }) },
  };
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { module, exports: module.exports, require: id => mocks[id] || require(id) });
  return { state, requests, routes, render() { cursor = 0; return nodes(module.exports.default()); }, finish: () => finish(), recoveries: () => recoveries };
}

test('forgot password blocks duplicate sends and explains the web destination after sending', async () => {
  const h = harness('app/(onboarding)/forgot-password.tsx');
  h.render().find(n => n.type === 'TextField').props.onChangeText('me@example.com');
  const send = h.render().find(n => n.props.label === 'Send reset link'); send.props.onPress(); send.props.onPress();
  assert.equal(h.requests.length, 1); h.finish(); await settle();
  const result = h.render();
  assert.equal(result.some(n => n.type === 'TextField'), false);
  assert.equal(result.some(n => typeof n.props.children === 'string' && n.props.children.includes('Open it in this browser')), true);
  assert.equal(result.find(n => n.props.label === 'Resend in 60s').props.disabled, true);
});

test('invalid addresses cannot request a recovery email even if the disabled handler is invoked', () => {
  const h = harness('app/(onboarding)/forgot-password.tsx');
  const send = h.render().find(n => n.props.label === 'Send reset link');
  assert.equal(send.props.disabled, true); send.props.onPress(); assert.equal(h.requests.length, 0);
});

test('the reset form requires a verified recovery session', () => {
  const h = harness('app/reset-password.tsx');
  h.state.server.recoveryActive = false;
  assert.equal(h.render().some(n => n.type === 'PasswordField'), false);
  assert.equal(h.render().some(n => n.props.label === 'Request a new link'), true);
  h.state.server.recoveryActive = true; h.state.server.session = null;
  assert.equal(h.render().some(n => n.type === 'PasswordField'), false);
});

test('a valid recovery session exposes password entry and saves only once', async () => {
  const h = harness('app/reset-password.tsx');
  let inputs = h.render().filter(n => n.type === 'PasswordField');
  assert.equal(inputs.length, 2); inputs[0].props.onChangeText('new-password'); inputs[1].props.onChangeText('new-password');
  const save = h.render().find(n => n.props.label === 'Save password');
  assert.equal(save.props.disabled, false); save.props.onPress(); save.props.onPress(); assert.equal(h.requests.length, 1);
  h.finish(); await settle(); assert.equal(h.recoveries(), 1); assert.deepEqual(h.routes, ['/(tabs)/people']);
});
