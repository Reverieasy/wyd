import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

// Exact exported circle layers from App Screens > Final. Dimensions match Figma.
export const figmaArtwork = {
  avatar36: require('../../assets/figma/imgEllipse.svg'),
  lavender28: require('../../assets/figma/imgEllipse1.svg'),
  avatar40: require('../../assets/figma/imgEllipse2.svg'),
  pink32: require('../../assets/figma/imgEllipse3.svg'),
  add48: require('../../assets/figma/imgEllipse4.svg'),
  lavender48: require('../../assets/figma/imgEllipse5.svg'),
  violet48: require('../../assets/figma/imgEllipse6.svg'),
  beige48: require('../../assets/figma/imgEllipse7.svg'),
  green48: require('../../assets/figma/imgEllipse8.svg'),
  add58: require('../../assets/figma/imgEllipse9.svg'),
  avatar30: require('../../assets/figma/imgEllipse10.svg'),
  pink22: require('../../assets/figma/imgEllipse11.svg'),
  shutter82: require('../../assets/figma/imgEllipse12.svg'),
  shutter68: require('../../assets/figma/imgEllipse13.svg'),
  shutter54: require('../../assets/figma/imgEllipse14.svg'),
  pink28: require('../../assets/figma/imgEllipse15.svg'),
  violet28: require('../../assets/figma/imgEllipse16.svg'),
  avatar42: require('../../assets/figma/imgEllipse17.svg'),
  lavender34: require('../../assets/figma/imgEllipse18.svg'),
  badge32: require('../../assets/figma/imgEllipse19.svg'),
  pink34: require('../../assets/figma/imgEllipse20.svg'),
  avatar82: require('../../assets/figma/imgEllipse21.svg'),
  pink74: require('../../assets/figma/imgEllipse22.svg'),
  avatar52: require('../../assets/figma/imgEllipse23.svg'),
  pink44: require('../../assets/figma/imgEllipse24.svg'),
  avatar34: require('../../assets/figma/imgEllipse25.svg'),
  pink26: require('../../assets/figma/imgEllipse26.svg'),
};

export function FigmaArtwork({ name, size }: { name: keyof typeof figmaArtwork; size: number }) {
  return <Image accessible={false} source={figmaArtwork[name]} contentFit="contain" style={{ width: size, height: size }} />;
}

export function ShutterArtwork() {
  return <View style={styles.shutter}><FigmaArtwork name="shutter82" size={82} /><View style={styles.layer}><FigmaArtwork name="shutter68" size={68} /></View><View style={styles.layer}><FigmaArtwork name="shutter54" size={54} /></View></View>;
}
const styles = StyleSheet.create({ shutter: { alignItems: 'center', justifyContent: 'center', width: 82, height: 82 }, layer: { position: 'absolute' } });
