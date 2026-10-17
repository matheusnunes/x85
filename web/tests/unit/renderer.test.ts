import { test, expect } from 'vitest';
import { verticesQuad, tamanhoTextura, FLOATS_POR_VERTICE, RecordingBackend } from '../../src/engine/renderer';
const V = FLOATS_POR_VERTICE; // x, y, u, v, alpha, r, g, b
const corner = (o: Float32Array, k: number) => Array.from(o.subarray(k * V, k * V + V));
test('texture size is the engine POT square (16..1024)', () => {
  expect(tamanhoTextura(120, 60)).toBe(128); expect(tamanhoTextura(8, 8)).toBe(16);
  expect(tamanhoTextura(512, 512)).toBe(512); expect(tamanhoTextura(800, 600)).toBe(1024);
});
test('quad → two triangles TL,TR,BR / BR,BL,TL with frame UVs', () => {
  const o = new Float32Array(6 * V);
  verticesQuad({ tex: 1, sx: 60, sy: 0, sw: 60, sh: 60, dx: 10, dy: 20, dw: 60, dh: 60, alpha: 0.5 }, 128, 128, 1, 1, 1, o, 0);
  const TL = [10, 20, 60 / 128, 0, 0.5, 1, 1, 1], TR = [70, 20, 120 / 128, 0, 0.5, 1, 1, 1];
  const BR = [70, 80, 120 / 128, 60 / 128, 0.5, 1, 1, 1], BL = [10, 80, 60 / 128, 60 / 128, 0.5, 1, 1, 1];
  expect([0, 1, 2, 3, 4, 5].map(k => corner(o, k))).toEqual([TL, TR, BR, BR, BL, TL]);
});
test('negative height: texture top row at dy, bottom row at dy+dh (vertical mirror, grows up)', () => {
  const o = new Float32Array(6 * V);
  verticesQuad({ tex: 1, sx: 0, sy: 0, sw: 16, sh: 586, dx: 6, dy: 595, dw: 16, dh: -100, alpha: 1 }, 1024, 1024, 1, 1, 1, o, 0);
  expect(corner(o, 0).slice(0, 4)).toEqual([6, 595, 0, 0]);               // TL: top texel row at y=595
  expect(corner(o, 2).slice(0, 4)).toEqual([22, 495, 16 / 1024, 586 / 1024]); // BR: bottom texel row at y=495
});
test('negative width mirrors horizontally; colour and offset honoured', () => {
  const o = new Float32Array(12 * V);
  verticesQuad({ tex: 0, sx: 0, sy: 0, sw: 1, sh: 1, dx: 50, dy: 0, dw: -10, dh: 10, alpha: 1 }, 16, 16, 0.5, 0.25, 1, o, 6 * V);
  expect(corner(o, 6)).toEqual([50, 0, 0, 0, 1, 0.5, 0.25, 1]);
  expect(corner(o, 7).slice(0, 3)).toEqual([40, 0, 1 / 16]);
});
test('RecordingBackend hands out sequential texture ids and records calls', () => {
  const r = new RecordingBackend();
  const t1 = r.criaTextura(null, 10, 10), t2 = r.criaTextura(null, 10, 10);
  expect(t2).toBe(t1 + 1);
  r.limpa(); r.fimQuadro(); expect([r.limpezas, r.quadros]).toEqual([1, 1]);
});
