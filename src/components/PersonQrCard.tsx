import { forwardRef, useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import type { User } from '@/src/models';
import { environment } from '@/src/lib/environment';
import { createMomentPhotoSource } from '@/src/features/updates/photoAccess';
import { createPersonQr } from '@/src/features/connections/qrCode';
import { AppText } from './primitives/AppText';
import { BrandWordmark } from './BrandWordmark';

type Props = { profile: User; accessToken?: string; width: number; onReady?: (ready: boolean) => void; onLayout?: (event: LayoutChangeEvent) => void };
export const PersonQrCard = forwardRef<View, Props>(function PersonQrCard({ profile, accessToken, width, onReady, onLayout }, ref) {
  const qr = useMemo(() => createPersonQr(profile.handle), [profile.handle]);
  const source = useMemo(() => createMomentPhotoSource(profile.avatarUrl, accessToken, environment.supabaseUrl, environment.supabasePublishableKey), [profile.avatarUrl, accessToken]);
  const [avatarLoaded, setAvatarLoaded] = useState(false), [avatarFailed, setAvatarFailed] = useState(false), [qrLoaded, setQrLoaded] = useState(false), [qrFailed, setQrFailed] = useState(false);
  useEffect(() => { setAvatarLoaded(false); setAvatarFailed(false); }, [source?.uri]);
  useEffect(() => { setQrLoaded(false); setQrFailed(false); }, [qr.uri]);
  useEffect(() => { onReady?.(qrLoaded && (!source || avatarLoaded || avatarFailed)); }, [qrLoaded, source, avatarLoaded, avatarFailed, onReady]);
  const qrSize = Math.min(260, width - 40);
  return <View ref={ref} collapsable={false} onLayout={onLayout} style={[styles.card, { width }]}>
    <View style={styles.avatar}>{source && !avatarFailed ? <Image source={source} cachePolicy="none" transition={0} contentFit="cover" style={StyleSheet.absoluteFill} onLoad={() => setAvatarLoaded(true)} onError={() => setAvatarFailed(true)} /> : <AppText allowFontScaling={false} style={styles.initial}>{profile.displayName.slice(0, 1).toUpperCase()}</AppText>}</View>
    <View style={styles.identity}><AppText allowFontScaling={false} numberOfLines={2} style={styles.name}>{profile.displayName}</AppText><AppText allowFontScaling={false} style={styles.handle}>@{profile.handle}</AppText></View>
    <Image source={{ uri: qr.uri }} contentFit="contain" transition={0} allowDownscaling={false} style={{ width: qrSize, height: qrSize, backgroundColor: '#FFFFFF' }} onLoad={() => setQrLoaded(true)} onError={() => setQrFailed(true)} accessibilityLabel={`QR code to add @${profile.handle}`} />
    {qrFailed ? <AppText style={styles.handle}>QR code could not load. Reopen this screen to try again.</AppText> : null}
    <View style={styles.brand}><BrandWordmark size={Math.min(26, (width - 64) / 6.2)} appearance="light" /></View>
    <AppText allowFontScaling={false} style={styles.caption}>Scan in watchudoin? to add me.</AppText>
  </View>;
});
const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#EAE5F0', alignItems: 'center', gap: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F1E8FC', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, initial: { color: '#6C2CF5', fontFamily: 'Nunito_800ExtraBold', fontSize: 34 },
  identity: { alignItems: 'center', gap: 4 }, name: { color: '#100C26', fontFamily: 'Nunito_800ExtraBold', fontSize: 24, lineHeight: 30, textAlign: 'center' }, handle: { color: '#797184', fontSize: 13, textAlign: 'center' },
  brand: { width: '100%', alignItems: 'center', justifyContent: 'center' }, caption: { color: '#797184', fontSize: 11, textAlign: 'center' },
});
