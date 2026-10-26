const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function control(props = {}) {
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/components/MotionPressable.tsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, require: id => id === 'react-native' ? { Pressable: 'Pressable' } : require(id) });
  return module.exports.MotionPressable(props);
}

test('shared buttons use the native Pressable directly without animation hooks or timers', () => {
  const calls = [];
  const element = control({ onPressIn: () => calls.push('in'), onPress: () => calls.push('press'), onPressOut: () => calls.push('out') });
  assert.equal(element.type, 'Pressable');
  element.props.onPressIn(); element.props.onPress(); element.props.onPressOut();
  assert.deepEqual(calls, ['in', 'press', 'out']);
});

test('pressed styles, disabled controls and accessibility props reach the native target unchanged', () => {
  const style = state => ({ opacity: state.pressed ? 0.8 : 1 });
  const element = control({ style, disabled: true, accessibilityLabel: 'Send', pressScale: 0.95 });
  assert.equal(element.props.style, style);
  assert.equal(element.props.disabled, true);
  assert.equal(element.props.accessibilityLabel, 'Send');
  assert.equal('pressScale' in element.props, false);
});
