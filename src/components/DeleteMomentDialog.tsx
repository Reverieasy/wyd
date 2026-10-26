import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/src/state/appStore';
import { updateService } from '@/src/features/updates/updateService';
import { ConfirmationDialog } from './ConfirmationDialog';

export function DeleteMomentDialog({ updateId, onCancel, onDeleted }: { updateId: string | null; onCancel: () => void; onDeleted: () => void }) {
  const { state, actions } = useAppStore();
  const userId = state.server.session?.user.id;
  const currentUser = useRef(userId); currentUser.current = userId;
  const active = useRef(true), pending = useRef(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => { setError(null); }, [updateId, userId]);
  const remove = async () => {
    if (!updateId || !userId || pending.current) return;
    pending.current = true; setBusy(true); setError(null);
    try {
      await actions.deleteMoment(updateId);
      if (active.current && currentUser.current === userId) onDeleted();
    } catch (err) {
      if (active.current && currentUser.current === userId) setError(updateService.errorMessage(err));
    } finally { pending.current = false; if (active.current) setBusy(false); }
  };
  return <ConfirmationDialog visible={Boolean(updateId)} title="Delete this moment?" message="This permanently removes the photo and its comments from the app for everyone it was shared with." confirmLabel="Delete moment" busy={busy} error={error} onConfirm={() => void remove()} onCancel={() => { if (!pending.current) onCancel(); }} />;
}
