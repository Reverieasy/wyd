import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { getSupabase } from '@/src/lib/supabase';
import { nudgeService } from '@/src/features/activity/nudgeService';
import { notificationService } from '@/src/features/notifications/notificationService';
import { MomentWidget } from './MomentWidget.android';
import { loadWidgetSnapshot } from './widgetData.android';
import { MOMENT_WIDGET_NAME, emptyWidget, type WidgetSnapshot } from './widgetModel';
import { widgetStorage } from './widgetStorage';
import { getWidgetApi } from './nativeWidgetApi.android';
import { readWidgetAppearance } from './widgetAppearance';

let nudging = false;
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetInfo.widgetName !== MOMENT_WIDGET_NAME) return;
  if (props.widgetAction === 'WIDGET_DELETED') {
    const remaining = await getWidgetApi()?.getWidgetInfo(MOMENT_WIDGET_NAME);
    if (!remaining?.some(widget => widget.widgetId !== props.widgetInfo.widgetId)) await widgetStorage.clearPhoto();
    return;
  }
  const mode = await readWidgetAppearance();
  const render = (snapshot: WidgetSnapshot, button: 'idle' | 'sending' | 'sent' = 'idle', feedback?: string) => {
    const view = (isDark: boolean) => <MomentWidget snapshot={snapshot} width={props.widgetInfo.width} height={props.widgetInfo.height} button={button} feedback={feedback} isDark={isDark} />;
    props.renderWidget(mode === 'system' ? { light: view(false), dark: view(true) } : view(mode === 'dark'));
  };
  // The native headless worker has a 30-second limit. Finish its UI update before
  // that deadline even on slow networks; the server still enforces nudge cooldowns.
  const deadline = Date.now() + 25_000;
  const bounded = async <T,>(operation: Promise<T>): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try { return await Promise.race([operation, new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error('Open the app to refresh this widget.')), Math.max(1, deadline - Date.now())); })]); }
    finally { if (timer) clearTimeout(timer); }
  };
  let snapshot: WidgetSnapshot;
  try { snapshot = await bounded(loadWidgetSnapshot()); }
  catch { render(emptyWidget('unavailable')); return; }
  if (props.widgetAction !== 'WIDGET_CLICK' || props.clickAction !== 'NUDGE_PERSON') { render(snapshot); return; }
  if (nudging || !snapshot.personId || !snapshot.ownerId || props.clickActionData?.ownerId !== snapshot.ownerId || props.clickActionData?.personId !== snapshot.personId) {
    render(snapshot, nudging ? 'sending' : 'idle'); return;
  }
  nudging = true;
  render(snapshot, 'sending');
  try {
    const { data } = await getSupabase().auth.getSession();
    const settings = await widgetStorage.getSettings(snapshot.ownerId);
    if (data.session?.user.id !== snapshot.ownerId || !settings.enabled || settings.personId !== snapshot.personId) { render(emptyWidget('signed-out')); return; }
    const nudge = await bounded(nudgeService.send(snapshot.personId));
    // Keep the headless worker alive for push delivery, while showing success
    // as soon as the nudge is saved. Push failure never reverses a saved nudge.
    const push = bounded(notificationService.sendPush('nudge', nudge.id)).catch(() => undefined);
    // Recheck logout, widget disabling and connection removal before repainting.
    const latest = await bounded(loadWidgetSnapshot()).catch(() => emptyWidget('unavailable'));
    render(latest, latest.ownerId === snapshot.ownerId ? 'sent' : 'idle');
    await push;
  } catch (error) {
    const latest = await bounded(loadWidgetSnapshot()).catch(() => emptyWidget('unavailable'));
    render(latest, 'idle', latest.ownerId === snapshot.ownerId ? nudgeService.errorMessage(error) : undefined);
  }
  finally { nudging = false; }
}
