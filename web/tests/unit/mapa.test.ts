import { test, expect, beforeAll } from 'vitest';
import { initMapas, C2D2M_CarregaMapaMappy, C2D2M_PrimeiroBlocoMarca, C2D2M_ProximoBlocoMarca } from '../../src/engine/mapa';
import { dadosDeTeste } from './fixture';
beforeAll(() => initMapas(dadosDeTeste()));
test('iterates markers row-major', () => {
  const m = C2D2M_CarregaMapaMappy('dados/jogo/mapas/fase1.fmp', 'dados/jogo/mapas/tileset.png');
  expect(C2D2M_PrimeiroBlocoMarca(m, 0)).toEqual({ x: 368, y: 6384 });
  let n = 0; for (let p = C2D2M_PrimeiroBlocoMarca(m, 21); p; p = C2D2M_ProximoBlocoMarca(m)) n++;
  expect(n).toBe(27);
  expect(C2D2M_CarregaMapaMappy('dados/jogo/mapas/fase6.fmp', 'x')).toBe(0);
});
test('ids are 1-based and cached by normalised path', () => {
  const a = C2D2M_CarregaMapaMappy('dados/jogo/mapas/fase1.fmp', 't');
  expect(a).toBeGreaterThan(0);
  expect(C2D2M_CarregaMapaMappy('./dados/jogo/mapas/fase1.fmp', 't')).toBe(a);
  expect(C2D2M_CarregaMapaMappy('dados/jogo/mapas/fase2.fmp', 't')).not.toBe(a);
});
test('order and coordinates match the JSON; iterator ends and stays ended', () => {
  const m = C2D2M_CarregaMapaMappy('dados/jogo/mapas/fase1.fmp', 't');
  const pts: [number, number][] = [];
  for (let p = C2D2M_PrimeiroBlocoMarca(m, 21); p; p = C2D2M_ProximoBlocoMarca(m)) pts.push([p.x, p.y]);
  expect(pts).toEqual(dadosDeTeste().mapas.get('dados/jogo/mapas/fase1.fmp')!.markers['21']);
  expect(C2D2M_ProximoBlocoMarca(m)).toBeNull();
  expect(C2D2M_PrimeiroBlocoMarca(m, 1)).toEqual({ x: 368, y: 16 });
  expect(C2D2M_ProximoBlocoMarca(m)).toBeNull();
});
test('absent code / invalid map → null; a failed search keeps the previous iteration (C behaviour)', () => {
  const m = C2D2M_CarregaMapaMappy('dados/jogo/mapas/fase1.fmp', 't');
  expect(C2D2M_PrimeiroBlocoMarca(0, 0)).toBeNull();
  expect(C2D2M_ProximoBlocoMarca(0)).toBeNull();
  expect(C2D2M_PrimeiroBlocoMarca(99, 0)).toBeNull();
  const primeiro = C2D2M_PrimeiroBlocoMarca(m, 22);
  expect(primeiro).not.toBeNull();
  expect(C2D2M_PrimeiroBlocoMarca(m, 24)).toBeNull(); // fase1 has no M_INIMIGO4
  const seg = C2D2M_ProximoBlocoMarca(m);
  expect(seg).toEqual({ x: dadosDeTeste().mapas.get('dados/jogo/mapas/fase1.fmp')!.markers['22'][1][0], y: dadosDeTeste().mapas.get('dados/jogo/mapas/fase1.fmp')!.markers['22'][1][1] });
});
test('initMapas resets the table', () => {
  initMapas(dadosDeTeste());
  expect(C2D2M_CarregaMapaMappy('dados/jogo/mapas/fase3.fmp', 't')).toBe(1);
});
