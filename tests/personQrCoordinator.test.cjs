const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

test('a scanned person survives sign-in route changes and opens before the pending username is cleared', async () => {
  const hooks = [], calls = [];
  let cursor = 0, effects = [], resolveCode;
  let segments = ['(onboarding)', 'sign-in'];
  const state = { server: { profile: { id: 'new-user' } } };
  const module = { exports: {} };
  const mocks = {
    react: {
      useRef(initial) { return hooks[cursor++] ??= { current: initial }; },
      useEffect(run, deps) {
        const index = cursor++, previous = hooks[index];
        if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
          effects.push(() => { previous?.cleanup?.(); hooks[index] = { deps, cleanup: run() }; });
        }
      },
    },
    'expo-router': { useSegments: () => segments, router: { push: route => calls.push(['navigate', route.params.username]) } },
    '@/src/state/appStore': { useAppStore: () => ({ state }) },
    './personQrStorage': { personQrStorage: {
      get: () => new Promise(resolve => { resolveCode = resolve; }),
      clear: async () => { calls.push(['clear']); },
    } },
  };
  const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/features/connections/PersonQrCoordinator.tsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, require: id => mocks[id] });
  const render = () => { cursor = 0; effects = []; module.exports.PersonQrCoordinator(); effects.forEach(run => run()); };
  render();
  segments = ['(tabs)', 'people'];
  render();
  resolveCode('ara');
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(calls, [['navigate', 'ara'], ['clear']]);
  render();
  assert.equal(calls.length, 2);
});
