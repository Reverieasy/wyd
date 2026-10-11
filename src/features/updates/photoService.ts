import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { readableServiceError, ServiceError } from '@/src/lib/serviceError';
import { getSupabase } from '@/src/lib/supabase';
import type { DraftPhoto } from '@/src/models';

const BUCKET = 'moment-photos';
const MAX_BYTES = 6 * 1024 * 1024;
const MAX_DIMENSION = 1600;
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export type PreparedPhoto = {
  uri: string;
  width: number;
  height: number;
  size: number;
  mimeType: 'image/jpeg';
};

async function saveWithinLimit(photo: DraftPhoto): Promise<PreparedPhoto> {
  const context = ImageManipulator.manipulate(photo.uri);
  if (Math.max(photo.width, photo.height) > MAX_DIMENSION) {
    if (photo.width >= photo.height) context.resize({ width: MAX_DIMENSION });
    else context.resize({ height: MAX_DIMENSION });
  }

  const rendered = await context.renderAsync();
  for (const compress of [0.82, 0.68, 0.52]) {
    const result = await rendered.saveAsync({ compress, format: SaveFormat.JPEG });
    const file = new File(result.uri);
    if (file.size <= MAX_BYTES) {
      return {
        uri: result.uri,
        width: result.width,
        height: result.height,
        size: file.size,
        mimeType: 'image/jpeg',
      };
    }
  }

  throw new ServiceError('That photo is still too large after compression. Choose another photo.', 'photo_too_large');
}

export const photoService = {
  prepare: saveWithinLimit,

  createPath(userId: string, objectId = Crypto.randomUUID()) {
    return `${userId}/${objectId}.jpg`;
  },

  async upload(userId: string, photo: PreparedPhoto, objectId?: string) {
    if (photo.size > MAX_BYTES) {
      throw new ServiceError('That photo is larger than 6 MB.', 'photo_too_large');
    }
    const path = this.createPath(userId, objectId);
    const bytes = await new File(photo.uri).arrayBuffer();
    const { error } = await getSupabase().storage.from(BUCKET).upload(path, bytes, {
      cacheControl: '3600',
      contentType: photo.mimeType,
      upsert: false,
    });
    if (error && objectId) {
      try {
        const { error: lookupError } = await getSupabase().storage.from(BUCKET).createSignedUrl(path, 60);
        if (!lookupError) return path;
      } catch {
        // Fall through to the original upload error.
      }
    }
    if (error) throw readableServiceError(error);
    return path;
  },

  async remove(path: string) {
    const { error } = await getSupabase().storage.from(BUCKET).remove([path]);
    if (error) throw readableServiceError(error);
  },

  async createSignedUrl(path: string) {
    const { data, error } = await getSupabase().storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (error) throw readableServiceError(error);
    return data.signedUrl;
  },
};
