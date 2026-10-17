import { test, expect } from 'vitest';
import * as C from '../../src/engine/c2d2';
import { dadosDeTeste } from './fixture';
test('initHeadless is synchronous and wires sprites, maps, input and silent audio', async () => {
  const { backend, entrada } = C.initHeadless(dadosDeTeste());
  expect(C.C2D2_PegaTeclas()).toBe(entrada.teclas);
  expect(C.C2D2_PegaMouse()).toBe(entrada.mouse);
  const s = C.C2D2_CarregaSpriteSet('./dados/menu/x85.jpg', 0, 0);
  expect(s).toBeGreaterThan(0);
  C.C2D2_LimpaTela(); C.C2D2_DesenhaSprite(s, 0, 312, 270); C.C2D2_Sincroniza();
  expect(backend.quads.length).toBe(1); expect(backend.quadros).toBe(1);
  expect(C.C2D2M_CarregaMapaMappy('dados/jogo/mapas/fase1.fmp', 'dados/jogo/mapas/tileset.png')).toBe(1);
  const fx = C.CA2_CarregaEfeito('./dados/sons/explo.wav');
  expect(fx).toBeGreaterThan(0);
  await new Promise(r => setTimeout(r, 0)); // silent decodes settle
  expect(C.CA2_TocaEfeitoTela(fx, 400)).toBe(0);
  entrada.push({ t: 'down', k: C.K.ESPACO }); entrada.poll();
  expect(C.C2D2_PegaTeclas()[C.K.ESPACO].pressionado).toBe(true);
});
test('init / teardown names exist and are harmless', () => {
  expect(C.C2D2_Inicia(800, 600, C.C2D2_JANELA, C.C2D2_DESENHO_OPENGL, 'X85')).toBe(true);
  expect(C.C2D2P_Inicia()).toBe(true); expect(C.CA2_Inicia()).toBe(true); C.C2D2M_Inicia();
  C.C2D2_RemoveSpriteSet(1); C.C2D2_RemoveFonte(1); C.CA2_Encerra(); C.C2D2_Encerra();
  expect(C.C2D2_MESQUERDO).toBe(0); expect(C.C2D2M_INICIO).toBe(0); expect(C.C2D2M_FIM).toBe(1); expect(C.C2D2M_PROG).toBe(20);
  expect(typeof C.rand()).toBe('number'); expect(C.RAND_MAX).toBe(2147483647);
});
