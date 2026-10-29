export type FirstUseProgress = { connected: boolean; firstMoment: boolean; widgetAdded: boolean; dismissed: boolean };
export const emptyFirstUseProgress: FirstUseProgress = { connected: false, firstMoment: false, widgetAdded: false, dismissed: false };
export function parseFirstUseProgress(raw: string | null): FirstUseProgress {
  try {
    const value = JSON.parse(raw ?? '{}');
    return { connected: value.connected === true, firstMoment: value.firstMoment === true, widgetAdded: value.widgetAdded === true, dismissed: value.dismissed === true };
  } catch { return { ...emptyFirstUseProgress }; }
}
export function advanceFirstUseProgress(previous: FirstUseProgress, observed: Partial<FirstUseProgress>): FirstUseProgress {
  return { connected: previous.connected || observed.connected === true, firstMoment: previous.firstMoment || observed.firstMoment === true, widgetAdded: previous.widgetAdded || observed.widgetAdded === true, dismissed: previous.dismissed || observed.dismissed === true };
}
export function firstUseStep(progress: FirstUseProgress) {
  return !progress.connected ? 'connect' : !progress.firstMoment ? 'moment' : !progress.widgetAdded ? 'widget' : 'done';
}
