// Menu helpers, records and saves. orig: X85-devcore 2/funcoes_M.cpp (all), funcoes_M.h
// File I/O (./dados/recs.x85, ./dados/saves.x85) becomes storage.ts: every function that opened a file
// loads the whole Persistido and, where the C code wrote, saves it back.
import {
  C2D2_PegaMouse, C2D2_PegaSpriteSet, C2D2_DesenhaSprite, C2D2_DesenhaSpriteEfeito, C2D2_ColidiuSprites,
  C2D2_MESQUERDO, type Mouse,
} from '../engine/c2d2';
import { carrega, grava, type TipoSave, type TipoRecorde } from '../engine/storage';
import { EASY, TELA_MAIN } from './constantes';
import type { Planeta } from './tipos';

const NOME_MAX = 14; // orig: funcoes_M.h:27,35 char nome[15]

// orig: funcoes_M.h:31 tiposave — a zeroed C global / freshly truncated file
function saveZerado(): TipoSave {
  return { empty: false, pts: 0, nome: '', level: 0, planeta_liberado: 0, planeta_atual: 0, tiro_liberado: [false, false, false, false, false, false] };
}

// orig: funcoes_M.cpp:3-14 variaveis globais do menu e jogo (+ menu.cpp:49-50 music ids, extern in funcoes_M.h:56-57)
export const g = {
  estado_atual: TELA_MAIN,     // orig: funcoes_M.cpp:4 (zero = TELA_MAIN)
  planeta_max: 5,              // orig: funcoes_M.cpp:5
  saveAtual: saveZerado(),     // orig: funcoes_M.cpp:7
  slotAtual: 0,                // orig: funcoes_M.cpp:8
  volume_effects: 30,          // orig: funcoes_M.cpp:10
  volume_music: 30,            // orig: funcoes_M.cpp:10
  encerra: 0,                  // orig: funcoes_M.cpp:12
  fadealpha: 0,                // orig: funcoes_M.cpp:13
  fadecontrol: false,          // orig: funcoes_M.cpp:14
  music_menu: 0,               // orig: menu.cpp:49
  music_jogo: 0,               // orig: menu.cpp:50
};

// Mouse hotspot: cursor.png frame 1 holds exactly one solid pixel, at (8,6) (01-game-spec 1.5). XDesenhaBotao
// collides that frame drawn at the mouse position (funcoes_M.cpp:47), so the effective click point is
// mouse + HOTSPOT. Touch input pushes `tap - HOTSPOT` so the finger lands on the hotspot.
export const HOTSPOT = { x: 8, y: 6 }; // orig: dados/menu/cursor.png frame 1 pixel (8,6)

// --- persistence store (localStorage by default; tests inject an in-memory one) -------------------
let store: Storage | null | undefined = undefined;
/** undefined → localStorage (default), null → no persistence (defaults in memory), or a Storage. */
export function setStorage(s: Storage | null | undefined): void { store = s; }

/** Read accessor for the record table (what menu_ranking reads from recs.x85). */
export function recordes(): TipoRecorde[] { return carrega(store).recordes; }

/** Volumes persist across sessions in the web port (D10 convenience; the original reset to 30/30). */
export function opcoes_carrega(): void {
  const o = carrega(store).opcoes;
  g.volume_music = o.volume_music; g.volume_effects = o.volume_effects;
}
export function opcoes_grava(): void {
  const p = carrega(store);
  p.opcoes = { volume_music: g.volume_music, volume_effects: g.volume_effects };
  grava(p, store);
}

// orig: funcoes_M.cpp:16 XDesenhaSprite
export function XDesenhaSprite(id: number, indice: number, posx: number, posy: number, largura: number, altura: number, alpha: number): void {
  //quando vai desenhar com o tamanho que foi carregado
  if (largura === 0 || altura === 0) {
    const s = C2D2_PegaSpriteSet(id); // orig: sprites[id-1] (id 0 would read out of bounds; here a no-op)
    if (!s) return;
    largura = s.spLargura;
    altura = s.spAltura;
  }
  // orig: funcoes_M.cpp:25-36 — axis-aligned quad (posx,posy)-(posx+largura,posy+altura), r=g=b=255
  C2D2_DesenhaSpriteEfeito(id, indice, posx, posy, largura, altura, alpha);
}

// orig: funcoes_M.cpp:39 XDesenhaBotao — int &alpha → { v }
export function XDesenhaBotao(idbot: number, indx: number, x: number, y: number, idcursor: number, alpha: { v: number }): number {
  const mouse = C2D2_PegaMouse();
  //botão normal
  C2D2_DesenhaSprite(idbot, indx, x, y);
  //botão selecionado
  XDesenhaSprite(idbot, indx + 1, x, y, 0, 0, alpha.v);

  if (C2D2_ColidiuSprites(idcursor, 1, mouse.x, mouse.y, idbot, indx, x, y)) {
    if (alpha.v < 250)
      alpha.v += 25;
    if (mouse.botoes[C2D2_MESQUERDO].pressionado)
      return 1;
    else if (mouse.botoes[C2D2_MESQUERDO].ativo)
      return 2;
    else if (mouse.botoes[C2D2_MESQUERDO].liberado)
      return 3;
  } else {
    if (alpha.v > 0)
      alpha.v -= 25;
    return 0; // orig: return false
  }
  return 0; // orig: return NULL
}

// orig: funcoes_M.cpp:66 planetas_atualiza — C integer arithmetic (division truncates toward zero)
export function planetas_atualiza(planetas: Planeta[], atual: number, max: number): void {
  const pos_x = 325;
  const pos_y = 225;
  const tamanho_centro = 150;
  const smooth = 10;
  const c = planetas[atual];

  // ATUAL... o do meio
  if (c.tamanho < tamanho_centro)
    c.tamanho = (c.tamanho + Math.trunc((tamanho_centro - c.tamanho) / smooth) + 1) | 0;
  else if (c.tamanho > tamanho_centro)
    c.tamanho = (c.tamanho - (Math.trunc((c.tamanho - tamanho_centro) / smooth) + 1)) | 0;

  if (c.x < pos_x)
    c.x = (c.x + Math.trunc((pos_x - c.x) / smooth) + 1) | 0;
  else if (c.x > pos_x)
    c.x = (c.x - (Math.trunc((c.x - pos_x) / smooth) + 1)) | 0;

  if (c.y < pos_y)
    c.y = (c.y + Math.trunc((pos_y - c.y) / smooth) + 1) | 0;
  else if (c.y > pos_y)
    c.y = (c.y - (Math.trunc((c.y - pos_y) / smooth) + 1)) | 0;

  c.alpha = 255;

  // DA DIREITA
  for (let i = atual + 1; i < max; i++) {
    const p = planetas[i], a = planetas[i - 1];
    p.tamanho = Math.trunc(a.tamanho / 2);
    p.x = (a.x + a.tamanho + 20) | 0;
    p.y = (a.y + Math.trunc((a.tamanho - p.tamanho) / 2)) | 0;
    p.alpha = (a.alpha - 50) | 0;
  }

  // DA Esquerda
  for (let i = atual - 1; i >= 0; i--) {
    const p = planetas[i], d = planetas[i + 1];
    p.tamanho = (d.tamanho * 2) | 0;
    p.x = (d.x - p.tamanho - 20) | 0;
    p.y = (d.y + Math.trunc((d.tamanho - p.tamanho) / 2)) | 0;
    p.alpha = Math.trunc(d.alpha / 2);
  }
}

// orig: funcoes_M.cpp:126 atualiza_barra — int &yatual → { v }; mouse->y is an int in C
export function atualiza_barra(yatual: { v: number }, ymax: number, ymin: number, mouse: Mouse): number {
  const my = mouse.y | 0;
  const tamanho = ymax - ymin;
  if (Math.trunc(((ymax - my) * 100) / tamanho) >= 100)
    yatual.v = ymin;
  else if (Math.trunc(((ymax - my) * 100) / tamanho) <= 0)
    yatual.v = ymax;
  else
    yatual.v = my;
  //retorna porcentagem da barra
  return Math.trunc(((ymax - yatual.v) * 100) / tamanho);
}

// orig: funcoes_M.cpp:139 menu_recordes_default — rewrites recs.x85 with the factory table
export function menu_recordes_default(): void {
  const p = carrega(store);
  p.recordes = [
    { nome: 'Matheus', pts: 9000 },
    { nome: 'Argus', pts: 8000 },
    { nome: 'chucknorris', pts: 3000 },
    { nome: 'magaiver', pts: 2000 },
    { nome: 'loser', pts: 1000 },
    { nome: 'bill', pts: 600 },
    { nome: 'noob', pts: 500 },
  ];
  grava(p, store);
}

// orig: funcoes_M.cpp:165 menu_recordes_insere — with fixes F4, F5, F6 (web/FIXES.md)
export function menu_recordes_insere(pontos: number, tempnome: string): void {
  const p = carrega(store);
  const vetrecs = p.recordes;
  pontos |= 0;
  // F5: work on a copy; the original strcpy'd the displaced names into the caller's buffer (saveAtual.nome)
  const nome = tempnome.slice(0, NOME_MAX);

  // F6: one entry per name — a higher score replaces that player's entry; a lower/equal one changes nothing
  const j = vetrecs.findIndex(r => r.nome === nome);
  if (j >= 0) {
    if (pontos <= vetrecs[j].pts) return;
    vetrecs.splice(j, 1);
  }

  // orig: funcoes_M.cpp:178-198 — first i with pontos >= pts (ties go above), shift the rest down, drop the 7th
  let inserido = false;
  for (let i = 0; i < vetrecs.length; i++) {
    if (pontos >= vetrecs[i].pts) {
      vetrecs.splice(i, 0, { nome, pts: pontos });
      inserido = true;
      break;
    }
  }
  if (!inserido && vetrecs.length < 7) { vetrecs.push({ nome, pts: pontos }); inserido = true; } // F6 path only
  // F4: below all 7 records → nothing is written (the original wrote through an already-closed FILE*)
  if (!inserido) return;
  p.recordes = vetrecs.slice(0, 7);
  grava(p, store);
}

// orig: funcoes_M.cpp:203 menu_saves_default — truncate saves.x85, then 3 × menu_saves_edit(i, "new", EASY, true)
export function menu_saves_default(): void {
  const p = carrega(store);
  p.saves = [saveZerado(), saveZerado(), saveZerado()]; // orig: fopen("wb") truncation
  grava(p, store);
  const nome = 'new';
  for (let i = 0; i < 3; menu_saves_edit(i++, nome, EASY, true));
}

// orig: funcoes_M.cpp:211 menu_saves_carregavetor — returns the 3 slots (fresh copies)
export function menu_saves_carregavetor(): TipoSave[] {
  return carrega(store).saves;
}

// orig: funcoes_M.cpp:219 menu_saves_saveslot — writes progress only (not nome, level, empty)
export function menu_saves_saveslot(slot: number): void {
  const p = carrega(store);
  const vetsaves = p.saves;
  //seta o slot com o nome e zera o resto
  vetsaves[slot].planeta_liberado = g.saveAtual.planeta_liberado;
  vetsaves[slot].pts = g.saveAtual.pts;
  vetsaves[slot].planeta_atual = g.saveAtual.planeta_atual;
  vetsaves[slot].tiro_liberado = g.saveAtual.tiro_liberado.slice(0, 6); // memcpy 6 bools
  //grava e fecha esse trem !
  grava(p, store);
}

// orig: funcoes_M.cpp:237 menu_saves_loadslot — copies progress and nome (not level, empty)
export function menu_saves_loadslot(slot: number): void {
  const vetsaves = menu_saves_carregavetor();
  g.saveAtual.planeta_liberado = vetsaves[slot].planeta_liberado;
  g.saveAtual.pts = vetsaves[slot].pts;
  g.saveAtual.planeta_atual = vetsaves[slot].planeta_atual;
  g.saveAtual.tiro_liberado = vetsaves[slot].tiro_liberado.slice(0, 6);
  g.saveAtual.nome = vetsaves[slot].nome;
}

// orig: funcoes_M.cpp:249 menu_saves_edit
export function menu_saves_edit(slot: number, nome: string, level: number, empty: boolean): void {
  const p = carrega(store);
  const v = p.saves[slot];
  //seta o slot com o nome e zera o resto
  v.nome = nome.slice(0, NOME_MAX); // orig: sprintf(vetsaves[slot].nome, nome)
  v.level = level;
  v.planeta_liberado = 0;
  v.planeta_atual = 0;
  v.pts = 0;
  v.tiro_liberado = [true, false, false, false, false, false];
  v.empty = empty;
  //grava e fecha esse trem !
  grava(p, store);
}
