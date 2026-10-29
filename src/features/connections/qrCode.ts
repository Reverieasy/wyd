import qrcode from 'qrcode-generator';
import { personQrLink } from './personQr';

// SVG below contains ASCII paths only. Keep the data URI independent of Node's
// Buffer and browser-only globals so the headless/native runtime can render it.
function base64Ascii(value: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let i = 0; i < value.length; i += 3) {
    const a = value.charCodeAt(i), b = value.charCodeAt(i + 1), c = value.charCodeAt(i + 2);
    output += alphabet[a >> 2] + alphabet[((a & 3) << 4) | (b >> 4)] + (i + 1 < value.length ? alphabet[((b & 15) << 2) | (c >> 6)] : '=') + (i + 2 < value.length ? alphabet[c & 63] : '=');
  }
  return output;
}

export function createPersonQr(handle: string) {
  const link = personQrLink(handle);
  const code = qrcode(0, 'M');
  code.addData(link, 'Byte'); code.make();
  const count = code.getModuleCount();
  const matrix = Array.from({ length: count }, (_, row) => Array.from({ length: count }, (_, col) => code.isDark(row, col)));
  const edge = count + 8; // Four-module quiet zone on every side.
  let path = '';
  matrix.forEach((row, y) => row.forEach((dark, x) => { if (dark) path += `M${x + 4} ${y + 4}h1v1h-1z`; }));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${edge * 8}" height="${edge * 8}" viewBox="0 0 ${edge} ${edge}" shape-rendering="crispEdges"><rect width="${edge}" height="${edge}" fill="white"/><path d="${path}" fill="#000000"/></svg>`;
  return { link, matrix, svg, uri: `data:image/svg+xml;base64,${base64Ascii(svg)}` };
}
