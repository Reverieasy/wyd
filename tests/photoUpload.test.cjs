const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function harness(platform = 'web', sizes = [12], readable = true) {
  const uploads = [], files = [], compressions = [];
  let imageIndex = 0;
  const uri = 'data:image/jpeg;base64,/9j/2Q==';
  class ServiceError extends Error { constructor(message, code) { super(message); this.code = code; } }
  const mocks = {
    'expo-crypto': { randomUUID: () => 'object-id' },
    'react-native': { Platform: { OS: platform } },
    'expo-file-system': { File: class {
      constructor(value) { if (platform === 'web') throw Error('this.validatePath is not a function'); files.push(value); this.size = sizes[0]; }
      async arrayBuffer() { return new ArrayBuffer(sizes[0]); }
    } },
    'expo-image-manipulator': { SaveFormat: { JPEG: 'jpeg' }, ImageManipulator: { manipulate: () => ({ resize() {}, async renderAsync() { return { async saveAsync(options) { compressions.push(options.compress); return { uri, width: 800, height: 600 }; } }; } }) } },
    '@/src/lib/serviceError': { ServiceError, readableServiceError: error => error },
    '@/src/lib/environment': { environment: {} },
    './photoAccess': { createMomentPhotoUrl() {} },
    '@/src/lib/supabase': { getSupabase: () => ({ storage: { from: bucket => ({ async upload(...args) { uploads.push({ bucket, args }); return { error: null }; } }) } }) },
  };
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/features/updates/photoService.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, fetch: async () => ({ ok: readable, async arrayBuffer() { return new ArrayBuffer(sizes[Math.min(imageIndex++, sizes.length - 1)]); } }), require: id => Object.hasOwn(mocks, id) ? mocks[id] : require(id) });
  return { service: module.exports.photoService, files, uploads, compressions };
}

test('web moment preparation and upload use browser bytes without constructing Expo File', async () => {
  const h = harness();
  const photo = await h.service.prepare({ uri: 'blob:browser-photo', width: 800, height: 600 });
  assert.equal(photo.size, 12);
  assert.equal(await h.service.upload('owner', photo, 'draft'), 'owner/draft.jpg');
  assert.equal(h.files.length, 0);
  assert.equal(h.uploads[0].bucket, 'moment-photos');
  assert.equal(h.uploads[0].args[1].byteLength, 12);
  assert.equal(h.uploads[0].args[2].contentType, 'image/jpeg');
  assert.equal(h.uploads[0].args[2].upsert, false);
});

test('web compression retries use actual output byte length to enforce the 6 MB limit', async () => {
  const h = harness('web', [7 * 1024 * 1024, 100]);
  const photo = await h.service.prepare({ uri: 'blob:photo', width: 800, height: 600 });
  assert.equal(photo.size, 100);
  assert.deepEqual(h.compressions, [0.82, 0.68]);
});

test('an unreadable web image fails before attempting a storage upload', async () => {
  const h = harness('web', [12], false);
  await assert.rejects(h.service.prepare({ uri: 'blob:revoked', width: 800, height: 600 }), error => error.code === 'photo_read_failed');
  assert.equal(h.uploads.length, 0);
});

test('Android moment uploads retain native File reading', async () => {
  const h = harness('android');
  const photo = await h.service.prepare({ uri: 'file:///photo.jpg', width: 800, height: 600 });
  await h.service.upload('owner', photo, 'draft');
  assert.equal(h.files.length, 2);
  assert.equal(h.uploads[0].args[1].byteLength, 12);
});
