const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

const actor = '11111111-1111-4111-8111-111111111111';
const owner = '22222222-2222-4222-8222-222222222222';
const participant = '33333333-3333-4333-8333-333333333333';
const commentId = '44444444-4444-4444-8444-444444444444';
function harness() {
  let handler;
  const state = {
    caller: actor, comment: { id: commentId, user_id: actor, update_id: 'moment' },
    recipients: [{ recipient_id: owner, is_reply: false }, { recipient_id: participant, is_reply: true }],
    preferences: [], recipientError: null, deliveries: [], sent: [],
  };
  function from(table) {
    let operation = 'select', values, filters = [];
    const matches = row => filters.every(([key, value, many]) => many ? value.includes(row[key]) : row[key] === value);
    function result() {
      if (table === 'moment_comments') return { data: state.comment };
      if (table === 'notification_jobs') return { data: { actor_id: actor, event_type: 'comment', event_id: commentId, status: 'processing' } };
      if (table === 'blocks') return { data: null };
      if (table === 'profiles') return { data: { display_name: 'Ara' } };
      if (table === 'notification_preferences') return { data: state.preferences };
      if (table === 'push_tokens') return { data: [owner, participant, actor].map(id => ({ id: 'token-' + id, user_id: id, enabled: true, expo_push_token: 'test-token-' + id })).filter(matches) };
      if (table === 'notification_deliveries') {
        if (operation === 'insert') {
          if (state.deliveries.some(row => row.push_token_id === values.push_token_id && row.event_id === values.event_id)) return { data: null, error: { code: '23505' } };
          const row = { id: 'delivery-' + state.deliveries.length, status: 'pending', ...values };
          state.deliveries.push(row); return { data: row };
        }
        const rows = state.deliveries.filter(matches);
        if (operation === 'update') rows.forEach(row => Object.assign(row, values));
        return { data: rows[0] ?? null };
      }
      throw Error('Unexpected table: ' + table);
    }
    const query = {
      select() { return query; }, eq(key, value) { filters.push([key, value, false]); return query; },
      in(key, value) { filters.push([key, value, true]); return query; }, or() { return query; }, limit() { return query; },
      insert(value) { operation = 'insert'; values = value; return query; }, update(value) { operation = 'update'; values = value; return query; },
      maybeSingle: async () => result(), single: async () => result(), then(resolve, reject) { return Promise.resolve().then(result).then(resolve, reject); },
    };
    return query;
  }
  const admin = { from, async rpc(name) {
    if (name === 'comment_push_recipients') return { data: state.recipients, error: state.recipientError };
    if (name === 'validate_worker_secret') return { data: true };
    throw Error('Unexpected RPC: ' + name);
  } };
  const mocks = {
    'jsr:@supabase/functions-js/edge-runtime.d.ts': {},
    '@supabase/supabase-js': { createClient: (_url, key) => key === 'service' ? admin : { auth: { async getUser() { return { data: { user: { id: state.caller } } }; } } } },
  };
  const source = ts.transpileModule(fs.readFileSync('supabase/functions/send-push-notification/index.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(source, {
    exports: {}, require: id => mocks[id], Request, Response, AbortSignal,
    Deno: { serve: fn => { handler = fn; }, env: { get: key => ({ SUPABASE_URL: 'https://example.invalid', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service' })[key] } },
    async fetch(_url, options) { const messages = JSON.parse(options.body); state.sent.push(...messages); return Response.json({ data: messages.map((_, i) => ({ status: 'ok', id: 'ticket-' + i })) }); },
  });
  const send = worker => handler(new Request('https://example.invalid/push', { method: 'POST', headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json', ...(worker ? { 'x-worker-secret': 'test-worker' } : {}) }, body: JSON.stringify(worker ? { jobId: 'job' } : { type: 'comment', eventId: commentId }) }));
  return { state, send };
}
test('push distinguishes photo-owner comments from replies, excludes self, and opens the same moment', async () => {
  const h = harness(); h.state.recipients.push({ recipient_id: actor, is_reply: true });
  assert.equal((await h.send()).status, 200);
  assert.equal(h.state.sent.length, 2);
  assert.equal(h.state.sent[0].title, 'Ara commented on your moment');
  assert.equal(h.state.sent[1].title, 'Ara replied in the comments');
  assert.deepEqual(h.state.sent[1].data, { type: 'comment', updateId: 'moment', commentId });
  assert.equal(h.state.sent[1].body, 'Open watchudoin? to read it.');
});
test('comment preferences and the global switch also control reply pushes', async () => {
  const h = harness(); h.state.preferences = [{ user_id: owner, enabled: false, comments: true }, { user_id: participant, enabled: true, comments: false }];
  assert.equal((await h.send()).status, 200); assert.equal(h.state.sent.length, 0);
});
test('client delivery followed by the background worker does not duplicate reply alerts', async () => {
  const h = harness(); await h.send(); await h.send(true);
  assert.equal(h.state.sent.length, 2); assert.equal(h.state.deliveries.length, 2);
});
test('forged authors and failed audience lookups cannot send reply notifications', async () => {
  const h = harness(); h.state.caller = owner;
  assert.equal((await h.send()).status, 403); assert.equal(h.state.sent.length, 0);
  h.state.caller = actor; h.state.recipientError = { message: 'offline' };
  assert.equal((await h.send()).status, 503); assert.equal(h.state.sent.length, 0);
});
