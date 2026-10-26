import assert from 'node:assert/strict';
import test from 'node:test';
import { createMomentPhotoUrl, createMomentPhotoSource } from '../src/features/updates/photoAccess.ts';

const project = 'https://example.supabase.co';
const path = 'owner/my photo.jpg';
const uri = createMomentPhotoUrl(project, path);

test('uses the authenticated route and encodes object names without a signed-link request', () => {
  assert.equal(uri, `${project}/storage/v1/object/authenticated/moment-photos/owner/my%20photo.jpg`);
  assert.equal(createMomentPhotoUrl(`${project}/`, path), uri);
  assert.equal(new URL(uri).search, '');
});

test('empty configuration and traversal paths do not produce image URLs', () => {
  for (const value of ['', '../photo.jpg', 'owner/../photo.jpg', '/photo.jpg', 'owner//photo.jpg']) {
    assert.equal(createMomentPhotoUrl(project, value), null);
  }
  assert.equal(createMomentPhotoUrl(undefined, path), null);
});

test('authenticated images use the current session credentials', () => {
  assert.deepEqual(createMomentPhotoSource(uri, 'first-token', project, 'public-key'), {
    uri, headers: { Authorization: 'Bearer first-token', apikey: 'public-key' },
  });
  assert.equal(createMomentPhotoSource(uri, 'refreshed-token', project, 'public-key').headers.Authorization, 'Bearer refreshed-token');
  assert.equal(createMomentPhotoSource(uri, undefined, project, 'public-key'), null);
});

test('tokens are never sent to other hosts, routes, local previews or lookalike origins', () => {
  for (const other of ['file:///photo.jpg', 'data:image/jpeg;base64,example', 'https://other.example/image.jpg',
    uri.replace('example.supabase.co', 'example.supabase.co.evil.example'),
    uri.replace('https:', 'http:'), uri.replace('/authenticated/', '/public/'),
    uri.replace('/moment-photos/', '/unrelated-bucket/')]) {
    assert.deepEqual(createMomentPhotoSource(other, 'secret-token', project, 'public-key'), { uri: other });
  }
  assert.equal(createMomentPhotoSource(null, 'secret-token', project, 'public-key'), null);
});

test('private avatars use session credentials and cannot load after logout', () => {
  const avatar = uri.replace('/moment-photos/', '/avatars/');
  assert.equal(createMomentPhotoSource(avatar, 'avatar-token', project, 'public-key').headers.Authorization, 'Bearer avatar-token');
  assert.equal(createMomentPhotoSource(avatar, undefined, project, 'public-key'), null);
});
