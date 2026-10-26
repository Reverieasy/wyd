const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function harness() {
  const requests = [];
  class ServiceError extends Error {}
  const mocks = {
    '@/src/lib/serviceError': { ServiceError, readableServiceError: error => error },
    '@/src/lib/supabase': { getSupabase: () => ({ async rpc(name, args) { requests.push({ name, args }); return { data: [{ id: 'moment', photo_path: 'owner/photo.jpg', is_quiet: args.p_is_quiet }], error: null }; } }) },
    './photoService': { photoService: { prepare: async photo => photo, upload: async () => 'owner/photo.jpg', getPhotoUrl: () => 'photo-url' } },
  };
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('src/features/updates/updateService.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: id => mocks[id] });
  return { service: module.exports.updateService, requests };
}

for (const circleIds of [[], ['circle']]) {
  test(`${circleIds.length ? 'circle' : 'close-person'} moments cannot inherit a legacy quiet setting`, async () => {
    const h = harness();
    const result = await h.service.send({ userId: 'owner', photo: { uri: 'file:///photo.jpg' }, recipientIds: ['friend'], circleIds, caption: '', statusText: null, clientRequestId: 'request', isQuiet: true });
    assert.equal(h.requests[0].name, circleIds.length ? 'create_circle_update' : 'create_update_v2');
    assert.equal(h.requests[0].args.p_is_quiet, false);
    assert.equal(result.row.is_quiet, false);
  });
}
