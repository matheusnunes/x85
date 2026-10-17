import { test, expect, beforeAll } from 'vitest';
import { colidemMascaras, C2D2_ColidiuSprites } from '../../src/engine/collision';
import { RecordingBackend } from '../../src/engine/renderer';
import { initSprites, C2D2_CarregaSpriteSet } from '../../src/engine/sprites';
import { dadosDeTeste } from './fixture';
const m = (w: number, h: number, solid: (x: number, y: number) => boolean) => {
  const ld = Math.ceil(w / 32), bits = new Uint32Array(ld * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (solid(x, y)) bits[y * ld + (x >> 5)] |= 1 << (x & 31);
  return { w, h, ldwords: ld, bits };
};
// colidemMascaras(a, ax0, ay0, aw, ah, b, bx0, by0, bw, bh, offx, offy): frame rects inside each mask, b offset relative to a
test('ring masks: bbox overlap but no pixel overlap → false', () => {
  const ring = m(40, 40, (x, y) => x === 0 || y === 0 || x === 39 || y === 39);
  const dot = m(2, 2, () => true);
  expect(colidemMascaras(ring, 0, 0, 40, 40, dot, 0, 0, 2, 2, 19, 19)).toBe(false);
  expect(colidemMascaras(ring, 0, 0, 40, 40, dot, 0, 0, 2, 2, 0, 0)).toBe(true);
  expect(colidemMascaras(ring, 0, 0, 40, 40, dot, 0, 0, 2, 2, 38, 38)).toBe(true);
  expect(colidemMascaras(ring, 0, 0, 40, 40, dot, 0, 0, 2, 2, -1, -1)).toBe(true);
  expect(colidemMascaras(ring, 0, 0, 40, 40, dot, 0, 0, 2, 2, 40, 0)).toBe(false);
  expect(colidemMascaras(ring, 0, 0, 40, 40, dot, 0, 0, 2, 2, -2, 0)).toBe(false);
});
test('wide overlaps (>64px) compare the right words (engine bug fixed)', () => {
  const left = m(128, 1, x => x < 32), right = m(128, 1, x => x >= 96);
  expect(colidemMascaras(left, 0, 0, 128, 1, right, 0, 0, 128, 1, 0, 0)).toBe(false);
  expect(colidemMascaras(left, 0, 0, 128, 1, right, 0, 0, 128, 1, -70, 0)).toBe(true);
  expect(colidemMascaras(left, 0, 0, 128, 1, right, 0, 0, 128, 1, -64, 0)).toBe(false);
  expect(colidemMascaras(left, 0, 0, 128, 1, right, 0, 0, 128, 1, -65, 0)).toBe(true);
});
test('no sign-extension false positive when the next word starts solid', () => {
  // a: only pixel 32 solid; b: only pixel 0 solid; shift b by 5 → b pixel at 5, a pixel at 32: no overlap
  const a = m(64, 1, x => x === 32), b = m(64, 1, x => x === 0 || x === 63);
  expect(colidemMascaras(a, 0, 0, 64, 1, b, 0, 0, 64, 1, 5, 0)).toBe(false);
  expect(colidemMascaras(a, 0, 0, 64, 1, b, 0, 0, 64, 1, 32, 0)).toBe(true);
});
test('frame sub-rectangles: only the frame’s own pixels are tested', () => {
  // sheet 2 frames of 8x8: frame 0 empty, frame 1 solid
  const sheet = m(16, 8, x => x >= 8), dot = m(1, 1, () => true);
  expect(colidemMascaras(sheet, 0, 0, 8, 8, dot, 0, 0, 1, 1, 7, 7)).toBe(false);
  expect(colidemMascaras(sheet, 8, 0, 8, 8, dot, 0, 0, 1, 1, 0, 0)).toBe(true);
  expect(colidemMascaras(dot, 0, 0, 1, 1, sheet, 0, 0, 8, 8, -7, 0)).toBe(false); // would hit frame 1 if not clipped
  expect(colidemMascaras(dot, 0, 0, 1, 1, sheet, 8, 0, 8, 8, -7, 0)).toBe(true);
});
test('C2D2_ColidiuSprites with real masks', () => {
  initSprites(new RecordingBackend(), dadosDeTeste());
  const nave = C2D2_CarregaSpriteSet('./dados/jogo/nave.png', 60, 60);
  const bomba = C2D2_CarregaSpriteSet('./dados/jogo/tiros/bomba.png', 0, 0); // JPG-based → solid 800x600
  expect(C2D2_ColidiuSprites(nave, 0, 100, 100, bomba, 0, 0, 0)).toBe(true);
  expect(C2D2_ColidiuSprites(nave, 0, 900, 100, bomba, 0, 0, 0)).toBe(false);
  expect(C2D2_ColidiuSprites(nave, 0, 100, 100, nave, 0, 100, 100)).toBe(true);
  expect(C2D2_ColidiuSprites(nave, 0, 0, 0, nave, 0, 60, 0)).toBe(false); // touching edges
  expect(C2D2_ColidiuSprites(0, 0, 0, 0, nave, 0, 0, 0)).toBe(false);
  expect(C2D2_ColidiuSprites(nave, 2, 0, 0, nave, 0, 0, 0)).toBe(false);
});
