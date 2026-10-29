import { widgetActionsForDesign, type WidgetDesign } from './widgetModel';

export function widgetLayout(design: WidgetDesign, width: number, height: number) {
  const padding = Math.max(10, Math.min(16, width * 0.04));
  const gap = width < 260 ? 6 : 8;
  const innerWidth = Math.max(1, width - padding * 2);
  const actionCount = widgetActionsForDesign(design).length;
  const buttonSize = 44;
  const cameraSize = buttonSize + 6;
  const actionsWidth = (actionCount - 1) * buttonSize + cameraSize + (actionCount - 1) * gap;
  const stacked = design !== 'small' && innerWidth - actionsWidth - gap < 64;
  const detailsWidth = Math.max(1, stacked ? innerWidth : innerWidth - actionsWidth - gap);
  const separateTime = design === 'small' || detailsWidth < 105;
  const nameSize = design === 'small' ? Math.min(20, Math.max(14, width * 0.09)) : Math.min(22, Math.max(15, width * 0.055));
  const statusSize = width < 200 || (!separateTime && detailsWidth < 135) ? 10 : 12;
  const timeSize = width < 200 ? 9 : 11;
  const textHeight = nameSize * 1.25 + statusSize * 1.35 + (separateTime ? timeSize * 1.35 : 0) + 8;
  const footerHeight = Math.min(height - padding * 2, stacked ? textHeight + cameraSize + gap : Math.max(textHeight, cameraSize));
  return { padding, gap, innerWidth, buttonSize, cameraSize, actionsWidth, stacked, separateTime, detailsWidth, nameSize, statusSize, timeSize, footerHeight,
    radius: Math.min(28, Math.min(width, height) * 0.17), iconSize: buttonSize * 0.46,
  };
}
export function compactWidgetTime(time: string) {
  return time.replace(/ (minutes?|hours?) ago$/, (_match, unit: string) => `${unit.startsWith('minute') ? 'm' : 'h'} ago`);
}
