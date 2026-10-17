// Task 14: touch controls — the DOM-free parts (CSS → logical deltas, the input sequencer that turns touch / OS
// keyboard activity into engine-visible edges, OS-keyboard text diffing) and the moveAlvoToque target clamp.
// initToque itself (real DOM, pointer events, layout) is covered by the Task 15 e2e mobile projects.
import { test, expect, beforeAll, beforeEach } from 'vitest';
import { initHeadless } from '../../src/engine/c2d2';
import { Entrada, K } from '../../src/engine/input';
import { dadosDeTeste } from './fixture';
import * as J from '../../src/game/funcoes_J';
import { novoNave, novaExplo } from '../../src/game/tipos';
import { MAXEXPLOS, INVALIDO, X85 } from '../../src/game/constantes';
import { deltaParaAlvo, Sequenciador, difTexto } from '../../src/touch/touch';

// --- deltaParaAlvo ---------------------------------------------------------------------------------
test('deltaParaAlvo converts a CSS-px finger delta to logical px', () => {
  expect(deltaParaAlvo(100, 50, 0.5)).toEqual({ dx: 200, dy: 100 });
  expect(deltaParaAlvo(-30, 12, 1.5)).toEqual({ dx: -20, dy: 8 });
  expect(deltaParaAlvo(10, 10, 0)).toEqual({ dx: 0, dy: 0 }); // degenerate layout: no movement, no NaN
});

// --- moveAlvoToque ---------------------------------------------------------------------------------
let h: ReturnType<typeof initHeadless>;
beforeAll(() => { h = initHeadless(dadosDeTeste()); });
beforeEach(() => { h.entrada.push({ t: 'releaseAll' }); h.entrada.poll(); h.entrada.poll(); });
const explos = () => Array.from({ length: MAXEXPLOS }, novaExplo);
const jogador = () => { const n = novoNave(); J.jogo_inicia_jogador(n); return n; };

test('moveAlvoToque moves the ship target (xaux/yaux) on the next update; the ship keeps its chase easing', () => {
  const n = jogador();
  J.moveAlvoToque(40, -60);
  J.jogo_atualiza_jogador(n, explos());
  expect([n.xaux, n.yaux]).toEqual([440, 340]);
  // funcoes_J.cpp:58-67 easing: (target - pos) / velocidade + 1
  expect([n.x, n.y]).toEqual([400 + Math.trunc(40 / 20) + 1, 400 - (Math.trunc(60 / 20) + 1)]);
  // deltas are consumed once
  J.jogo_atualiza_jogador(n, explos());
  expect([n.xaux, n.yaux]).toEqual([440, 340]);
});

test('moveAlvoToque accumulates several drags between frames', () => {
  const n = jogador();
  J.moveAlvoToque(10, 5); J.moveAlvoToque(15, -25);
  J.jogo_atualiza_jogador(n, explos());
  expect([n.xaux, n.yaux]).toEqual([425, 380]);
});

test('a huge drag cannot push the target outside the keyboard bounds (funcoes_J.cpp:48-55)', () => {
  // The keyboard steps the target by 15 only while yaux > 15 / yaux < 615 (x: < 815), so the target it can produce
  // stays within [1, 629] x [1, 829]; the touch nudge is clamped to exactly that range.
  const n = jogador();
  J.moveAlvoToque(1e6, 1e6);
  J.jogo_atualiza_jogador(n, explos());
  expect([n.xaux, n.yaux]).toEqual([J.ALVO_MAX_X, J.ALVO_MAX_Y]);
  expect([J.ALVO_MAX_X, J.ALVO_MAX_Y]).toEqual([829, 629]);
  J.moveAlvoToque(-1e6, -1e6);
  J.jogo_atualiza_jogador(n, explos());
  expect([n.xaux, n.yaux]).toEqual([J.ALVO_MIN, J.ALVO_MIN]);
  expect(J.ALVO_MIN).toBe(1);
  // NaN / Infinity never reach the target
  J.moveAlvoToque(Number.NaN, Number.POSITIVE_INFINITY);
  J.jogo_atualiza_jogador(n, explos());
  expect([n.xaux, n.yaux]).toEqual([J.ALVO_MIN, J.ALVO_MAX_Y]);
});

test('the keyboard alone reaches exactly those bounds, and the clamp never changes keyboard-only play', () => {
  const n = jogador();
  n.xaux = 16; n.yaux = 614;
  h.entrada.push({ t: 'down', k: K.ESQUERDA }); h.entrada.push({ t: 'down', k: K.BAIXO }); h.entrada.poll();
  J.jogo_atualiza_jogador(n, explos());
  expect([n.xaux, n.yaux]).toEqual([1, 629]);
  h.entrada.push({ t: 'releaseAll' }); h.entrada.push({ t: 'down', k: K.DIREITA }); h.entrada.poll();
  n.xaux = 814;
  J.jogo_atualiza_jogador(n, explos());
  expect(n.xaux).toBe(829);
  // keyboard-only: an out-of-range target set by game code is left alone (no pending touch delta → no clamp)
  h.entrada.push({ t: 'releaseAll' }); h.entrada.poll();
  n.xaux = -50; n.yaux = 900;
  J.jogo_atualiza_jogador(n, explos());
  expect([n.xaux, n.yaux]).toEqual([-50, 900]);
});

test('a dead ship ignores (and drops) touch nudges, like the keyboard', () => {
  const n = jogador();
  n.tipo = INVALIDO;
  J.moveAlvoToque(100, 100);
  J.jogo_atualiza_jogador(n, explos());
  expect([n.xaux, n.yaux]).toEqual([400, 400]);
  n.tipo = X85;
  J.jogo_atualiza_jogador(n, explos());
  expect([n.xaux, n.yaux]).toEqual([400, 400]);
});

test('a nudge pending when a new game starts is dropped by jogo_inicia_jogador (Task 15)', () => {
  J.moveAlvoToque(120, -80); // e.g. a drag during the last frames of the previous game / the ready screen
  const n = jogador();       // jogo_inicia_jogador
  J.jogo_atualiza_jogador(n, explos());
  expect([n.xaux, n.yaux]).toEqual([400, 400]);
});

// --- Sequenciador ----------------------------------------------------------------------------------
test('a tap whose down and up land in the same frame still produces a press edge (up deferred one poll)', () => {
  const e = new Entrada(); const s = new Sequenciador(e); const solta = s.instala();
  s.tecla(K.LCTRL, true); s.tecla(K.LCTRL, false);
  e.poll();
  expect(e.teclas[K.LCTRL]).toEqual({ pressionado: true, ativo: true, liberado: false });
  e.poll();
  expect(e.teclas[K.LCTRL]).toEqual({ pressionado: false, ativo: false, liberado: true });
  solta();
  // uninstalled: the original poll is back (down+up in one frame loses the press again)
  e.push({ t: 'down', k: K.LALT }); e.push({ t: 'up', k: K.LALT }); e.poll();
  expect(e.teclas[K.LALT].pressionado).toBe(false);
});

test('a slow tap is passed through unchanged', () => {
  const e = new Entrada(); const s = new Sequenciador(e); s.instala();
  s.tecla(K.ESPACO, true); e.poll();
  expect(e.teclas[K.ESPACO].pressionado).toBe(true);
  e.poll();
  s.tecla(K.ESPACO, false); e.poll();
  expect(e.teclas[K.ESPACO]).toEqual({ pressionado: false, ativo: false, liberado: true });
});

test('menu taps: mouse down/up at the given logical point, with the same deferral', () => {
  const e = new Entrada(); const s = new Sequenciador(e); s.instala();
  e.push({ t: 'mmove', x: 92, y: 314 });
  s.mouse(true, 92, 314); s.mouse(false, 92, 314);
  e.poll();
  expect(e.mouse.x).toBe(92); expect(e.mouse.y).toBe(314);
  expect(e.mouse.botoes[0].pressionado).toBe(true);
  e.poll();
  expect(e.mouse.botoes[0].liberado).toBe(true);
});

test('OS-keyboard text: characters batch into one frame; each Backspace is its own key press, in order', () => {
  const e = new Entrada(); const s = new Sequenciador(e); s.instala();
  s.texto({ apagar: 0, inserir: 'ab' });
  s.texto({ apagar: 2, inserir: 'c' });
  const quadros: { typed: string[]; bs: boolean }[] = [];
  for (let i = 0; i < 6; i++) { e.poll(); quadros.push({ typed: [...e.typed], bs: e.teclas[K.BACKSPACE].pressionado }); }
  // poll 1 applies what was queued before it (nothing of ours: the text queue drains after each poll)
  expect(quadros).toEqual([
    { typed: [], bs: false },
    { typed: ['a', 'b'], bs: false },
    { typed: [], bs: true },
    { typed: [], bs: true },
    { typed: ['c'], bs: false },
    { typed: [], bs: false },
  ]);
  expect(e.teclas[K.BACKSPACE].ativo).toBe(false);
});

// --- difTexto ----------------------------------------------------------------------------------------
test('difTexto: insertions, deletions and replacements (autocorrect / IME composition)', () => {
  expect(difTexto('', 'a')).toEqual({ apagar: 0, inserir: 'a' });
  expect(difTexto('a', 'ab')).toEqual({ apagar: 0, inserir: 'b' });
  expect(difTexto('abc', 'ab')).toEqual({ apagar: 1, inserir: '' });
  expect(difTexto('teh', 'the')).toEqual({ apagar: 2, inserir: 'he' });
  expect(difTexto('ab', 'ab')).toEqual({ apagar: 0, inserir: '' });
});
