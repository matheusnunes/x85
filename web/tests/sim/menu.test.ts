import { test, expect, beforeAll, beforeEach } from 'vitest';
import { initHeadless, C2D2_CarregaSpriteSet, C2D2_PegaSpriteSet } from '../../src/engine/c2d2';
import { dadosDeTeste, memStorage } from '../unit/fixture';
import * as M from '../../src/game/funcoes_M';
import {
  menu_carrega, menu_main, menu_slot_select, menu_slot_insert, menu_mission, menu_ranking, menu_opcoes, menu_about, textoAtivo,
} from '../../src/game/menu';
import { K } from '../../src/engine/input';
import { TELA_MAIN, TELA_SLOT_SELECT, TELA_SLOT_INSERT, TELA_MISSION, TELA_OPCOES, TELA_RANKING, TELA_ABOUT, TELA_JOGO, SAIR, EASY, HARD } from '../../src/game/constantes';

let h: ReturnType<typeof initHeadless>;
beforeAll(() => { h = initHeadless(dadosDeTeste()); M.setStorage(memStorage()); menu_carrega(); });
beforeEach(() => { M.setStorage(memStorage()); M.menu_recordes_default(); M.menu_saves_default(); });
const frame = (g: Generator) => { h.entrada.poll(); return g.next(); };

// --- helpers ---------------------------------------------------------------------------------
type Gen = Generator<void, void, void>;
/** Mirrors main.cpp:29-32: encerra = 0 and estado set before a screen runs. */
function abre(estado: number, tela: () => Gen): Gen { M.g.estado_atual = estado; M.g.encerra = 0; return tela(); }
/** Runs until the generator finishes (fade-out completes); returns the number of frames. */
function ateFim(g: Gen, max = 200): number {
  for (let i = 0; i < max; i++) if (frame(g).done) return i + 1;
  throw new Error('screen did not end');
}
function anda(g: Gen, n: number): void { for (let i = 0; i < n; i++) expect(frame(g).done).toBe(false); }
/** Solid pixel of a sprite frame closest to its centre (screen coords for the frame drawn at x,y). */
function pontoSolido(path: string, w: number, hh: number, frameIdx: number, x: number, y: number): [number, number] {
  const s = C2D2_PegaSpriteSet(C2D2_CarregaSpriteSet(path, w, hh))!;
  const ox = (frameIdx % s.matrizX) * s.spLargura, oy = Math.trunc(frameIdx / s.matrizX) * s.spAltura;
  let melhor: [number, number] | null = null, dist = Infinity;
  for (let py = 0; py < s.spAltura; py++) for (let px = 0; px < s.spLargura; px++) {
    const X = ox + px, Y = oy + py;
    if ((s.mask.bits[Y * s.mask.ldwords + (X >> 5)] >>> (X & 31)) & 1) {
      const d = (px - s.spLargura / 2) ** 2 + (py - s.spAltura / 2) ** 2;
      if (d < dist) { dist = d; melhor = [x + px, y + py]; }
    }
  }
  if (!melhor) throw new Error('no solid pixel');
  return melhor;
}
/** Click (press edge) with the hotspot on screen point (sx,sy): move, press, release over 3 frames. */
function clica(g: Gen, [sx, sy]: [number, number]): void {
  const x = sx - M.HOTSPOT.x, y = sy - M.HOTSPOT.y;
  h.entrada.push({ t: 'mmove', x, y }); frame(g);
  h.entrada.push({ t: 'mdown', b: 0, x, y }); frame(g);
  h.entrada.push({ t: 'mup', b: 0, x, y }); frame(g);
}
function tecla(g: Gen, k: K): void { h.entrada.push({ t: 'down', k }); frame(g); h.entrada.push({ t: 'up', k }); }
const longe = () => h.entrada.push({ t: 'mmove', x: 790, y: 590 });
const BOTMAIN = (y: number) => pontoSolido('./dados/menu/botmain.png', 262, 62, 0, 262, y);
const BACK = () => pontoSolido('./dados/menu/botback.png', 65, 445, 0, 8, 94);
const OTHER = (x: number, y: number) => pontoSolido('./dados/menu/otherbots.png', 220, 35, 0, x, y);
const texRed = () => C2D2_PegaSpriteSet(C2D2_CarregaSpriteSet('./dados/menu/red.png', 0, 0))!.tex;

// --- main menu -------------------------------------------------------------------------------
test('main menu draws every frame and Esc exits to SAIR', () => {
  M.g.estado_atual = 0; M.g.encerra = 0; const g = menu_main();
  for (let i = 0; i < 30; i++) frame(g);
  expect(h.backend.quads.length).toBeGreaterThan(0);
  h.entrada.push({ t: 'down', k: K.ESC });
  let r; for (let i = 0; i < 120 && !(r = frame(g)).done; i++);
  expect(M.g.estado_atual).toBe(8 /* SAIR */);
  expect(r?.done).toBe(true);
});
test('clicking "start" goes to SLOT_SELECT; fade-out takes 10 frames then the screen ends', () => {
  longe(); const g = abre(TELA_MAIN, menu_main); anda(g, 15);
  clica(g, BOTMAIN(162));
  expect(M.g.estado_atual).toBe(TELA_SLOT_SELECT);
  expect(ateFim(g)).toBeLessThanOrEqual(12);
  expect(M.g.fadealpha).toBe(250); expect(M.g.encerra).toBe(1); expect(M.g.fadecontrol).toBe(false);
});
test.each([[226, TELA_OPCOES], [288, TELA_RANKING], [350, TELA_ABOUT], [412, SAIR]])('main button y=%i → state %i', (y, alvo) => {
  longe(); const g = abre(TELA_MAIN, menu_main); anda(g, 3);
  clica(g, BOTMAIN(y)); expect(M.g.estado_atual).toBe(alvo); ateFim(g);
});
test('main menu frame draw order ends with cover then cursor (menu_aux)', () => {
  longe(); const g = abre(TELA_MAIN, menu_main); anda(g, 12); // fade-in finished
  const n = h.backend.quads.length; frame(g);
  const q = h.backend.quads.slice(n);
  const tex = (p: string, w = 0, hh = 0) => C2D2_PegaSpriteSet(C2D2_CarregaSpriteSet(p, w, hh))!.tex;
  // 2 background + 5 buttons x 2 + menutxt + cover + cursor
  expect(q.length).toBe(2 + 10 + 1 + 2);
  expect(q[0].tex).toBe(tex('./dados/menu/fundo.jpg'));
  expect(q[2].dx).toBe(262); expect(q[2].dy).toBe(162);
  expect(q[12].tex).toBe(tex('./dados/menu/menutxt.png'));
  expect(q[13].tex).toBe(tex('./dados/menu/cover.png'));
  expect(q[14].tex).toBe(tex('./dados/menu/cursor.png', 40, 40)); expect([q[14].dx, q[14].dy]).toEqual([790, 590]);
  M.g.estado_atual = SAIR; ateFim(g);
});

// --- other screens: Esc and back --------------------------------------------------------------
test.each([
  ['ranking', TELA_RANKING, menu_ranking], ['options', TELA_OPCOES, menu_opcoes], ['about', TELA_ABOUT, menu_about],
  ['slot select', TELA_SLOT_SELECT, menu_slot_select], ['slot insert', TELA_SLOT_INSERT, menu_slot_insert], ['mission', TELA_MISSION, menu_mission],
] as const)('%s: Esc → TELA_MAIN', (_n, estado, tela) => {
  longe(); const g = abre(estado, tela); anda(g, 5);
  tecla(g, K.ESC); expect(M.g.estado_atual).toBe(TELA_MAIN); ateFim(g);
});
test.each([
  ['ranking', TELA_RANKING, menu_ranking, TELA_MAIN], ['options', TELA_OPCOES, menu_opcoes, TELA_MAIN], ['about', TELA_ABOUT, menu_about, TELA_MAIN],
  ['slot select', TELA_SLOT_SELECT, menu_slot_select, TELA_MAIN], ['slot insert', TELA_SLOT_INSERT, menu_slot_insert, TELA_SLOT_SELECT],
  ['mission', TELA_MISSION, menu_mission, TELA_MAIN],
] as const)('%s: back button → %i', (_n, estado, tela, alvo) => {
  longe(); const g = abre(estado, tela); anda(g, 3);
  clica(g, BACK()); expect(M.g.estado_atual).toBe(alvo); ateFim(g);
});

// --- slot select ---------------------------------------------------------------------------------
test('slot select: empty slot → SLOT_INSERT with slotAtual; used slot → load + MISSION; delete clears', () => {
  longe(); let g = abre(TELA_SLOT_SELECT, menu_slot_select); anda(g, 2);
  clica(g, BOTMAIN(288)); expect(M.g.estado_atual).toBe(TELA_SLOT_INSERT); expect(M.g.slotAtual).toBe(1); ateFim(g);

  M.menu_saves_edit(2, 'zeca', HARD, false); M.g.saveAtual.pts = 4321; M.menu_saves_saveslot(2); M.g.saveAtual.pts = 0;
  longe(); g = abre(TELA_SLOT_SELECT, menu_slot_select); anda(g, 2);
  clica(g, BOTMAIN(350)); expect(M.g.estado_atual).toBe(TELA_MISSION); expect(M.g.slotAtual).toBe(2);
  expect(M.g.saveAtual.nome).toBe('zeca'); expect(M.g.saveAtual.pts).toBe(4321); ateFim(g);

  longe(); g = abre(TELA_SLOT_SELECT, menu_slot_select); anda(g, 2);
  clica(g, pontoSolido('./dados/menu/botdelslot.png', 62, 62, 0, 515, 350));
  expect(M.g.estado_atual).toBe(TELA_SLOT_SELECT);
  expect(M.menu_saves_carregavetor()[2]).toMatchObject({ empty: true, nome: 'new', level: EASY, pts: 0 });
  M.g.estado_atual = TELA_MAIN; ateFim(g);
});
test('slot select: delete button of an empty slot is neither drawn nor clickable', () => {
  longe(); const g = abre(TELA_SLOT_SELECT, menu_slot_select); anda(g, 12);
  const del = C2D2_PegaSpriteSet(C2D2_CarregaSpriteSet('./dados/menu/botdelslot.png', 62, 62))!.tex;
  const n = h.backend.quads.length; frame(g);
  expect(h.backend.quads.slice(n).some(q => q.tex === del)).toBe(false);
  M.g.estado_atual = TELA_MAIN; ateFim(g);
});

// --- slot insert / name entry ---------------------------------------------------------------------
test('slot insert: keys type a lowercase name, Backspace deletes, difficulty saves the slot → MISSION', () => {
  M.g.slotAtual = 1; longe(); const g = abre(TELA_SLOT_INSERT, menu_slot_insert); anda(g, 2);
  expect(textoAtivo.v).toBe(true);
  for (const k of [K.J, K.O, K.X, K.BACKSPACE, K.A, K.O, K.ESPACO, K.K_]) tecla(g, k);
  clica(g, OTHER(275, 360)); // Hard
  expect(M.g.estado_atual).toBe(TELA_MISSION);
  expect(M.menu_saves_carregavetor()[1]).toMatchObject({ empty: false, nome: 'joao k', level: HARD, pts: 0 });
  expect(M.g.saveAtual.nome).toBe('joao k');
  ateFim(g);
  expect(textoAtivo.v).toBe(false);
});
test('slot insert: empty name → red flash, stays', () => {
  M.g.slotAtual = 0; longe(); const g = abre(TELA_SLOT_INSERT, menu_slot_insert); anda(g, 2);
  clica(g, OTHER(275, 280));
  expect(M.g.estado_atual).toBe(TELA_SLOT_INSERT);
  const n = h.backend.quads.length; frame(g);
  expect(h.backend.quads.slice(n).some(q => q.tex === texRed())).toBe(true);
  expect(M.menu_saves_carregavetor()[0].empty).toBe(true);
  M.g.estado_atual = TELA_MAIN; ateFim(g);
});
test('slot insert: OS keyboard chars ([A-Za-z0-9 ]) are accepted, not doubled with the key, 12-char limit', () => {
  M.g.slotAtual = 0; longe(); const g = abre(TELA_SLOT_INSERT, menu_slot_insert); anda(g, 2);
  // same physical key press seen as keydown and as an input char in one frame → counted once
  h.entrada.push({ t: 'down', k: K.J }); h.entrada.push({ t: 'char', c: 'J' }); frame(g); h.entrada.push({ t: 'up', k: K.J });
  for (const c of ['o', '9', '!', 'é', ' ', 'Z']) h.entrada.push({ t: 'char', c });
  frame(g);
  h.entrada.push({ t: 'char', c: 'abcdefghij' }); frame(g); // limit reached mid-string
  clica(g, OTHER(275, 280));
  expect(M.menu_saves_carregavetor()[0].nome).toBe('Jo9 Zabcdefg');
  ateFim(g);
});
test('slot insert: at most one key char per frame, in the C order (menu.cpp:664-690)', () => {
  M.g.slotAtual = 2; longe(); const g = abre(TELA_SLOT_INSERT, menu_slot_insert); anda(g, 2);
  h.entrada.push({ t: 'down', k: K.W }); h.entrada.push({ t: 'down', k: K.X }); frame(g); // X is tested before W
  h.entrada.push({ t: 'up', k: K.W }); h.entrada.push({ t: 'up', k: K.X });
  clica(g, OTHER(275, 280));
  expect(M.menu_saves_carregavetor()[2].nome).toBe('x');
  ateFim(g);
});

// --- mission ------------------------------------------------------------------------------------
test('mission: Space on an unlocked planet → JOGO; Right browses to a locked one; Space there is refused', () => {
  Object.assign(M.g.saveAtual, { nome: 'p', pts: 10, planeta_liberado: 0, planeta_atual: 0 });
  longe(); let g = abre(TELA_MISSION, menu_mission); anda(g, 2);
  tecla(g, K.DIREITA); expect(M.g.saveAtual.planeta_atual).toBe(1);
  tecla(g, K.ESPACO); expect(M.g.estado_atual).toBe(TELA_MISSION);
  const n = h.backend.quads.length; frame(g);
  expect(h.backend.quads.slice(n).some(q => q.tex === texRed())).toBe(true);
  tecla(g, K.ESQUERDA); tecla(g, K.ESQUERDA); expect(M.g.saveAtual.planeta_atual).toBe(0);
  tecla(g, K.ESPACO); expect(M.g.estado_atual).toBe(TELA_JOGO); ateFim(g);
  // right arrow stops at planeta_max-1
  M.g.saveAtual.planeta_atual = 0; longe(); g = abre(TELA_MISSION, menu_mission); anda(g, 1);
  for (let i = 0; i < 8; i++) tecla(g, K.DIREITA);
  expect(M.g.saveAtual.planeta_atual).toBe(4);
  M.g.estado_atual = TELA_MAIN; ateFim(g);
});
test('mission: clicking the select box (310,210) on an unlocked planet → JOGO', () => {
  Object.assign(M.g.saveAtual, { planeta_liberado: 2, planeta_atual: 2 });
  longe(); const g = abre(TELA_MISSION, menu_mission); anda(g, 2);
  clica(g, pontoSolido('./dados/menu/select.png', 180, 180, 0, 310, 210));
  expect(M.g.estado_atual).toBe(TELA_JOGO); ateFim(g);
});

// --- options ------------------------------------------------------------------------------------
test('options: mute zeroes both volumes and persists; dragging the music knob sets the volume', () => {
  M.g.volume_music = 30; M.g.volume_effects = 30;
  longe(); const g = abre(TELA_OPCOES, menu_opcoes); anda(g, 2);
  // music knob: frame 2 drawn at (230, ymusic-95) with ymusic = 422 - 30*172/100 = 371
  const [kx, ky] = pontoSolido('./dados/menu/volume.png', 65, 190, 2, 230, 371 - 95);
  const x = kx - M.HOTSPOT.x, y = ky - M.HOTSPOT.y;
  h.entrada.push({ t: 'mmove', x, y }); frame(g);
  h.entrada.push({ t: 'mdown', b: 0, x, y }); frame(g); // press edge returns 1, not 2: no change yet
  expect(M.g.volume_music).toBe(30);
  frame(g); // held → 2 → atualiza_barra(mouse.y)
  expect(M.g.volume_music).toBe(Math.trunc(((422 - y) * 100) / 172));
  h.entrada.push({ t: 'mup', b: 0, x, y }); frame(g);
  clica(g, OTHER(440, 230));
  expect([M.g.volume_music, M.g.volume_effects]).toEqual([0, 0]);
  M.g.volume_music = 99; M.opcoes_carrega(); expect(M.g.volume_music).toBe(0);
  M.g.estado_atual = TELA_MAIN; ateFim(g);
});
test('options: clear records / clear saves buttons', () => {
  M.menu_recordes_insere(99999, 'x'); M.menu_saves_edit(0, 'k', 1, false);
  longe(); const g = abre(TELA_OPCOES, menu_opcoes); anda(g, 2);
  clica(g, OTHER(440, 270)); expect(M.recordes()[0].nome).toBe('Matheus'); expect(M.menu_saves_carregavetor()[0].nome).toBe('k');
  clica(g, OTHER(440, 310)); expect(M.menu_saves_carregavetor()[0]).toMatchObject({ nome: 'new', empty: true });
  M.g.estado_atual = TELA_MAIN; ateFim(g);
});

// --- ranking / about ---------------------------------------------------------------------------------
test('ranking shows the records read on entry', () => {
  M.menu_recordes_insere(123456, 'campeao');
  longe(); const g = abre(TELA_RANKING, menu_ranking); anda(g, 12);
  const n = h.backend.quads.length; frame(g);
  const q = h.backend.quads.slice(n);
  // first glyph quad of the name row 0 is at y=175 (font cell top), first row is 'campeao'
  expect(q.some(x => x.dy === 175)).toBe(true);
  expect(q.some(x => x.dy === 175 + 50 * 6)).toBe(true);
  M.g.estado_atual = TELA_MAIN; ateFim(g);
});
test('about: glow alpha pulses (0→255 in 51 frames)', () => {
  longe(); const g = abre(TELA_ABOUT, menu_about);
  const glow = C2D2_PegaSpriteSet(C2D2_CarregaSpriteSet('./dados/menu/about2.png', 0, 0))!.tex;
  const alphas: number[] = [];
  for (let i = 0; i < 110; i++) { const n = h.backend.quads.length; frame(g); alphas.push(h.backend.quads.slice(n).find(q => q.tex === glow)!.alpha * 255); }
  expect(Math.round(alphas[0])).toBe(5); expect(Math.round(alphas[50])).toBe(255); expect(Math.round(alphas[51])).toBe(255);
  expect(Math.round(alphas[52])).toBe(250);
  M.g.estado_atual = TELA_MAIN; ateFim(g);
});
