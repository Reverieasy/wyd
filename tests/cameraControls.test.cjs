const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

function harness() {
  const states = [], refs = []; let position = 0, refPosition = 0, focus;
  const mockReact = { ...require('react'), useState(initial) { const index = position++; if (!(index in states)) states[index] = initial; return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; }, useRef(initial) { const index = refPosition++; return refs[index] ??= { current: index === 0 ? { takePictureAsync: () => new Promise(() => {}) } : initial }; }, useCallback: fn => fn, useEffect() {} };
  const styles = { control: {}, libraryButton: {}, screen: {} };
  const colors = { text: {}, background: {} };
  const mocks = {
    react: mockReact,
    'react-native': { StyleSheet: { create: x => x, absoluteFill: {} }, View: 'View', Pressable: 'Pressable', ActivityIndicator: 'Spinner', AppState: { currentState: 'active' } },
    'expo-camera': { CameraView: 'CameraView', useCameraPermissions: () => [{ granted: true }, () => {}, () => {}] },
    'expo-router': { router: {}, useFocusEffect: fn => { focus = fn; }, useLocalSearchParams: () => ({}) },
    'expo-image-picker': {}, 'expo-status-bar': { StatusBar: 'StatusBar' },
    '@expo/vector-icons/MaterialIcons': { __esModule: true, default: 'Icon' },
    '@/src/theme/ThemeProvider': { useThemeStyles: () => ({ colors, styles }) },
    '@/src/state/appStore': { useAppStore: () => ({ state: { server: { connections: [] }, local: { draft: { circleIds: [], recipientIds: [] } } }, actions: {} }) },
    '@/src/components': { Screen: 'Screen', AppText: 'Text', Avatar: 'Avatar' },
    '@/src/components/FigmaArtwork': { ShutterArtwork: 'Shutter' },
    '@/src/features/activity/nudgeService': {}, '@/src/lib/logger': {}, '@/src/theme': { radii: {}, spacing: {} },
  };
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync('app/(tabs)/camera.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, require: id => Object.hasOwn(mocks, id) ? mocks[id] : require(id) });
  const render = () => { position = 0; refPosition = 0; return module.exports.default(); };
  render(); focus();
  return { render };
}
function nodes(node) { return !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)]; }
const find = (tree, label) => nodes(tree).find(node => node.props?.accessibilityLabel === label);
test('both camera switches flip the lens and reset zoom through the same action', () => {
  const h = harness(); let tree = h.render();
  nodes(tree).find(n => n.type === 'CameraView').props.onCameraReady();
  find(tree, 'Zoom in').props.onPress(); tree = h.render();
  assert.equal(nodes(tree).find(n => n.type === 'CameraView').props.zoom, 0.1);
  assert.equal(find(tree, 'Flip camera').props.onPress, find(tree, 'Flip camera beside shutter').props.onPress);
  find(tree, 'Flip camera beside shutter').props.onPress(); tree = h.render();
  assert.equal(nodes(tree).find(n => n.type === 'CameraView').props.facing, 'front');
  assert.equal(nodes(tree).find(n => n.type === 'CameraView').props.zoom, 0);
  assert.equal(find(tree, 'Take photo').props.disabled, true);
  find(tree, 'Flip camera').props.onPress(); tree = h.render();
  assert.equal(nodes(tree).find(n => n.type === 'CameraView').props.facing, 'back');
});
test('the camera cannot switch lenses during a capture', () => {
  const h = harness(); let tree = h.render();
  nodes(tree).find(n => n.type === 'CameraView').props.onCameraReady(); tree = h.render();
  find(tree, 'Take photo').props.onPress(); tree = h.render();
  assert.equal(find(tree, 'Flip camera beside shutter').props.disabled, true);
  find(tree, 'Flip camera beside shutter').props.onPress(); tree = h.render();
  assert.equal(nodes(tree).find(n => n.type === 'CameraView').props.facing, 'back');
});
