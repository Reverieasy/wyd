import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { getSupabase } from '@/src/lib/supabase';
import { environment } from '@/src/lib/environment';
import { readableServiceError, ServiceError } from '@/src/lib/serviceError';
import type { DraftPhoto } from '@/src/models';

export function avatarUrl(path: string | null) {
  if (!path || !environment.supabaseUrl) return null;
  const parts = path.split('/');
  if (parts.some(part => !part || part === '.' || part === '..')) return null;
  return `${environment.supabaseUrl}/storage/v1/object/authenticated/avatars/${parts.map(encodeURIComponent).join('/')}`;
}

export const avatarService = {
  async upload(userId: string, photo: DraftPhoto) {
    const context = ImageManipulator.manipulate(photo.uri);
    const edge = Math.min(photo.width, photo.height);
    context.crop({ originX: (photo.width - edge) / 2, originY: (photo.height - edge) / 2, width: edge, height: edge });
    context.resize({ width: 512, height: 512 });
    const rendered = await context.renderAsync();
    const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
    const bytes = Platform.OS === 'web' ? await (await fetch(result.uri)).arrayBuffer() : await new File(result.uri).arrayBuffer();
    if (bytes.byteLength > 2 * 1024 * 1024) throw new ServiceError('Choose a smaller profile photo.', 'avatar_too_large');
    const path = `${userId}/${Crypto.randomUUID()}.jpg`;
    const client = getSupabase();
    const { error } = await client.storage.from('avatars').upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
    if (error) throw readableServiceError(error);
    const { error: updateError } = await client.rpc('update_avatar', { p_path: path });
    if (updateError) {
      await client.storage.from('avatars').remove([path]).catch(() => undefined);
      throw readableServiceError(updateError);
    }
    return path;
  },
  async removeOld(path: string) {
    await getSupabase().storage.from('avatars').remove([path]);
  },
};
