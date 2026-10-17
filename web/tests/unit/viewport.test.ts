import { test, expect } from 'vitest';
import { encaixa, paraLogico } from '../../src/engine/viewport';
test('landscape letterbox', () => { const e = encaixa(1280, 800); expect(e.altura).toBe(800); expect(e.largura).toBeCloseTo(1066.67, 1); expect(e.esquerda).toBeCloseTo((1280 - e.largura) / 2, 1); });
test('portrait fits width and reserves bottom', () => { const e = encaixa(390, 844, 260); expect(e.largura).toBe(390); expect(e.topo).toBeGreaterThanOrEqual(0); expect(e.topo + e.altura).toBeLessThanOrEqual(844 - 260); });
test('pointer mapping round-trips after resize', () => {
  for (const [w, h] of [[1280, 800], [844, 390], [390, 844]]) { const e = encaixa(w, h); const p = paraLogico(e, e.esquerda + e.largura / 2, e.topo + e.altura / 2); expect(p).toEqual({ x: 400, y: 300 }); }
});
test('keeps 4:3 and centres; reserve is ignored in landscape', () => {
  const e = encaixa(1000, 1000); expect(e.largura).toBe(1000); expect(e.altura).toBe(750); expect(e.topo).toBe(125); expect(e.escala).toBe(1.25);
  expect(encaixa(1280, 800, 260)).toEqual(encaixa(1280, 800));
});
test('pointer mapping clamps and truncates at the edges', () => {
  for (const [w, h, r] of [[1280, 800, undefined], [390, 844, 260], [1920, 1080, undefined], [801, 601, undefined]] as const) {
    const e = encaixa(w, h, r);
    expect(paraLogico(e, e.esquerda - 50, e.topo - 50)).toEqual({ x: 0, y: 0 });
    expect(paraLogico(e, e.esquerda + e.largura + 50, e.topo + e.altura + 50)).toEqual({ x: 799, y: 599 });
    expect(paraLogico(e, e.esquerda, e.topo)).toEqual({ x: 0, y: 0 });
    // every logical pixel centre maps back to itself
    for (let x = 0; x < 800; x += 37) {
      const p = paraLogico(e, e.esquerda + (x + 0.5) * e.escala, e.topo + ((x % 600) + 0.5) * e.escala);
      expect(p).toEqual({ x, y: x % 600 });
    }
  }
});
