import { CameraView, scanFromURLAsync, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Platform, StyleSheet, View } from 'react-native';
import { ActionButton, AppText, FlowHeader, Screen } from '@/src/components';
import { parsePersonQr } from '@/src/features/connections/personQr';

export default function ScanPersonRoute() {
  const [permission, requestPermission] = useCameraPermissions();
  const [focused, setFocused] = useState(false), [active, setActive] = useState(AppState.currentState === 'active');
  const [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const locked = useRef(false), mounted = useRef(true), focus = useRef(false);
  useFocusEffect(useCallback(() => { focus.current = true; setFocused(true); locked.current = false; return () => { focus.current = false; setFocused(false); locked.current = true; }; }, []));
  useEffect(() => { mounted.current = true; const listener = AppState.addEventListener('change', value => setActive(value === 'active')); return () => { mounted.current = false; listener.remove(); }; }, []);
  const scanned = ({ data }: Pick<BarcodeScanningResult, 'data'>) => {
    if (locked.current || !focused || !active) return;
    locked.current = true;
    const username = parsePersonQr(data);
    if (!username) { setError('This isn’t a watchudoin? person QR code. Try another code.'); return; }
    router.replace({ pathname: '/add-person', params: { username } });
  };
  const chooseImage = async () => {
    if (busy || locked.current) return;
    locked.current = true; setBusy(true); setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1, selectionLimit: 1 });
      if (result.canceled || !result.assets[0]) { locked.current = false; return; }
      const codes = await scanFromURLAsync(result.assets[0].uri, ['qr']);
      if (!mounted.current || !focus.current) return;
      const username = codes.map(code => parsePersonQr(code.data)).find(Boolean);
      if (username) router.replace({ pathname: '/add-person', params: { username } });
      else setError('No watchudoin? person QR code was found in that image.');
    } catch { if (mounted.current) setError('That image could not be scanned. Try the camera or a clearer QR image.'); }
    finally { if (mounted.current) setBusy(false); }
  };
  return <Screen scroll contentStyle={{ gap: 18 }}><FlowHeader title="Scan a person" /><AppText tone="secondary">Scan their watchudoin? QR card. You’ll see who it is before sending a connection request.</AppText>
    {!permission ? <ActivityIndicator accessibilityLabel="Checking camera permission" /> : !permission.granted ? <View style={{ gap: 12 }}><AppText>Allow camera access to scan a QR code.</AppText><ActionButton label={permission.canAskAgain ? 'Allow camera' : 'Open settings'} onPress={() => permission.canAskAgain ? void requestPermission() : void Linking.openSettings()} /></View> : <View style={styles.camera}>
      {focused && active && !error && !busy ? <CameraView style={StyleSheet.absoluteFill} facing="back" active barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={scanned} onMountError={() => setError('The camera could not start. Try again or choose a saved QR image.')} /> : null}
      <View pointerEvents="none" style={styles.frame}><MaterialIcons name="qr-code-scanner" size={42} color="white" /></View>
    </View>}
    {Platform.OS !== 'web' ? <ActionButton label="Scan a saved QR image" variant="secondary" disabled={busy || Boolean(error)} loading={busy} onPress={() => void chooseImage()} /> : null}
    {error ? <><AppText accessibilityRole="alert">{error}</AppText><ActionButton label="Try another scan" variant="secondary" onPress={() => { locked.current = false; setError(null); }} /></> : null}
    <ActionButton label="Search by username instead" variant="secondary" onPress={() => router.replace('/(onboarding)/connect')} />
  </Screen>;
}
const styles = StyleSheet.create({ camera: { height: 320, borderRadius: 24, backgroundColor: '#100C26', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, frame: { width: 220, height: 220, borderWidth: 2, borderColor: '#FFFFFF', borderRadius: 18, alignItems: 'center', justifyContent: 'center' } });
