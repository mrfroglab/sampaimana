/**
 * Share-image kit: builds satori element trees and rasterises them with resvg.
 *
 * Shared by the `/kasus/:slug/og.png` route and `scripts/generate-brand-assets.mjs`
 * (Node strips the types), so it must have NO runtime relative imports and only
 * erasable TypeScript syntax. Callers pass in the status order/labels.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import type { ReactNode } from 'react';

export const OG_W = 1200;
export const OG_H = 630;

export const C = {
  canvas: '#f4f4f5',
  card: '#ffffff',
  ink: '#09090b',
  muted: '#52525b',
  faint: '#a1a1aa',
  line: '#ececee',
  lineStrong: '#d4d4d8',
  ember: '#ff5a00',
  onInk: '#fafafa',
} as const;

export const SITE_HOST = 'sampaimana.hallojanu.me';

type Style = Record<string, string | number | undefined>;
type Child = ReactNode | string | number | null | false | undefined;

/** Tiny element builder: h('div', { display: 'flex' }, [children], { extra props }). */
export function h(type: string, style: Style = {}, children?: Child | Child[], props: Record<string, unknown> = {}): ReactNode {
  const kids = Array.isArray(children) ? children.filter((c) => c !== null && c !== false && c !== undefined) : children;
  return { type, props: { ...props, style, children: kids } } as unknown as ReactNode;
}

const flex = (style: Style): Style => ({ display: 'flex', ...style });

/* ---------- fonts (loaded once, lazily) ---------- */

type FontDef = { name: string; data: Buffer; weight: 400 | 500 | 600 | 700; style: 'normal' };
let fontsCache: FontDef[] | null = null;

export function ogFonts(): FontDef[] {
  if (fontsCache) return fontsCache;
  const req = createRequire(import.meta.url);
  const load = (pkg: string, file: string) => readFileSync(req.resolve(`${pkg}/files/${file}`));
  const fonts: FontDef[] = [
    { name: 'DM Sans', data: load('@fontsource/dm-sans', 'dm-sans-latin-400-normal.woff'), weight: 400, style: 'normal' },
    { name: 'DM Sans', data: load('@fontsource/dm-sans', 'dm-sans-latin-500-normal.woff'), weight: 500, style: 'normal' },
    { name: 'DM Sans', data: load('@fontsource/dm-sans', 'dm-sans-latin-600-normal.woff'), weight: 600, style: 'normal' },
    { name: 'DM Sans', data: load('@fontsource/dm-sans', 'dm-sans-latin-700-normal.woff'), weight: 700, style: 'normal' },
  ];
  try {
    fonts.push({ name: 'DM Mono', data: load('@fontsource/dm-mono', 'dm-mono-latin-400-normal.woff'), weight: 400, style: 'normal' });
  } catch {
    // DM Mono is optional; text falls back to DM Sans.
  }
  fontsCache = fonts;
  return fonts;
}

export const MONO = "'DM Mono', 'DM Sans'";

/** satori element tree -> PNG bytes. */
export async function renderPng(node: ReactNode, width = OG_W, height = OG_H): Promise<Buffer> {
  const svg = await satori(node, { width, height, fonts: ogFonts() });
  return new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: { loadSystemFonts: false } }).render().asPng();
}

/* ---------- text helpers ---------- */

/** Strip control/bidi chars, collapse whitespace, cap length (with ellipsis). */
export function cleanText(input: unknown, max: number): string {
  const s = String(input ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

/* ---------- shared pieces ---------- */

const Q_PATH =
  'M11.4 12.1c0-2.8 2.1-4.7 4.9-4.7 2.7 0 4.7 1.7 4.7 4.1 0 2-1.2 3-2.6 4-1.3.9-1.8 1.6-1.8 3.1v.7h-2v-.9c0-2 .8-3.1 2.1-4.1 1.1-.8 1.6-1.6 1.6-2.7 0-1.3-.9-2.2-2.2-2.2-1.4 0-2.4 1-2.4 2.4 0 .3 0 .5.1.7-.3.4-.9.7-1.4.7-.6 0-1-.4-1-1.1Z';

/** The logo mark: ink rounded square, paper "?", ember dot. Same geometry as components/Logo.tsx. */
export function logoMark(size: number, opts: { bg?: boolean } = {}): ReactNode {
  return h('svg', { display: 'flex' }, [
    ...(opts.bg === false ? [] : [h('rect', {}, undefined, { width: 32, height: 32, rx: 10, fill: C.ink })]),
    h('path', {}, undefined, { d: Q_PATH, fill: C.onInk }),
    h('circle', {}, undefined, { cx: 15.6, cy: 23.2, r: 1.8, fill: C.ember }),
  ], { width: size, height: size, viewBox: '0 0 32 32', xmlns: 'http://www.w3.org/2000/svg' });
}

export function wordmark(): ReactNode {
  return h('div', flex({ alignItems: 'center' }), [
    logoMark(44),
    h('div', { display: 'flex', marginLeft: 14, fontSize: 28, fontWeight: 600, color: C.ink }, 'Sampai Mana'),
  ]);
}

/** Canvas + inset white card with hairline border. `children` fill the card (column). */
export function cardShell(children: Child[]): ReactNode {
  return h('div', flex({ width: OG_W, height: OG_H, boxSizing: 'border-box', background: C.canvas, padding: 48, fontFamily: 'DM Sans', color: C.ink }), [
    h(
      'div',
      flex({
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: C.card,
        border: `1px solid ${C.line}`,
        boxSizing: 'border-box',
        borderRadius: 36,
        padding: '40px 52px 40px 52px',
      }),
      children,
    ),
  ]);
}

export interface RailStation {
  label: string;
  state: 'past' | 'skipped' | 'current' | 'future';
}

/**
 * The five-station status rail, rendered like components/StatusRail.tsx (lg):
 * passed = solid ink with a paper dot, current = hollow ring with the ember dot
 * (or solid ink with a check when `done`), future = hollow grey ring.
 */
export function statusRail(opts: {
  stations: RailStation[];
  done?: boolean;
  width: number;
  dot?: number;
  labelSize?: number;
}): ReactNode {
  const { stations, done = false, width } = opts;
  const dot = opts.dot ?? 30;
  const labelSize = opts.labelSize ?? 22;
  const last = stations.length - 1;
  const currentIndex = stations.findIndex((s) => s.state === 'current');
  const inner = width - dot; // centres run from dot/2 to width-dot/2
  const cx = (i: number) => dot / 2 + (i / last) * inner;
  const trackH = 4;
  const labelBox = 200;

  const track = [
    h('div', { position: 'absolute', left: dot / 2, top: (dot - trackH) / 2, width: inner, height: trackH, borderRadius: 999, background: C.line }),
    currentIndex > 0 &&
      h('div', { position: 'absolute', left: dot / 2, top: (dot - trackH) / 2, width: (currentIndex / last) * inner, height: trackH, borderRadius: 999, background: C.ink }),
  ];

  const dots = stations.map((s, i) => {
    const solid = s.state === 'past' || (s.state === 'current' && done);
    const border = s.state === 'future' ? C.lineStrong : s.state === 'skipped' ? C.lineStrong : C.ink;
    let inside: ReactNode = null;
    if (s.state === 'current' && !done) {
      inside = h('div', { width: 12, height: 12, borderRadius: 999, background: C.ember });
    } else if (s.state === 'current' && done) {
      inside = h('svg', { display: 'flex' }, [h('path', {}, undefined, { d: 'M4.5 10.5l3.6 3.6 7.4-8', stroke: C.onInk, 'stroke-width': 2.6, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })], {
        width: 20,
        height: 20,
        viewBox: '0 0 20 20',
      });
    } else if (s.state === 'past') {
      inside = h('div', { width: 8, height: 8, borderRadius: 999, background: C.onInk });
    }
    return h(
      'div',
      flex({
        position: 'absolute',
        left: cx(i) - dot / 2,
        top: 0,
        width: dot,
        height: dot,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        background: solid ? C.ink : C.card,
        border: `3px ${s.state === 'skipped' ? 'dashed' : 'solid'} ${border}`,
      }),
      inside,
    );
  });

  const labels = stations.map((s, i) => {
    const isCurrent = s.state === 'current';
    const align = i === 0 ? 'flex-start' : i === last ? 'flex-end' : 'center';
    const left = i === 0 ? 0 : i === last ? width - labelBox : cx(i) - labelBox / 2;
    return h(
      'div',
      flex({ position: 'absolute', left, top: dot + 14, width: labelBox, justifyContent: align }),
      h(
        'div',
        {
          display: 'flex',
          fontSize: labelSize,
          letterSpacing: '-0.01em',
          fontWeight: isCurrent ? 600 : 500,
          color: isCurrent ? C.ink : s.state === 'past' ? '#404040' : C.muted,
        },
        s.label,
      ),
    );
  });

  return h('div', flex({ position: 'relative', width, height: dot + 14 + Math.round(labelSize * 1.3) }), [...track, ...dots, ...labels]);
}

export const dotSep = (size = 8, color: string = C.faint): ReactNode =>
  h('div', { display: 'flex', width: size, height: size, borderRadius: 999, background: color });
