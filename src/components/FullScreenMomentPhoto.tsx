import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Feather from '@expo/vector-icons/Feather';
import { MomentPhoto } from './MomentPhoto';
import { PhotoDownloadButton } from './PhotoDownloadButton';
import { AppText } from './primitives/AppText';

export function FullScreenMomentPhoto({ visible, uri, updateId, onClose }: { visible: boolean; uri: string | null; updateId: string; onClose: () => void }) {
  const viewport = useWindowDimensions();
  return <Modal visible={visible} animationType="none" onRequestClose={onClose}>
    <SafeAreaView style={styles.screen}><StatusBar style="light" /><View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Close full photo" onPress={onClose} style={styles.close}><Feather name="x" color="white" size={25} /></Pressable><AppText style={{ color: 'white' }}>Full photo</AppText><View style={styles.close} /></View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} maximumZoomScale={3} minimumZoomScale={1} centerContent>
        {visible ? <View><MomentPhoto photo={{ uri }} contentFit="contain" height={Math.max(200, viewport.height - 150)} radius={0} style={{ backgroundColor: '#09090B' }} /><View style={styles.download}><PhotoDownloadButton overlay updateId={updateId} /></View></View> : null}
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: '#09090B' }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14 }, close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, download: { position: 'absolute', top: 10, right: 14 } });
