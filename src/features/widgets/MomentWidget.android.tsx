'use no memo';

import { FlexWidget, ImageWidget, OverlapWidget, SvgWidget, TextWidget } from 'react-native-android-widget';
import { isCurrentWidgetPhoto, parseWidgetDesign, widgetActionsForDesign, widgetMomentUri, widgetReplyUri, widgetTime, type WidgetAction, type WidgetSnapshot } from './widgetModel';
import { compactWidgetTime, widgetLayout } from './widgetLayout';
import { widgetIconSvg, widgetPlaceholderSvg, widgetShadeSvg } from './widgetIcons';

type Props = { snapshot: WidgetSnapshot; width: number; height: number; isDark?: boolean; pendingAction?: WidgetAction; feedback?: string };
export { widgetPlaceholderSvg } from './widgetIcons';
const purple = { from: '#6823FF', to: '#9762FF', orientation: 'BL_TR' } as const;

export function MomentWidget({ snapshot, width, height, pendingAction, feedback }: Props) {
  'use no memo';
  const design = parseWidgetDesign(snapshot.design);
  const l = widgetLayout(design, width, height);
  const current = isCurrentWidgetPhoto(snapshot, snapshot.ownerId);
  const connected = Boolean(snapshot.ownerId && snapshot.personId && snapshot.ownerId !== snapshot.personId && (current || snapshot.mode === 'waiting'));
  const uri = widgetMomentUri(snapshot);
  const time = compactWidgetTime(widgetTime(snapshot.createdAt));
  const hint = snapshot.mode === 'setup' ? 'Tap to set up' : snapshot.mode === 'signed-out' ? 'Sign in to continue' : snapshot.mode === 'unavailable' ? 'Tap to refresh' : null;
  const status = !current && snapshot.mode === 'moment' ? 'Tap to refresh' : snapshot.status;
  const line = feedback ?? hint ?? (l.separateTime ? status : `${status} · ${time}`);
  const identity = { ownerId: snapshot.ownerId, personId: snapshot.personId, updateId: snapshot.updateId };
  const actions = widgetActionsForDesign(design).filter(action => action === 'camera' || (action === 'nudge' ? connected : current && connected));
  const details = <FlexWidget style={{ flex: 1, justifyContent: 'flex-end', flexGap: 1 }}>
    <TextWidget text={snapshot.name} maxLines={1} truncate="END" allowFontScaling={false} style={{ width: 'match_parent', color: '#FFFFFF', fontFamily: 'Nunito_800ExtraBold', fontWeight: '800', fontSize: l.nameSize, lineHeight: l.nameSize * 1.25 }} />
    <TextWidget text={line} maxLines={1} truncate="END" allowFontScaling={false} style={{ color: feedback || hint ? '#D8C4FF' : '#FFFFFF', fontSize: l.statusSize, lineHeight: l.statusSize * 1.35 }} />
    {l.separateTime && !feedback && !hint ? <TextWidget text={time} maxLines={1} truncate="END" allowFontScaling={false} style={{ color: '#C8C2D3', fontSize: l.timeSize, lineHeight: l.timeSize * 1.35 }} /> : null}
  </FlexWidget>;
  const buttons = <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: l.gap }}>
    {actions.map(action => {
      const size = action === 'camera' ? l.cameraSize : l.buttonSize;
      const selected = action === 'heart' && snapshot.myReaction === action;
      const label = action === 'camera' ? connected ? `Send yours: open camera to reply to ${snapshot.name}` : 'Open widget settings' : action === 'nudge' ? `Nudge ${snapshot.name}` : `${selected ? 'Selected' : 'Send'} ${action} reaction`;
      return <FlexWidget key={action} style={{ width: size, height: size, borderRadius: action === 'camera' ? size * 0.4 : size / 2, justifyContent: 'center', alignItems: 'center', ...(action === 'camera' ? { backgroundGradient: purple } : { backgroundColor: selected ? '#582138CC' : '#2A252CCC' }) }}
        clickAction={action === 'camera' ? 'OPEN_URI' : pendingAction || selected ? 'WIDGET_NOOP' : action === 'nudge' ? 'NUDGE_PERSON' : 'REACT_TO_MOMENT'}
        clickActionData={action === 'camera' ? { uri: widgetReplyUri(snapshot) } : { ...identity, reaction: action }}
        accessibilityLabel={pendingAction === action ? 'Sending' : label}>
        <SvgWidget svg={widgetIconSvg(action, selected, pendingAction === action)} style={{ width: size * 0.46, height: size * 0.46 }} />
      </FlexWidget>;
    })}
  </FlexWidget>;

  return <OverlapWidget style={{ width: 'match_parent', height: 'match_parent', borderRadius: l.radius, overflow: 'hidden', backgroundColor: '#100C18' }} clickAction="OPEN_URI" clickActionData={{ uri }} accessibilityLabel={`${current && snapshot.isNew ? 'New moment. ' : ''}${snapshot.name}. ${status}. ${widgetTime(snapshot.createdAt)}. ${feedback ?? ''}`}>
    {snapshot.photoData && current ? <ImageWidget image={snapshot.photoData} imageWidth={width} imageHeight={height} radius={l.radius} resizeMode="cover" /> : <SvgWidget svg={widgetPlaceholderSvg} style={{ width, height }} />}
    <SvgWidget svg={widgetShadeSvg(width, height, l.radius)} style={{ width, height }} />
    <FlexWidget style={{ width: 'match_parent', height: 'match_parent', padding: l.padding, justifyContent: 'flex-end' }}>
      <FlexWidget style={{ width: 'match_parent', height: l.footerHeight, flexDirection: l.stacked ? 'column' : 'row', alignItems: 'flex-end', flexGap: l.gap }}>
        {l.stacked ? <FlexWidget style={{ width: 'match_parent', flex: 1 }}>{details}</FlexWidget> : details}
        {buttons}
      </FlexWidget>
    </FlexWidget>
    {current && snapshot.isNew ? <FlexWidget style={{ width: 'match_parent', height: 'match_parent', padding: l.padding, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-start' }}><FlexWidget style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#9D62FF' }} /></FlexWidget> : null}
  </OverlapWidget>;
}
