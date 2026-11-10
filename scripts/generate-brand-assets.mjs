// Regenerates the static brand PNGs in public/ from the logo geometry and the
// shared share-card kit (app/lib/og.server.ts). Run: pnpm brand
//
// Node 22 strips the TypeScript types from the kit on import, so no build step.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { STATUS_LABEL, STATUS_ORDER } from '../app/lib/format.ts';
import { C, SITE_HOST, cardShell, h, MONO, renderPng, statusRail, wordmark } from '../app/lib/og.server.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = (name) => resolve(root, 'public', name);

// Keep in sync with app/components/Logo.tsx and public/favicon.svg.
const Q_PATH =
  'M11.4 12.1c0-2.8 2.1-4.7 4.9-4.7 2.7 0 4.7 1.7 4.7 4.1 0 2-1.2 3-2.6 4-1.3.9-1.8 1.6-1.8 3.1v.7h-2v-.9c0-2 .8-3.1 2.1-4.1 1.1-.8 1.6-1.6 1.6-2.7 0-1.3-.9-2.2-2.2-2.2-1.4 0-2.4 1-2.4 2.4 0 .3 0 .5.1.7-.3.4-.9.7-1.4.7-.6 0-1-.4-1-1.1Z';

/**
 * Tile SVG on a 32x32 grid. `rx` rounds the tile (0 = full bleed); `scale` enlarges
 * the glyph around the middle of the tile (the "?" + dot spans roughly x 10-21, y 7-25).
 */
function tileSvg({ rx, scale = 1 }) {
  const gx = 15.7; // horizontal centre of the glyph
  const gy = 16.3; // vertical centre of the glyph (question mark + dot)
  const t = `translate(16 16) scale(${scale}) translate(${-gx} ${-gy})`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<rect width="32" height="32" rx="${rx}" fill="${C.ink}"/>
<g transform="${t}"><path d="${Q_PATH}" fill="${C.onInk}"/><circle cx="15.6" cy="23.2" r="1.8" fill="${C.ember}"/></g>
</svg>`;
}

function raster(svg, size) {
  return new Resvg(svg, { fitTo: { mode: 'width', value: size }, font: { loadSystemFonts: false } }).render().asPng();
}

const files = {
  'favicon.png': raster(tileSvg({ rx: 9 }), 64),
  'apple-touch-icon.png': raster(tileSvg({ rx: 0, scale: 1.25 }), 180), // iOS rounds it itself; no transparency
  'icon-192.png': raster(tileSvg({ rx: 9 }), 192),
  'icon-512.png': raster(tileSvg({ rx: 9 }), 512),
  // glyph ends up well inside the 80% (circular) safe zone
  'icon-maskable-512.png': raster(tileSvg({ rx: 0, scale: 1.2 }), 512),
};

// Generic 1200x630 share card.
const RAIL_W = 998;
const states = ['past', 'past', 'past', 'current', 'future'];
const rail = statusRail({
  stations: STATUS_ORDER.map((s, i) => ({ label: STATUS_LABEL[s], state: states[i] })),
  width: RAIL_W,
});
const card = cardShell([
  h('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44 }, [
    wordmark(),
    h('div', { display: 'flex', fontFamily: MONO, fontSize: 24, color: C.muted }, SITE_HOST),
  ]),
  h('div', { display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center', paddingTop: 16, paddingBottom: 16 }, [
    h(
      'div',
      { display: 'flex', fontSize: 92, fontWeight: 600, letterSpacing: '-0.045em', lineHeight: 1.02, color: C.ink },
      'Sampai mana kasusnya?',
    ),
    h(
      'div',
      { display: 'flex', marginTop: 24, fontSize: 32, fontWeight: 400, letterSpacing: '-0.01em', color: C.muted },
      'Pelacak publik perkembangan kasus hukum di Indonesia',
    ),
  ]),
  h('div', { display: 'flex', marginTop: 8, marginBottom: 12 }, rail),
]);
files['og.png'] = await renderPng(card, 1200, 630);

mkdirSync(resolve(root, 'public'), { recursive: true });
for (const [name, data] of Object.entries(files)) {
  writeFileSync(out(name), data);
  console.log(`public/${name}  ${data.length} bytes  (${data.readUInt32BE(16)}x${data.readUInt32BE(20)})`);
}
