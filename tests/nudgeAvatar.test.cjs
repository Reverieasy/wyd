const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function harness(onNudge = async () => true, reducedMotion = false) {
  let now = 0, nextTimer = 0, cursor = 0, taps = 0, appListener;
  const timers = new Map(), hooks = [], effects = [], values = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const React = {
    ...require('react'),
    useRef(initial) { const i = cursor++; return hooks[i] ??= { current: initial }; },
    useState(initial) { const i = cursor++; if (!(i in hooks)) hooks[i] = initial; return [hooks[i], v => { hooks[i] = typeof v === 'function' ? v(hooks[i]) : v; }]; },
    useCallback(value, deps) { const i = cursor++; if (!same(hooks[i]?.deps, deps)) hooks[i] = { value, deps }; return hooks[i].value; },
    useEffect(effect, deps) { const i = cursor++; if (!same(hooks[i]?.deps, deps)) effects.push(() => { hooks[i]?.cleanup?.(); hooks[i] = { deps, cleanup: effect() }; }); },
  };
  class Value { constructor(value) { this.value = value; values.push(this); } setValue(value) { this.value = value; } stopAnimation() {} interpolate(config) { return config; } }
  const theme = { colors: { background: { card: '#fff', accent: '#6c2cf5' }, border: { default: '#ddd' }, text: { primary: '#111', secondary: '#777' } } };
  const mocks = {
    react: React,
    'expo-router': { useFocusEffect: callback => React.useEffect(callback, [callback]) },
    'react-native': { View: 'View', Pressable: 'Pressable', ActivityIndicator: 'Spinner', Easing: { linear: v => v }, Animated: { Value, View: 'AnimatedView', timing: (value, config) => ({ start() { value.setValue(config.toValue); } }) }, StyleSheet: { create: v => v }, AppState: { addEventListener(_event, listener) { appListener = listener; return { remove() {} }; } } },
    '@/src/theme/ThemeProvider': { useThemeStyles: factory => ({ ...theme, styles: factory(theme) }) },
    './Avatar': { Avatar: 'Avatar' }, './primitives/AppText': { AppText: 'Text' },
    './SoftEntrance': { useReducedMotion: () => reducedMotion },
  };
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/components/NudgeAvatar.tsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, require: id => Object.hasOwn(mocks, id) ? mocks[id] : require(id), setTimeout(callback, delay) { const id = ++nextTimer; timers.set(id, { callback, at: now + delay }); return id; }, clearTimeout(id) { timers.delete(id); } });
  const props = { name: 'Person', onPress: () => taps++, onNudge };
  function render() { cursor = 0; const node = module.exports.NudgeAvatar(props); while (effects.length) effects.shift()(); return node; }
  function advance(ms) { const end = now + ms; for (;;) { const entry = [...timers].sort((a, b) => a[1].at - b[1].at)[0]; if (!entry || entry[1].at > end) break; now = entry[1].at; timers.delete(entry[0]); entry[1].callback(); } now = end; }
  return { render, props, advance, lift: () => values[1].value, taps: () => taps, background: () => appListener('background'), unmount: () => hooks.forEach(h => h?.cleanup?.()), blur: () => render().props.onBlur() };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('a short tap selects the person and never sends a nudge', () => {
  let sends = 0; const h = harness(async () => { sends++; return true; });
  h.render().props.onPressIn(); h.advance(100); h.render().props.onPressOut(); h.render().props.onPress(); h.advance(4000);
  assert.equal(h.taps(), 1); assert.equal(sends, 0);
});

test('a nudge requires a full uninterrupted 3000 ms hold and sends once', async () => {
  let sends = 0, finish; const h = harness(() => { sends++; return new Promise(resolve => { finish = resolve; }); });
  h.render().props.onPressIn(); h.advance(2999); assert.equal(sends, 0);
  h.advance(1); assert.equal(sends, 1); assert.equal(h.render().props.accessibilityState.busy, true);
  h.render().props.onPressIn(); h.advance(9000); assert.equal(sends, 1);
  h.render().props.onPressOut(); h.render().props.onPress(); assert.equal(h.taps(), 0);
  finish(true); await settle(); assert.equal(h.render().props.accessibilityState.busy, false);
});

test('releasing just before completion cancels and a new hold starts from zero', () => {
  let sends = 0; const h = harness(async () => { sends++; return true; });
  h.render().props.onPressIn(); h.advance(2999); h.render().props.onPressOut(); h.advance(5000); assert.equal(sends, 0);
  h.render().props.onPressIn(); h.advance(2999); assert.equal(sends, 0); h.advance(1); assert.equal(sends, 1);
});

test('blur, app backgrounding, disabling and unmount all cancel a pending hold', () => {
  for (const cancel of [h => h.blur(), h => h.background(), h => { h.props.disabled = true; h.render(); }, h => h.unmount()]) {
    let sends = 0; const h = harness(async () => { sends++; return true; });
    h.render().props.onPressIn(); h.advance(2500); cancel(h); h.advance(2000); assert.equal(sends, 0);
  }
});

test('failed sends unlock the control and require a fresh full hold to retry', async () => {
  let sends = 0; const h = harness(async () => { sends++; return false; });
  h.render().props.onPressIn(); h.advance(3000); await settle(); h.render().props.onPressOut();
  assert.equal(h.render().props.accessibilityState.busy, false);
  h.render().props.onPressIn(); h.advance(2999); assert.equal(sends, 1); h.advance(1); assert.equal(sends, 2); await settle();
});

test('disabled or externally busy profiles cannot start nudges', () => {
  for (const key of ['busy', 'disabled']) {
    let sends = 0; const h = harness(async () => { sends++; return true; }); h.props[key] = true;
    h.render().props.onPressIn(); h.advance(5000); assert.equal(sends, 0);
  }
});

test('the photo stays lifted through sending and success until the finger releases', async () => {
  let finish; const h = harness(() => new Promise(resolve => { finish = resolve; }));
  h.render().props.onPressIn(); assert.equal(h.lift(), 1);
  h.advance(3000); h.props.busy = true; h.render(); assert.equal(h.lift(), 1);
  h.props.busy = false; finish(true); await settle(); h.render(); assert.equal(h.lift(), 1);
  h.render().props.onPressOut(); assert.equal(h.lift(), 0);
});

test('reduced motion skips enlargement while retaining the 3 second hold requirement', () => {
  let sends = 0; const h = harness(async () => { sends++; return true; }, true);
  h.render().props.onPressIn(); assert.equal(h.lift(), 0); h.advance(2999); assert.equal(sends, 0);
  h.advance(1); assert.equal(sends, 1);
});
