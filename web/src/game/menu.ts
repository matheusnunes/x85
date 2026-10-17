// Menu screens. orig: X85-devcore 2/menu.cpp (all)
// Each blocking screen loop `while(!encerra){ ...; C2D2_Sincroniza(); }` is a generator that yields once per frame.
import {
  C2D2_CarregaSpriteSet, C2D2_CarregaFonte, C2D2_DesenhaSprite, C2D2_DesenhaTexto, C2D2_LimpaTela, C2D2_Sincroniza,
  C2D2_PegaTeclas, C2D2_PegaMouse, C2D2_PegaDigitados,
  C2D2_TEXTO_ESQUERDA, C2D2_TEXTO_DIREITA, C2D2_TEXTO_CENTRALIZADO,
  CA2_CarregaEfeito, CA2_CarregaMusica, CA2_TocaMusica, CA2_TocaEfeito, CA2_AjustaVolume, K,
} from '../engine/c2d2';
import {
  g, XDesenhaSprite, XDesenhaBotao, planetas_atualiza, atualiza_barra, menu_recordes_default, recordes,
  menu_saves_default, menu_saves_carregavetor, menu_saves_loadslot, menu_saves_edit, opcoes_carrega, opcoes_grava,
} from './funcoes_M';
import {
  TELA_MAIN, TELA_SLOT_SELECT, TELA_SLOT_INSERT, TELA_MISSION, TELA_OPCOES, TELA_RANKING, TELA_ABOUT, TELA_JOGO, SAIR,
  EASY, NORMAL, HARD, GODMODE,
} from './constantes';
import type { Planeta } from './tipos';

type Tela = Generator<void, void, void>;

//fundo animado — orig: menu.cpp:4-6 (float yfundo1, yfundo2; int redAlpha), shared by every menu screen
let yfundo1 = 0;
let yfundo2 = 0;
let redAlpha = 0;

//sprites de uso geral — orig: menu.cpp:9-17
let cursor = 0, fonte = 0, fundo = 0, cover = 0, darkback = 0, botmain = 0, botback = 0, menutxt = 0, otherbots = 0;
//sprite da tela de planetas — orig: menu.cpp:20-23
let sprite_planetas = 0, selectbox = 0, botplanetas = 0, redback = 0;
//sprites load slots — orig: menu.cpp:27-30
let botdelslot = 0, slotback = 0, slotloadcover = 0, slotinsertcover = 0;
//sprites opcoes — orig: menu.cpp:33-34
let spvolume = 0, spoptionscover = 0;
//sprites about — orig: menu.cpp:38-39
let spabout1 = 0, spabout2 = 0;
//sprites recordes — orig: menu.cpp:42-43
let trofeus = 0, recordstab = 0;
//sons ! — orig: menu.cpp:46-48 (music_menu / music_jogo live in g)
let sombot = 0, sombot2 = 0, acess = 0;

/** True while the name-entry screen runs (Task 14 focuses the hidden #texto input for the OS keyboard). */
export const textoAtivo = { v: false };

// orig: menu.cpp:165 etc. int balpha[12] = {0,...} — one { v } ref per button (XDesenhaBotao's int &alpha)
const novoBalpha = (): { v: number }[] => Array.from({ length: 12 }, () => ({ v: 0 }));

// orig: menu.cpp:52 menu_carrega
export function menu_carrega(): void {
  //main e leftmenu
  cursor = C2D2_CarregaSpriteSet('./dados/menu/cursor.png', 40, 40);
  fundo = C2D2_CarregaSpriteSet('./dados/menu/fundo.jpg', 0, 0);
  cover = C2D2_CarregaSpriteSet('./dados/menu/cover.png', 0, 0);
  darkback = C2D2_CarregaSpriteSet('./dados/menu/darkback.png', 0, 0);

  botmain = C2D2_CarregaSpriteSet('./dados/menu/botmain.png', 262, 62);
  botback = C2D2_CarregaSpriteSet('./dados/menu/botback.png', 65, 445);
  menutxt = C2D2_CarregaSpriteSet('./dados/menu/menutxt.png', 0, 0);

  otherbots = C2D2_CarregaSpriteSet('./dados/menu/otherbots.png', 220, 35);

  //slots select
  botdelslot = C2D2_CarregaSpriteSet('./dados/menu/botdelslot.png', 62, 62);
  slotloadcover = C2D2_CarregaSpriteSet('./dados/menu/slotloadcover.png', 0, 0);
  slotinsertcover = C2D2_CarregaSpriteSet('./dados/menu/slotinsertcover.png', 0, 0);
  slotback = C2D2_CarregaSpriteSet('./dados/menu/slotback.png', 0, 0);

  // planetas
  sprite_planetas = C2D2_CarregaSpriteSet('./dados/menu/logo.png', 128, 128);
  selectbox = C2D2_CarregaSpriteSet('./dados/menu/select.png', 180, 180);
  botplanetas = C2D2_CarregaSpriteSet('./dados/menu/botplanetas.png', 110, 70);
  redback = C2D2_CarregaSpriteSet('./dados/menu/red.png', 0, 0);

  //opcoes
  spvolume = C2D2_CarregaSpriteSet('./dados/menu/volume.png', 65, 190);
  spoptionscover = C2D2_CarregaSpriteSet('./dados/menu/optionscover.png', 0, 0);

  //about
  spabout1 = C2D2_CarregaSpriteSet('./dados/menu/about1.png', 0, 0);
  spabout2 = C2D2_CarregaSpriteSet('./dados/menu/about2.png', 0, 0);

  //recordes
  trofeus = C2D2_CarregaSpriteSet('./dados/menu/trofeus.png', 50, 50);
  recordstab = C2D2_CarregaSpriteSet('./dados/menu/recordstab.png', 486, 52);

  //fontes
  fonte = C2D2_CarregaFonte('./dados/menu/512.png', 32);
  //sons loading
  sombot = CA2_CarregaEfeito('./dados/sons/click.ogg');
  sombot2 = CA2_CarregaEfeito('./dados/sons/zoop.ogg');
  acess = CA2_CarregaEfeito('./dados/sons/acess.wav');
  g.music_jogo = CA2_CarregaMusica('./dados/sons/progression_sasquamox.ogg');
  g.music_menu = CA2_CarregaMusica('./dados/sons/recharge_alvys18.ogg');

  // web (D10): volumes persist across sessions — restore them before the music starts
  opcoes_carrega();
  CA2_AjustaVolume(g.volume_music, g.volume_effects);

  //toca !
  CA2_TocaMusica(g.music_menu, -1);
}

// orig: menu.cpp:105 menu_fundo
export function menu_fundo(): void {
  if (yfundo1 >= 0) {
    yfundo1 = -600;
  }
  if (yfundo2 >= 600) {
    yfundo2 = 0;
  }
  yfundo1 += 1;
  yfundo2 += 1;

  if (redAlpha > 0)
    redAlpha -= 5;

  C2D2_DesenhaSprite(fundo, 0, 0, Math.trunc(yfundo1));
  C2D2_DesenhaSprite(fundo, 0, 0, Math.trunc(yfundo2));
  if (redAlpha) XDesenhaSprite(redback, 0, 0, 0, 800, 600, redAlpha);
}

// orig: menu.cpp:124 menu_aux
export function menu_aux(): void {
  const teclado = C2D2_PegaTeclas();
  const mouse = C2D2_PegaMouse();

  //sai com esc
  if (teclado[K.ESC].pressionado) {
    if (g.estado_atual === TELA_MAIN) g.estado_atual = SAIR;
    else g.estado_atual = TELA_MAIN;
  }

  //para efeitos de fade
  if (!g.fadecontrol && g.fadealpha > 0)
    g.fadealpha -= 25;
  else if (g.fadecontrol) {
    if (g.fadealpha < 250)
      g.fadealpha += 25;
    else {
      g.encerra = 1;
      g.fadecontrol = false;
    }
  }
  if (g.fadealpha > 0) {
    XDesenhaSprite(fundo, 0, 0, Math.trunc(yfundo1), 800, 600, g.fadealpha);
    XDesenhaSprite(fundo, 0, 0, Math.trunc(yfundo2), 800, 600, g.fadealpha);
  }

  C2D2_DesenhaSprite(cover, 0, 0, 0);

  C2D2_DesenhaSprite(cursor, 0, mouse.x, mouse.y);
}

// orig: menu.cpp:162 menu_main
export function* menu_main(): Tela {
  const balpha = novoBalpha();

  while (!g.encerra) {
    if (g.estado_atual !== TELA_MAIN)
      g.fadecontrol = true;

    C2D2_LimpaTela();
    menu_fundo();

    if (XDesenhaBotao(botmain, 0, 262, 162, cursor, balpha[1]) === 1) {
      CA2_TocaEfeito(sombot, 0);
      g.estado_atual = TELA_SLOT_SELECT;
    }
    if (XDesenhaBotao(botmain, 0, 262, 226, cursor, balpha[2]) === 1) {
      CA2_TocaEfeito(sombot, 0);
      g.estado_atual = TELA_OPCOES;
    }
    if (XDesenhaBotao(botmain, 0, 262, 288, cursor, balpha[3]) === 1) {
      CA2_TocaEfeito(sombot, 0);
      g.estado_atual = TELA_RANKING;
    }
    if (XDesenhaBotao(botmain, 0, 262, 350, cursor, balpha[4]) === 1) {
      CA2_TocaEfeito(sombot, 0);
      g.estado_atual = TELA_ABOUT;
    }

    if (XDesenhaBotao(botmain, 0, 262, 412, cursor, balpha[5]) === 1)
      g.estado_atual = SAIR;

    C2D2_DesenhaSprite(menutxt, 0, 0, 0);

    //esse é o menu da esquerda
    menu_aux();

    C2D2_Sincroniza();
    yield;
  }
}

// orig: menu.cpp:212 menu_mission
export function* menu_mission(): Tela {
  const teclado = C2D2_PegaTeclas();

  let min = 0, max = g.planeta_max;

  let i = 0;

  // vetor com alpha de cada botão usado pela XDesenhaBotao
  const balpha = novoBalpha();

  //vetor de planetas (orig: malloc'd, never freed — here garbage-collected)
  const planetas: Planeta[] = [];

  let spontos: string;
  let snome: string;

  // inicia a posição central dos planetas
  for (i = 0; i < g.planeta_max; i++)
    planetas.push({ x: 400, y: 300, tamanho: 2, alpha: 0 });

  while (!g.encerra) {
    if (g.estado_atual !== TELA_MISSION)
      g.fadecontrol = true;

    snome = `Welcome ${g.saveAtual.nome} !`;
    spontos = `Pts: ${g.saveAtual.pts}`;

    // logica pra desenhar só 3 planetas pra cada lado
    if ((g.saveAtual.planeta_atual + 4) >= g.planeta_max) max = g.planeta_max;
    else max = g.saveAtual.planeta_atual + 5; // quatro por causa do "<" e não "<="
    if ((g.saveAtual.planeta_atual - 3) < 0) min = 0;
    else min = g.saveAtual.planeta_atual - 2;

    planetas_atualiza(planetas, g.saveAtual.planeta_atual, g.planeta_max);

    C2D2_LimpaTela();
    menu_fundo();

    if (XDesenhaBotao(selectbox, 0, 310, 210, cursor, balpha[3]) === 1 || teclado[K.ESPACO].pressionado) {
      if (g.saveAtual.planeta_atual <= g.saveAtual.planeta_liberado) {
        CA2_TocaEfeito(sombot, 0);
        g.estado_atual = TELA_JOGO;
      } else {
        CA2_TocaEfeito(acess, 0);
        redAlpha = 210;
      }
    }

    //desenha planetas
    for (i = min; i < max; i++) {
      if (i <= g.saveAtual.planeta_liberado) {
        XDesenhaSprite(sprite_planetas, i, planetas[i].x, planetas[i].y, planetas[i].tamanho, planetas[i].tamanho, planetas[i].alpha);
      } else {
        XDesenhaSprite(sprite_planetas, 8, planetas[i].x, planetas[i].y, planetas[i].tamanho, planetas[i].tamanho, planetas[i].alpha);
      }
    }

    if (XDesenhaBotao(botback, 0, 8, 94, cursor, balpha[0]) === 1) {
      CA2_TocaEfeito(sombot, 0);
      g.estado_atual = TELA_MAIN;
    }

    if (((XDesenhaBotao(botplanetas, 0, 255, 450, cursor, balpha[1]) === 1) || teclado[K.ESQUERDA].pressionado) && g.saveAtual.planeta_atual > 0) {
      CA2_TocaEfeito(sombot2, 0);
      g.saveAtual.planeta_atual--;
    }

    if (((XDesenhaBotao(botplanetas, 2, 450, 450, cursor, balpha[2]) === 1) || teclado[K.DIREITA].pressionado) && g.saveAtual.planeta_atual < max - 1) {
      CA2_TocaEfeito(sombot2, 0);
      g.saveAtual.planeta_atual++;
    }

    C2D2_DesenhaTexto(fonte, 100, 100, snome, C2D2_TEXTO_ESQUERDA);
    C2D2_DesenhaTexto(fonte, 780, 100, spontos, C2D2_TEXTO_DIREITA);

    menu_aux();

    C2D2_Sincroniza();
    yield;
  }
}

// orig: menu.cpp:332 menu_ranking
export function* menu_ranking(): Tela {
  // vetor com alpha de cada botão usado pela XDesenhaBotao
  const balpha = novoBalpha();

  //aplica default — orig: menu.cpp:344-350 reads recs.x85 once on entry (defaults if missing: storage.carrega)
  const vetrecs = recordes();
  //para imprimir na tela
  const pontos: string[] = new Array<string>(7);

  while (!g.encerra) {
    if (g.estado_atual !== TELA_RANKING)
      g.fadecontrol = true;

    C2D2_LimpaTela();
    menu_fundo();
    C2D2_DesenhaSprite(darkback, 0, 0, 0);

    if (XDesenhaBotao(botback, 0, 8, 94, cursor, balpha[0]) === 1) {
      CA2_TocaEfeito(sombot, 0);
      g.estado_atual = TELA_MAIN;
    }

    //tabs:
    C2D2_DesenhaSprite(recordstab, 0, 200, 115);
    C2D2_DesenhaSprite(recordstab, 1, 200, 165);
    C2D2_DesenhaSprite(recordstab, 1, 200, 215);
    C2D2_DesenhaSprite(recordstab, 1, 200, 265);
    C2D2_DesenhaSprite(recordstab, 2, 200, 315);
    C2D2_DesenhaSprite(recordstab, 2, 200, 365);
    C2D2_DesenhaSprite(recordstab, 2, 200, 415);
    C2D2_DesenhaSprite(recordstab, 2, 200, 465);
    //trofeus:
    C2D2_DesenhaSprite(trofeus, 0, 190, 166);
    C2D2_DesenhaSprite(trofeus, 1, 190, 216);
    C2D2_DesenhaSprite(trofeus, 2, 190, 266);

    //LABELS
    for (let i = 0; i < 7; i++)
      pontos[i] = `${vetrecs[i].pts}`; // sprintf("%d")
    for (let i = 0; i < 7; i++) {
      C2D2_DesenhaTexto(fonte, 255, 175 + (50 * i), vetrecs[i].nome, C2D2_TEXTO_ESQUERDA);
      C2D2_DesenhaTexto(fonte, 640, 175 + (50 * i), pontos[i], C2D2_TEXTO_DIREITA);
    }
    //esse é o menu da esquerda
    menu_aux();

    C2D2_Sincroniza();
    yield;
  }
}

// orig: menu.cpp:399 menu_about
export function* menu_about(): Tela {
  // vetor com alpha de cada botão usado pela XDesenhaBotao
  const balpha = novoBalpha();
  let about_alpha = 0;
  let about_alpha_inc = true;

  while (!g.encerra) {
    if (g.estado_atual !== TELA_ABOUT)
      g.fadecontrol = true;

    if (about_alpha_inc) {
      if (about_alpha < 255) about_alpha += 5;
      else about_alpha_inc = false;
    } else {
      if (about_alpha > 1) about_alpha -= 5;
      else about_alpha_inc = true;
    }

    C2D2_LimpaTela();
    menu_fundo();
    C2D2_DesenhaSprite(darkback, 0, 0, 0);

    if (XDesenhaBotao(botback, 0, 8, 94, cursor, balpha[0]) === 1) {
      CA2_TocaEfeito(sombot, 0);
      g.estado_atual = TELA_MAIN;
    }

    C2D2_DesenhaSprite(spabout1, 0, 200, 100);
    XDesenhaSprite(spabout2, 0, 200, 100, 0, 0, about_alpha);

    //esse é o menu da esquerda
    menu_aux();

    C2D2_Sincroniza();
    yield;
  }
}

// orig: menu.cpp:443 menu_opcoes
export function* menu_opcoes(): Tela {
  const mouse = C2D2_PegaMouse();

  const balpha = novoBalpha();
  //controle do volume
  let tempvolume: number;
  const ymusic = { v: 422 - Math.trunc((g.volume_music * 172) / 100) };
  const yeffects = { v: 422 - Math.trunc((g.volume_effects * 172) / 100) };
  // web (D10): last persisted volumes, so storage is written only when a value changes
  let gravMusic = g.volume_music, gravEffects = g.volume_effects;

  while (!g.encerra) {
    if (g.estado_atual !== TELA_OPCOES)
      g.fadecontrol = true;

    C2D2_LimpaTela();
    menu_fundo();

    C2D2_DesenhaSprite(darkback, 0, 0, 0);
    C2D2_DesenhaSprite(spoptionscover, 0, 0, 0);

    if (XDesenhaBotao(botback, 0, 8, 94, cursor, balpha[0]) === 1) {
      CA2_TocaEfeito(sombot, 0);
      g.estado_atual = TELA_MAIN;
    }

    //módulo do volume da musica
    C2D2_DesenhaSprite(spvolume, 0, 230, 240);
    XDesenhaSprite(spvolume, 1, 230, 430, 65, (ymusic.v - 430) - 1, 255);
    if (XDesenhaBotao(spvolume, 2, 230, ymusic.v - 95, cursor, balpha[1]) === 2)
      g.volume_music = atualiza_barra(ymusic, 422, 250, mouse);

    //módulo do volume do efeito
    C2D2_DesenhaSprite(spvolume, 0, 320, 240);
    XDesenhaSprite(spvolume, 1, 320, 430, 65, (yeffects.v - 430) - 1, 255);
    if (XDesenhaBotao(spvolume, 2, 320, yeffects.v - 95, cursor, balpha[2]) === 2) {
      tempvolume = atualiza_barra(yeffects, 422, 250, mouse);
      if (g.volume_effects !== tempvolume)
        CA2_TocaEfeito(sombot2, 0);
      g.volume_effects = tempvolume;
    }

    //mute
    if (XDesenhaBotao(otherbots, 0, 440, 230, cursor, balpha[3]) === 1) {
      g.volume_music = 0;
      g.volume_effects = 0;
      ymusic.v = 422 - Math.trunc((g.volume_music * 172) / 100);
      yeffects.v = 422 - Math.trunc((g.volume_effects * 172) / 100);
    }

    // orig: menu.cpp:499-511 fullscreen / reset buttons are commented out

    //clear records
    if (XDesenhaBotao(otherbots, 0, 440, 270, cursor, balpha[6]) === 1)
      menu_recordes_default();
    //clear records (sic: clear saves)
    if (XDesenhaBotao(otherbots, 0, 440, 310, cursor, balpha[7]) === 1)
      menu_saves_default();

    C2D2_DesenhaTexto(fonte, 550, 232, 'mute', C2D2_TEXTO_CENTRALIZADO);
    C2D2_DesenhaTexto(fonte, 550, 272, 'clear records', C2D2_TEXTO_CENTRALIZADO);
    C2D2_DesenhaTexto(fonte, 550, 312, 'clear saves', C2D2_TEXTO_CENTRALIZADO);

    //esse é o menu da esquerda
    menu_aux();

    CA2_AjustaVolume(g.volume_music, g.volume_effects);
    if (g.volume_music !== gravMusic || g.volume_effects !== gravEffects) { // web (D10)
      opcoes_grava();
      gravMusic = g.volume_music; gravEffects = g.volume_effects;
    }
    C2D2_Sincroniza();
    yield;
  }
}

// orig: menu.cpp:534 menu_slot_select
export function* menu_slot_select(): Tela {
  const balpha = novoBalpha();

  // orig: menu.cpp:541-548 — reads saves.x85 once on entry (defaults if missing: storage.carrega)
  let vetsaves = menu_saves_carregavetor();

  while (!g.encerra) {
    if (g.estado_atual !== TELA_SLOT_SELECT)
      g.fadecontrol = true;

    C2D2_LimpaTela();
    menu_fundo();

    C2D2_DesenhaSprite(darkback, 0, 0, 0);
    C2D2_DesenhaSprite(slotback, 0, 0, 0);
    C2D2_DesenhaSprite(slotloadcover, 0, 0, 0);

    if (XDesenhaBotao(botback, 0, 8, 94, cursor, balpha[0]) === 1) {
      CA2_TocaEfeito(sombot, 0);
      g.estado_atual = TELA_MAIN;
    }

    if (XDesenhaBotao(botmain, 0, 262, 226, cursor, balpha[1]) === 1) {
      //continue
      if (!vetsaves[0].empty) {
        g.slotAtual = 0;
        menu_saves_loadslot(0);
        g.estado_atual = TELA_MISSION;
      } else {
        g.slotAtual = 0;
        g.estado_atual = TELA_SLOT_INSERT;
      }
    }
    if (XDesenhaBotao(botmain, 0, 262, 288, cursor, balpha[2]) === 1) {
      //continue
      if (!vetsaves[1].empty) {
        g.slotAtual = 1;
        menu_saves_loadslot(1);
        g.estado_atual = TELA_MISSION;
      } else {
        g.slotAtual = 1;
        g.estado_atual = TELA_SLOT_INSERT;
      }
    }
    if (XDesenhaBotao(botmain, 0, 262, 350, cursor, balpha[3]) === 1) {
      //continue
      if (!vetsaves[2].empty) {
        g.slotAtual = 2;
        menu_saves_loadslot(2);
        g.estado_atual = TELA_MISSION;
      } else {
        g.slotAtual = 2;
        g.estado_atual = TELA_SLOT_INSERT;
      }
    }

    //delbots
    if (!vetsaves[0].empty && XDesenhaBotao(botdelslot, 0, 515, 226, cursor, balpha[4]) === 1) {
      menu_saves_edit(0, 'new', EASY, true);
      vetsaves = menu_saves_carregavetor();
    }

    if (!vetsaves[1].empty && XDesenhaBotao(botdelslot, 0, 515, 288, cursor, balpha[5]) === 1) {
      menu_saves_edit(1, 'new', EASY, true);
      vetsaves = menu_saves_carregavetor();
    }

    if (!vetsaves[2].empty && XDesenhaBotao(botdelslot, 0, 515, 350, cursor, balpha[6]) === 1) {
      menu_saves_edit(2, 'new', EASY, true);
      vetsaves = menu_saves_carregavetor();
    }

    for (let i = 0; i < 3; i++)
      C2D2_DesenhaTexto(fonte, 390, 238 + (62 * i), vetsaves[i].nome, C2D2_TEXTO_CENTRALIZADO);

    menu_aux();

    C2D2_Sincroniza();
    yield;
  }
}

// orig: menu.cpp:664-690 — the if/else-if chain order: A..V, X, Y, W, Z, Space (one char per frame, first match)
const TECLAS_NOME: [K, string][] = [
  ...Array.from({ length: 22 }, (_, i): [K, string] => [K.A + i, String.fromCharCode(0x61 + i)]), // A..V → 'a'..'v'
  [K.X, 'x'], [K.Y, 'y'], [K.W, 'w'], [K.Z, 'z'], [K.ESPACO, ' '],
];
const MAX_NOME = 12;                 // orig: menu.cpp:662 if(indxnome<12)
// web: OS keyboard (#texto) chars — lowercased, then only the original alphabet [a-z ] is kept (Ruling R15)
const DIGITAVEL = /^[a-z ]$/;

// orig: menu.cpp:646 menu_slot_insert
export function* menu_slot_insert(): Tela {
  const balpha = novoBalpha();

  const teclado = C2D2_PegaTeclas();

  let pisca = 0;
  let indxnome = 0;
  let nome = '';     // orig: char nome[15] — always NUL-terminated at indxnome, so a string of length indxnome
  let nometemp = '';

  textoAtivo.v = true;
  try {
    while (!g.encerra) {
      if (g.estado_atual !== TELA_SLOT_INSERT)
        g.fadecontrol = true;

      const digitados = C2D2_PegaDigitados();
      if (digitados.length > 0) {
        // web: characters from the OS keyboard. When any arrive this frame the key chain is skipped, so a
        // physical key that produced both a keydown and an input character is counted once.
        for (const s of digitados) for (const ch of s) {
          const c = ch.toLowerCase();
          if (indxnome < MAX_NOME && DIGITAVEL.test(c)) { nome += c; indxnome++; }
        }
      } else if (indxnome < MAX_NOME) {
        for (const [k, c] of TECLAS_NOME) {
          if (teclado[k].pressionado) { nome += c; indxnome++; break; }
        }
      }

      if (teclado[K.BACKSPACE].pressionado && indxnome > 0)
        nome = nome.slice(0, --indxnome);

      nometemp = `${nome}|`;

      /*-------------------------- DESEHO --------------------------*/

      C2D2_LimpaTela();
      menu_fundo();

      C2D2_DesenhaSprite(darkback, 0, 0, 0);
      C2D2_DesenhaSprite(slotback, 0, 0, 0);
      C2D2_DesenhaSprite(slotinsertcover, 0, 0, 0);

      if (XDesenhaBotao(botback, 0, 8, 94, cursor, balpha[0]) === 1) {
        CA2_TocaEfeito(sombot, 0);
        g.estado_atual = TELA_SLOT_SELECT;
      }

      // orig: menu.cpp:717-772 — four identical blocks: (y, level, balpha index)
      for (const [y, level, b] of [[280, EASY, 1], [320, NORMAL, 2], [360, HARD, 3], [400, GODMODE, 4]] as const) {
        if (XDesenhaBotao(otherbots, 0, 275, y, cursor, balpha[b]) === 1) {
          if (nome !== '') {
            menu_saves_edit(g.slotAtual, nome, level, false);
            menu_saves_loadslot(g.slotAtual);
            g.estado_atual = TELA_MISSION;
          } else {
            redAlpha = 220;
            CA2_TocaEfeito(acess, 0);
          }
        }
      }

      //labels
      C2D2_DesenhaTexto(fonte, 380, 282, 'Easy', C2D2_TEXTO_CENTRALIZADO);
      C2D2_DesenhaTexto(fonte, 380, 322, 'Normal', C2D2_TEXTO_CENTRALIZADO);
      C2D2_DesenhaTexto(fonte, 380, 362, 'Hard', C2D2_TEXTO_CENTRALIZADO);
      C2D2_DesenhaTexto(fonte, 380, 402, 'GOD MODE', C2D2_TEXTO_CENTRALIZADO);

      C2D2_DesenhaTexto(fonte, 300, 205, nome, C2D2_TEXTO_ESQUERDA);
      if (pisca++ <= 30) C2D2_DesenhaTexto(fonte, 300, 205, nometemp, C2D2_TEXTO_ESQUERDA);
      else if (pisca >= 60) pisca = 0;

      menu_aux();
      C2D2_Sincroniza();
      yield;
    }
  } finally {
    textoAtivo.v = false;
  }
}
