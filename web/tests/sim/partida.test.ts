// Task 13: the game screen (jogo.cpp) and the state machine (main.cpp), headless, with scripted input.
// Fixes F11 (weapon cycle without index -1), F12 (stable ready screen), F13 (dismissing Space does not fire),
// F14 (no boss marker: the phase ends with the map scroll), F15 (Esc from the game reloads the slot).
import { test, expect, beforeAll, beforeEach } from 'vitest';
import { initHeadless, initAudio, C2D2_CarregaSpriteSet, C2D2_PegaSpriteSet, type AudioPort } from '../../src/engine/c2d2';
import { K } from '../../src/engine/input';
import { dadosDeTeste, memStorage } from '../unit/fixture';
import * as M from '../../src/game/funcoes_M';
import { menu_carrega } from '../../src/game/menu';
import { jogo_tela, jogo_troca_tiro, jogoAtual, fase, emPartida } from '../../src/game/jogo';
import { principal } from '../../src/game/principal';
import { novoNave } from '../../src/game/tipos';
import { Sequenciador, AutoTiro, autoTiroLigado } from '../../src/touch/touch';
import {
  TELA_JOGO, TELA_MISSION, TELA_MAIN, SAIR, EASY, INVALIDO, TIRO1, TIRO2, TIRO3, TIRO5, TIRO6, BOSS1,
} from '../../src/game/constantes';

let h: ReturnType<typeof initHeadless>;
beforeAll(() => { h = initHeadless(dadosDeTeste()); M.setStorage(memStorage()); menu_carrega(); });
beforeEach(() => {
  M.setStorage(memStorage()); M.menu_recordes_default(); M.menu_saves_default();
  h.entrada.push({ t: 'releaseAll' }); h.entrada.poll();
});

type Gen = Generator<void, unknown, void>;
const frame = (g: Gen) => { h.entrada.poll(); return g.next(); };
const down = (k: K) => h.entrada.push({ t: 'down', k });
const up = (k: K) => h.entrada.push({ t: 'up', k });
const tex = (p: string, w = 0, hh = 0) => C2D2_PegaSpriteSet(C2D2_CarregaSpriteSet(p, w, hh))!.tex;

/** A fresh slot 0 named "tester", loaded, planet `planeta`; state as main.cpp leaves it before jogo_tela(). */
function novaPartida(planeta = 0): Gen {
  M.menu_saves_edit(0, 'tester', EASY, false);
  M.g.slotAtual = 0;
  M.menu_saves_loadslot(0);
  M.g.saveAtual.planeta_atual = planeta;
  M.g.estado_atual = TELA_JOGO;
  M.g.encerra = 0;
  return jogo_tela();
}
/** Runs the loading frame and `n` ready frames, then dismisses "ready" with Space (that frame is game frame 0). */
function passaReady(g: Gen, n = 5): void {
  for (let i = 0; i < 1 + n; i++) expect(frame(g).done).toBe(false);
  down(K.ESPACO); expect(frame(g).done).toBe(false);
}
const tirosDoJogador = () => jogoAtual.p!.tiros.filter(t => t.tipo >= TIRO1 && t.tipo <= TIRO6).length;

test('loading frame, then loading + ready redrawn every frame until Space (F12); Esc does nothing there', () => {
  const g = novaPartida();
  let n = h.backend.quads.length;
  frame(g); // loading screen
  let q = h.backend.quads.slice(n);
  expect(q.map(x => x.tex)).toEqual([tex('./dados/jogo/loading.jpg')]);
  for (let i = 0; i < 4; i++) {
    if (i === 2) down(K.ESC);
    const limpezas = h.backend.limpezas;
    n = h.backend.quads.length;
    expect(frame(g).done).toBe(false);
    q = h.backend.quads.slice(n);
    expect(h.backend.limpezas).toBe(limpezas + 1);
    expect(q.map(x => [x.tex, x.dx, x.dy])).toEqual([[tex('./dados/jogo/loading.jpg'), 0, 0], [tex('./dados/jogo/ready.png'), 180, 440]]);
    expect(jogoAtual.p).toBeNull();
    expect(emPartida()).toBe(false); // touch ⏸ stays hidden on the ready screen (Esc is a no-op there)
  }
  up(K.ESC);
  expect(M.g.estado_atual).toBe(TELA_JOGO);
  down(K.ESPACO); frame(g);
  expect(jogoAtual.p).not.toBeNull();
  expect(jogoAtual.p!.quadro).toBe(1);
  expect(emPartida()).toBe(true);
});

test('scripted run: fire, bomb, weapon info, Esc → MISSION with the slot reloaded (F13, F15)', () => {
  const g = novaPartida();
  passaReady(g);
  const p = jogoAtual.p!;
  // F13: the Space press that dismissed "ready" never fires, also while it stays held
  expect(tirosDoJogador()).toBe(0);
  for (let i = 0; i < 10; i++) { frame(g); expect(tirosDoJogador()).toBe(0); }
  up(K.ESPACO); frame(g);
  // hold Space for 600 frames: TIRO1 every 5 frames (intervalo 4)
  down(K.ESPACO);
  let disparos = 0, max = 0;
  for (let i = 0; i < 600; i++) {
    const antes = tirosDoJogador();
    expect(frame(g).done).toBe(false);
    if (tirosDoJogador() > antes) disparos++;
    max = Math.max(max, p.temp_pts.v);
  }
  up(K.ESPACO);
  expect(disparos).toBeGreaterThan(100);
  expect(p.jogador.energia).toBeGreaterThan(0);
  expect(max).toBeGreaterThan(0);
  expect(p.temp_pts.v).toBeGreaterThan(0);
  // bomb: LCtrl press edge, 5 → 4, one BOMBA1 in the pool
  expect(p.jogador.n_bombas).toBe(5);
  down(K.LCTRL); frame(g); up(K.LCTRL); frame(g);
  expect(p.jogador.n_bombas).toBe(4);
  frame(g); frame(g);
  expect(p.jogador.n_bombas).toBe(4);
  // LAlt: weapon info box for 181 frames (only TIRO1 unlocked: stays TIRO1)
  down(K.LALT);
  let n = h.backend.quads.length;
  frame(g); up(K.LALT);
  expect(p.informacao).toBe(179);
  expect(p.jogador.tiro_atual).toBe(TIRO1);
  const barraInf = tex('./dados/jogo/barra_inf.png');
  expect(h.backend.quads.slice(n).some(q => q.tex === barraInf && q.dx === 380 && q.dy === 5)).toBe(true);
  for (let i = 0; i < 179; i++) frame(g);
  n = h.backend.quads.length; frame(g);
  expect(p.informacao).toBe(-1);
  n = h.backend.quads.length; frame(g);
  expect(h.backend.quads.slice(n).some(q => q.tex === barraInf)).toBe(false);
  // an unlock picked up in this run (pickup sets tiro_liberado in RAM) must be discarded by the Esc abort (F15)
  M.g.saveAtual.tiro_liberado[1] = true;
  M.g.saveAtual.pts = 123;
  down(K.ESC);
  let r = frame(g); up(K.ESC);
  expect(M.g.estado_atual).toBe(TELA_MISSION);
  let i = 0;
  while (!r.done && i++ < 5) r = frame(g);
  expect(r.done).toBe(true);
  expect(r.value).toBe(0);
  expect(emPartida()).toBe(false);
  expect(M.g.encerra).toBe(1);
  const salvo = M.menu_saves_carregavetor()[0];
  // menu_saves_loadslot copies every field but `level` (funcoes_M.cpp:229-236), so that one is taken as is
  expect(M.g.saveAtual).toEqual({ ...salvo, level: M.g.saveAtual.level });
  expect(M.g.saveAtual.nome).toBe('tester');
  expect(M.g.saveAtual.tiro_liberado[1]).toBe(false);
});

/** The touch wiring of initToque (DOM-free part): sequencer + auto-fire updated after every poll. */
function toque(): { seq: Sequenciador; a: AutoTiro; solta: () => void } {
  const seq = new Sequenciador(h.entrada);
  const desinstala = seq.instala();
  const a = new AutoTiro((k, baixo) => seq.tecla(k, baixo));
  seq.aoPoll = () => a.atualiza(autoTiroLigado({ toque: true, partida: emPartida(), confirmaAberto: false, esc: h.entrada.teclas[K.ESC].pressionado }));
  return { seq, a, solta: () => { a.solta(); desinstala(); } };
}

test('touch auto-fire (D10): "ready" dismissed by a tap, the ship fires within a few frames without any input (F13 intact)', () => {
  const t = toque();
  try {
    const g = novaPartida();
    for (let i = 0; i < 6; i++) frame(g);
    expect(h.entrada.teclas[K.ESPACO].ativo).toBe(false); // ready screen: no auto-fire
    expect(jogoAtual.p).toBeNull();
    t.seq.mouse(true, 400, 300); t.seq.mouse(false, 400, 300); // a quick tap (left click) dismisses "ready"
    frame(g);
    expect(jogoAtual.p).not.toBeNull();
    let primeiro = -1;
    for (let i = 1; i <= 10 && primeiro < 0; i++) { frame(g); if (tirosDoJogador() > 0) primeiro = i; }
    expect(primeiro).toBeGreaterThan(0);
    expect(primeiro).toBeLessThanOrEqual(3);
    for (let i = 0; i < 60; i++) frame(g);
    expect(tirosDoJogador()).toBeGreaterThan(5); // keeps firing while held
  } finally { t.solta(); }
});

test('touch auto-fire (D10): leaving with Esc never hands a Space press to the next screen', () => {
  const t = toque();
  try {
    const g = novaPartida();
    for (let i = 0; i < 6; i++) frame(g);
    t.seq.mouse(true, 400, 300); t.seq.mouse(false, 400, 300); // tap: dismiss "ready"
    for (let i = 0; i < 20; i++) frame(g);
    expect(h.entrada.teclas[K.ESPACO].ativo).toBe(true);
    t.a.solta(); // ⏸ opens the dialog: Space released, logic frozen (no polls) while it is open
    t.seq.tecla(K.ESC, true); t.seq.tecla(K.ESC, false); // "Sim" → Esc
    let r = frame(g);
    let i = 0;
    while (!r.done && i++ < 5) { r = frame(g); expect(h.entrada.teclas[K.ESPACO].pressionado).toBe(false); }
    expect(r.done).toBe(true);
    for (let k = 0; k < 3; k++) { h.entrada.poll(); expect(h.entrada.teclas[K.ESPACO].pressionado).toBe(false); }
    expect(h.entrada.teclas[K.ESPACO].ativo).toBe(false); // released once the gameplay loop is over
  } finally { t.solta(); }
});

test('4000-frame run (ship kept alive): the fase1 boss activates on game frame 3070; killing it wins → slot saved, record, MISSION 200 frames later', () => {
  const g = novaPartida(0);
  passaReady(g);
  const p = jogoAtual.p!;
  expect(p.Boss).toBeGreaterThanOrEqual(0);
  expect(p.marcas[p.Boss].tipo).toBe(BOSS1);
  let ativou = -1, fim = -1;
  for (let k = 1; k < 4000; k++) {
    p.jogador.energia = 1e9; // test hook: invulnerable
    if (ativou >= 0 && k === ativou + 5) { p.temp_pts.v = 5000; p.marcas[p.Boss].energia = 0; } // dies in the next AI update
    const r = frame(g);
    if (r.done) { fim = p.quadro; break; }
    if (ativou < 0 && p.marcas[p.Boss].ativo) ativou = p.quadro - 1; // 0-based game frame that activated it
  }
  expect(ativou).toBeGreaterThanOrEqual(3069);
  expect(ativou).toBeLessThanOrEqual(3071);
  // won: boss gone, then 200 frames of contadorfinal, then MISSION and the generator ends
  expect(fim - ativou).toBeGreaterThan(200);
  expect(fim - ativou).toBeLessThan(215);
  expect(M.g.estado_atual).toBe(TELA_MISSION);
  const salvo = M.menu_saves_carregavetor()[0];
  expect(salvo.planeta_liberado).toBe(1);
  expect(salvo.pts).toBeGreaterThanOrEqual(5000);
  expect(M.g.saveAtual.pts).toBe(salvo.pts);
  expect(M.g.saveAtual.planeta_liberado).toBe(1);
  expect(M.recordes().some(r => r.nome === 'tester' && r.pts === salvo.pts)).toBe(true);
}, 60_000);

test('death: the slot is reloaded (temp points dropped) and the game returns to MISSION after 200 frames', () => {
  const g = novaPartida(0);
  passaReady(g);
  const p = jogoAtual.p!;
  for (let k = 0; k < 10; k++) frame(g);
  p.temp_pts.v = 777;
  M.g.saveAtual.tiro_liberado[2] = true;
  p.jogador.energia = 0;
  let fim = -1;
  for (let k = 0; k < 400; k++) if (frame(g).done) { fim = k; break; }
  expect(fim).toBeGreaterThanOrEqual(200);
  expect(fim).toBeLessThanOrEqual(203);
  expect(p.jogador.tipo).toBe(INVALIDO);
  expect(M.g.saveAtual.tiro_liberado[2]).toBe(false);
  expect(M.menu_saves_carregavetor()[0].pts).toBe(0);
});

test('no boss marker (missing map): no crash, the phase ends (as a win) when the map scroll finishes (F14)', () => {
  const g = novaPartida(5); // fase6.fmp is absent from devcore 2 → map id 0: no marks, no INICIO
  fase.yinicio = 0;         // the stale global yinicio is the scroll start when INICIO is missing (jogo.cpp:152-155)
  passaReady(g);
  const p = jogoAtual.p!;
  expect(p.Boss).toBe(-1);
  expect(p.marcas.every(m => m.tipo === INVALIDO)).toBe(true);
  p.temp_pts.v = 300;
  let fim = -1;
  for (let k = 0; k < 2000; k++) if (frame(g).done) { fim = p.quadro; break; }
  // ymapa 0 → -600 at 2 px/frame = 300 frames, then 200 frames of contadorfinal
  expect(fim).toBeGreaterThan(495);
  expect(fim).toBeLessThan(510);
  expect(M.g.estado_atual).toBe(TELA_MISSION);
  expect(M.menu_saves_carregavetor()[0].pts).toBe(300); // the win branch saved the run's points
});

test('weapon cycle: previous unlocked weapon, wraps to the highest, never reads index -1 (F11)', () => {
  const lidos: number[] = [];
  const libera = (...ks: number[]) => {
    const arr = [1, 2, 3, 4, 5, 6].map(k => ks.includes(k));
    return new Proxy(arr, { get(t, prop, rcv) { if (typeof prop === 'string' && /^-?\d+$/.test(prop)) lidos.push(Number(prop)); return Reflect.get(t, prop, rcv); } });
  };
  const j = novoNave();
  M.g.saveAtual.tiro_liberado = libera(1);
  j.tiro_atual = TIRO1; jogo_troca_tiro(j); expect(j.tiro_atual).toBe(TIRO1);
  M.g.saveAtual.tiro_liberado = libera(1, 2, 3);
  j.tiro_atual = TIRO1; jogo_troca_tiro(j); expect(j.tiro_atual).toBe(TIRO3);
  jogo_troca_tiro(j); expect(j.tiro_atual).toBe(TIRO2);
  jogo_troca_tiro(j); expect(j.tiro_atual).toBe(TIRO1);
  M.g.saveAtual.tiro_liberado = libera(1, 5, 6);
  j.tiro_atual = TIRO1; jogo_troca_tiro(j); expect(j.tiro_atual).toBe(TIRO6);
  jogo_troca_tiro(j); expect(j.tiro_atual).toBe(TIRO5);
  jogo_troca_tiro(j); expect(j.tiro_atual).toBe(TIRO1);
  // nothing unlocked (never happens with a real slot): no infinite loop, weapon unchanged
  M.g.saveAtual.tiro_liberado = libera();
  j.tiro_atual = TIRO2; jogo_troca_tiro(j); expect(j.tiro_atual).toBe(TIRO2);
  expect(lidos.every(i => i >= 0 && i <= 5)).toBe(true);
  expect(lidos.length).toBeGreaterThan(0);
});

// --- principal (main.cpp) ---------------------------------------------------------------------------
function portaGravadora(): { port: AudioPort; musicas: string[]; pausas: string[] } {
  const musicas: string[] = [], pausas: string[] = [];
  return {
    musicas, pausas,
    port: {
      agora: () => 0, tocaBuffer: (_b, _l, _r, onEnd) => onEnd(), decodifica: async () => ({}),
      musica: (m4a) => { musicas.push(m4a); }, volumeMusica: () => {},
      desbloqueia: async () => {}, desbloqueado: () => true,
      pausaMusica: () => { pausas.push('pausa'); }, continuaMusica: () => { pausas.push('continua'); },
    },
  };
}

test('principal: splash x85.jpg at (312,270), menu music, TELA_JOGO switches music both ways, Esc on main → SAIR ends', async () => {
  const { port, musicas } = portaGravadora();
  await initAudio(port, dadosDeTeste().manifest);
  const gen = principal();
  const n = h.backend.quads.length;
  frame(gen);
  expect(h.backend.quads.slice(n).map(q => [q.tex, q.dx, q.dy])).toEqual([[tex('./dados/menu/x85.jpg'), 312, 270]]);
  frame(gen);
  expect(M.g.estado_atual).toBe(TELA_MAIN);
  expect(musicas.at(-1)).toContain('recharge');
  // as if a planet had been launched from MISSION
  M.menu_saves_edit(0, 'tester', EASY, false); M.g.slotAtual = 0; M.menu_saves_loadslot(0);
  M.g.estado_atual = TELA_JOGO;
  for (let i = 0; i < 30 && !jogoAtual.carregando; i++) frame(gen);
  expect(musicas.at(-1)).toContain('progression');
  for (let i = 0; i < 3; i++) frame(gen);
  down(K.ESPACO); frame(gen); up(K.ESPACO);
  down(K.ESC); frame(gen); up(K.ESC);
  frame(gen); frame(gen);
  expect(musicas.at(-1)).toContain('recharge');
  expect(M.g.estado_atual).toBe(TELA_MISSION);
  // Esc in MISSION → MAIN, Esc in MAIN → SAIR: principal() returns
  let r;
  for (let i = 0; i < 40; i++) { if (i === 15) down(K.ESC); if (i === 16) up(K.ESC); r = frame(gen); }
  expect(M.g.estado_atual).toBe(TELA_MAIN);
  for (let i = 0; i < 40 && !r!.done; i++) { if (i === 0) down(K.ESC); if (i === 1) up(K.ESC); r = frame(gen); }
  expect(M.g.estado_atual).toBe(SAIR);
  expect(r!.done).toBe(true);
});
