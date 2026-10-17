// Task 11: background, stars, player ship, shots, HUD bar, explosions (funcoes_J.cpp:3-319, :81-103, :823-849).
import { test, expect, beforeAll, beforeEach } from 'vitest';
import { initHeadless, srand } from '../../src/engine/c2d2';
import { K } from '../../src/engine/input';
import { dadosDeTeste } from '../unit/fixture';
import * as J from '../../src/game/funcoes_J';
import { novoNave, novoTiro, novaExplo, novaMarca } from '../../src/game/tipos';
import {
  TIRO1, TIRO2, TIRO3, TIRO4, TIRO5, TIRO6, BOMBA1, TIROINI1, TIROINI2, TIROINI3,
  MAXTIROS, MAXEXPLOS, MAXSTARS, INVALIDO, X85, EXPLOSAO,
} from '../../src/game/constantes';

let h: ReturnType<typeof initHeadless>;
beforeAll(() => { h = initHeadless(dadosDeTeste()); });
beforeEach(() => { h.entrada.push({ t: 'releaseAll' }); h.entrada.poll(); h.entrada.poll(); });

const pool = () => Array.from({ length: MAXTIROS }, novoTiro);
const explos = () => Array.from({ length: MAXEXPLOS }, novaExplo);
const jogador = () => { const n = novoNave(); J.jogo_inicia_jogador(n); return n; };

// --- F1 / jogo_inicia_jogador --------------------------------------------------------------
test('player starts with 100 energy and 5 bombs (F1)', () => {
  const n = jogador();
  expect(n.energia).toBe(100);
  expect(n.n_bombas).toBe(5);
});

test('jogo_inicia_jogador sets the original start state', () => {
  const n = jogador();
  expect([n.x, n.y, n.xaux, n.yaux]).toEqual([400, 400, 400, 400]);
  expect(n.velocidade).toBe(20);
  expect(n.tipo).toBe(X85);
  expect(n.escudo).toBe(100);
  expect(n.tiro_atual).toBe(TIRO1);
  expect(n.bomba_atual).toBe(BOMBA1);
  expect(n.intervalo_tiro).toBe(0);
});

// --- F2 / jogo_atualiza_tiro ---------------------------------------------------------------
test('enemy shots leave the pool once off-screen (F2)', () => {
  const tiros = pool(); const n = jogador();
  tiros[0].tipo = TIROINI1; tiros[0].x = 400; tiros[0].y = 690;
  // y: 690 -> 694 -> 698 -> 702 (3 moves), then expired on the 4th update (expiry is checked before movement)
  for (let i = 0; i < 3; i++) J.jogo_atualiza_tiro(tiros, n);
  expect(tiros[0].tipo).toBe(TIROINI1);
  expect(tiros[0].y).toBe(702);
  J.jogo_atualiza_tiro(tiros, n);
  expect(tiros[0].tipo).toBe(INVALIDO);
});

test('enemy shots expire off every edge: y<-100, x<-100, x>900 (F2)', () => {
  const n = jogador();
  for (const [tipo, x, y] of [[TIROINI2, 400, -101], [TIROINI3, -101, 300], [TIROINI1, 901, 300]] as const) {
    const tiros = pool();
    tiros[5].tipo = tipo; tiros[5].x = x; tiros[5].y = y; tiros[5].alpha = 255;
    J.jogo_atualiza_tiro(tiros, n);
    expect(tiros[5].tipo).toBe(INVALIDO);
  }
  // on-screen enemy shots are not touched by the fix
  const tiros = pool();
  tiros[0].tipo = TIROINI2; tiros[0].x = 900; tiros[0].y = 700; tiros[0].alpha = 255;
  J.jogo_atualiza_tiro(tiros, n);
  expect(tiros[0].tipo).toBe(TIROINI2);
  expect(tiros[0].y).toBe(704);
});

test('a full pool of stale enemy shots drains, so the player can fire again (F2/F16)', () => {
  const tiros = pool(); const n = jogador();
  for (const t of tiros) { t.tipo = TIROINI1; t.x = 400; t.y = 650; t.alpha = 255; }
  J.jogo_cria_tiro(tiros, n, TIRO1);
  expect(tiros.some(t => t.tipo === TIRO1)).toBe(false);
  for (let i = 0; i < 20; i++) J.jogo_atualiza_tiro(tiros, n);
  J.jogo_cria_tiro(tiros, n, TIRO1);
  expect(tiros[0].tipo).toBe(TIRO1);
});

test('enemy shot motion: TIROINI1/2 fall 4 px, TIROINI3 homes on x and falls 3 px', () => {
  const tiros = pool(); const n = jogador(); // n.x = 400
  tiros[0].tipo = TIROINI1; tiros[0].y = 0; tiros[0].x = 100; tiros[0].alpha = 255;
  tiros[1].tipo = TIROINI2; tiros[1].y = 0; tiros[1].x = 100; tiros[1].alpha = 255;
  tiros[2].tipo = TIROINI3; tiros[2].y = 0; tiros[2].x = 100; tiros[2].alpha = 255;
  tiros[3].tipo = TIROINI3; tiros[3].y = 0; tiros[3].x = 700; tiros[3].alpha = 255;
  J.jogo_atualiza_tiro(tiros, n);
  expect([tiros[0].x, tiros[0].y]).toEqual([100, 4]);
  expect([tiros[1].x, tiros[1].y]).toEqual([100, 4]);
  expect([tiros[2].x, tiros[2].y]).toEqual([100 + Math.trunc(300 / 80) + 1, 3]); // 104
  expect([tiros[3].x, tiros[3].y]).toEqual([700 - (Math.trunc(300 / 80) + 1), 3]); // 696
});

test('player shot motion and expiry follow funcoes_J.cpp:259-300', () => {
  const tiros = pool(); const n = jogador();
  J.jogo_cria_tiro(tiros, n, TIRO1);
  J.jogo_atualiza_tiro(tiros, n);
  expect(tiros[0].y).toBe(394);
  // TIRO3: tamanho 5 -> 6, y -= 6/3
  const t3 = pool(); J.jogo_cria_tiro(t3, n, TIRO3); J.jogo_atualiza_tiro(t3, n);
  expect([t3[0].tamanho, t3[0].y]).toEqual([6, 398]);
  // TIRO5: alpha 255 -> 251, tamanho 10 -> 11, y -= 11/4
  const t5 = pool(); J.jogo_cria_tiro(t5, n, TIRO5); J.jogo_atualiza_tiro(t5, n);
  expect([t5[0].tamanho, t5[0].alpha, t5[0].y]).toEqual([11, 251, 395 - 2]);
  // TIRO6: y -= 6/3+1 first, then tamanho++, alpha -= 6
  const t6 = pool(); J.jogo_cria_tiro(t6, n, TIRO6); J.jogo_atualiza_tiro(t6, n);
  expect([t6[0].y, t6[0].tamanho, t6[0].alpha]).toEqual([398 - 3, 7, 249]);
  // a shot above y=-100 dies on the next update
  tiros[0].y = -101; J.jogo_atualiza_tiro(tiros, n);
  expect(tiros[0].tipo).toBe(INVALIDO);
  // TIRO6 fades out: alive while alpha >= 10
  let vivos = 1;
  for (; vivos < 100 && t6[0].tipo !== INVALIDO; vivos++) J.jogo_atualiza_tiro(t6, n);
  expect(vivos).toBe(42); // alpha = 255-6k: 9 after 41 updates → removed on update 42 (alpha < 10)
});

test('bomb: created at (0,0) size 800, resets the fire interval, lives 52 frames', () => {
  const tiros = pool(); const n = jogador(); n.intervalo_tiro = 4;
  J.jogo_cria_tiro(tiros, n, BOMBA1);
  expect(tiros[0]).toMatchObject({ tipo: BOMBA1, x: 0, y: 0, tamanho: 800, alpha: 255 });
  expect(n.intervalo_tiro).toBe(0);
  let k = 0;
  while (tiros[0].tipo === BOMBA1 && k < 100) { J.jogo_atualiza_tiro(tiros, n); k++; }
  expect(k).toBe(52); // alpha 255 → 0 in 51 updates, removed on the 52nd (alpha < 5)
});

// --- jogo_cria_tiro / jogo_cria_tiro_inimigo ---------------------------------------------------
test('jogo_cria_tiro spawn offsets and intervals match funcoes_J.cpp:105-208', () => {
  const n = jogador(); n.x = 100; n.y = 200;
  const casos: [number, number, number, number, number][] = [
    // tipo, intervalo, dx, dy, tamanho
    [TIRO1, 4, 21, 0, 0], [TIRO2, 6, 14, 0, 0], [TIRO3, 6, 29, 0, 5], [TIRO5, 6, 29, -5, 10], [TIRO6, 0, 29, -2, 6],
  ];
  for (const [tipo, intervalo, dx, dy, tam] of casos) {
    const tiros = pool(); tiros[0].tipo = TIROINI1; // first slot busy → uses slot 1
    J.jogo_cria_tiro(tiros, n, tipo);
    expect(n.intervalo_tiro).toBe(intervalo);
    expect(tiros[1]).toMatchObject({ tipo, x: 100 + dx, y: 200 + dy, tamanho: tam, alpha: 255 });
  }
  const tiros = pool();
  J.jogo_cria_tiro(tiros, n, TIRO4);
  expect(n.intervalo_tiro).toBe(12);
  expect(tiros.slice(0, 3).map(t => [t.tipo, t.x, t.y, t.id, t.tamanho])).toEqual([
    [TIRO4, 117, 200, -1, 5], [TIRO4, 127, 200, 0, 5], [TIRO4, 137, 200, 1, 5],
  ]);
});

test('jogo_cria_tiro_inimigo spawns at (marca.x+22, marca.y+45)', () => {
  const m = novaMarca(); m.x = 300; m.y = 50;
  for (const tipo of [TIROINI1, TIROINI2, TIROINI3]) {
    const tiros = pool();
    J.jogo_cria_tiro_inimigo(tiros, m, tipo);
    expect(tiros[0]).toMatchObject({ tipo, x: 322, y: 95, tamanho: 0, alpha: 255 });
  }
});

// --- jogo_atualiza_jogador ------------------------------------------------------------------
test('ship chases target with original easing (distance/20 + 1)', () => {
  const n = jogador(); const x0 = n.x;
  h.entrada.push({ t: 'down', k: K.DIREITA }); h.entrada.poll();
  J.jogo_atualiza_jogador(n, explos());
  // target moves 15 px (static velocidade = 15); ship moves (415-400)/20 + 1 = 1
  expect(n.xaux).toBe(415);
  expect(n.x - x0).toBe(1);
  h.entrada.poll(); // still held (ativo)
  J.jogo_atualiza_jogador(n, explos());
  expect(n.xaux).toBe(430);
  expect(n.x).toBe(401 + Math.trunc((430 - 401) / 20) + 1); // 403
  h.entrada.push({ t: 'up', k: K.DIREITA }); h.entrada.poll();
  J.jogo_atualiza_jogador(n, explos());
  expect(n.xaux).toBe(430);
  expect(n.x).toBe(403 + Math.trunc((430 - 403) / 20) + 1); // 405
});

test('ship target bounds and screen limits (funcoes_J.cpp:49-69)', () => {
  const n = jogador();
  h.entrada.push({ t: 'down', k: K.CIMA }); h.entrada.push({ t: 'down', k: K.ESQUERDA });
  for (let i = 0; i < 200; i++) { h.entrada.poll(); J.jogo_atualiza_jogador(n, explos()); }
  expect([n.xaux, n.yaux]).toEqual([10, 10]);
  expect([n.x, n.y]).toEqual([10, 10]);
  h.entrada.push({ t: 'releaseAll' });
  h.entrada.push({ t: 'down', k: K.BAIXO }); h.entrada.push({ t: 'down', k: K.DIREITA });
  for (let i = 0; i < 300; i++) { h.entrada.poll(); J.jogo_atualiza_jogador(n, explos()); }
  expect([n.xaux, n.yaux]).toEqual([820, 625]);
  expect(n.x).toBeGreaterThanOrEqual(720); expect(n.x).toBeLessThan(727);
  expect(n.y).toBeGreaterThanOrEqual(520); expect(n.y).toBeLessThan(527);
});

test('player dies when energia <= 0: tipo INVALIDO + one explosion at the top-left', () => {
  const n = jogador(); const e = explos(); n.x = 123; n.y = 321; n.xaux = 123; n.yaux = 321; n.energia = 0;
  J.jogo_atualiza_jogador(n, e);
  expect(n.tipo).toBe(INVALIDO);
  expect(e[0]).toMatchObject({ tipo: EXPLOSAO, x: 123, y: 321, tamanho: 30, alpha: 255 });
  J.jogo_atualiza_jogador(n, e);
  expect(e[1].tipo).toBe(INVALIDO);
  // dead: keys no longer move the target
  h.entrada.push({ t: 'down', k: K.DIREITA }); h.entrada.poll();
  J.jogo_atualiza_jogador(n, e);
  expect(n.xaux).toBe(123);
});

// --- background, stars ------------------------------------------------------------------------
test('background: two float copies scroll 0.5 px/frame and loop (funcoes_J.cpp:3-13)', () => {
  const y1 = { v: 0 }, y2 = { v: 0 };
  J.jogo_atualiza_fundo(y1, y2);
  expect([y1.v, y2.v]).toEqual([0.5, 0.5]);
  J.jogo_atualiza_fundo(y1, y2); // y1 > 0 → -600, then +0.5
  expect([y1.v, y2.v]).toEqual([-599.5, 1]);
  for (let i = 0; i < 1199; i++) J.jogo_atualiza_fundo(y1, y2);
  expect([y1.v, y2.v]).toEqual([0, 600.5]);
  J.jogo_atualiza_fundo(y1, y2);
  expect([y1.v, y2.v]).toEqual([0.5, 0.5]);
});

test('stars are deterministic from glibc seed 1', () => {
  srand(1); const a = new Int32Array(2 * MAXSTARS); J.jogo_cria_estrela(a, MAXSTARS);
  srand(1); const b = new Int32Array(2 * MAXSTARS); J.jogo_cria_estrela(b, MAXSTARS);
  expect(Array.from(a)).toEqual(Array.from(b));
  // glibc: rand() = 1804289383, 846930886, ... → (1804289383 % 800, 846930886 % 600)
  expect([a[0], a[1]]).toEqual([583, 286]);
  for (let i = 0; i < MAXSTARS; i++) { expect(a[2 * i]).toBeLessThan(800); expect(a[2 * i + 1]).toBeLessThan(600); }
});

test('stars fall by vel and respawn at y=0, x in 0..807', () => {
  const e = new Int32Array([10, 598, 20, 599, 30, 5]);
  J.jogo_atualiza_estrela(e, 1, 3);
  expect(e[1]).toBe(599); expect(e[0]).toBe(10);
  expect(e[3]).toBe(0); expect(e[2]).toBeGreaterThanOrEqual(0); expect(e[2]).toBeLessThan(808);
  expect([e[4], e[5]]).toEqual([30, 6]);
});

// --- HUD bar, explosions ----------------------------------------------------------------------
test('energy bar eases ±1 per frame toward energia', () => {
  const n = jogador(); const a = { v: 0 };
  J.jogo_atualiza_barras(a, n); expect(a.v).toBe(1);
  a.v = 100; n.energia = 85; J.jogo_atualiza_barras(a, n); expect(a.v).toBe(99);
  a.v = 85; J.jogo_atualiza_barras(a, n); expect(a.v).toBe(85);
});

test('explosions: first free slot, grow 3 / fade 5 per frame, removed after 52 updates', () => {
  const e = explos(); e[0].tipo = EXPLOSAO; e[0].alpha = 100;
  J.jogo_cria_explosao(50, 60, e);
  expect(e[1]).toMatchObject({ tipo: EXPLOSAO, x: 50, y: 60, tamanho: 30, alpha: 255 });
  J.jogo_atualiza_explosao(e);
  expect([e[1].tamanho, e[1].alpha]).toEqual([33, 250]);
  let k = 1;
  while (e[1].tipo !== INVALIDO && k < 100) { J.jogo_atualiza_explosao(e); k++; }
  expect(k).toBe(52);
  expect(e[1].tamanho).toBe(30 + 3 * 51); // 183
});
