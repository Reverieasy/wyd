const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const source = fs.readFileSync('auth-site/confirmation.js', 'utf8');
const settle = () => new Promise(resolve => setImmediate(resolve));
function harness({ hash = '#access_token=test-access&refresh_token=test-refresh&type=signup', search = '', android = false, ok = true, user = { id: 'person', email_confirmed_at: '2026-10-28' }, offline = false } = {}) {
  const nodes = Object.fromEntries(['status','title','message','detail'].map(id => [id, { textContent: '' }]));
  const requests = [], navigation = [], history = [];
  const window = { location: { search, hash, pathname: '/email-confirmed', assign: value => navigation.push(value) }, history: { replaceState(_state, _title, url) { history.push(url); } }, WATCHUDOIN_AUTH: { url: 'https://example.supabase.co', publishableKey: 'sb_publishable_example' } };
  vm.runInNewContext(source, { window, navigator: { userAgent: android ? 'Android' : 'Windows' }, document: { getElementById: id => nodes[id] }, URLSearchParams, AbortController, setTimeout, clearTimeout, fetch: async (url, options) => { assert.deepEqual(history, ['/email-confirmed']); requests.push({ url, options }); if (offline) throw Error('offline'); return { ok, status: ok ? 200 : 401, json: async () => user }; } });
  return { nodes, requests, navigation, history };
}
test('desktop confirmation verifies the session, scrubs the URL and shows a real result without opening an app scheme', async () => {
  const h = harness(); await settle();
  assert.equal(h.nodes.title.textContent, 'Account confirmed');
  assert.equal(h.nodes.message.textContent, 'You can close this now.');
  assert.match(h.nodes.detail.textContent, /sign in/);
  assert.equal(h.navigation.length, 0);
  assert.equal(h.requests[0].url, 'https://example.supabase.co/auth/v1/user');
  assert.equal(h.requests[0].options.headers.Authorization, 'Bearer test-access');
  assert.equal(h.requests[0].options.cache, 'no-store');
});
test('Android also asks the user to close the page and reopen the app manually', async () => {
  const h = harness({ android: true }); await settle();
  assert.equal(h.nodes.title.textContent, 'Account confirmed');
  assert.equal(h.nodes.message.textContent, 'You can close this now.');
  assert.match(h.nodes.detail.textContent, /Reopen watchudoin\?/);
  assert.equal(h.navigation.length, 0);
  assert.doesNotMatch(fs.readFileSync('auth-site/index.html', 'utf8'), /open-app|Open Android app/);
});
test('expired, incomplete, unconfirmed and offline links always have a visible recovery state', async () => {
  for (const options of [{ hash: '#error_code=otp_expired' }, { hash: '' }, { user: { id: 'person', email_confirmed_at: null } }, { ok: false }, { offline: true }]) {
    const h = harness({ ...options, android: true }); await settle();
    assert.notEqual(h.nodes.title.textContent, 'Account confirmed');
    assert.ok(h.nodes.message.textContent);
    assert.equal(h.navigation.length, 0);
  }
});
test('server error descriptions are never rendered as page markup or text', async () => {
  const h = harness({ hash: '#error_description=%3Cscript%3Eprivate%3C%2Fscript%3E' }); await settle();
  assert.equal(h.requests.length, 0); assert.doesNotMatch(JSON.stringify(h.nodes), /<script>|private/);
});
