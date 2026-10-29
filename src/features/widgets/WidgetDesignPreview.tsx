import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, MomentPhoto } from '@/src/components';
import { widgetActionsForDesign, widgetLabels, type WidgetDesign, type WidgetReaction } from './widgetModel';
import { compactWidgetTime, widgetLayout } from './widgetLayout';
import { widgetIconSvg } from './widgetIcons';

type Props = { design: WidgetDesign; name: string; status: string; time: string; photoUrl?: string | null; myReaction?: WidgetReaction | null; isNew?: boolean; pressedCamera?: boolean };
const cameraGradient = ['#6823FF', '#9762FF'] as const;
export function WidgetDesignPreview({ design, name, status, time, photoUrl, myReaction, isNew, pressedCamera = false }: Props) {
  const [availableWidth, setAvailableWidth] = useState(300);
  const width = Math.min(design === 'small' ? 200 : 420, availableWidth);
  const height = Math.round(width * (design === 'small' ? 1 : design === 'medium' ? 0.53 : 0.75));
  const l = widgetLayout(design, width, height);
  const details = <View style={{ flex: 1, minWidth: 0, justifyContent: 'flex-end', gap: 1 }}>
    <AppText numberOfLines={1} maxFontSizeMultiplier={1} style={{ color: '#FFFFFF', fontFamily: 'Nunito_800ExtraBold', fontSize: l.nameSize, lineHeight: l.nameSize * 1.25 }}>{name}</AppText>
    <AppText numberOfLines={1} maxFontSizeMultiplier={1} style={{ color: '#FFFFFF', fontSize: l.statusSize, lineHeight: l.statusSize * 1.35 }}>{l.separateTime ? status : `${status} · ${compactWidgetTime(time)}`}</AppText>
    {l.separateTime ? <AppText numberOfLines={1} maxFontSizeMultiplier={1} style={{ color: '#C8C2D3', fontSize: l.timeSize, lineHeight: l.timeSize * 1.35 }}>{compactWidgetTime(time)}</AppText> : null}
  </View>;
  return <View onLayout={event => setAvailableWidth(Math.max(1, event.nativeEvent.layout.width))} style={styles.container} accessibilityLabel={`${widgetLabels[design]} widget preview`}>
    <View style={{ width, height, borderRadius: l.radius, overflow: 'hidden', backgroundColor: '#100C18', borderWidth: 1, borderColor: '#FFFFFF40' }}>
      {photoUrl ? <MomentPhoto photo={{ uri: photoUrl }} height={height} radius={0} contentFit="cover" style={styles.fill} /> : <LinearGradient colors={['#39264C', '#100C1A']} style={styles.fill} />}
      <LinearGradient colors={['#08060F00', '#08060F14', '#08060FAE', '#08060FFA']} locations={[0, 0.38, 0.73, 1]} style={styles.fill} />
      <View style={{ flex: 1, padding: l.padding, justifyContent: 'flex-end' }}>
        <View style={{ width: '100%', height: l.footerHeight, flexDirection: l.stacked ? 'column' : 'row', alignItems: 'flex-end', gap: l.gap }}>
          {l.stacked ? <View style={{ width: '100%', flex: 1 }}>{details}</View> : details}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: l.gap }}>
            {widgetActionsForDesign(design).map(action => {
              const size = action === 'camera' ? l.cameraSize : l.buttonSize;
              const selected = myReaction === action;
              const icon = <Image source={{ uri: 'data:image/svg+xml;utf8,' + encodeURIComponent(widgetIconSvg(action, selected)) }} style={{ width: size * 0.46, height: size * 0.46 }} contentFit="contain" transition={0} />;
              return action === 'camera' ? <View key={action} style={pressedCamera ? { borderRadius: size / 2, boxShadow: '0 0 14px #8E4CFF' } : undefined}><LinearGradient colors={cameraGradient} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={[styles.center, { width: size, height: size, borderRadius: size * 0.4 }]}>{icon}</LinearGradient></View>
                : <View key={action} style={[styles.center, { width: size, height: size, borderRadius: size / 2, backgroundColor: selected ? '#582138CC' : '#2A252CCC' }]}>{icon}</View>;
            })}
          </View>
        </View>
      </View>
      {isNew ? <View style={{ position: 'absolute', right: l.padding, top: l.padding, width: 7, height: 7, borderRadius: 4, backgroundColor: '#9D62FF' }} /> : null}
    </View>
  </View>;
}
const styles = StyleSheet.create({ container: { alignItems: 'center', width: '100%' }, center: { justifyContent: 'center', alignItems: 'center' }, fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 } });
