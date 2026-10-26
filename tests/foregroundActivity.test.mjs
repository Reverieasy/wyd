import assert from 'node:assert/strict';
import test from 'node:test';
import { ForegroundActivityTracker } from '../src/features/notifications/foregroundActivity.ts';

const prefs = { enabled: true, moments: true, reactions: true, comments: true, nudges: true, connections: true };
const moment = (id, second, extra = {}) => ({ id: `moment:${id}`, kind: 'moment', actor: { id: 'friend' }, createdAt: `2026-10-26T01:00:${String(second).padStart(2, '0')}.000Z`, updateId: id, read: false, ...extra });
const read = (tracker, items, options = {}) => tracker.read(options.user ?? 'owner', options.hydrated ?? true, items, { ...prefs, ...options.preferences }, options.active ?? true);

test('new comment alerts respect their preference and do not replay after a refresh', () => {
  const tracker = new ForegroundActivityTracker(); read(tracker, []);
  const comment = moment('commented', 20, { kind: 'comment', id: 'comment:one' });
  assert.equal(read(tracker, [comment]).length, 1);
  assert.equal(read(tracker, [comment]).length, 0);
  assert.equal(read(tracker, [moment('commented', 30, { kind: 'comment', id: 'comment:two' })], { preferences: { comments: false } }).length, 0);
});

test('initial loading seeds history without creating old-notification popups', () => {
  const tracker = new ForegroundActivityTracker();
  assert.deepEqual(read(tracker, [], { hydrated: false }), []);
  assert.deepEqual(read(tracker, [moment('old', 10)]), []);
  assert.deepEqual(read(tracker, [moment('old', 10)]), []);
});

test('new photos appear once across repeated realtime refreshes and push refreshes', () => {
  const tracker = new ForegroundActivityTracker(); read(tracker, [moment('old', 10)]);
  assert.equal(read(tracker, [moment('new', 20), moment('old', 10)])[0].updateId, 'new');
  assert.deepEqual(read(tracker, [moment('new', 20), moment('old', 10)]), []);
});

test('older activity loaded by pagination never creates a popup', () => {
  const tracker = new ForegroundActivityTracker(); read(tracker, [moment('newest', 20)]);
  assert.deepEqual(read(tracker, [moment('newest', 20), moment('older', 5)]), []);
});

test('quiet photos, own activity, read items and other event kinds are excluded', () => {
  const tracker = new ForegroundActivityTracker(); read(tracker, []);
  assert.deepEqual(read(tracker, [moment('quiet', 20, { quiet: true }), moment('own', 20, { actor: { id: 'owner' } }), moment('read', 20, { read: true }), moment('nudge', 20, { kind: 'nudge' })]), []);
});

test('disabled categories are consumed without replaying when enabled later', () => {
  const tracker = new ForegroundActivityTracker(); read(tracker, []);
  const items = [moment('off', 20)];
  assert.deepEqual(read(tracker, items, { preferences: { enabled: false } }), []);
  assert.deepEqual(read(tracker, items), []);
  assert.deepEqual(read(tracker, [moment('off2', 21)], { preferences: { moments: false } }), []);
});

test('new reactions and changed reactions notify once per saved version', () => {
  const tracker = new ForegroundActivityTracker(); read(tracker, []);
  const reaction = moment('reaction', 20, { id: 'reaction:r', kind: 'reaction', reaction: 'heart' });
  assert.equal(read(tracker, [reaction]).length, 1);
  assert.deepEqual(read(tracker, [reaction]), []);
  const changed = { ...reaction, reaction: 'laugh', createdAt: '2026-10-26T01:00:21.000Z' };
  assert.equal(read(tracker, [changed])[0].reaction, 'laugh');
  assert.deepEqual(read(tracker, [changed]), []);
});

test('background activity is consumed without resurfacing on resume', () => {
  const tracker = new ForegroundActivityTracker(); read(tracker, []);
  const items = [moment('background', 20)];
  assert.deepEqual(read(tracker, items, { active: false }), []);
  assert.deepEqual(read(tracker, items), []);
});

test('switching accounts resets the history and prevents previous-account alerts', () => {
  const tracker = new ForegroundActivityTracker(); read(tracker, [moment('owner-history', 20)]);
  assert.deepEqual(read(tracker, [moment('other-history', 30)], { user: 'other' }), []);
  assert.deepEqual(tracker.read(null, false, [], prefs, true), []);
});
