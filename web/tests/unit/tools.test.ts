import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
// @ts-expect-error mjs without types
import { decodePng } from '../../tools/png.mjs';
// @ts-expect-error mjs without types
import { parseFmp, markersOf } from '../../tools/fmp.mjs';
// @ts-expect-error mjs without types
import { packMask, maskFromRgba, pngMask, jpgSize, jpgMask } from '../../tools/mask.mjs';
const D = '../X85-devcore 2/dados/';
test('decodes nave.png (RGBA) with alpha-0 coloured pixels preserved', () => {
  const p = decodePng(readFileSync(D + 'jogo/nave.png'));
  expect([p.width, p.height]).toEqual([120, 60]);
  let colouredTransparent = 0;
  for (let i = 0; i < p.rgba.length; i += 4) if (p.rgba[i + 3] === 0 && (p.rgba[i] | p.rgba[i + 1] | p.rgba[i + 2])) colouredTransparent++;
  expect(colouredTransparent).toBe(71); // 02-engine §6
});
test('fase1 markers match 02-engine §10.4', () => {
  const m = markersOf(parseFmp(readFileSync(D + 'jogo/mapas/fase1.fmp')));
  expect(m['0']).toEqual([[368, 6384]]);   // INICIO
  expect(m['21'].length).toBe(27);          // M_INIMIGO1
  expect(m['26']).toEqual([[368, 144]]);    // M_BOSS
  expect(m['28']).toEqual([[624, 2736]]);   // M_T2
});

// ---- masks ----------------------------------------------------------------------------------
const words = (b: Uint8Array) => {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  return Array.from({ length: b.byteLength / 4 }, (_, i) => dv.getUint32(i * 4, true));
};
const rgbaOf = (w: number, h: number, px: Record<number, [number, number, number, number]>) => {
  const a = new Uint8Array(w * h * 4);
  for (const [i, v] of Object.entries(px)) a.set(v, Number(i) * 4);
  return a;
};

test('mask bit order: x=31 -> word0 bit31, x=32 -> word1 bit0 (LSB-first, little-endian)', () => {
  const m = packMask(40, 2, (x: number, y: number) => y === 0 && (x === 31 || x === 32 || x === 0));
  expect(words(m)).toEqual([40, 2, 0x80000001, 0x00000001, 0, 0]);
  expect(m.length).toBe(8 + 4 * Math.ceil(40 / 32) * 2);
});
test('mask semantics: alpha-0 coloured solid; opaque magenta and (0,0,0,0) empty', () => {
  const rgba = rgbaOf(4, 1, {
    0: [10, 20, 30, 0],     // alpha 0 but coloured -> solid
    1: [255, 0, 255, 255],  // opaque magenta -> whole pixel zeroed -> empty
    2: [0, 0, 0, 0],        // empty
    3: [255, 0, 255, 128],  // translucent magenta -> solid (not the colour key)
  });
  const m = maskFromRgba(4, 1, rgba);
  expect(words(m)).toEqual([4, 1, 0b1001]);
});
test('pngMask of a real PNG: header, length, and magenta-keyed tileset has no key pixels solid', () => {
  const nave = pngMask(readFileSync(D + 'jogo/nave.png'));
  expect([nave.w, nave.h]).toEqual([120, 60]);
  expect(nave.mask.length).toBe(8 + 4 * Math.ceil(120 / 32) * 60);
  const p = decodePng(readFileSync(D + 'jogo/mapas/tileset.png'));
  let magenta = 0;
  for (let i = 0; i < p.rgba.length; i += 4) if (p.rgba[i] === 255 && p.rgba[i + 1] === 0 && p.rgba[i + 2] === 255 && p.rgba[i + 3] === 255) magenta++;
  const t = pngMask(readFileSync(D + 'jogo/mapas/tileset.png'));
  let solid = 0;
  for (const w of words(t.mask).slice(2)) for (let v = w; v; v >>>= 1) solid += v & 1;
  const solidExpected = (() => { let n = 0; for (let i = 0; i < p.rgba.length; i += 4) {
    const k = p.rgba[i] === 255 && p.rgba[i + 1] === 0 && p.rgba[i + 2] === 255 && p.rgba[i + 3] === 255;
    if (!k && (p.rgba[i] | p.rgba[i + 1] | p.rgba[i + 2] | p.rgba[i + 3])) n++; } return n; })();
  expect(magenta).toBeGreaterThan(0);
  expect(solid).toBe(solidExpected);
});
test('jpgSize parses fundo1.jpg; jpgMask is all solid', () => {
  const buf = readFileSync(D + 'jogo/fundo1.jpg');
  const { w, h } = jpgSize(buf);
  expect([w, h]).toEqual([800, 600]);
  const m = jpgMask(buf);
  expect([m.w, m.h]).toEqual([w, h]);
  const rows = Math.ceil(w / 32);
  const ws = words(m.mask);
  expect(ws.length).toBe(2 + rows * h);
  expect(ws[2]).toBe(w >= 32 ? 0xffffffff : (1 << w) - 1);
});
