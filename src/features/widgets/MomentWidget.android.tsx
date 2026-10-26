'use no memo';

import { FlexWidget, ImageWidget, SvgWidget, TextWidget } from 'react-native-android-widget';
import { isCurrentWidgetPhoto, widgetMomentUri, widgetTime, type WidgetSnapshot } from './widgetModel';

type Props = { snapshot: WidgetSnapshot; width: number; height: number; isDark?: boolean; button?: 'idle' | 'sending' | 'sent'; feedback?: string };
export const widgetPlaceholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><defs><linearGradient id="pastel" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#DAD6FF"/><stop offset="0.52" stop-color="#F9E6F0"/><stop offset="1" stop-color="#E2D4FF"/></linearGradient></defs><rect width="320" height="320" rx="48" fill="url(#pastel)"/><g fill="#AF99CC"><circle cx="181" cy="140" r="7"/><path d="M135 148q5-8 10 0l12 18 7-10q4-6 9 0l21 30q5 8-4 8h-60q-9 0-4-8z"/></g></svg>`;
const darkPlaceholderSvg = widgetPlaceholderSvg.replaceAll('#DAD6FF', '#362B4C').replaceAll('#F9E6F0', '#382839').replaceAll('#E2D4FF', '#2C223E').replaceAll('#AF99CC', '#B39DCE');
export function MomentWidget({ snapshot, width, height, isDark = true, button = 'idle', feedback }: Props) {
  'use no memo';
  const size = Math.max(48, Math.min(height - 24, width * 0.40, 200));
  const compact = height < 135;
  const buttonHeight = compact ? 32 : Math.min(42, Math.round(height * 0.25));
  const current = isCurrentWidgetPhoto(snapshot, snapshot.ownerId);
  const canNudge = Boolean(snapshot.personId && snapshot.ownerId && (snapshot.mode === 'waiting' || (snapshot.mode === 'moment' && current)));
  const uri = widgetMomentUri(snapshot);
  return <FlexWidget style={{ width: 'match_parent', height: 'match_parent', padding: 12, borderRadius: 28, borderWidth: 1, borderColor: isDark ? '#44384E' : '#FFFFFF', backgroundGradient: { from: isDark ? '#211B29' : '#FFFFFF', to: isDark ? '#19151F' : '#F8F3FF', orientation: 'TL_BR' }, flexDirection: 'row', alignItems: 'center', flexGap: 12 }} clickAction="OPEN_URI" clickActionData={{ uri }} accessibilityLabel={`${snapshot.name}. ${snapshot.status}. ${widgetTime(snapshot.createdAt)}`}>
    {snapshot.photoData && current ? <ImageWidget image={snapshot.photoData} imageWidth={size} imageHeight={size} radius={20} resizeMode="cover" clickAction="OPEN_URI" clickActionData={{ uri }} /> : <SvgWidget svg={isDark ? darkPlaceholderSvg : widgetPlaceholderSvg} style={{ width: size, height: size }} />}
    <FlexWidget style={{ flex: 1, height: 'match_parent', justifyContent: 'center', flexGap: compact ? 3 : 5 }}>
      <TextWidget text={snapshot.name} maxLines={1} truncate="END" style={{ fontSize: compact ? 19 : Math.min(27, Math.round(height * 0.15)), fontWeight: 'bold', fontFamily: 'sans-serif', color: isDark ? '#F5EFFB' : '#100C26', width: 'match_parent' }} />
      <TextWidget text={!current && snapshot.mode === 'moment' ? 'Open to refresh' : snapshot.status} maxLines={1} truncate="END" style={{ fontSize: compact ? 13 : 15, color: isDark ? '#E2D7EE' : '#150B32' }} />
      <TextWidget text={feedback || (snapshot.mode === 'setup' ? 'Tap to set up your widget' : snapshot.mode === 'signed-out' ? 'Tap to open the app' : widgetTime(snapshot.createdAt))} maxLines={compact ? 1 : 2} truncate="END" style={{ fontSize: 11, color: isDark ? '#B5A9C0' : '#8A7BAA', marginBottom: compact ? 2 : 4 }} />
      <TextWidget text={button === 'sending' ? 'Sending…' : button === 'sent' ? 'Nudged!' : canNudge ? 'Nudge' : 'Open app'}
        style={{ height: buttonHeight, width: 'match_parent', borderRadius: buttonHeight / 2, backgroundGradient: { from: '#6D2BFF', to: '#B56FFF', orientation: 'BL_TR' }, color: '#FFFFFF', fontSize: compact ? 15 : 17, fontWeight: '700', textAlign: 'center' }}
        clickAction={button === 'sending' ? undefined : canNudge ? 'NUDGE_PERSON' : 'OPEN_URI'}
        clickActionData={canNudge ? { ownerId: snapshot.ownerId, personId: snapshot.personId } : { uri: 'watchudoin://widget-settings' }}
        accessibilityLabel={canNudge ? `Nudge ${snapshot.name}` : 'Open widget settings'} />
    </FlexWidget>
  </FlexWidget>;
}
