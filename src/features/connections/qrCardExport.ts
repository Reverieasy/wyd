import type { User } from '@/src/models';
import { createMomentPhotoSource } from '@/src/features/updates/photoAccess';
import { environment } from '@/src/lib/environment';
import { createPersonQr } from './qrCode';

export function qrCardExportMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (/permission|allow saving/i.test(message)) return 'Allow saving photos in your device settings, then try again.';
  if (/account changed/i.test(message)) return 'Your account changed. Open your QR card again.';
  if (/native module|viewshot|media.?library|not installed/i.test(message)) return 'Install the updated app build to download your QR card.';
  return 'Your QR card could not be saved. Please try again.';
}
export async function downloadQrCardWeb(profile: User, accessToken: string, assertCurrent: () => void) {
  assertCurrent();
  const qr = createPersonQr(profile.handle);
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1480;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable.');
  context.fillStyle = '#FFFFFF'; context.fillRect(0, 0, canvas.width, canvas.height);
  const avatar = createMomentPhotoSource(profile.avatarUrl, accessToken, environment.supabaseUrl, environment.supabasePublishableKey);
  let bitmap: ImageBitmap | null = null;
  if (avatar) {
    try {
      const response = await fetch(avatar.uri, { headers: avatar.headers });
      if (response.ok) bitmap = await createImageBitmap(await response.blob());
    } catch { /* Initials remain available if the profile image cannot load. */ }
  }
  try {
    assertCurrent(); await document.fonts.ready;
    context.save(); context.beginPath(); context.arc(540, 175, 100, 0, Math.PI * 2); context.clip();
    if (bitmap) {
      const edge = Math.min(bitmap.width, bitmap.height);
      context.drawImage(bitmap, (bitmap.width - edge) / 2, (bitmap.height - edge) / 2, edge, edge, 440, 75, 200, 200);
    } else {
      context.fillStyle = '#F1E8FC'; context.fillRect(440, 75, 200, 200);
      context.fillStyle = '#6C2CF5'; context.font = '800 90px Nunito_800ExtraBold, sans-serif'; context.textAlign = 'center'; context.fillText(profile.displayName.slice(0, 1).toUpperCase(), 540, 207);
    }
    context.restore(); context.textAlign = 'center'; context.fillStyle = '#100C26';
    let nameSize = 64;
    do { context.font = `800 ${nameSize}px Nunito_800ExtraBold, sans-serif`; if (context.measureText(profile.displayName).width <= 940) break; nameSize -= 2; } while (nameSize > 24);
    context.fillText(profile.displayName, 540, 365, 940);
    context.fillStyle = '#797184'; context.font = '34px PlusJakartaSans_400Regular, sans-serif'; context.fillText(`@${profile.handle}`, 540, 425);
    const moduleSize = Math.floor(800 / (qr.matrix.length + 8));
    const start = Math.floor((1080 - (qr.matrix.length + 8) * moduleSize) / 2);
    context.fillStyle = '#000000';
    qr.matrix.forEach((row, y) => row.forEach((dark, x) => { if (dark) context.fillRect(start + (x + 4) * moduleSize, 495 + (y + 4) * moduleSize, moduleSize, moduleSize); }));
    // Match the app's rounded wordmark, split gradient and question-mark sparks.
    const size = 52, wordX = (canvas.width - size * 6.2) / 2, top = 1296;
    context.font = `900 ${size}px Nunito_900Black, sans-serif`; context.letterSpacing = `${-size * 0.025}px`; context.textAlign = 'right';
    const fill = context.createLinearGradient(wordX, 0, wordX + size * 5.55, 0);
    [[0, '#150B32'], [0.63, '#150B32'], [0.64, '#AC6BFF'], [1, '#9556FA']].forEach(([stop, color]) => fill.addColorStop(Number(stop), String(color)));
    context.fillStyle = fill; context.fillText('watchudoin', wordX + size * 5.55, top + size * 1.1);
    const questionX = wordX + size * (5.55 + 0.325);
    context.letterSpacing = '0px'; context.textAlign = 'center';
    const questionFill = context.createLinearGradient(questionX - 17, 0, questionX + 17, 0); questionFill.addColorStop(0, '#9556FA'); questionFill.addColorStop(1, '#8145F5');
    context.fillStyle = questionFill; context.fillText('?', questionX, top + size * 1.1);
    context.strokeStyle = '#9953FF'; context.lineWidth = 4; context.lineCap = 'round';
    for (const direction of [-1, 1]) { context.beginPath(); context.moveTo(questionX + direction * 5, top + 10); context.lineTo(questionX + direction * 10, top - 2); context.stroke(); }
    context.fillStyle = '#797184'; context.font = '30px PlusJakartaSans_400Regular, sans-serif'; context.fillText('Scan in watchudoin? to add me.', 540, 1405);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Could not prepare PNG.')), 'image/png'));
    assertCurrent();
    const uri = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = uri; link.download = `watchudoin-${profile.handle}-qr.png`; document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(uri), 30_000);
  } finally { bitmap?.close(); }
}
