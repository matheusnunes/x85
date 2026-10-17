import { test, expect, beforeEach } from 'vitest';
import * as M from '../../src/game/funcoes_M';
import * as C from '../../src/game/constantes';
import { novoNave, novoTiro, novaMarca, novaExplo, type Planeta } from '../../src/game/tipos';
import { initHeadless, C2D2_CarregaSpriteSet, C2D2_PegaSpriteSet, type Mouse } from '../../src/engine/c2d2';
import { CHAVE } from '../../src/engine/storage';
import { dadosDeTeste, memStorage } from '../unit/fixture';

let h: ReturnType<typeof initHeadless>;
let store: Storage;
beforeEach(() => {
  h = initHeadless(dadosDeTeste());
  store = memStorage();
  M.setStorage(store); M.menu_recordes_default(); M.menu_saves_default();
});

// --- brief tests -------------------------------------------------------------------------
test('low score does not enter the board and does not crash (F4)', () => {
  const antes = M.recordes().map(r => r.pts); M.menu_recordes_insere(1, 'zz'); expect(M.recordes().map(r => r.pts)).toEqual(antes);
});
test('high score inserted sorted, board stays 7', () => { M.menu_recordes_insere(999999, 'top'); const r = M.recordes(); expect(r[0]).toEqual({ nome: 'top', pts: 999999 }); expect(r.length).toBe(7); });
test('same name updates instead of duplicating (F6)', () => { M.menu_recordes_insere(50000, 'argus'); M.menu_recordes_insere(60000, 'argus'); expect(M.recordes().filter(r => r.nome === 'argus').length).toBe(1); });
test('save/load slot round trip', () => { M.menu_saves_edit(2, 'joao', 2, false); M.g.saveAtual.pts = 1234; M.menu_saves_saveslot(2); M.g.saveAtual.pts = 0; M.menu_saves_loadslot(2); expect(M.g.saveAtual.pts).toBe(1234); expect(M.g.saveAtual.nome).toBe('joao'); });

// --- constants & globals -------------------------------------------------------------------
test('enum values match funcoes_M.h / funcoes_J.h', () => {
  expect([C.TELA_MAIN, C.TELA_SLOT_SELECT, C.TELA_SLOT_INSERT, C.TELA_MISSION, C.TELA_OPCOES, C.TELA_RANKING, C.TELA_ABOUT, C.TELA_JOGO, C.SAIR]).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  expect([C.EASY, C.NORMAL, C.HARD, C.GODMODE]).toEqual([1, 2, 3, 4]);
  expect([C.MAXTIROS, C.MAXMARCAS, C.MAXSTARS, C.MAXEXPLOS]).toEqual([300, 1000, 100, 100]);
  expect([C.INVALIDO, C.X85, C.INVUNERAVEL]).toEqual([0, 1, 2]);
  expect([C.C2D2M_INICIO, C.C2D2M_FIM, C.C2D2M_PROG]).toEqual([0, 1, 20]);
  expect([C.BOLA, C.M_INIMIGO1, C.M_METEORO, C.M_BOSS, C.M_T1, C.M_T6]).toEqual([20, 21, 25, 26, 27, 32]);
  expect([C.INIMIGO1, C.METEORO, C.BOSS1, C.BOSS5, C.T1, C.T6, C.EXPLOSAO]).toEqual([1, 5, 6, 10, 11, 16, 17]);
  expect([C.TIRO1, C.TIRO6, C.BOMBA1, C.TIROINI1, C.TIROINI3]).toEqual([1, 6, 7, 8, 10]);
});
test('zero-initialisers', () => {
  expect(novoNave()).toEqual({ tipo: 0, x: 0, y: 0, xaux: 0, yaux: 0, energia: 0, escudo: 0, velocidade: 0, tiro_atual: 0, bomba_atual: 0, n_bombas: 0, intervalo_tiro: 0, sprite: 0 });
  expect(novoTiro()).toEqual({ tipo: 0, x: 0, y: 0, alpha: 0, tamanho: 0, id: 0, sprite: 0 });
  expect(novaMarca()).toEqual({ tipo: 0, estado_atual: 0, tempotiro: 0, x: 0, y: 0, centroX: 0, centroY: 0, energia: 0, ativo: 0, angulo: 0, sprite: 0 });
  expect(novaExplo()).toEqual({ tipo: 0, x: 0, y: 0, tamanho: 0, alpha: 0 });
});
test('globals start like funcoes_M.cpp:4-14', () => {
  expect(M.g.planeta_max).toBe(5); expect(M.g.volume_music).toBe(30); expect(M.g.volume_effects).toBe(30);
  expect(M.g.slotAtual).toBe(0); expect(M.g.saveAtual.tiro_liberado.length).toBe(6);
});

// --- records / saves -------------------------------------------------------------------------
test('defaults written to storage', () => {
  expect(store.getItem(CHAVE)).not.toBeNull();
  expect(M.recordes()[0]).toEqual({ nome: 'Matheus', pts: 9000 });
  expect(M.menu_saves_carregavetor().map(s => [s.nome, s.empty, s.level])).toEqual([['new', true, 1], ['new', true, 1], ['new', true, 1]]);
});
test('tie goes above the existing record, last one drops (funcoes_M.cpp:181)', () => {
  M.menu_recordes_insere(2000, 'tie');
  const r = M.recordes();
  expect(r.map(x => x.nome)).toEqual(['Matheus', 'Argus', 'chucknorris', 'tie', 'magaiver', 'loser', 'bill']);
});
test('same name with lower score changes nothing (F6); higher re-sorts', () => {
  const antes = M.recordes(); M.menu_recordes_insere(100, 'Argus'); expect(M.recordes()).toEqual(antes);
  M.menu_recordes_insere(9500, 'Argus');
  expect(M.recordes().slice(0, 3)).toEqual([{ nome: 'Argus', pts: 9500 }, { nome: 'Matheus', pts: 9000 }, { nome: 'chucknorris', pts: 3000 }]);
  expect(M.recordes().length).toBe(7);
});
test('insert does not touch the caller name / saveAtual (F5)', () => {
  M.g.saveAtual.nome = 'meu'; M.menu_recordes_insere(5000, M.g.saveAtual.nome); expect(M.g.saveAtual.nome).toBe('meu');
});
test('saveslot writes only progress fields; loadslot copies nome but not level/empty', () => {
  M.menu_saves_edit(1, 'ana', 3, false);
  Object.assign(M.g.saveAtual, { nome: 'outro', level: 4, empty: true, pts: 77, planeta_liberado: 2, planeta_atual: 1, tiro_liberado: [true, true, false, false, false, false] });
  M.menu_saves_saveslot(1);
  const s = M.menu_saves_carregavetor()[1];
  expect(s).toEqual({ empty: false, pts: 77, nome: 'ana', level: 3, planeta_liberado: 2, planeta_atual: 1, tiro_liberado: [true, true, false, false, false, false] });
  M.g.saveAtual.level = 9; M.g.saveAtual.empty = true;
  M.menu_saves_loadslot(1);
  expect(M.g.saveAtual.nome).toBe('ana'); expect(M.g.saveAtual.level).toBe(9); expect(M.g.saveAtual.empty).toBe(true);
  // the loaded weapon array is a copy, not the stored one
  M.g.saveAtual.tiro_liberado[5] = true; expect(M.menu_saves_carregavetor()[1].tiro_liberado[5]).toBe(false);
});
test('menu_saves_edit resets progress', () => {
  M.g.saveAtual.pts = 500; M.menu_saves_saveslot(0);
  M.menu_saves_edit(0, 'z', 2, false);
  expect(M.menu_saves_carregavetor()[0]).toEqual({ empty: false, pts: 0, nome: 'z', level: 2, planeta_liberado: 0, planeta_atual: 0, tiro_liberado: [true, false, false, false, false, false] });
});
test('menu_saves_default keeps records; menu_recordes_default keeps saves', () => {
  M.menu_recordes_insere(99999, 'x'); M.menu_saves_edit(0, 'k', 1, false);
  M.menu_saves_default(); expect(M.recordes()[0].nome).toBe('x');
  M.menu_saves_edit(0, 'k', 1, false); M.menu_recordes_default();
  expect(M.menu_saves_carregavetor()[0].nome).toBe('k'); expect(M.recordes()[0].nome).toBe('Matheus');
});
test('volume options persist (D10)', () => {
  M.g.volume_music = 55; M.g.volume_effects = 7; M.opcoes_grava();
  M.g.volume_music = 30; M.g.volume_effects = 30; M.opcoes_carrega();
  expect([M.g.volume_music, M.g.volume_effects]).toEqual([55, 7]);
});

// --- widgets -----------------------------------------------------------------------------
test('HOTSPOT is the single solid pixel of cursor.png frame 1', () => {
  const cur = C2D2_CarregaSpriteSet('./dados/menu/cursor.png', 40, 40);
  const s = C2D2_PegaSpriteSet(cur)!;
  const solidos: [number, number][] = [];
  for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) {
    const px = 40 + x; if ((s.mask.bits[y * s.mask.ldwords + (px >> 5)] >>> (px & 31)) & 1) solidos.push([x, y]);
  }
  expect(solidos).toEqual([[M.HOTSPOT.x, M.HOTSPOT.y]]);
  expect(M.HOTSPOT).toEqual({ x: 8, y: 6 });
});
test('XDesenhaBotao: hover fades alpha, edges map to 1/2/3, miss returns 0', () => {
  const cur = C2D2_CarregaSpriteSet('./dados/menu/cursor.png', 40, 40);
  const bot = C2D2_CarregaSpriteSet('./dados/menu/botmain.png', 262, 62);
  const a = { v: 0 };
  const mover = (x: number, y: number) => { h.entrada.push({ t: 'mmove', x, y }); h.entrada.poll(); };
  mover(0, 0);
  expect(M.XDesenhaBotao(bot, 0, 262, 162, cur, a)).toBe(0); expect(a.v).toBe(0);
  // two quads per call: normal frame + highlight frame
  const n0 = h.backend.quads.length; M.XDesenhaBotao(bot, 0, 262, 162, cur, a); expect(h.backend.quads.length - n0).toBe(2);
  const cx = 262 + 131 - M.HOTSPOT.x, cy = 162 + 31 - M.HOTSPOT.y;
  mover(cx, cy);
  expect(M.XDesenhaBotao(bot, 0, 262, 162, cur, a)).toBe(0); expect(a.v).toBe(25);
  h.entrada.push({ t: 'mdown', b: 0, x: cx, y: cy }); h.entrada.poll();
  expect(M.XDesenhaBotao(bot, 0, 262, 162, cur, a)).toBe(1);
  h.entrada.poll();
  expect(M.XDesenhaBotao(bot, 0, 262, 162, cur, a)).toBe(2);
  h.entrada.push({ t: 'mup', b: 0, x: cx, y: cy }); h.entrada.poll();
  expect(M.XDesenhaBotao(bot, 0, 262, 162, cur, a)).toBe(3);
  for (let i = 0; i < 20; i++) M.XDesenhaBotao(bot, 0, 262, 162, cur, a);
  expect(a.v).toBe(250);
  mover(0, 0); M.XDesenhaBotao(bot, 0, 262, 162, cur, a); expect(a.v).toBe(225);
});
test('XDesenhaSprite: 0 size → frame size; explicit size kept (negative flips)', () => {
  const bot = C2D2_CarregaSpriteSet('./dados/menu/botmain.png', 262, 62);
  const n = h.backend.quads.length;
  M.XDesenhaSprite(bot, 1, 10, 20, 0, 0, 100);
  M.XDesenhaSprite(bot, 0, 230, 430, 65, -60, 255);
  const [q1, q2] = h.backend.quads.slice(n);
  expect([q1.dx, q1.dy, q1.dw, q1.dh, q1.sy]).toEqual([10, 20, 262, 62, 62]); expect(q1.alpha).toBeCloseTo(100 / 255);
  expect([q2.dw, q2.dh]).toEqual([65, -60]);
  M.XDesenhaSprite(0, 0, 0, 0, 0, 0, 255); // id 0: silent no-op
  expect(h.backend.quads.length).toBe(n + 2);
});
test('planetas_atualiza converges to the spec steady state (01-game-spec 2.4)', () => {
  const p: Planeta[] = Array.from({ length: 5 }, () => ({ x: 400, y: 300, tamanho: 2, alpha: 0 }));
  for (let i = 0; i < 200; i++) M.planetas_atualiza(p, 1, 5);
  expect(p[1]).toEqual({ x: 325, y: 225, tamanho: 150, alpha: 255 });
  expect(p[2]).toEqual({ x: 495, y: 262, tamanho: 75, alpha: 205 });
  expect(p[3]).toEqual({ x: 590, y: 281, tamanho: 37, alpha: 155 });
  expect(p[0]).toEqual({ x: 5, y: 150, tamanho: 300, alpha: 127 });
  // first step from the initial state: tamanho 2 + 148/10+1 = 17, x 400 - 75/10-1 = 392, y 300 - 75/10-1 = 292
  const q: Planeta[] = Array.from({ length: 5 }, () => ({ x: 400, y: 300, tamanho: 2, alpha: 0 }));
  M.planetas_atualiza(q, 3, 5);
  expect(q[3]).toEqual({ x: 392, y: 292, tamanho: 17, alpha: 255 });
  expect(q[2]).toEqual({ x: 392 - 34 - 20, y: 292 + Math.trunc((17 - 34) / 2), tamanho: 34, alpha: 127 });
});
test('atualiza_barra clamps and returns the percentage (funcoes_M.cpp:126)', () => {
  const y = { v: 0 }; const m = (my: number): Mouse => ({ x: 0, y: my, botoes: [0, 0, 0].map(() => ({ pressionado: false, ativo: false, liberado: false })) as Mouse['botoes'] });
  expect(M.atualiza_barra(y, 422, 250, m(100))).toBe(100); expect(y.v).toBe(250);
  expect(M.atualiza_barra(y, 422, 250, m(500))).toBe(0); expect(y.v).toBe(422);
  expect(M.atualiza_barra(y, 422, 250, m(371))).toBe(29); expect(y.v).toBe(371);
  expect(M.atualiza_barra(y, 422, 250, m(371.7))).toBe(29); expect(y.v).toBe(371);
});
