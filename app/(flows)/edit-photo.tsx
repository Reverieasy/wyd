import { FlipType, ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { ActionButton, AppText, FlowHeader, MomentPhoto, Screen } from '@/src/components';
import type { DraftPhoto } from '@/src/models';
import { useAppStore } from '@/src/state/appStore';
export default function EditPhotoRoute() {
  const { state, actions } = useAppStore();
  const original = useRef(state.local.draft.photo);
  const [photo, setPhoto] = useState<DraftPhoto | null>(original.current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const edit = async (operation: 'rotate' | 'flip' | 'square') => {
    if (!photo || busy) return;
    setBusy(true); setError(null);
    try {
      const context = ImageManipulator.manipulate(photo.uri);
      if (operation === 'rotate') context.rotate(90);
      if (operation === 'flip') context.flip(FlipType.Horizontal);
      if (operation === 'square') { const size = Math.min(photo.width, photo.height); context.crop({ originX: Math.floor((photo.width - size) / 2), originY: Math.floor((photo.height - size) / 2), width: size, height: size }); }
      const image = await context.renderAsync();
      const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.95 });
      setPhoto({ ...photo, uri: result.uri, width: result.width, height: result.height, mimeType: 'image/jpeg' });
    } catch { setError('That edit could not be applied. Your original photo is safe.'); } finally { setBusy(false); }
  };
  if (!photo) return <Screen><FlowHeader title="Edit photo" /><AppText>No photo selected.</AppText></Screen>;
  return <Screen scroll><FlowHeader title="Edit photo" /><MomentPhoto photo={{ uri: photo.uri }} height={360} /><View style={{ gap: 10 }}><ActionButton label="Rotate 90°" variant="secondary" disabled={busy} onPress={() => void edit('rotate')} /><ActionButton label="Flip horizontally" variant="secondary" disabled={busy} onPress={() => void edit('flip')} /><ActionButton label="Crop to square" variant="secondary" disabled={busy} onPress={() => void edit('square')} /><ActionButton label="Reset edits" variant="secondary" disabled={busy} onPress={() => setPhoto(original.current)} /></View>{error ? <AppText style={{ color: '#B42318' }}>{error}</AppText> : null}<ActionButton label="Use photo" loading={busy} disabled={state.local.draft.sending} onPress={() => { actions.setDraftPhoto(photo); router.back(); }} /><ActionButton label="Cancel" variant="secondary" disabled={busy} onPress={() => router.back()} /></Screen>;
}
