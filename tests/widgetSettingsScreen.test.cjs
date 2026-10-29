const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
const model = require('../src/features/widgets/widgetModel.ts');
const nodes = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
function harness(initial = { enabled: true, personId: 'friend', design: 'portrait' }) {
  const values = [], dependencies = [], effects = [], saves = [], pins = []; let cursor = 0, settings = initial, fail = false;
  const React = {
    useState(initial) { const i = cursor++; if (!(i in values)) values[i] = initial; return [values[i], value => { values[i] = typeof value === 'function' ? value(values[i]) : value; }]; },
    useRef(initial) { const i = cursor++; return values[i] ??= { current: initial }; },
    useEffect(effect, deps) { const i = cursor++; if (!dependencies[i] || deps.some((v,j) => v !== dependencies[i][j])) { dependencies[i] = deps; effects.push(effect); } },
  };
  const colors = { background: { accent: '#7733FF', accentSoft: '#EFE4FF', card: '#FFF' }, border: { default: '#DDD', selected: '#7733FF' }, text: { secondary: '#888' } };
  const mocks = {
    react: React, 'react-native': { Platform: { OS: 'android' }, StyleSheet: { create: value => value }, Switch: 'Switch', View: 'View' },
    'expo-router': { router: { push() {} } }, '@expo/vector-icons/MaterialIcons': { __esModule: true, default: 'Icon' },
    '@/src/components': Object.fromEntries(['ActionButton','AppText','Avatar','FlowHeader','Screen'].map(n => [n,n])),
    '@/src/components/MotionPressable': { MotionPressable: 'Pressable' },
    '@/src/features/widgets/WidgetDesignPreview': { WidgetDesignPreview: 'Preview' },
    '@/src/features/widgets/widgetModel': model,
    '@/src/features/widgets/widgetService': { widgetService: { isAvailable: () => true, getSettings: async () => settings, async saveSettings(owner, value) { if (fail) throw Error('storage failed'); settings = value; saves.push({ owner, ...value }); }, addToHomeScreen: async design => { pins.push(design); return true; } } },
    '@/src/state/appStore': { useAppStore: () => ({ state: { server: { profile: { id: 'owner' }, connections: [{ connection: { status: 'accepted' }, person: { id: 'friend', displayName: 'Ara', handle: 'ara' } }], updates: [] } } }) },
    '@/src/theme/ThemeProvider': { useThemeStyles: factory => ({ colors, styles: factory({ colors }) }) },
  };
  const mod = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/(flows)/widget.tsx','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { module: mod, exports: mod.exports, require: id => Object.hasOwn(mocks,id) ? mocks[id] : require(id) });
  return {
    saves, pins, fail() { fail = true; },
    render() { cursor = 0; return nodes(mod.exports.default()); },
    async effects() { for (const effect of effects.splice(0)) effect(); await new Promise(resolve => setImmediate(resolve)); },
    async settle() { await new Promise(resolve => setImmediate(resolve)); },
  };
}
test('restores the selected size and persists a size change with its preview',async()=>{
 const h=harness({enabled:true,personId:'friend',design:'reactions'});h.render();await h.effects();let tree=h.render();
 assert.equal(tree.find(n=>n.type==='Preview').props.design,'large');
 assert.equal(tree.filter(n=>n.props?.accessibilityRole==='radio'&&/widget/.test(n.props.accessibilityLabel??'')).length,3);
 tree.find(n=>n.props?.accessibilityLabel==='Medium widget 4 × 2').props.onPress();await h.settle();tree=h.render();
 assert.equal(h.saves.at(-1).design,'medium');assert.equal(tree.find(n=>n.type==='Preview').props.design,'medium');
 tree.find(n=>n.type==='Switch').props.onValueChange(false);await h.settle();assert.equal(h.saves.at(-1).enabled,false);assert.equal(h.saves.at(-1).design,'medium');
});
test('pinning uses the selected provider, including migrated preferences',async()=>{
 const h=harness({enabled:true,personId:'friend',design:'wide'});h.render();await h.effects();let tree=h.render();
 await tree.find(n=>n.props?.label==='Add to home screen').props.onPress();await h.settle();assert.deepEqual(h.pins,['medium']);
 tree=h.render();await tree.find(n=>n.props?.accessibilityLabel==='Large widget 4 × 3').props.onPress();await h.settle();
 tree=h.render();await tree.find(n=>n.props?.label==='Add to home screen').props.onPress();await h.settle();assert.deepEqual(h.pins,['medium','large']);
});
test('failed size saves restore the previous preview and give a retry message',async()=>{
 const h=harness({enabled:true,personId:'friend',design:'small'});h.render();await h.effects();const tree=h.render();h.fail();
 await tree.find(n=>n.props?.accessibilityLabel==='Large widget 4 × 3').props.onPress();await h.settle();
 const after=h.render();assert.equal(after.find(n=>n.type==='Preview').props.design,'small');assert.ok(after.some(n=>n.props?.children==='Could not save the widget size. Try again.'));
});
