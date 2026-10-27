const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

function harness(reducedMotion = false) {
  const hooks = [], effects = [], animations = []; let cursor = 0, hidden = 0, completed = 0;
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const React = { ...require('react'),
    useRef(initial) { const i = cursor++; return hooks[i] ??= { current: initial }; },
    useState(initial) { const i = cursor++; if (!(i in hooks)) hooks[i] = initial; return [hooks[i], value => { hooks[i] = value; }]; },
    useEffect(run, deps) { const i = cursor++; if (!same(hooks[i]?.deps, deps)) effects.push(() => { hooks[i]?.cleanup?.(); hooks[i] = { deps, cleanup: run() }; }); },
  };
  const animation = (kind, config) => ({ kind, config, stopped: false, start(callback) { this.callback = callback; animations.push(this); }, stop() { this.stopped = true; } });
  class Value { constructor(value) { this.value = value; } setValue(value) { this.value = value; } }
  const mocks = {
    react: React,
    'react-native': { View: 'View', Text: 'Text', ActivityIndicator: 'Spinner', StyleSheet: { create: v => v, absoluteFill: {} }, Easing: { out: v => v, cubic: 'cubic', quad: 'quad' }, Animated: { Value, View: 'AnimatedView', timing: (_value, config) => animation('timing', config), sequence: steps => animation('sequence', steps) } },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) },
    'expo-splash-screen': { async hideAsync() { hidden++; } },
    './BrandLogo': { BrandLogo: 'BrandLogo' }, './BrandWordmark': { BrandWordmark: 'BrandWordmark' }, './MotionProvider': { useReducedMotion: () => reducedMotion },
  };
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/StartupSplash.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { module, exports: module.exports, require: id => mocks[id] || require(id) });
  const props = { ready: false, onFinish: () => completed++ };
  function render() { cursor = 0; const result = module.exports.StartupSplash(props); while (effects.length) effects.shift()(); return result; }
  return { props, animations, render, hidden: () => hidden, completed: () => completed, unmount: () => hooks.forEach(hook => hook?.cleanup?.()) };
}

test('native splash stays until the branded overlay lays out, then hides only once', () => {
  const h = harness(); const view = h.render(); assert.equal(h.hidden(), 0);
  view.props.onLayout(); view.props.onLayout(); h.render();
  assert.equal(h.hidden(), 1); assert.equal(h.completed(), 0);
});

test('startup waits for app readiness and the logo pop before fading away', () => {
  const h = harness(); h.render().props.onLayout(); h.render();
  assert.equal(h.animations[0].kind, 'sequence');
  h.animations[0].callback({ finished: true }); h.render(); assert.equal(h.animations.length, 1);
  h.props.ready = true; h.render(); assert.equal(h.animations[1].config.toValue, 0);
  assert.equal(h.completed(), 0); h.animations[1].callback({ finished: true }); h.render();
  assert.equal(h.completed(), 1);
  h.props.ready = false; h.render(); h.props.ready = true; h.render(); assert.equal(h.completed(), 1);
});

test('a fast restored session still completes the brief logo pop without an artificial timer', () => {
  const h = harness(); h.props.ready = true; h.render().props.onLayout(); h.render();
  assert.equal(h.animations.length, 1); assert.equal(h.completed(), 0);
  h.animations[0].callback({ finished: true }); h.render(); h.animations[1].callback({ finished: true });
  assert.equal(h.completed(), 1);
});

test('Reduce Motion skips animation but still waits for app readiness', () => {
  const h = harness(true); h.render().props.onLayout(); h.render(); h.render();
  assert.equal(h.animations.length, 0); assert.equal(h.completed(), 0);
  h.props.ready = true; h.render(); assert.equal(h.completed(), 1);
});

test('unmount stops the animation and ignores its late completion callback', () => {
  const h = harness(); h.props.ready = true; h.render().props.onLayout(); h.render();
  h.animations[0].callback({ finished: true }); h.render(); h.unmount();
  assert.equal(h.animations[1].stopped, true); h.animations[1].callback({ finished: true }); assert.equal(h.completed(), 0);
});

test('native notification icons are white transparent W masks at the required sizes', () => {
  const { PNG } = require('pngjs');
  for (const [file, size] of [['notification-icon.png', 96], ['android-icon-monochrome.png', 432]]) {
    const png = PNG.sync.read(fs.readFileSync('assets/' + file));
    assert.equal(png.width, size); assert.equal(png.height, size);
    let opaque = 0, transparent = 0;
    for (let i = 0; i < png.data.length; i += 4) {
      if (!png.data[i + 3]) { transparent++; continue; }
      opaque++; assert.equal(png.data[i], 255); assert.equal(png.data[i + 1], 255); assert.equal(png.data[i + 2], 255);
    }
    assert.ok(opaque > size * size * 0.1); assert.ok(transparent > size * size * 0.4);
  }
  assert.ok(fs.readFileSync('assets/splash-icon.png').equals(fs.readFileSync('assets/figma/wyd-logo.png')));
});
