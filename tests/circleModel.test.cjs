const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks = {}) {
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, URL, require: id => Object.hasOwn(mocks, id) ? mocks[id] : require(id) });
  return module.exports;
}
const model = load('src/features/circles/circleModel.ts');
const code = '0123456789abcdef0123456789abcdef';

test('circle invites accept copied codes and links with the same normalized token', () => {
  assert.equal(model.normalizeCircleCode('01234567-89ABCDEF-01234567-89ABCDEF'), code);
  assert.equal(model.normalizeCircleCode(model.circleInviteLink(code)), code);
  assert.equal(model.normalizeCircleCode('https://example.test/join-circle?code=' + code), code);
});
test('malformed or incomplete circle tokens cannot become join requests', () => {
  for (const value of ['', 'someone', 'abcdef', 'z'.repeat(32), 'https://example.test/join-circle']) assert.equal(model.normalizeCircleCode(value), null);
  assert.throws(() => model.circleInviteLink('invalid'));
});
test('requesting a circle invite calls the approval RPC and never inserts membership', async () => {
  const calls = [];
  const { circleService } = load('src/features/circles/circleService.ts', {
    './circleModel': model,
    '@/src/features/profiles/profileService': {},
    '@/src/lib/serviceError': { ServiceError: Error, readableServiceError: value => value },
    '@/src/lib/supabase': { getSupabase: () => ({ async rpc(name, args) { calls.push({ name, args }); return { data: { circle_id: 'circle', status: 'pending' }, error: null }; }, from() { throw Error('Membership must be managed by the host-approved RPC'); } }) },
  });
  const result = await circleService.requestJoin(model.circleInviteLink(code));
  assert.equal(result.status, 'pending');
  assert.equal(calls[0].name, 'circle_action');
  assert.equal(calls[0].args.p_action, 'request_join');
  assert.equal(calls[0].args.p_code, code);
});
test('approval and rejection send the circle and request IDs for server-side host validation', async () => {
  const calls = [];
  const { circleService } = load('src/features/circles/circleService.ts', {
    './circleModel': model,
    '@/src/features/profiles/profileService': {},
    '@/src/lib/serviceError': { ServiceError: Error, readableServiceError: value => value },
    '@/src/lib/supabase': { getSupabase: () => ({ async rpc(_name, args) { calls.push(args); return { data: {}, error: null }; } }) },
  });
  await circleService.review('circle', 'request', true);
  await circleService.review('circle', 'request', false);
  assert.equal(calls[0].p_action, 'approve_join'); assert.equal(calls[1].p_action, 'decline_join');
  assert.equal(calls[0].p_circle_id, 'circle'); assert.equal(calls[0].p_request_id, 'request');
});
