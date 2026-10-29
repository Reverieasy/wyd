import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { getSupabase } from '@/src/lib/supabase';
import { nudgeService } from '@/src/features/activity/nudgeService';
import { reactionService } from '@/src/features/activity/reactionService';
import { notificationService } from '@/src/features/notifications/notificationService';
import { MomentWidget } from './MomentWidget.android';
import { loadWidgetSnapshot } from './widgetData.android';
import { momentWidgetNames, widgetDesignForName, widgetActionsForDesign, emptyWidget, isCurrentWidgetPhoto, isWidgetReaction, type WidgetAction, type WidgetSnapshot } from './widgetModel';
import { widgetStorage } from './widgetStorage';
import { getWidgetApi } from './nativeWidgetApi.android';
import { readWidgetAppearance } from './widgetAppearance';

let interacting = false;
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const design = widgetDesignForName(props.widgetInfo.widgetName);
  if (!design) return;
  if (props.widgetAction === 'WIDGET_DELETED') {
    const api = getWidgetApi();
    const remaining = api ? (await Promise.all(momentWidgetNames.map(name => api.getWidgetInfo(name)))).flat() : [];
    if (!remaining.some(widget => widget.widgetId !== props.widgetInfo.widgetId)) await widgetStorage.clearPhoto();
    return;
  }
  const mode = await readWidgetAppearance();
  const render = (snapshot: WidgetSnapshot, pendingAction?: WidgetAction, feedback?: string) => {
    const view = (isDark: boolean) => <MomentWidget snapshot={{ ...snapshot, design }} width={props.widgetInfo.width} height={props.widgetInfo.height} pendingAction={pendingAction} feedback={feedback} isDark={isDark} />;
    props.renderWidget(mode === 'system' ? { light: view(false), dark: view(true) } : view(mode === 'dark'));
  };
  const deadline = Date.now() + 25_000;
  const bounded = async <T,>(operation: Promise<T>): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try { return await Promise.race([operation, new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error('Open the app to refresh this widget.')), Math.max(1, deadline - Date.now())); })]); }
    finally { if (timer) clearTimeout(timer); }
  };
  let snapshot: WidgetSnapshot;
  try { snapshot = await bounded(loadWidgetSnapshot()); }
  catch { render(emptyWidget('unavailable')); return; }
  const reacting = props.clickAction === 'REACT_TO_MOMENT';
  const nudging = props.clickAction === 'NUDGE_PERSON';
  const reaction = props.clickActionData?.reaction;
  if (props.widgetAction !== 'WIDGET_CLICK' || (!reacting && !nudging)) { render(snapshot); return; }
  const action = nudging ? 'nudge' : isWidgetReaction(reaction) ? reaction : null;
  const allowed = action && widgetActionsForDesign(design).includes(action);
  if (!allowed || interacting || !snapshot.ownerId || !snapshot.personId || snapshot.ownerId === snapshot.personId ||
      props.clickActionData?.ownerId !== snapshot.ownerId || props.clickActionData?.personId !== snapshot.personId) { render(snapshot); return; }
  if (reacting && (!isCurrentWidgetPhoto(snapshot, snapshot.ownerId) || props.clickActionData?.updateId !== snapshot.updateId || !isWidgetReaction(reaction))) { render(snapshot); return; }
  if (nudging && !(snapshot.mode === 'waiting' || isCurrentWidgetPhoto(snapshot, snapshot.ownerId))) { render(snapshot); return; }
  if (reacting && snapshot.myReaction === reaction) { render(snapshot); return; }

  interacting = true;
  try {
    const { data } = await bounded(getSupabase().auth.getSession());
    const settings = await bounded(widgetStorage.getSettings(snapshot.ownerId));
    if (data.session?.user.id !== snapshot.ownerId || !settings.enabled || settings.personId !== snapshot.personId) { render(emptyWidget('signed-out')); return; }
    render(snapshot, action);
    const saved = reacting && isWidgetReaction(reaction) ? await bounded(reactionService.set(snapshot.updateId!, reaction)) : await bounded(nudgeService.send(snapshot.personId));
    const push = bounded(notificationService.sendPush(reacting ? 'reaction' : 'nudge', saved.id)).catch(() => undefined);
    const latest = await bounded(loadWidgetSnapshot()).catch(() => emptyWidget('unavailable'));
    const same = latest.ownerId === snapshot.ownerId && latest.personId === snapshot.personId && (nudging || latest.updateId === snapshot.updateId);
    render(same && reacting && isWidgetReaction(reaction) ? { ...latest, myReaction: reaction } : latest, undefined, same ? reacting ? 'Reaction sent' : 'Nudged!' : undefined);
    await push;
  } catch (error) {
    const latest = await bounded(loadWidgetSnapshot()).catch(() => emptyWidget('unavailable'));
    render(latest, undefined, latest.ownerId === snapshot.ownerId ? (reacting ? reactionService : nudgeService).errorMessage(error) : undefined);
  } finally { interacting = false; }
}
