import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
// @ts-expect-error mjs without types
import { decodePng } from '../../tools/png.mjs';
// @ts-expect-error mjs without types
import { parseFmp, markersOf } from '../../tools/fmp.mjs';
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
