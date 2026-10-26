import { getSupabase } from '@/src/lib/supabase';
import { environment } from '@/src/lib/environment';
import { createMomentPhotoSource, createMomentPhotoUrl } from './photoAccess';
import { isMomentRetained } from './momentRetention';

export const PHOTO_WATERMARK = 'watchudoin?';
export function photoExportMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (/native module|viewshot|media.?library|not installed/i.test(message)) return 'Install the updated app build to save photos.';
  if (/Sign in again|no longer available|Allow saving|Could not|This photo|This browser|Your account/i.test(message)) return message;
  return 'Could not save the photo. Check your connection and try again.';
}
export function exportDimensions(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new Error('Could not read this photo.');
  const scale = Math.min(1, 2048 / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
export async function authorizePhotoExport(updateId: string, ownerId: string) {
  const client = getSupabase();
  const { data: auth } = await client.auth.getSession();
  if (auth.session?.user.id !== ownerId) throw new Error('Sign in again before saving this photo.');
  const { data: row, error } = await client.from('updates').select('id,sender_id,photo_path,created_at,expires_at').eq('id', updateId).maybeSingle();
  if (error || !row || !isMomentRetained(row.created_at) || (row.sender_id !== ownerId && row.expires_at && Date.parse(row.expires_at) <= Date.now())) throw new Error('This moment is no longer available to save.');
  const source = createMomentPhotoSource(createMomentPhotoUrl(environment.supabaseUrl, row.photo_path), auth.session.access_token, environment.supabaseUrl, environment.supabasePublishableKey);
  if (!source) throw new Error('This photo is unavailable.');
  return source;
}
export async function requestGalleryAccess() {
  const media = await import('expo-media-library');
  const permission = await media.requestPermissionsAsync(true);
  if (!permission.granted) throw new Error('Allow saving photos in your device settings, then try again.');
}
export async function saveCapturedPhoto(uri: string, updateId: string, ownerId: string) {
  await authorizePhotoExport(updateId, ownerId);
  const { Asset } = await import('expo-media-library');
  await Asset.create(uri.startsWith('file://') ? uri : `file://${uri}`);
}
export async function downloadPhotoWeb(updateId: string, ownerId: string) {
  const source = await authorizePhotoExport(updateId, ownerId);
  const response = await fetch(source.uri, { headers: source.headers });
  if (!response.ok) throw new Error('Could not download the photo. Try again.');
  const bitmap = await createImageBitmap(await response.blob());
  try {
    const dimensions = exportDimensions(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    Object.assign(canvas, dimensions);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser could not prepare the photo.');
    context.drawImage(bitmap, 0, 0, dimensions.width, dimensions.height);
    await document.fonts.ready;
    context.font = `900 ${Math.max(16, dimensions.width * 0.032)}px Nunito_900Black, sans-serif`;
    context.fillStyle = 'rgba(255,255,255,0.94)'; context.textAlign = 'right'; context.textBaseline = 'bottom';
    context.shadowColor = 'rgba(0,0,0,0.75)'; context.shadowBlur = 4; context.shadowOffsetY = 1;
    context.fillText(PHOTO_WATERMARK, dimensions.width * 0.98, dimensions.height * 0.98);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Could not prepare the download.')), 'image/jpeg', 0.95));
    await authorizePhotoExport(updateId, ownerId);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `watchudoin-${updateId}.jpg`;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  } finally { bitmap.close(); }
}
