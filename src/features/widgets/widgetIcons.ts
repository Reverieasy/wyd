import type { WidgetAction } from './widgetModel';

// Shared SVG artwork keeps the Android widget and its in-app preview identical.
export function widgetIconSvg(action: WidgetAction, selected = false, pending = false) {
  const ink = selected && action === 'heart' ? '#FF4E79' : '#FFFFFF';
  const path = pending
    ? '<circle cx="5" cy="12" r="1.6" fill="white"/><circle cx="12" cy="12" r="1.6" fill="white"/><circle cx="19" cy="12" r="1.6" fill="white"/>'
    : action === 'camera'
      ? '<path d="M8 5.5 9.5 3h5L16 5.5h3.4A2.6 2.6 0 0 1 22 8.1v10.3a2.6 2.6 0 0 1-2.6 2.6H4.6A2.6 2.6 0 0 1 2 18.4V8.1a2.6 2.6 0 0 1 2.6-2.6H8Zm4 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 2.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z" fill="white" fill-rule="evenodd"/>'
      : action === 'heart'
        ? `<path d="m12 20-8.3-7.7C-2 6.5 6.4-1 12 6c5.6-7 14 0.5 8.3 6.3L12 20Z" fill="${selected ? ink : 'none'}" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>`
        : '<path d="M9.4 12.4 8 6.7a1.5 1.5 0 0 1 2.9-.7l2 6 .3-2a1.3 1.3 0 0 1 2.5.2l.2 1.1.4-.5a1.3 1.3 0 0 1 2.3.7l.2 1a1.4 1.4 0 0 1 2.1 1.1l.3 3.7c.2 2.9-1.7 5-4.7 5h-1.9c-1.4 0-2.6-.6-3.5-1.6l-4.4-5a1.5 1.5 0 0 1 2-2.2l1.9 1.4Z" fill="white"/><path d="m4 3 1.4 1.3M8 1v1.7M2 7h1.8" stroke="white" stroke-width="1.6" stroke-linecap="round"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">${path}</svg>`;
}

export function widgetShadeSvg(width: number, height: number, radius: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#08060F" stop-opacity="0"/><stop offset=".38" stop-color="#08060F" stop-opacity=".08"/><stop offset=".73" stop-color="#08060F" stop-opacity=".68"/><stop offset="1" stop-color="#08060F" stop-opacity=".98"/></linearGradient></defs><rect width="${width}" height="${height}" rx="${radius}" fill="url(#shade)"/><rect x=".5" y=".5" width="${Math.max(1, width - 1)}" height="${Math.max(1, height - 1)}" rx="${Math.max(1, radius - .5)}" fill="none" stroke="white" stroke-opacity=".24"/></svg>`;
}

export const widgetPlaceholderSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#38264C"/><stop offset="1" stop-color="#100C1A"/></linearGradient></defs><rect width="480" height="360" fill="url(#bg)"/><circle cx="365" cy="40" r="155" fill="#683DA5" fill-opacity=".22"/><g fill="none" stroke="#C6ACE9" stroke-opacity=".45" stroke-width="4"><rect x="208" y="85" width="64" height="54" rx="11"/><circle cx="254" cy="101" r="5"/><path d="m210 127 17-20 15 16 9-9 20 20"/></g></svg>';
