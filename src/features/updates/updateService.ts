import type { UpdateRowType } from '@/src/lib/database.types';
import { readableServiceError, ServiceError } from '@/src/lib/serviceError';
import { getSupabase } from '@/src/lib/supabase';
import type { DraftPhoto } from '@/src/models';
import { photoService } from './photoService';

type SendUpdateInput = {
  userId: string;
  photo: DraftPhoto;
  recipientIds: string[];
  circleIds?: string[];
  caption: string;
  statusText: string | null;
  isQuiet: boolean;
  clientRequestId: string;
};

type SendStage = 'preparing' | 'uploading' | 'creating';

const updateErrors: Record<string, string> = {
  AUTH_REQUIRED: 'Sign in again to send this update.',
  invalid_photo_path: 'The photo could not be attached. Please try again.',
  caption_too_long: 'Keep your caption to 150 characters or fewer.',
  status_too_long: 'Keep your status to 40 characters or fewer.',
  recipient_required: 'Choose at least one person.',
  too_many_recipients: 'You selected too many people for one update.',
  recipient_not_connected: 'You can only send updates to accepted connections.',
  circle_member_required: 'Join this circle and wait for host approval before sharing.',
  terms_required: 'Accept the current Terms of Use before sharing a moment.',
  blocked_relationship: 'You cannot share a moment with this person.',
  request_id_required: 'This draft could not be prepared. Retake the photo and try again.',
};

function mapUpdateError(error: unknown) {
  const fallback = readableServiceError(error);
  const raw = error instanceof Error
    ? error.message
    : typeof error === 'object' && error && 'message' in error && typeof error.message === 'string'
      ? error.message
      : '';
  const code = Object.keys(updateErrors).find((candidate) => raw.includes(candidate));
  return code ? new ServiceError(updateErrors[code], code, error) : fallback;
}

export const updateService = {
  errorMessage(error: unknown) {
    return mapUpdateError(error).message;
  },

  async send(input: SendUpdateInput, onStage?: (stage: SendStage) => void): Promise<{ row: UpdateRowType; photoUrl: string | null }> {
    if (input.caption.length > 150) throw new ServiceError(updateErrors.caption_too_long, 'caption_too_long');
    if (input.statusText && input.statusText.length > 40) throw new ServiceError(updateErrors.status_too_long, 'status_too_long');
    if (input.recipientIds.length === 0 && !input.circleIds?.length) throw new ServiceError(updateErrors.recipient_required, 'recipient_required');
    onStage?.('preparing');
    const photo = await photoService.prepare(input.photo);
    onStage?.('uploading');
    const photoPath = await photoService.upload(input.userId, photo, input.clientRequestId);

    let row: UpdateRowType;
    try {
      onStage?.('creating');
      const circleIds = input.circleIds ?? [];
      const { data, error } = await getSupabase().rpc(circleIds.length ? 'create_circle_update' : 'create_update_v2', {
        p_photo_path: photoPath,
        p_recipient_ids: input.recipientIds,
        p_caption: input.caption.trim() || null,
        p_status_text: input.statusText?.trim() || null,
        p_is_quiet: input.isQuiet,
        p_client_request_id: input.clientRequestId,
        ...(circleIds.length ? { p_circle_ids: circleIds } : {}),
      });
      if (error) throw error;
      if (!data?.[0]) throw new ServiceError('The update was not created. Please try again.', 'update_missing');
      row = data[0];
    } catch (error) {
      const mapped = mapUpdateError(error);
      const safeToRemove = new Set([
        'invalid_photo_path', 'caption_too_long', 'status_too_long', 'recipient_required',
        'too_many_recipients', 'recipient_not_connected', 'terms_required', 'blocked_relationship',
        'request_id_required',
        'circle_member_required',
      ]).has(mapped.code);
      if (safeToRemove) {
        try { await photoService.remove(photoPath); }
        catch { /* Preserve the original create error. */ }
      }
      throw mapped;
    }

    return { row, photoUrl: photoService.getPhotoUrl(row.photo_path) };
  },

  async markSeen(updateId: string) {
    const { data, error } = await getSupabase().rpc('mark_update_seen', { p_update_id: updateId });
    if (error) throw mapUpdateError(error);
    return data;
  },
};
