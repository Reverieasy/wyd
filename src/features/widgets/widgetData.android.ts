import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { getSupabase } from '@/src/lib/supabase';
import { environment } from '@/src/lib/environment';
import { createMomentPhotoUrl } from '@/src/features/updates/photoAccess';
import { connectionService } from '@/src/features/connections/connectionService';
import { emptyWidget, isCurrentWidgetPhoto, isWidgetReaction, parseWidgetDesign, widgetStatus, type WidgetSnapshot } from './widgetModel';
import { widgetStorage } from './widgetStorage';

// Photos are authorized with the current session, then reduced to a small private
// bitmap. Access tokens and signed URLs are never written into widget content.
async function downloadPhoto(path: string, ownerId: string, updateId: string, accessToken: string): Promise<WidgetSnapshot['photoData']> {
  const url = createMomentPhotoUrl(environment.supabaseUrl, path);
  if (!url) return null;
  const destination = new File(Paths.cache, `wyd-widget-${ownerId}-${updateId}-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);
  let renderedUri: string | null = null;
  try {
    const file = await File.downloadFileAsync(url, destination, { idempotent: true, headers: { Authorization: `Bearer ${accessToken}`, apikey: environment.supabasePublishableKey! } });
    const original = await ImageManipulator.manipulate(file.uri).renderAsync();
    const context = ImageManipulator.manipulate(original);
    // Preserve the entire photo and its aspect ratio for every launcher size.
    const scale = Math.min(1, 640 / Math.max(original.width, original.height));
    context.resize({ width: Math.max(1, Math.round(original.width * scale)), height: Math.max(1, Math.round(original.height * scale)) });
    const rendered = await context.renderAsync();
    const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.65, base64: true });
    renderedUri = result.uri;
    return result.base64 ? `data:image/jpeg;base64,${result.base64}` : null;
  } finally {
    if (destination.exists) destination.delete();
    if (renderedUri) { const file = new File(renderedUri); if (file.exists) file.delete(); }
  }
}

export async function loadWidgetSnapshot(): Promise<WidgetSnapshot> {
  const client = getSupabase();
  const { data: auth, error: authError } = await client.auth.getSession();
  if (authError || !auth.session) { await widgetStorage.clearPhoto(); return emptyWidget('signed-out'); }
  const userId = auth.session.user.id;
  const settings = await widgetStorage.getSettings(userId);
  if (!settings.enabled || !settings.personId || settings.personId === userId) { await widgetStorage.clearPhoto(); return emptyWidget(); }
  const connections = await connectionService.listForUser(userId);
  const person = connections.find(entry => entry.connection.status === 'accepted' && entry.person.id === settings.personId)?.person;
  if (!person) { await widgetStorage.clearPhoto(); return emptyWidget(); }
  const base: WidgetSnapshot = { ...emptyWidget('waiting'), ownerId: userId, personId: person.id, name: person.displayName, status: 'No moment yet', design: parseWidgetDesign(settings.design) };
  const { data: row, error } = await client.from('updates').select('id,sender_id,photo_path,status_text,created_at,expires_at')
    .eq('sender_id', person.id).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  if (!row) { await widgetStorage.clearPhoto(); return base; }
  const snapshot: WidgetSnapshot = { ...base, mode: 'moment', updateId: row.id, status: widgetStatus(row.status_text), createdAt: row.created_at, expiresAt: row.expires_at };
  const cached = await widgetStorage.getPhoto(userId);
  const [photoData, reaction, receipt] = await Promise.all([
    cached?.updateId === row.id && cached.personId === person.id && isCurrentWidgetPhoto(cached, userId) ? cached.photoData : downloadPhoto(row.photo_path, userId, row.id, auth.session.access_token).catch(() => null),
    client.from('reactions').select('reaction').eq('update_id', row.id).eq('user_id', userId).maybeSingle(),
    client.from('update_recipients').select('seen_at').eq('update_id', row.id).eq('recipient_id', userId).maybeSingle(),
  ]);
  snapshot.photoData = photoData;
  snapshot.myReaction = !reaction.error && isWidgetReaction(reaction.data?.reaction) ? reaction.data.reaction : null;
  snapshot.isNew = Boolean(!receipt.error && receipt.data && receipt.data.seen_at === null);
  // A logout, account switch or changed selection during the download invalidates it.
  const { data: current } = await client.auth.getSession();
  const currentSettings = await widgetStorage.getSettings(userId);
  if (current.session?.user.id !== userId || !currentSettings.enabled || currentSettings.personId !== person.id) return emptyWidget('signed-out');
  snapshot.design = parseWidgetDesign(currentSettings.design);
  if (!isCurrentWidgetPhoto(snapshot, userId)) { await widgetStorage.clearPhoto(); return base; }
  await widgetStorage.savePhoto(snapshot);
  return snapshot;
}
