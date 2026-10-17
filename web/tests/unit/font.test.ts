// values from docs/analysis/tools/out/font-512.json
import { test, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { initSprites } from '../../src/engine/sprites';
import { RecordingBackend } from '../../src/engine/renderer';
import { C2D2_CarregaFonte, C2D2_DesenhaTexto, larguraTexto, metricasFonte, C2D2_TEXTO_CENTRALIZADO, C2D2_TEXTO_DIREITA, C2D2_TEXTO_ESQUERDA } from '../../src/engine/font';
import { dadosDeTeste } from './fixture';
let f = 0; let b: RecordingBackend;
beforeAll(() => { b = new RecordingBackend(); initSprites(b, dadosDeTeste()); f = C2D2_CarregaFonte('./dados/menu/512.png', 32); });
test('glyph widths', () => {
  expect(larguraTexto(f, 'A')).toBe(18); expect(larguraTexto(f, 'i')).toBe(11);
  expect(larguraTexto(f, ' ')).toBe(16); expect(larguraTexto(f, '0')).toBe(17);
  expect(larguraTexto(f, 'pts: 000012345')).toBe(218);
});
test('all 256 glyph metrics match the Python port of the engine', () => {
  const ref = JSON.parse(new TextDecoder().decode(readFileSync('../docs/analysis/tools/out/font-512.json'))) as { larguras: number[]; deslocamentos: number[] };
  const mf = metricasFonte(f)!;
  expect(Array.from(mf.larguras)).toEqual(ref.larguras);
  expect(Array.from(mf.deslocamentos)).toEqual(ref.deslocamentos);
});
test('font ids are 1-based and cached; invalid → 0', () => {
  expect(f).toBe(1);
  expect(C2D2_CarregaFonte('dados/menu/512.png', 32)).toBe(f);
  expect(C2D2_CarregaFonte('./nao/existe.png', 32)).toBe(0);
  expect(C2D2_CarregaFonte('./dados/jogo/nave.png', 32)).toBe(0); // not 16*size square
  expect(larguraTexto(0, 'A')).toBe(0);
});
test('alignment and per-glyph placement', () => {
  const mf = metricasFonte(f)!; const A = 65, i = 105;
  const W = mf.larguras[A] + mf.larguras[i];
  const place = (al: number) => { b.quads.length = 0; C2D2_DesenhaTexto(f, 400, 50, 'Ai', al); return b.quads.map(q => [q.dx, q.dy, q.sx, q.sy]); };
  const glyph = (c: number) => [(c % 16) * 32, Math.trunc(c / 16) * 32];
  const exp = (pen: number) => [[pen - mf.deslocamentos[A], 50, ...glyph(A)], [pen + mf.larguras[A] - mf.deslocamentos[i], 50, ...glyph(i)]];
  expect(place(C2D2_TEXTO_ESQUERDA)).toEqual(exp(400));
  expect(place(C2D2_TEXTO_DIREITA)).toEqual(exp(400 - W));
  expect(place(C2D2_TEXTO_CENTRALIZADO)).toEqual(exp(400 - Math.trunc(W / 2)));
  expect([C2D2_TEXTO_CENTRALIZADO, C2D2_TEXTO_DIREITA, C2D2_TEXTO_ESQUERDA]).toEqual([0, 1, 2]);
});
test('Latin-1: char codes are taken & 255', () => {
  expect(larguraTexto(f, 'é')).toBe(metricasFonte(f)!.larguras[0xe9]);
  expect(larguraTexto(f, String.fromCharCode(0x141))).toBe(metricasFonte(f)!.larguras[0x41]);
});
