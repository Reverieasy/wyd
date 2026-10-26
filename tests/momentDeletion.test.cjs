const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
function harness() {
  const calls = [], state = { userId: 'owner', row: { id: 'moment', sender_id: 'owner', photo_path: 'owner/server-photo.jpg' }, storageError: null, rpcError: null, changeAccountAfterStorage: false };
  class ServiceError extends Error { constructor(message, code) { super(message); this.code = code; } }
  const client = { auth: { getSession: async () => ({ data: { session: { user: { id: state.userId } } } }) }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.row, error: null }) }) }) }), async rpc(name, args) { calls.push({ rpc: name, args }); return { data: true, error: state.rpcError }; } };
  const mocks = { '@/src/lib/supabase': { getSupabase: () => client }, '@/src/lib/serviceError': { ServiceError, readableServiceError: error => error }, './photoService': { photoService: { async remove(path) { calls.push({ remove: path }); if (state.storageError) throw state.storageError; if (state.changeAccountAfterStorage) state.userId = 'other'; } } } };
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/updates/updateService.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module, exports: module.exports, require: id => mocks[id] });
  return { service: module.exports.updateService, state, calls };
}
test('deletion removes the server-owned photo before deleting its moment metadata', async () => {
  const h = harness(); await h.service.deleteOwn('moment', 'owner');
  assert.equal(h.calls[0].remove, 'owner/server-photo.jpg');
  assert.equal(h.calls[1].rpc, 'delete_own_moment');
  assert.equal(h.calls[1].args.p_update_id, 'moment');
});
test('recipients cannot delete a photo shared with them', async () => {
  const h = harness(); h.state.row.sender_id = 'someone-else';
  await assert.rejects(h.service.deleteOwn('moment', 'owner'), /only delete your own/);
  assert.equal(h.calls.length, 0);
});
test('storage failure keeps the moment metadata and supports a successful retry', async () => {
  const h = harness(); h.state.storageError = Error('offline');
  await assert.rejects(h.service.deleteOwn('moment', 'owner'), /offline/);
  assert.equal(h.calls.some(c => c.rpc), false);
  h.state.storageError = null; await h.service.deleteOwn('moment', 'owner');
  assert.equal(h.calls.filter(c => c.rpc).length, 1);
});
test('a metadata failure is retryable after the binary was removed', async () => {
  const h = harness(); h.state.rpcError = Error('network interrupted');
  await assert.rejects(h.service.deleteOwn('moment', 'owner'), /network interrupted/);
  h.state.rpcError = null; await h.service.deleteOwn('moment', 'owner');
  assert.equal(h.calls.filter(c => c.rpc).length, 2);
});
test('missing moments are already deleted and do not touch storage', async () => {
  const h = harness(); h.state.row = null;
  await h.service.deleteOwn('moment', 'owner'); assert.equal(h.calls.length, 0);
});
test('account switches stop deletion before it can run as a different user', async () => {
  const h = harness(); h.state.userId = 'other';
  await assert.rejects(h.service.deleteOwn('moment', 'owner'), /Sign in again/);
  assert.equal(h.calls.length, 0);
  h.state.userId = 'owner'; h.state.changeAccountAfterStorage = true;
  await assert.rejects(h.service.deleteOwn('moment', 'owner'), /Sign in again/);
  assert.equal(h.calls.some(c => c.rpc), false);
});

test('delete confirmation blocks duplicate submissions and cancellation while pending, then permits retry', async () => {
  const hooks = []; let cursor = 0, calls = 0, cancelled = 0, deleted = 0, finish;
  const actions = { deleteMoment: () => { calls++; return new Promise((resolve, reject) => { finish = { resolve, reject }; }); } };
  const mocks = {
    react: { useEffect() {}, useRef(value) { const index = cursor++; return hooks[index] ??= { current: value }; }, useState(value) { const index = cursor++; if (!(index in hooks)) hooks[index] = value; return [hooks[index], next => { hooks[index] = next; }]; } },
    '@/src/state/appStore': { useAppStore: () => ({ state: { server: { session: { user: { id: 'owner' } } } }, actions }) },
    '@/src/features/updates/updateService': { updateService: { errorMessage: error => error.message } },
    './ConfirmationDialog': { ConfirmationDialog: 'ConfirmationDialog' },
  };
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/DeleteMomentDialog.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { module, exports: module.exports, require: id => mocks[id] || require(id) });
  const render = () => { cursor = 0; return module.exports.DeleteMomentDialog({ updateId: 'moment', onCancel: () => cancelled++, onDeleted: () => deleted++ }).props; };
  let props = render(); assert.equal(calls, 0);
  props.onConfirm(); props.onConfirm(); props.onCancel();
  assert.equal(calls, 1); assert.equal(cancelled, 0); assert.equal(render().busy, true);
  finish.reject(Error('Offline')); await new Promise(resolve => setImmediate(resolve));
  props = render(); assert.equal(props.error, 'Offline'); assert.equal(props.busy, false); assert.equal(deleted, 0);
  props.onConfirm(); assert.equal(calls, 2); finish.resolve(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(deleted, 1);
});
