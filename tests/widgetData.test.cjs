const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks = {}) {
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, require: id => Object.hasOwn(mocks, id) ? mocks[id] : require(id) });
  return module.exports;
}
const model = load('src/features/widgets/widgetModel.ts');
function harness(options = {}) {
  const calls = { sessions: 0, settings: 0, connectionChecks: 0, queries: [], downloads: [], saves: [], clears: 0, crops: [], sizes: [] };
  const row = { id: 'moment', sender_id: 'friend', photo_path: 'friend/photo.jpg', status_text: 'Studying', created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 3600_000).toISOString() };
  const session = { user: { id: 'owner' }, access_token: 'private-session-token' };
  const settings = { enabled: true, personId: 'friend', design: options.design ?? 'small' };
  const query = Object.fromEntries(['select', 'eq', 'gt', 'order', 'limit'].map(name => [name, (...args) => { calls.queries.push([name, ...args]); return query; }]));
  query.maybeSingle = async () => ({ data: options.noMoment ? null : row, error: options.queryError ?? null });
  const extraQuery = table => {
    const q = { select: (...args) => { calls.queries.push(['select', ...args, table]); return q; }, eq: (...args) => { calls.queries.push(['eq', ...args, table]); return q; }, maybeSingle: async () => table === 'reactions' ? { data: { reaction: options.reaction ?? null }, error: options.reactionError ?? null } : { data: options.noReceipt ? null : { seen_at: options.seen ? new Date().toISOString() : null }, error: null } };
    return q;
  };
  class File {
    constructor() { this.uri = 'file:///private-cache/image.jpg'; this.exists = false; }
    static async downloadFileAsync(url, destination, config) { calls.downloads.push({ url, config }); return destination; }
    delete() {}
  }
  const context = () => ({ crop(value) { calls.crops.push(value); }, resize(value) { calls.sizes.push(value); }, async renderAsync() { return { width: 640, height: 480, async saveAsync() { return { uri: 'file:///private-cache/small.jpg', base64: 'cGhvdG8=' }; } }; } });
  const { loadWidgetSnapshot } = load('src/features/widgets/widgetData.android.ts', {
    'expo-file-system': { File, Paths: { cache: 'cache' } },
    'expo-image-manipulator': { ImageManipulator: { manipulate: context }, SaveFormat: { JPEG: 'jpeg' } },
    '@/src/lib/supabase': { getSupabase: () => ({ auth: { async getSession() { calls.sessions++; return { data: { session: options.signedOut || (options.switchAccount && calls.sessions > 1) ? null : session }, error: null }; } }, from: table => table === 'updates' ? query : extraQuery(table) }) },
    '@/src/lib/environment': { environment: { supabaseUrl: 'https://example.supabase.co', supabasePublishableKey: 'publishable-key' } },
    '@/src/features/updates/photoAccess': { createMomentPhotoUrl: (_project, photo) => `https://example.supabase.co/storage/v1/object/authenticated/moment-photos/${photo}` },
    '@/src/features/connections/connectionService': { connectionService: { async listForUser() { calls.connectionChecks++; return options.disconnected ? [] : [{ connection: { status: 'accepted' }, person: { id: 'friend', displayName: 'Friend', avatarPath: options.avatar ? 'friend/avatar.jpg' : null } }]; } } },
    './widgetModel': model,
    './widgetStorage': { widgetStorage: {
      async getSettings() { calls.settings++; return options.disabled || (options.disableDuringDownload && calls.settings > 1) ? { enabled: false, personId: null } : settings; },
      async clearPhoto() { calls.clears++; }, async savePhoto(snapshot) { calls.saves.push(snapshot); },
      async getPhoto() { return options.cached ? { ...model.emptyWidget('moment'), ownerId: 'owner', personId: 'friend', updateId: row.id, expiresAt: row.expires_at, photoData: 'data:image/jpeg;base64,cached' } : null; },
    } },
  });
  return { run: loadWidgetSnapshot, calls };
}

test('signed-out and disabled widgets never query or download private moments', async () => {
  for (const options of [{ signedOut: true }, { disabled: true }]) {
    const h = harness(options); const snapshot = await h.run();
    assert.equal(snapshot.photoData, null); assert.equal(h.calls.queries.length, 0); assert.equal(h.calls.downloads.length, 0); assert.equal(h.calls.clears, 1);
  }
});

test('a removed connection cannot reuse its cached photo', async () => {
  const h = harness({ disconnected: true, cached: true }); const snapshot = await h.run();
  assert.equal(snapshot.personId, null); assert.equal(snapshot.photoData, null); assert.equal(h.calls.queries.length, 0);
});

test('cached photos are reused only after checking the current connection and active moment', async () => {
  const h = harness({ cached: true }); const snapshot = await h.run();
  assert.equal(h.calls.connectionChecks, 1); assert.ok(h.calls.queries.some(([name, key]) => name === 'gt' && key === 'expires_at'));
  assert.equal(snapshot.photoData, 'data:image/jpeg;base64,cached'); assert.equal(h.calls.downloads.length, 0);
});

test('widget content contains only a thumbnail, never storage credentials or private URLs', async () => {
  const h = harness(); const snapshot = await h.run();
  assert.match(snapshot.photoData, /^data:image\/jpeg;base64,/);
  assert.equal(h.calls.downloads[0].config.headers.Authorization, 'Bearer private-session-token');
  assert.doesNotMatch(JSON.stringify(snapshot), /private-session-token|publishable-key|supabase.co/);
});

test('logout and disabling during a download prevent saving or displaying the downloaded photo', async () => {
  for (const options of [{ switchAccount: true }, { disableDuringDownload: true }]) {
    const h = harness(options); const snapshot = await h.run(); assert.equal(snapshot.photoData, null); assert.equal(h.calls.saves.length, 0);
  }
});

test('no active moment clears old photos while keeping the selected accepted person', async () => {
  const h = harness({ noMoment: true, cached: true }); const snapshot = await h.run();
  assert.equal(snapshot.mode, 'waiting'); assert.equal(snapshot.personId, 'friend'); assert.equal(snapshot.photoData, null); assert.equal(h.calls.clears, 1);
});

test('failed access revalidation cannot fall back to a previously cached photo', async () => {
  const h = harness({ queryError: Error('not authorized'), cached: true }); await assert.rejects(h.run(), /not authorized/);
  assert.equal(h.calls.downloads.length, 0); assert.equal(h.calls.saves.length, 0);
});

test('the private thumbnail preserves its source aspect ratio without downloading an unused avatar', async () => {
  const h = harness({ design: 'reactions', avatar: true }); const snapshot = await h.run();
  assert.equal(snapshot.design, 'large'); assert.equal(snapshot.avatarData, undefined);
  assert.deepEqual({ ...h.calls.sizes[0] }, { width: 640, height: 480 });
  assert.equal(h.calls.sizes.length, 1);
  assert.equal(h.calls.crops.length, 0);
  assert.equal(h.calls.downloads.length, 1);
  assert.doesNotMatch(JSON.stringify(snapshot), /private-session-token|supabase.co/);
});
test('reaction and unread indicators use only the current user and moment', async () => {
  const h = harness({ reaction: 'heart' }); const snapshot = await h.run();
  assert.equal(snapshot.myReaction, 'heart'); assert.equal(snapshot.isNew, true);
  assert.ok(h.calls.queries.some(([name,key,value,table]) => table === 'reactions' && name === 'eq' && key === 'user_id' && value === 'owner'));
  assert.ok(h.calls.queries.some(([name,key,value,table]) => table === 'update_recipients' && name === 'eq' && key === 'recipient_id' && value === 'owner'));
  assert.equal((await harness({ seen: true }).run()).isNew, false);
  assert.equal((await harness({ noReceipt: true }).run()).isNew, false);
  assert.equal((await harness({ reactionError: Error('unavailable') }).run()).myReaction, null);
});
