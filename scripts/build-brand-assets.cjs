// Compile native brand assets from the same W image used by BrandLogo.
const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('pngjs');
const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'assets/figma/wyd-logo.png');
const image = PNG.sync.read(fs.readFileSync(sourcePath));
const { width, height, data } = image;
const visited = new Uint8Array(width * height);
const queue = new Uint32Array(width * height);
let largest = new Uint32Array();
// Ignore detached antialiasing specks, retaining the actual connected logo.
for (let start = 0; start < visited.length; start++) {
  if (visited[start] || data[start * 4 + 3] < 180) continue;
  let head = 0, tail = 1; queue[0] = start; visited[start] = 1;
  while (head < tail) {
    const pixel = queue[head++], x = pixel % width, y = Math.floor(pixel / width);
    for (const next of [x > 0 ? pixel - 1 : -1, x + 1 < width ? pixel + 1 : -1, y > 0 ? pixel - width : -1, y + 1 < height ? pixel + width : -1]) {
      if (next < 0 || visited[next] || data[next * 4 + 3] < 180) continue;
      visited[next] = 1; queue[tail++] = next;
    }
  }
  if (tail > largest.length) largest = queue.slice(0, tail);
}
if (!largest.length) throw new Error('The brand logo has no visible shape.');
const mask = new Uint8Array(width * height);
let left = width, top = height, right = 0, bottom = 0;
for (const pixel of largest) {
  mask[pixel] = 1;
  const x = pixel % width, y = Math.floor(pixel / width);
  left = Math.min(left, x); right = Math.max(right, x);
  top = Math.min(top, y); bottom = Math.max(bottom, y);
}
function silhouette(size, filename) {
  const output = new PNG({ width: size, height: size });
  const scale = size * 0.78 / Math.max(right - left + 1, bottom - top + 1);
  const offsetX = (size - (right - left + 1) * scale) / 2;
  const offsetY = (size - (bottom - top + 1) * scale) / 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let coverage = 0;
    for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) {
      const sourceX = Math.floor((x + (sx + 0.5) / 4 - offsetX) / scale + left);
      const sourceY = Math.floor((y + (sy + 0.5) / 4 - offsetY) / scale + top);
      if (sourceX >= 0 && sourceX < width && sourceY >= 0 && sourceY < height) coverage += mask[sourceY * width + sourceX];
    }
    const pixel = (y * size + x) * 4;
    output.data[pixel] = output.data[pixel + 1] = output.data[pixel + 2] = 255;
    output.data[pixel + 3] = Math.round(coverage / 16 * 255);
  }
  fs.writeFileSync(path.join(root, 'assets', filename), PNG.sync.write(output));
}
fs.copyFileSync(sourcePath, path.join(root, 'assets/splash-icon.png'));
silhouette(96, 'notification-icon.png');
silhouette(432, 'android-icon-monochrome.png');
console.log('Compiled W splash image and transparent white notification icons.');
