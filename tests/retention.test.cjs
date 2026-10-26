const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks = {}, globals = {}) {
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, ...globals, require: id => Object.hasOwn(mocks, id) ? mocks[id] : require(id) });
  return module.exports;
}
const { cleanupExpiredMoments, retentionCutoff } = load('supabase/functions/cleanup-expired-moments/cleanup.ts');
const { isMomentRetained } = load('src/features/updates/momentRetention.ts');
const now = Date.parse('2026-10-26T08:00:00.000Z');
const day = 86400000;
function fixture() {
  const state = { rows: [{ id: 'old', photo_path: 'owner/old.jpg', created_at: new Date(now - 31 * day).toISOString() }, { id: 'fresh', photo_path: 'owner/fresh.jpg', created_at: new Date(now - 29 * day).toISOString() }],
    objects: [{ name: 'owner/old.jpg', created_at: now - 31 * day }, { name: 'owner/orphan.jpg', created_at: now - 31 * day }, { name: 'owner/fresh.jpg', created_at: now - 29 * day }], removes: [], deletes: [], storageError: false, databaseError: false };
  const admin = {
    async rpc(name, args) { assert.equal(name, 'list_expired_moment_objects'); return { data: state.objects.filter(row => row.created_at <= Date.parse(args.p_cutoff)), error: null }; },
    storage: { from(bucket) { assert.equal(bucket, 'moment-photos'); return { async remove(paths) { state.removes.push([...paths]); if (state.storageError) return { error: Error('storage failed') }; state.objects = state.objects.filter(row => !paths.includes(row.name)); return { error: null }; } }; } },
    from(table) {
      assert.equal(table, 'updates');
      return {
        select() { return { lte(field, cutoff) { assert.equal(field, 'created_at'); return { order() { return { async limit() { return { data: state.rows.filter(row => Date.parse(row.created_at) <= Date.parse(cutoff)), error: null }; } }; } }; } }; },
        delete() { return { in(field, values) {
          const remove = async cutoff => {
            state.deletes.push({ field, values });
            if (state.databaseError) return { error: Error('database failed') };
            state.rows = state.rows.filter(row => !(values.includes(row[field]) && (!cutoff || row.created_at <= cutoff)));
            return { error: null };
          };
          return field === 'id' ? { lte(_field, cutoff) { return remove(cutoff); } } : remove();
        } }; },
      };
    },
  };
  return { state, admin };
}

test('30-day retention is measured from upload, and hides a moment exactly at its cutoff', () => {
  assert.equal(retentionCutoff(now), '2026-09-26T08:00:00.000Z');
  assert.equal(isMomentRetained(new Date(now - 30 * day).toISOString(), now), false);
  assert.equal(isMomentRetained(new Date(now - 30 * day + 1).toISOString(), now), true);
  assert.equal(isMomentRetained('invalid', now), false);
});
test('cleanup removes expired moment files and orphan uploads while preserving younger photos', async () => {
  const { state, admin } = fixture();
  const result = await cleanupExpiredMoments(admin, now);
  assert.equal(result.deleted, 1); assert.equal(result.files_deleted, 2);
  assert.deepEqual(state.removes[0].sort(), ['owner/old.jpg', 'owner/orphan.jpg']);
  assert.deepEqual(state.rows.map(row => row.id), ['fresh']);
  assert.deepEqual(state.objects.map(row => row.name), ['owner/fresh.jpg']);
});
test('Storage failures never delete moment records', async () => {
  const { state, admin } = fixture(); state.storageError = true;
  await assert.rejects(cleanupExpiredMoments(admin, now), /photo_cleanup_failed/);
  assert.equal(state.deletes.length, 0); assert.equal(state.rows.length, 2);
});
test('database failures can be retried after files were already removed', async () => {
  const { state, admin } = fixture(); state.databaseError = true;
  await assert.rejects(cleanupExpiredMoments(admin, now), /database_cleanup_failed/);
  state.databaseError = false;
  await cleanupExpiredMoments(admin, now);
  assert.deepEqual(state.rows.map(row => row.id), ['fresh']);
});
test('the cleanup endpoint rejects unauthenticated requests before deleting anything', async () => {
  let handler, cleanups = 0;
  load('supabase/functions/cleanup-expired-moments/index.ts', {
    'jsr:@supabase/functions-js/edge-runtime.d.ts': {},
    '@supabase/supabase-js': { createClient: () => ({ rpc: async () => ({ data: false, error: null }) }) },
    './cleanup.ts': { async cleanupExpiredMoments() { cleanups++; return {}; } },
  }, { Request, Response, Deno: { serve(fn) { handler = fn; }, env: { get: name => ({ SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'server-only-test-key' })[name] } } });
  assert.equal((await handler(new Request('https://example.test', { method: 'POST' }))).status, 401);
  assert.equal((await handler(new Request('https://example.test', { method: 'POST', headers: { 'x-worker-secret': 'wrong' } }))).status, 401);
  assert.equal((await handler(new Request('https://example.test', { method: 'GET' }))).status, 405);
  assert.equal(cleanups, 0);
});
