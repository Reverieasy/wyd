const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const access = require('../src/features/updates/photoAccess.ts');
const retention = require('../src/features/updates/momentRetention.ts');
function harness() {
  const state = { userId: 'me', visible: true, granted: true, saved: [], permission: [], fetches: [], drawn: [], marks: [] };
  const client = {
    auth: { async getSession() { return { data: { session: { user: { id: state.userId }, access_token: 'test-token' } } }; } },
    from: () => ({ select: () => ({ eq: () => ({ async maybeSingle() { return { data: state.visible ? { id: 'photo', sender_id: 'me', photo_path: 'me/photo.jpg', created_at: new Date().toISOString(), expires_at: null } : null }; } }) }) }),
  };
  const canvas = { getContext: () => ({ drawImage: (...args) => state.drawn.push(args), fillText: (...args) => state.marks.push(args) }), toBlob: callback => callback({ jpeg: true }) };
  const mocks = {
    '@/src/lib/supabase': { getSupabase: () => client },
    '@/src/lib/environment': { environment: { supabaseUrl: 'https://test.supabase.co', supabasePublishableKey: 'public-key' } },
    './photoAccess': access, './momentRetention': retention,
    'expo-media-library': { async requestPermissionsAsync(writeOnly) { state.permission.push(writeOnly); return { granted: state.granted }; }, Asset: { async create(uri) { state.saved.push(uri); } } },
  };
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/features/updates/photoExportService.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, Error, URL: { createObjectURL: () => 'blob:watermarked', revokeObjectURL() {} }, setTimeout: () => {}, createImageBitmap: async () => ({ width: 900, height: 1600, close() {} }),
    document: { fonts: { ready: Promise.resolve() }, createElement: tag => tag === 'canvas' ? canvas : { click() {}, remove() {} }, body: { appendChild() {} } },
    fetch: async (uri, options) => { state.fetches.push({ uri, options }); return { ok: true, blob: async () => ({}) }; },
    require: id => mocks[id],
  });
  return { api: module.exports, state };
}
test('photo exports retain the original aspect ratio instead of cropping to a square', () => {
  const { api } = harness();
  assert.equal(api.exportDimensions(900, 1600).width, 900);
  assert.equal(api.exportDimensions(900, 1600).height, 1600);
  assert.equal(api.exportDimensions(4000, 2000).height, 1024);
  assert.throws(() => api.exportDimensions(0, 100));
});
test('gallery saving asks only for write access and does not continue if denied', async () => {
  const { api, state } = harness(); state.granted = false;
  await assert.rejects(api.requestGalleryAccess(), /Allow saving/);
  assert.deepEqual(state.permission, [true]); assert.equal(state.saved.length, 0);
});
test('revoking moment access or switching accounts prevents a gallery write', async () => {
  const { api, state } = harness(); state.visible = false;
  await assert.rejects(api.saveCapturedPhoto('file:///photo.jpg', 'photo', 'me'), /no longer available/);
  state.visible = true; state.userId = 'other';
  await assert.rejects(api.saveCapturedPhoto('file:///photo.jpg', 'photo', 'me'), /Sign in again/);
  assert.equal(state.saved.length, 0);
});
test('web downloads fetch the authorized photo and place the brand watermark at the lower right', async () => {
  const { api, state } = harness(); await api.downloadPhotoWeb('photo', 'me');
  assert.equal(state.fetches[0].options.headers.Authorization, 'Bearer test-token');
  assert.equal(state.drawn[0].length, 5); // no source crop rectangle
  assert.equal(state.drawn[0][3], 900); assert.equal(state.drawn[0][4], 1600);
  assert.equal(state.marks[0][0], 'watchudoin?');
  assert.equal(state.marks[0][1], 882); assert.equal(state.marks[0][2], 1568);
});
