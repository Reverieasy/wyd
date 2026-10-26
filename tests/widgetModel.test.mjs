import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyWidget, isCurrentWidgetPhoto, widgetStatus, widgetTime } from '../src/features/widgets/widgetModel.ts';

const now = Date.parse('2026-10-26T01:00:00.000Z');
const active = { ...emptyWidget('moment'), ownerId: 'owner', personId: 'friend', updateId: 'photo', expiresAt: new Date(now + 60_000).toISOString(), photoData: 'data:image/jpeg;base64,photo' };

test('widget photos require the same signed-in owner and a future expiration', () => {
  assert.equal(isCurrentWidgetPhoto(active, 'owner', now), true);
  assert.equal(isCurrentWidgetPhoto(active, 'other', now), false);
  assert.equal(isCurrentWidgetPhoto(active, null, now), false);
  assert.equal(isCurrentWidgetPhoto({ ...active, expiresAt: new Date(now).toISOString() }, 'owner', now), false);
  assert.equal(isCurrentWidgetPhoto({ ...active, expiresAt: null }, 'owner', now), false);
  assert.equal(isCurrentWidgetPhoto({ ...active, expiresAt: 'invalid' }, 'owner', now), false);
});

test('empty and unavailable widget states contain no private photo or owner', () => {
  for (const mode of ['setup', 'signed-out', 'unavailable']) {
    const snapshot = emptyWidget(mode);
    assert.equal(snapshot.ownerId, null); assert.equal(snapshot.photoData, null); assert.equal(snapshot.personId, null); assert.equal(snapshot.updateId, null);
  }
});

test('widget time labels handle just now, singular and plural times, and empty moments', () => {
  assert.equal(widgetTime(null, now), 'Waiting for a photo');
  assert.equal(widgetTime(new Date(now - 20_000).toISOString(), now), 'Just now');
  assert.equal(widgetTime(new Date(now - 60_000).toISOString(), now), '1 minute ago');
  assert.equal(widgetTime(new Date(now - 12 * 60_000).toISOString(), now), '12 minutes ago');
  assert.equal(widgetTime(new Date(now - 3_600_000).toISOString(), now), '1 hour ago');
  assert.equal(widgetTime('invalid', now), 'Open to refresh');
});

test('known statuses use the app emoji while custom statuses remain intact', () => {
  assert.match(widgetStatus('Studying'), /📚/);
  assert.equal(widgetStatus('Walking the dog'), 'Walking the dog');
  assert.equal(widgetStatus(null), 'A little moment');
});
