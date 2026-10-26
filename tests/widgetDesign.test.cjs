const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
const model = require('../src/features/widgets/widgetModel.ts');
const widgetModule = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/features/widgets/MomentWidget.android.tsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
  module: widgetModule, exports: widgetModule.exports,
  require: id => id === 'react-native-android-widget' ? { FlexWidget: 'FlexWidget', TextWidget: 'TextWidget', ImageWidget: 'ImageWidget', SvgWidget: 'SvgWidget' } : id === './widgetModel' ? model : require(id),
});
function nodes(node) { return !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)]; }
const snapshot = { ...model.emptyWidget('moment'), ownerId: 'me', personId: 'friend', name: 'Ara', updateId: 'moment', photoData: 'data:image/jpeg;base64,private', expiresAt: new Date(Date.now() + 60000).toISOString() };
test('redesigned widget retains authorized photo and selected-person Nudge actions', () => {
  const tree = widgetModule.exports.MomentWidget({ snapshot, width: 320, height: 145 });
  const image = nodes(tree).find(n => n.type === 'ImageWidget');
  assert.equal(image.props.clickActionData.uri, 'watchudoin://moment/moment');
  const button = nodes(tree).find(n => n.props?.text === 'Nudge');
  assert.equal(button.props.clickAction, 'NUDGE_PERSON');
  assert.equal(button.props.clickActionData.personId, 'friend');
});
test('expired private photos use the pastel placeholder and cannot be nudged', () => {
  const tree = widgetModule.exports.MomentWidget({ snapshot: { ...snapshot, expiresAt: new Date(Date.now() - 60000).toISOString() }, width: 280, height: 120 });
  assert.equal(nodes(tree).some(n => n.type === 'ImageWidget'), false);
  assert.equal(nodes(tree).some(n => n.type === 'SvgWidget'), true);
  assert.equal(nodes(tree).some(n => n.props?.clickAction === 'NUDGE_PERSON'), false);
});
test('the widget send state cannot issue another Nudge', () => {
  const tree = widgetModule.exports.MomentWidget({ snapshot, width: 320, height: 145, button: 'sending' });
  const button = nodes(tree).find(n => n.props?.text === 'Sending…');
  assert.equal(button.props.clickAction, undefined);
});

test('dark and light widgets keep their text readable without changing Nudge actions', () => {
  for (const isDark of [true, false]) {
    const tree = widgetModule.exports.MomentWidget({ snapshot, width: 320, height: 145, isDark });
    assert.equal(tree.props.style.backgroundGradient.from, isDark ? '#211B29' : '#FFFFFF');
    assert.equal(nodes(tree).find(n => n.props?.text === 'Ara').props.style.color, isDark ? '#F5EFFB' : '#100C26');
    assert.equal(nodes(tree).find(n => n.props?.text === 'Nudge').props.clickAction, 'NUDGE_PERSON');
  }
});
