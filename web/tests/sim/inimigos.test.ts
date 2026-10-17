// Task 12: map markers, enemies, bosses, items, collisions (funcoes_J.cpp:321-821) + fixes F3, F7, F8, F9, F10.
import { test, expect, beforeAll, beforeEach } from 'vitest';
import {
  initHeadless, srand, C2D2_CarregaSpriteSet, C2D2_ColidiuSprites, CA2_CarregaEfeito,
  C2D2M_CarregaMapaMappy, C2D2M_CamadaMarcas, C2D2M_PrimeiroBlocoMarca, C2D2M_INICIO,
} from '../../src/engine/c2d2';
import { dadosDeTeste } from '../unit/fixture';
import * as J from '../../src/game/funcoes_J';
import { g } from '../../src/game/funcoes_M';
import { novoNave, novoTiro, novaExplo, novaMarca, type Marca, type Tiro } from '../../src/game/tipos';
import {
  MAXTIROS, MAXMARCAS, MAXEXPLOS, INVALIDO, X85, EXPLOSAO,
  TIRO1, TIRO2, TIRO3, TIRO4, TIRO5, TIRO6, BOMBA1, TIROINI1, TIROINI2, TIROINI3,
  INIMIGO1, INIMIGO2, INIMIGO3, INIMIGO4, METEORO, BOSS1, BOSS2, BOSS3, BOSS4, BOSS5, T1, T2, T3, T4, T5, T6,
  M_INIMIGO1, M_INIMIGO2, M_INIMIGO3, M_INIMIGO4, M_METEORO, M_BOSS, M_T1, M_T2, M_T3, M_T4, M_T5, M_T6,
} from '../../src/game/constantes';

// --- sprites/sounds exactly as jogo_carrega loads them (jogo.cpp:60, 64-93, 107) -------------------------
const spTiro: number[] = new Array(30).fill(0);   // orig: jogo.cpp:17 unsigned int spTiro[30]
const spMarca: number[] = new Array(40).fill(0);  // orig: jogo.cpp:18 unsigned int spMarca[40]
let spX85 = 0;
let somExplo = 0;
function carregaSpritesJogo(): void {
  spX85 = C2D2_CarregaSpriteSet('./dados/jogo/nave.png', 60, 60);
  spTiro[TIRO1] = C2D2_CarregaSpriteSet('./dados/jogo/tiros/tiro1.png', 0, 0);
  spTiro[TIRO2] = C2D2_CarregaSpriteSet('./dados/jogo/tiros/tiro2.png', 0, 0);
  spTiro[TIRO3] = C2D2_CarregaSpriteSet('./dados/jogo/tiros/tiro3.png', 0, 0);
  spTiro[TIRO4] = C2D2_CarregaSpriteSet('./dados/jogo/tiros/tiro4.png', 0, 0);
  spTiro[TIRO5] = C2D2_CarregaSpriteSet('./dados/jogo/tiros/tiro5.png', 0, 0);
  spTiro[TIRO6] = C2D2_CarregaSpriteSet('./dados/jogo/tiros/tiro6.png', 0, 0);
  spTiro[BOMBA1] = C2D2_CarregaSpriteSet('./dados/jogo/tiros/bomba.png', 0, 0);
  spTiro[TIROINI1] = C2D2_CarregaSpriteSet('./dados/jogo/tiros/tiroini1.png', 0, 0);
  spTiro[TIROINI2] = C2D2_CarregaSpriteSet('./dados/jogo/tiros/tiroini2.png', 0, 0);
  spTiro[TIROINI3] = C2D2_CarregaSpriteSet('./dados/jogo/tiros/tiroini3.png', 0, 0);
  spMarca[INIMIGO1] = C2D2_CarregaSpriteSet('./dados/jogo/inimigos/inim1.png', 0, 0);
  spMarca[INIMIGO2] = C2D2_CarregaSpriteSet('./dados/jogo/inimigos/inim2.png', 0, 0);
  spMarca[INIMIGO3] = C2D2_CarregaSpriteSet('./dados/jogo/inimigos/inim3.png', 0, 0);
  spMarca[INIMIGO4] = C2D2_CarregaSpriteSet('./dados/jogo/inimigos/inim4.png', 0, 0);
  spMarca[METEORO] = C2D2_CarregaSpriteSet('./dados/jogo/inimigos/meteoro.png', 75, 75);
  spMarca[BOSS1] = C2D2_CarregaSpriteSet('./dados/jogo/inimigos/boss1.png', 0, 0);
  spMarca[BOSS2] = C2D2_CarregaSpriteSet('./dados/jogo/inimigos/boss2.png', 0, 0);
  spMarca[BOSS3] = C2D2_CarregaSpriteSet('./dados/jogo/inimigos/boss3.png', 0, 0);
  spMarca[BOSS4] = C2D2_CarregaSpriteSet('./dados/jogo/inimigos/boss4.png', 0, 0);
  spMarca[BOSS5] = C2D2_CarregaSpriteSet('./dados/jogo/inimigos/boss5.png', 0, 0);
  spMarca[T1] = C2D2_CarregaSpriteSet('./dados/jogo/itens/T1.png', 0, 0);
  spMarca[T2] = C2D2_CarregaSpriteSet('./dados/jogo/itens/T2.png', 0, 0);
  spMarca[T3] = C2D2_CarregaSpriteSet('./dados/jogo/itens/T3.png', 0, 0);
  spMarca[T4] = C2D2_CarregaSpriteSet('./dados/jogo/itens/T4.png', 0, 0);
  spMarca[T5] = C2D2_CarregaSpriteSet('./dados/jogo/itens/T5.png', 0, 0);
  spMarca[T6] = C2D2_CarregaSpriteSet('./dados/jogo/itens/T6.png', 0, 0);
  somExplo = CA2_CarregaEfeito('./dados/sons/explo.wav');
}

beforeAll(() => { initHeadless(dadosDeTeste()); carregaSpritesJogo(); });
beforeEach(() => {
  g.saveAtual.planeta_atual = 0;
  g.saveAtual.tiro_liberado = [true, false, false, false, false, false];
});

// --- helpers ------------------------------------------------------------------------------------------------
const novasMarcas = () => Array.from({ length: MAXMARCAS }, novaMarca);
const novosTiros = () => Array.from({ length: MAXTIROS }, novoTiro);
const novasExplos = () => Array.from({ length: MAXEXPLOS }, novaExplo);
function novoJogador(x = 400, y = 400) {
  const n = novoNave(); J.jogo_inicia_jogador(n); n.sprite = spX85;
  n.x = n.xaux = x; n.y = n.yaux = y;
  return n;
}
/** An already-spawned (active) mark, as jogo_inicia_marca + the activation step leave it. */
function ativa(m: Marca, tipo: number, x: number, y: number, energia: number): Marca {
  m.tipo = tipo; m.x = m.centroX = x; m.y = m.centroY = y; m.energia = energia;
  m.ativo = 1; m.angulo = Math.fround(90); m.estado_atual = 0; m.tempotiro = 0;
  return m;
}
function tiro(t: Tiro, tipo: number, x: number, y: number, tamanho = 0): Tiro {
  t.tipo = tipo; t.x = x; t.y = y; t.tamanho = tamanho; t.alpha = 255; t.id = 0;
  return t;
}
function mundo() {
  return { marcas: novasMarcas(), tiros: novosTiros(), explos: novasExplos(), jogador: novoJogador(), score: { v: 0 } };
}
type Mundo = ReturnType<typeof mundo>;
const colisao = (w: Mundo) => J.jogo_testa_colisao(w.marcas, w.tiros, spMarca, spTiro, w.jogador, w.score);
const atualiza = (w: Mundo, ymapa = 0) => J.jogo_atualiza_marca(w.marcas, ymapa, w.jogador, w.explos, somExplo, w.tiros, w.score);

// --- F3 -----------------------------------------------------------------------------------------------------
test('INIMIGO3 kill scores 400 (F3)', () => {
  const w = mundo();
  const m = ativa(w.marcas[0], INIMIGO3, 400, 200, 1);
  tiro(w.tiros[0], TIRO1, 415, 220);
  expect(C2D2_ColidiuSprites(spTiro[TIRO1], 0, 415, 220, spMarca[INIMIGO3], 0, 400, 200)).toBe(true);
  colisao(w);
  expect(w.tiros[0].tipo).toBe(INVALIDO);
  expect(m.energia).toBe(1 - 65); // B1: 50 × 1.3
  atualiza(w);
  expect(m.tipo).toBe(INVALIDO);
  expect(w.score.v).toBe(400);
  expect(w.explos[0]).toMatchObject({ tipo: EXPLOSAO, x: 430, y: 252 }); // (x+30, y+50) after y += 2
});

test('kill scores per type match funcoes_J.cpp (200/300/400/500/1000/3000)', () => {
  const casos: [number, number][] = [
    [INIMIGO1, 200], [INIMIGO2, 300], [INIMIGO3, 400], [INIMIGO4, 500], [METEORO, 1000],
    [BOSS1, 3000], [BOSS2, 3000], [BOSS3, 3000], [BOSS4, 3000], [BOSS5, 3000],
  ];
  for (const [tipo, pts] of casos) {
    const w = mundo(); w.jogador.x = 700; w.jogador.y = 520;
    ativa(w.marcas[3], tipo, 100, 100, 0);
    atualiza(w);
    expect(w.marcas[3].tipo).toBe(INVALIDO);
    expect(w.score.v).toBe(pts);
    expect(w.explos[0].tipo).toBe(EXPLOSAO);
  }
});

// --- F7 -----------------------------------------------------------------------------------------------------
test('INIMIGO4 contact damages the player (F7)', () => {
  const w = mundo();
  const m = ativa(w.marcas[0], INIMIGO4, 400, 400, 500);
  expect(C2D2_ColidiuSprites(spMarca[INIMIGO4], 0, 400, 400, spX85, 0, 400, 400)).toBe(true);
  colisao(w);
  expect(w.jogador.energia).toBe(100 - 40); // the INIMIGO3 contact branch's numbers
  expect(m.energia).toBe(500 - 9999);
  atualiza(w);
  expect(m.tipo).toBe(INVALIDO);
  expect(w.explos[0].tipo).toBe(EXPLOSAO);
  expect(w.score.v).toBe(500); // ramming awards the kill, like every other small enemy
});

test('contact damage of the other marks is unchanged (funcoes_J.cpp:769-791)', () => {
  const casos: [number, number, boolean][] = [
    [INIMIGO1, 20, true], [INIMIGO2, 30, true], [INIMIGO3, 40, true], [METEORO, 50, true],
    [BOSS1, 100, false], [BOSS2, 100, false], [BOSS3, 100, false], [BOSS4, 100, false], [BOSS5, 100, false],
  ];
  for (const [tipo, dano, morre] of casos) {
    const w = mundo(); w.jogador.energia = 1000;
    const m = ativa(w.marcas[7], tipo, 390, 390, 50000);
    colisao(w);
    expect(w.jogador.energia).toBe(1000 - dano);
    expect(m.energia).toBe(morre ? 50000 - 9999 : 50000);
  }
});

// --- F8 -----------------------------------------------------------------------------------------------------
test('enemy shot hits player with no active enemies (F8)', () => {
  const w = mundo();
  tiro(w.tiros[0], TIROINI1, 420, 420);
  colisao(w);
  expect(w.jogador.energia).toBe(85);
  expect(w.tiros[0].tipo).toBe(INVALIDO);
  // marks present but all still inactive (not spawned yet): same result
  const w2 = mundo();
  for (let j = 0; j < 10; j++) { w2.marcas[j].tipo = INIMIGO1; w2.marcas[j].ativo = 0; }
  tiro(w2.tiros[17], TIROINI2, 420, 420);
  tiro(w2.tiros[18], TIROINI3, 430, 430);
  colisao(w2);
  expect(w2.jogador.energia).toBe(100 - 5 - 15);
  expect([w2.tiros[17].tipo, w2.tiros[18].tipo]).toEqual([INVALIDO, INVALIDO]);
});

test('an enemy shot damages the player once, also with many active marks', () => {
  const w = mundo();
  for (let j = 0; j < 5; j++) ativa(w.marcas[j], INIMIGO1, 50 + 60 * j, 50, 200);
  tiro(w.tiros[3], TIROINI1, 420, 420);
  colisao(w);
  expect(w.jogador.energia).toBe(85);
  // dead player: shots pass through
  const w2 = mundo(); w2.jogador.tipo = INVALIDO;
  tiro(w2.tiros[0], TIROINI1, 420, 420);
  colisao(w2);
  expect(w2.jogador.energia).toBe(100);
  expect(w2.tiros[0].tipo).toBe(TIROINI1);
});

// --- F9 -----------------------------------------------------------------------------------------------------
/** Where a scaled TIRO3–6 is drawn (jogo.cpp:308-315) and where its native mask sits once centred on that. */
function retanguloDesenhado(tipo: number, x: number, y: number, t: number) {
  const dx = x - Math.trunc(t / 2), dw = t, dh = tipo === TIRO6 ? 2 * t : t;
  return { dx, dy: y, dw, dh };
}
function procuraPosicoes(tipo: number, nativo: [number, number], sx: number, sy: number, t: number, alvo: number) {
  const { dx, dy, dw, dh } = retanguloDesenhado(tipo, sx, sy, t);
  const fx = dx + Math.trunc((dw - nativo[0]) / 2), fy = dy + Math.trunc((dh - nativo[1]) / 2);
  let soNova: [number, number] | null = null, soOriginal: [number, number] | null = null;
  for (let ex = sx - 150; ex < sx + 150 && !(soNova && soOriginal); ex++) {
    for (const ey of [sy - 40, sy - 10, sy]) {
      const nova = C2D2_ColidiuSprites(spTiro[tipo], 0, fx, fy, spMarca[alvo], 0, ex, ey);
      const orig = C2D2_ColidiuSprites(spTiro[tipo], 0, sx, sy, spMarca[alvo], 0, ex, ey);
      if (nova && !orig && !soNova) soNova = [ex, ey];
      if (orig && !nova && !soOriginal) soOriginal = [ex, ey];
    }
  }
  return { soNova, soOriginal };
}
const nativos: Record<number, [number, number]> = { [TIRO3]: [30, 30], [TIRO4]: [30, 30], [TIRO5]: [80, 80], [TIRO6]: [15, 30] };
for (const [tipo, t] of [[TIRO3, 22], [TIRO4, 20], [TIRO5, 40], [TIRO6, 30]] as const) {
  test(`TIRO${tipo} hits where it is drawn: native mask centred on the drawn quad (F9)`, () => {
    const sx = 400, sy = 300;
    const { soNova, soOriginal } = procuraPosicoes(tipo, nativos[tipo], sx, sy, t, INIMIGO1);
    expect(soNova).not.toBeNull();
    expect(soOriginal).not.toBeNull();
    // enemy only overlapping the drawn (centred) hitbox → hit
    const w = mundo(); w.jogador.x = 700; w.jogador.y = 520;
    const m = ativa(w.marcas[0], INIMIGO1, soNova![0], soNova![1], 1000);
    tiro(w.tiros[0], tipo, sx, sy, t);
    colisao(w);
    expect(m.energia).toBeLessThan(1000);
    expect(w.tiros[0].tipo).toBe(INVALIDO);
    // enemy only overlapping the original (top-left at x,y) hitbox → miss
    const w2 = mundo(); w2.jogador.x = 700; w2.jogador.y = 520;
    const m2 = ativa(w2.marcas[0], INIMIGO1, soOriginal![0], soOriginal![1], 1000);
    tiro(w2.tiros[0], tipo, sx, sy, t);
    colisao(w2);
    expect(m2.energia).toBe(1000);
    expect(w2.tiros[0].tipo).toBe(tipo);
  });
}

test('player shot damage table (B1: original × 1.3) and one-mark-per-shot rule (funcoes_J.cpp:706-737)', () => {
  const dano: [number, number][] = [[TIRO1, 65], [TIRO2, 98]];
  for (const [tipo, d] of dano) {
    const w = mundo(); w.jogador.x = 700; w.jogador.y = 520;
    const a = ativa(w.marcas[0], BOSS1, 300, 100, 10000);
    const b = ativa(w.marcas[1], BOSS2, 300, 100, 20000); // same place: only the first in array order is hit
    tiro(w.tiros[0], tipo, 360, 150);
    colisao(w);
    expect(a.energia).toBe(10000 - d);
    expect(b.energia).toBe(20000);
    expect(w.tiros[0].tipo).toBe(INVALIDO);
  }
  // the drawn-centred tiros 3..6 (sizes at full growth) deal 130 / 98 / 156 / 195 (B1)
  for (const [tipo, t, d] of [[TIRO3, 22, 130], [TIRO4, 20, 98], [TIRO5, 80, 156], [TIRO6, 30, 195]] as const) {
    const w = mundo(); w.jogador.x = 700; w.jogador.y = 520;
    const a = ativa(w.marcas[0], BOSS1, 300, 100, 10000);
    tiro(w.tiros[0], tipo, 370, 140, t);
    colisao(w);
    expect(a.energia).toBe(10000 - d);
  }
});

test('bomb deals 1300 (B1) to every active enemy only while alpha >= 250, and is not consumed', () => {
  const w = mundo(); w.jogador.x = 700; w.jogador.y = 520;
  const a = ativa(w.marcas[0], INIMIGO1, 100, 100, 200);
  const b = ativa(w.marcas[1], BOSS3, 300, 50, 30000);
  const item = ativa(w.marcas[2], T3, 500, 100, 0);
  tiro(w.tiros[0], BOMBA1, 0, 0, 800); w.tiros[0].alpha = 250;
  colisao(w);
  expect([a.energia, b.energia, item.energia]).toEqual([200 - 1300, 30000 - 1300, 0]);
  expect(w.tiros[0].tipo).toBe(BOMBA1);
  w.tiros[0].alpha = 245;
  colisao(w);
  expect(b.energia).toBe(30000 - 1300);
});

// --- F10 ----------------------------------------------------------------------------------------------------
test('orbits stay continuous when angulo passes 360 (F10)', () => {
  for (const tipo of [INIMIGO1, INIMIGO4, BOSS1, BOSS2, BOSS3, BOSS4]) {
    const w = mundo(); w.jogador.x = 400; w.jogador.y = 500;
    const m = ativa(w.marcas[0], tipo, 300, 250, 100000);
    m.estado_atual = 1; // bosses: already in their orbit phase
    m.angulo = Math.fround(359.9);
    const xs: number[] = [], ys: number[] = [];
    for (let k = 0; k < 6; k++) { atualiza(w); xs.push(m.x); ys.push(m.y); }
    for (let k = 1; k < xs.length; k++) {
      expect(Math.abs(xs[k] - xs[k - 1])).toBeLessThanOrEqual(10);
      expect(Math.abs(ys[k] - ys[k - 1])).toBeLessThanOrEqual(10);
    }
    expect(m.angulo).toBeGreaterThanOrEqual(0);
    expect(m.angulo).toBeLessThan(2 * Math.PI + 0.5);
  }
});

test('angulo accumulates in float precision (+0.08f) below 360, starting at 90', () => {
  const w = mundo();
  const m = ativa(w.marcas[0], INIMIGO1, 300, 100, 200);
  atualiza(w);
  const a1 = Math.fround(Math.fround(90) + Math.fround(0.08));
  expect(m.angulo).toBe(a1);
  // INIMIGO1 position uses the angle before the step, in double: (int)(centroY + 50 sin a), (int)(centroX + 100 cos a)
  expect(m.y).toBe(Math.trunc(100 + 50 * Math.sin(90)));
  expect(m.x).toBe(Math.trunc(300 + 100 * Math.cos(90)));
  expect(m.centroY).toBe(102);
  atualiza(w);
  expect(m.angulo).toBe(Math.fround(a1 + Math.fround(0.08)));
  expect(m.y).toBe(Math.trunc(102 + 50 * Math.sin(a1)));
});

// --- markers: search, init, activation -----------------------------------------------------------------------
function carregaFase1(marcas: Marca[]) {
  const mapa = C2D2M_CarregaMapaMappy('dados/jogo/mapas/fase1.fmp', 'dados/jogo/mapas/tileset.png');
  C2D2M_CamadaMarcas(mapa, 0, 1);
  const contador = { v: 0 };
  const contagem: number[] = [];
  // orig: jogo.cpp:172-183 (same order)
  for (const code of [M_INIMIGO1, M_INIMIGO2, M_INIMIGO3, M_INIMIGO4, M_METEORO, M_BOSS, M_T1, M_T2, M_T3, M_T4, M_T5, M_T6]) {
    const antes = contador.v;
    J.jogo_procura_marca(mapa, code, marcas, contador);
    contagem.push(contador.v - antes);
  }
  return { mapa, contador, contagem };
}

test('fase1 spawn order grouped by type, boss found', () => {
  const marcas = novasMarcas();
  const { contador, contagem } = carregaFase1(marcas);
  expect(contagem).toEqual([27, 17, 6, 0, 11, 1, 0, 1, 0, 0, 0, 0]);
  expect(contador.v).toBe(63);
  const tipos = [INIMIGO1, INIMIGO2, INIMIGO3, INIMIGO4, METEORO, BOSS1, T1, T2];
  let k = 0;
  contagem.slice(0, 8).forEach((n, ti) => {
    for (let c = 0; c < n; c++, k++) {
      expect(marcas[k].tipo).toBe(tipos[ti]);
      if (c > 0) expect(marcas[k].y).toBeGreaterThanOrEqual(marcas[k - 1].y); // row-major within a type
    }
  });
  expect(marcas[63].tipo).toBe(INVALIDO);
  const boss = marcas.findIndex(m => m.tipo >= BOSS1 && m.tipo <= BOSS5); // orig: jogo.cpp:184-189
  expect(boss).toBe(61);
  expect(marcas[boss]).toMatchObject({ tipo: BOSS1, x: 368, y: 144, energia: 10000, ativo: 0, estado_atual: 0, tempotiro: 0 });
  expect(marcas[boss].angulo).toBe(90);
  expect(marcas[62]).toMatchObject({ tipo: T2, x: 624, y: 2736 });
  expect(marcas[0]).toMatchObject({ tipo: INIMIGO1, energia: 200 });
  expect(marcas[27]).toMatchObject({ tipo: INIMIGO2, energia: 300 });
  expect(marcas[44]).toMatchObject({ tipo: INIMIGO3, energia: 400 });
  expect(marcas[50]).toMatchObject({ tipo: METEORO, energia: 750 });
});

test('jogo_inicia_marca: boss type/HP from planeta_atual; items; INIMIGO4 HP', () => {
  const casos: [number, number, number][] = [[0, BOSS1, 10000], [1, BOSS2, 20000], [2, BOSS3, 30000], [3, BOSS4, 30000], [4, BOSS5, 40000]];
  for (const [p, tipo, hp] of casos) {
    g.saveAtual.planeta_atual = p;
    const marcas = novasMarcas();
    J.jogo_inicia_marca(marcas, 4, M_BOSS);
    expect(marcas[4]).toMatchObject({ tipo, energia: hp, ativo: 0, angulo: 90 });
  }
  const marcas = novasMarcas();
  J.jogo_inicia_marca(marcas, 0, M_INIMIGO4);
  expect(marcas[0]).toMatchObject({ tipo: INIMIGO4, energia: 500 });
  [M_T1, M_T2, M_T3, M_T4, M_T5, M_T6].forEach((code, i) => {
    J.jogo_inicia_marca(marcas, 1 + i, code);
    expect(marcas[1 + i].tipo).toBe(T1 + i);
  });
});

test('boss arrives ≈ 51 s: activation frame follows Y - ymapa >= -100 (fase1 → frame 3070)', () => {
  const w = mundo();
  const { mapa } = carregaFase1(w.marcas);
  const inicio = C2D2M_PrimeiroBlocoMarca(mapa, C2D2M_INICIO)!;
  expect(inicio.y).toBe(6384);
  const boss = w.marcas[61];
  const Y = boss.y;
  // orig rule (funcoes_J.cpp:423, jogo.cpp:155,257): ymapa_k = yinicio - 2k; active on the first k with Y - ymapa_k >= -100
  const esperado = Math.ceil((inicio.y - (Y + 100)) / 2);
  expect(esperado).toBe(3070);
  let ymapa = inicio.y, ativou = -1;
  for (let k = 0; k < 4000 && ativou < 0; k++) {
    atualiza(w, ymapa);
    J.jogo_atualiza_tiro(w.tiros, w.jogador);
    if (boss.ativo) ativou = k;
    if (ymapa > -600) ymapa -= 2; // orig: jogo.cpp:257
  }
  expect(Math.abs(ativou - 3070)).toBeLessThanOrEqual(1);
  expect(ativou).toBe(esperado);
  expect(ativou / 60).toBeCloseTo(51.2, 1);
  expect(boss.y).toBe(-100);
  expect([boss.centroX, boss.centroY]).toEqual([368, -100]);
});

test('activation converts y to screen space; despawn below 700; spawn frame runs no AI', () => {
  const w = mundo();
  const m = w.marcas[0]; J.jogo_inicia_marca(w.marcas, 0, M_METEORO); m.x = 200; m.y = 1000;
  atualiza(w, 1102); // 1000 - 1102 = -102 < -100
  expect(m.ativo).toBe(0);
  atualiza(w, 1100);
  expect([m.ativo, m.x, m.y, m.centroX, m.centroY]).toEqual([1, 200, -100, 200, -100]);
  atualiza(w, 1098);
  expect(m.y).toBe(-98); // METEORO falls 2 px
  m.y = 701;
  atualiza(w);
  expect([m.tipo, m.ativo]).toEqual([INVALIDO, 0]);
  expect(w.score.v).toBe(0);
});

// --- AI branches -----------------------------------------------------------------------------------------------
test('INIMIGO1 fires TIROINI1 every 101 frames from (x+22, y+45)', () => {
  const w = mundo();
  const m = ativa(w.marcas[0], INIMIGO1, 300, 100, 200);
  const disparos: number[] = [];
  for (let k = 0; k < 250; k++) {
    const antes = w.tiros.filter(t => t.tipo === TIROINI1).length;
    atualiza(w);
    if (w.tiros.filter(t => t.tipo === TIROINI1).length > antes) disparos.push(k);
  }
  expect(disparos).toEqual([0, 101, 202]);
  expect(w.tiros[0]).toMatchObject({ tipo: TIROINI1 });
  expect(m.tipo).toBe(INIMIGO1);
});

test('INIMIGO2 chases the player with (d/80 + 1) steps; falls 2 px when the player is dead', () => {
  const w = mundo(); w.jogador.x = 400; w.jogador.y = 400;
  const m = ativa(w.marcas[0], INIMIGO2, 100, 100, 300);
  atualiza(w);
  // x < 410: x += (400-100)/80+1 = 4 ; y < 350: y += (400-100)/80+1 = 4
  expect([m.x, m.y]).toEqual([104, 104]);
  expect(w.tiros[0].tipo).toBe(TIROINI2);
  w.jogador.tipo = INVALIDO;
  atualiza(w);
  expect([m.x, m.y]).toEqual([104, 106]);
});

test('BOSS1 descends 1 px/frame to y=51, then orbits around centroY=51', () => {
  const w = mundo(); w.jogador.x = 700; w.jogador.y = 520;
  const m = ativa(w.marcas[0], BOSS1, 368, -100, 10000);
  for (let k = 0; k < 151; k++) atualiza(w);
  expect([m.y, m.estado_atual]).toEqual([51, 0]);
  atualiza(w);
  expect([m.estado_atual, m.centroY]).toEqual([1, 51]);
  const a = m.angulo;
  atualiza(w);
  expect(m.y).toBe(Math.trunc(51 + 20 * Math.sin(a)));
  expect(m.x).toBe(Math.trunc(368 + 50 * Math.cos(a)));
});

test('BOSS3 shot choice comes from glibc rand(): seed 1 → TIROINI1 first', () => {
  srand(1);
  const w = mundo(); w.jogador.x = 700; w.jogador.y = 520;
  ativa(w.marcas[0], BOSS3, 300, -100, 30000);
  atualiza(w);
  expect(w.tiros[0].tipo).toBe(TIROINI1); // 1804289383 % 2 == 1
  for (let k = 0; k < 46; k++) atualiza(w);
  expect(w.tiros[1].tipo).toBe(846930886 % 2 === 1 ? TIROINI1 : TIROINI2); // second rand() → TIROINI2
});

test('BOSS5 mirrors the player horizontally and fires every 26 frames', () => {
  srand(1);
  const w = mundo(); w.jogador.x = 150; w.jogador.y = 520;
  const m = ativa(w.marcas[0], BOSS5, 0, -100, 40000);
  atualiza(w);
  expect([m.x, m.y]).toEqual([650, -99]);
  expect(w.tiros[0].tipo).toBe([TIROINI3, TIROINI2, TIROINI1][1804289383 % 3]);
  for (let k = 0; k < 26; k++) atualiza(w);
  expect(w.tiros[1].tipo).not.toBe(INVALIDO);
});

test('items fall 1 px/frame; picking one up unlocks and selects the weapon', () => {
  const casos: [number, number, number][] = [[T2, 1, TIRO2], [T3, 2, TIRO3], [T4, 3, TIRO4], [T5, 4, TIRO5], [T6, 5, TIRO6]];
  for (const [tipo, idx, arma] of casos) {
    g.saveAtual.tiro_liberado = [true, false, false, false, false, false];
    const w = mundo();
    const m = ativa(w.marcas[2], tipo, 200, 100, 0);
    atualiza(w);
    expect(m.y).toBe(101);
    m.x = 410; m.y = 410;
    colisao(w);
    expect(m.tipo).toBe(INVALIDO);
    expect(g.saveAtual.tiro_liberado[idx]).toBe(true);
    expect(w.jogador.tiro_atual).toBe(arma);
    expect(w.jogador.energia).toBe(100);
    expect(w.score.v).toBe(0);
  }
  // T1: no movement and no pickup
  const w = mundo();
  const t1 = ativa(w.marcas[0], T1, 410, 410, 0);
  atualiza(w); colisao(w);
  expect([t1.tipo, t1.y, w.jogador.tiro_atual]).toEqual([T1, 410, TIRO1]);
});

test('shots never hit items; the player shot passes them', () => {
  const w = mundo(); w.jogador.x = 700; w.jogador.y = 520;
  const item = ativa(w.marcas[0], T4, 100, 100, 0);
  tiro(w.tiros[0], TIRO1, 110, 110);
  colisao(w);
  expect(w.tiros[0].tipo).toBe(TIRO1);
  expect(item.tipo).toBe(T4);
});
