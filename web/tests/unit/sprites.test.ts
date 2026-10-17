import { test, expect, beforeAll } from 'vitest';
import { RecordingBackend } from '../../src/engine/renderer';
import { initSprites, C2D2_CarregaSpriteSet, C2D2_PegaSpriteSet, C2D2_DesenhaSprite, C2D2_DesenhaSpriteEfeito, C2D2_LimpaTela, C2D2P_Pontos, C2D2_Sincroniza } from '../../src/engine/sprites';
import { normaliza, parseMascara } from '../../src/engine/assets';
import { dadosDeTeste } from './fixture';
let b: RecordingBackend;
beforeAll(() => { b = new RecordingBackend(); initSprites(b, dadosDeTeste()); });
test('ids are 1-based and cached by path', () => {
  const a = C2D2_CarregaSpriteSet('./dados/jogo/nave.png', 60, 60);
  expect(a).toBeGreaterThan(0);
  expect(C2D2_CarregaSpriteSet('dados/jogo/nave.png', 60, 60)).toBe(a);
  expect(C2D2_CarregaSpriteSet('./nao/existe.png', 0, 0)).toBe(0);
});
test('frame slicing row-major', () => {
  const id = C2D2_CarregaSpriteSet('./dados/jogo/nave.png', 60, 60); const s = C2D2_PegaSpriteSet(id)!;
  expect([s.largura, s.altura, s.spLargura, s.spAltura, s.matrizX, s.matrizY]).toEqual([120, 60, 60, 60, 2, 1]);
  b.quads.length = 0; C2D2_DesenhaSprite(id, 1, 10, 20);
  expect(b.quads[0]).toMatchObject({ sx: (1 % s.matrizX) * 60, sy: Math.trunc(1 / s.matrizX) * 60, sw: 60, sh: 60, dx: 10, dy: 20, dw: 60, dh: 60, alpha: 1 });
  expect(C2D2_DesenhaSprite(id, s.matrizX * s.matrizY, 0, 0)).toBe(false);
  expect(C2D2_DesenhaSprite(0, 0, 0, 0)).toBe(false);
  expect(b.quads.length).toBe(1);
});
test('multi-row sheet: col = i % matrizX, row = trunc(i / matrizX)', () => {
  const id = C2D2_CarregaSpriteSet('./dados/menu/botmain.png', 131, 62); const s = C2D2_PegaSpriteSet(id)!;
  expect([s.matrizX, s.matrizY]).toEqual([2, 2]);
  b.quads.length = 0; expect(C2D2_DesenhaSprite(id, 3, 0, 0)).toBe(true);
  expect(b.quads[0]).toMatchObject({ sx: 131, sy: 62, sw: 131, sh: 62 });
});
test('zero size → whole image is one frame', () => {
  const id = C2D2_CarregaSpriteSet('./dados/jogo/barras_energy.png', 0, 0); const s = C2D2_PegaSpriteSet(id)!;
  expect([s.spLargura, s.spAltura, s.matrizX, s.matrizY]).toEqual([16, 586, 1, 1]);
});
test('effect draw: negative height mirrors, alpha wraps & 255', () => {
  const id = C2D2_CarregaSpriteSet('./dados/jogo/barras_energy.png', 0, 0);
  b.quads.length = 0; C2D2_DesenhaSpriteEfeito(id, 0, 6, 595, 16, -100, 256 + 128);
  expect(b.quads[0]).toMatchObject({ dx: 6, dy: 595, dw: 16, dh: -100 });
  expect(b.quads[0].alpha).toBeCloseTo(128 / 255);
});
test('effect draw: w or h == 0 → frame size; bad index → false', () => {
  const id = C2D2_CarregaSpriteSet('./dados/jogo/nave.png', 60, 60);
  b.quads.length = 0; expect(C2D2_DesenhaSpriteEfeito(id, 1, 5, 7, 0, 30, 255)).toBe(true);
  expect(b.quads[0]).toMatchObject({ sx: 60, sy: 0, sw: 60, sh: 60, dx: 5, dy: 7, dw: 60, dh: 60, alpha: 1 });
  expect(C2D2_DesenhaSpriteEfeito(id, 2, 0, 0, 10, 10, 255)).toBe(false);
});
test('limpa, pontos and sincroniza reach the backend', () => {
  const l = b.limpezas, q = b.quadros; C2D2_LimpaTela(); C2D2_Sincroniza();
  expect(b.limpezas).toBe(l + 1); expect(b.quadros).toBe(q + 1);
  C2D2P_Pontos(new Int32Array([1, 2, 3, 4]), 2, 200, 200, 200);
  expect(b.pontosGravados.at(-1)).toMatchObject({ n: 2, r: 200, g: 200, b: 200 });
});
test('normaliza strips leading ./', () => {
  expect(normaliza('./dados/x.png')).toBe('dados/x.png'); expect(normaliza('dados/x.png')).toBe('dados/x.png');
});
test('parseMascara reads LE header + rows of ceil(w/32) words', () => {
  const buf = new ArrayBuffer(8 + 2 * 2 * 4); const dv = new DataView(buf);
  dv.setUint32(0, 33, true); dv.setUint32(4, 2, true); dv.setUint32(8 + 4, 1, true); dv.setUint32(8 + 8, 0x80000000, true);
  const m = parseMascara(buf);
  expect([m.w, m.h, m.ldwords]).toEqual([33, 2, 2]);
  expect(Array.from(m.bits)).toEqual([0, 1, 0x80000000, 0]);
  const curto = new ArrayBuffer(12); new DataView(curto).setUint32(0, 33, true); new DataView(curto).setUint32(4, 2, true);
  expect(() => parseMascara(curto)).toThrow(); expect(() => parseMascara(new ArrayBuffer(4))).toThrow();
});
