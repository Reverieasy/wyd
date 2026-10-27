const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

function harness(platform = 'web', href = 'http://localhost:8081/reset-password#access_token=access&refresh_token=refresh&type=recovery') {
  const location = new URL(href), history = [], requests = [];
  const browser = { location: { href, origin: location.origin }, history: { state: null, replaceState(_state, _title, value) { history.push(value); } } };
  const state = { session: { user: { id: 'owner' } }, clearError: false };
  const auth = {
    async resetPasswordForEmail(email, options) { requests.push({ email, options }); return { error: null }; },
    async signUp(input) { requests.push(input); return { data: { user: { identities: [{}] } }, error: null }; },
    async resend(input) { requests.push(input); return { error: null }; },
    async setSession(tokens) { requests.push(tokens); return { data: { session: state.session }, error: null }; },
  };
  class ServiceError extends Error {}
  const mocks = { 'react-native': { Platform: { OS: platform } }, '@react-native-async-storage/async-storage': { __esModule: true, default: { async removeItem() { if (state.clearError) throw Error('storage unavailable'); } } }, '@/src/lib/supabase': { getSupabase: () => ({ auth }) }, '@/src/lib/serviceError': { ServiceError, readableServiceError: error => error } };
  const modules = {};
  function load(name) {
    if (modules[name]) return modules[name].exports;
    const module = modules[name] = { exports: {} };
    const source = ts.transpileModule(fs.readFileSync('src/features/auth/' + name + '.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    vm.runInNewContext(source, { module, exports: module.exports, URL, URLSearchParams, window: browser, require: id => mocks[id] || load(id.replace('./', '')) });
    return module.exports;
  }
  return { redirects: load('authRedirects'), service: load('authService').authService, links: load('authLinkService').authLinkService, history, requests, state };
}

test('web recovery emails return to the current browser origin rather than the Android scheme', async () => {
  const h = harness(); await h.service.requestPasswordReset(' IVAN@EXAMPLE.COM ');
  assert.equal(h.requests[0].email, 'ivan@example.com');
  assert.equal(h.requests[0].options.redirectTo, 'http://localhost:8081/reset-password');
});

test('Android recovery emails retain the installed app deep link', async () => {
  const h = harness('android'); await h.service.requestPasswordReset('ivan@example.com');
  assert.equal(h.requests[0].options.redirectTo, 'watchudoin://reset-password');
});

test('web signup and resend callbacks also use the browser origin', async () => {
  const h = harness(); await h.service.signUp({ email: 'me@example.com', password: 'password', username: 'me' }); await h.service.resendSignupConfirmation('me@example.com');
  assert.equal(h.requests[0].options.emailRedirectTo, 'http://localhost:8081/email-confirmed');
  assert.equal(h.requests[1].options.emailRedirectTo, 'http://localhost:8081/email-confirmed');
});

test('web password callbacks create the recovery session and remove credentials from history', async () => {
  const url = 'http://localhost:8081/reset-password#access_token=access&refresh_token=refresh&type=recovery';
  const h = harness('web', url), result = await h.links.handle(url);
  assert.equal(result.kind, 'success'); assert.equal(result.recovery, true);
  assert.equal(h.requests[0].access_token, 'access'); assert.equal(h.requests[0].refresh_token, 'refresh');
  assert.deepEqual(h.history, ['/reset-password']);
});

test('query callbacks retain unrelated query data when removing credentials', async () => {
  const url = 'https://app.example.com/reset-password?from=email&access_token=access&refresh_token=refresh';
  const h = harness('web', url); assert.equal((await h.links.handle(url)).kind, 'success');
  assert.equal(h.history[0], '/reset-password?from=email');
});

test('untrusted origins and unrelated routes cannot supply a recovery session', async () => {
  const h = harness();
  for (const url of ['https://untrusted.example/reset-password#access_token=a&refresh_token=b', 'http://localhost:9999/reset-password#access_token=a&refresh_token=b', 'http://localhost:8081/other#access_token=a&refresh_token=b']) assert.equal((await h.links.handle(url)).kind, 'ignored');
  assert.equal(h.requests.length, 0); assert.equal(h.history.length, 0);
});

test('native callbacks support both hostname and pathname deep link forms', async () => {
  for (const url of ['watchudoin://reset-password#access_token=a&refresh_token=b', 'watchudoin:///reset-password#access_token=a&refresh_token=b']) {
    const h = harness('android'); const result = await h.links.handle(url);
    assert.equal(result.kind, 'success'); assert.equal(result.recovery, true); assert.equal(h.history.length, 0);
  }
});

test('expired and incomplete reset links show actionable recovery errors without a session', async () => {
  const url = 'http://localhost:8081/reset-password#error_code=otp_expired&error_description=Token+has+expired';
  const h = harness('web', url); const expired = await h.links.handle(url);
  assert.equal(expired.kind, 'error'); assert.equal(expired.recovery, true); assert.match(expired.message, /password reset link has expired/);
  assert.equal(h.requests.length, 0); assert.deepEqual(h.history, ['/reset-password']);
  assert.equal((await h.links.handle('http://localhost:8081/reset-password#access_token=only-one-token')).kind, 'error');
  assert.equal(h.requests.length, 0);
});

test('verification-email cleanup failure does not discard a valid recovery session', async () => {
  const h = harness(); h.state.clearError = true;
  assert.equal((await h.links.handle('http://localhost:8081/reset-password#access_token=a&refresh_token=b')).kind, 'success');
});

test('the redesigned email has an HTTPS confirmation button and a visible fallback link', () => {
  const html = fs.readFileSync('supabase/templates/recovery.html', 'utf8');
  const confirmation = 'https://project.supabase.co/auth/v1/verify?token=example&type=recovery&redirect_to=http%3A%2F%2Flocalhost%3A8081%2Freset-password';
  const rendered = html.replaceAll('{{ .ConfirmationURL }}', confirmation);
  assert.equal((rendered.match(/href="https:\/\/project\.supabase\.co\/auth\/v1\/verify/g) || []).length, 2);
  assert.ok(rendered.includes('Reset password &rarr;')); assert.ok(rendered.includes('>' + confirmation + '</a>'));
  assert.ok(!html.includes('href="watchudoin:')); assert.ok(!html.includes('src="http'));
});
