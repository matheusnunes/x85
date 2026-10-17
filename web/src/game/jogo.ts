// Game screen. orig: X85-devcore 2/jogo.cpp (all)
// The blocking loops `while(...) { ...; C2D2_Sincroniza(); }` are generators that yield once per frame
// (the caller polls input before every gen.next(), like C2D2_Sincroniza polls after the swap).
// Intentional behaviour changes (web/FIXES.md): F11, F12, F13, F14, F15 — each marked `// F<n>` below.
import {
  C2D2_CarregaSpriteSet, C2D2_CarregaFonte, C2D2_DesenhaSprite, C2D2_DesenhaTexto, C2D2_LimpaTela, C2D2_Sincroniza,
  C2D2_PegaTeclas, C2D2_PegaMouse, C2D2_TEXTO_ESQUERDA, C2D2_MESQUERDO, C2D2P_Pontos, K,
  CA2_CarregaEfeito, CA2_TocaEfeitoTela,
  C2D2M_CarregaMapaMappy, C2D2M_VelocidadeCamadaMapa, C2D2M_CamadaMarcas, C2D2M_PosicionaMapa,
  C2D2M_PrimeiroBlocoMarca, C2D2M_INICIO, C2D2M_FIM,
} from '../engine/c2d2';
import { g, XDesenhaSprite, menu_saves_saveslot, menu_saves_loadslot, menu_recordes_insere } from './funcoes_M';
import {
  jogo_atualiza_fundo, jogo_cria_estrela, jogo_atualiza_estrela, jogo_atualiza_jogador, jogo_inicia_jogador,
  jogo_cria_tiro, jogo_atualiza_tiro, jogo_atualiza_barras, jogo_procura_marca, jogo_atualiza_marca,
  jogo_testa_colisao, jogo_atualiza_explosao,
} from './funcoes_J';
import {
  TELA_JOGO, TELA_MISSION, MAXTIROS, MAXMARCAS, MAXSTARS, MAXEXPLOS, INVALIDO, X85, INVUNERAVEL,
  TIRO1, TIRO2, TIRO3, TIRO4, TIRO5, TIRO6, BOMBA1, TIROINI1, TIROINI2, TIROINI3,
  INIMIGO1, INIMIGO2, INIMIGO3, INIMIGO4, METEORO, BOSS1, BOSS2, BOSS3, BOSS4, BOSS5, T1, T2, T3, T4, T5, T6,
  M_INIMIGO1, M_INIMIGO2, M_INIMIGO3, M_INIMIGO4, M_METEORO, M_BOSS, M_T1, M_T2, M_T3, M_T4, M_T5, M_T6,
} from './constantes';
import { novoNave, novoTiro, novaMarca, novaExplo, novaFase, type Nave, type Tiro, type Marca, type Explo } from './tipos';

//coisas do load — orig: jogo.cpp:5-6
let loading = 0;
let ready = 0;

//fundos — orig: jogo.cpp:9
let spFundo = 0;
//Fase — orig: jogo.cpp:11 (global, zeroed; yinicio survives between plays)
export const fase = novaFase();
//nave e sprites em geral — orig: jogo.cpp:13-15
let spX85 = 0;
let spFlame = 0;
let spExplo = 0;
//vetor de sprites tiros — orig: jogo.cpp:17-18
const spTiro: number[] = new Array(30).fill(0);
const spMarca: number[] = new Array(40).fill(0);

//interface e cia ( barras e frescuras ) — orig: jogo.cpp:21-24
let barras_energy = 0;
let barras_bomba = 0;
let barras_back = 0;
let barra_informacao = 0;

//fonte — orig: jogo.cpp:27
let fontejogo = 0;

//vetor de sons de tiros e bombas — orig: jogo.cpp:30-31 (unloaded slots stay 0: TIRO3..TIRO6 are silent)
const somTiro: number[] = new Array(10).fill(0);
let somExplo = 0;

/** The locals of a running jogo_tela() (pointers/refs in C), exposed read-only for tests and window.__x85. */
export interface Partida {
  jogador: Nave;
  tiros: Tiro[];
  marcas: Marca[];
  explos: Explo[];
  /** orig: Marca *Boss — index into marcas, or -1 for the C NULL (F14) */
  Boss: number;
  temp_pts: { v: number };
  altura_energia: { v: number };
  informacao: number;
  contadorfinal: number;
  /** web: game frames run so far (0 until the frame that dismissed "ready" ends) */
  quadro: number;
}

/**
 * Current/last game (null from the start of jogo_tela() until "ready" is dismissed). `rodando` is true only while
 * the gameplay loop proper runs (not on the loading/ready screen, not during the fades around it).
 */
export const jogoAtual: { p: Partida | null; carregando: boolean; rodando: boolean } = { p: null, carregando: false, rodando: false };

/** Web addition (touch UI): the gameplay loop proper is running — Esc (⏸ on touch) only means something then. */
export function emPartida(): boolean { return jogoAtual.rodando && g.estado_atual === TELA_JOGO; }

// orig: jogo.cpp:36 jogo_carrega
// F12: the ready screen is cleared and redrawn (loading + ready) every frame instead of drawing ready once onto
// the back buffer and swapping forever (which flickered on page-flip drivers, jogo.cpp:116-123).
export function* jogo_carrega(): Generator<void, void, void> {
  //pega teclado para sair com espaço
  const teclado = C2D2_PegaTeclas();
  const mouse = C2D2_PegaMouse();
  jogoAtual.carregando = true;

  loading = C2D2_CarregaSpriteSet('./dados/jogo/loading.jpg', 0, 0);
  ready = C2D2_CarregaSpriteSet('./dados/jogo/ready.png', 0, 0);
  C2D2_LimpaTela();
  C2D2_DesenhaSprite(loading, 0, 0, 0);
  C2D2_Sincroniza();
  yield;

  switch (g.saveAtual.planeta_atual) {
    case 0: fase.mapa = C2D2M_CarregaMapaMappy('dados/jogo/mapas/fase1.fmp', 'dados/jogo/mapas/tileset.png'); break;
    case 1: fase.mapa = C2D2M_CarregaMapaMappy('dados/jogo/mapas/fase2.fmp', 'dados/jogo/mapas/tileset.png'); break;
    case 2: fase.mapa = C2D2M_CarregaMapaMappy('dados/jogo/mapas/fase3.fmp', 'dados/jogo/mapas/tileset.png'); break;
    case 3: fase.mapa = C2D2M_CarregaMapaMappy('dados/jogo/mapas/fase4.fmp', 'dados/jogo/mapas/tileset.png'); break;
    case 4: fase.mapa = C2D2M_CarregaMapaMappy('dados/jogo/mapas/fase5.fmp', 'dados/jogo/mapas/tileset.png'); break;
    case 5: fase.mapa = C2D2M_CarregaMapaMappy('dados/jogo/mapas/fase6.fmp', 'dados/jogo/mapas/tileset.png'); break;
    case 6: fase.mapa = C2D2M_CarregaMapaMappy('dados/jogo/mapas/fase7.fmp', 'dados/jogo/mapas/tileset.png'); break;
    case 7: fase.mapa = C2D2M_CarregaMapaMappy('dados/jogo/mapas/fase8.fmp', 'dados/jogo/mapas/tileset.png'); break;
  }

  spFundo = C2D2_CarregaSpriteSet('./dados/jogo/fundo1.jpg', 0, 0);
  spX85 = C2D2_CarregaSpriteSet('./dados/jogo/nave.png', 60, 60);
  spFlame = C2D2_CarregaSpriteSet('./dados/jogo/flame.png', 40, 40);
  spExplo = C2D2_CarregaSpriteSet('./dados/jogo/explo.png', 0, 0);

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

  //  spMarca[ENERGIA] / spMarca[ESCUDO] — commented out in the original (jogo.cpp:86-87)
  spMarca[T1] = C2D2_CarregaSpriteSet('./dados/jogo/itens/T1.png', 0, 0);
  spMarca[T2] = C2D2_CarregaSpriteSet('./dados/jogo/itens/T2.png', 0, 0);
  spMarca[T3] = C2D2_CarregaSpriteSet('./dados/jogo/itens/T3.png', 0, 0);
  spMarca[T4] = C2D2_CarregaSpriteSet('./dados/jogo/itens/T4.png', 0, 0);
  spMarca[T5] = C2D2_CarregaSpriteSet('./dados/jogo/itens/T5.png', 0, 0);
  spMarca[T6] = C2D2_CarregaSpriteSet('./dados/jogo/itens/T6.png', 0, 0);

  barras_energy = C2D2_CarregaSpriteSet('./dados/jogo/barras_energy.png', 0, 0);
  barras_bomba = C2D2_CarregaSpriteSet('./dados/jogo/barras_bomba.png', 0, 0);
  barras_back = C2D2_CarregaSpriteSet('./dados/jogo/barras_back.png', 0, 0);
  barra_informacao = C2D2_CarregaSpriteSet('./dados/jogo/barra_inf.png', 0, 0);

  //fonte
  fontejogo = C2D2_CarregaFonte('./dados/menu/512.png', 32);

  /*---------------- EFEITOS E MUSICAS -------------------------------------------------*/

  somExplo = CA2_CarregaEfeito('./dados/sons/explo.wav');
  somTiro[TIRO1] = CA2_CarregaEfeito('./dados/sons/tiro1.wav');
  somTiro[TIRO2] = CA2_CarregaEfeito('./dados/sons/tiro2.wav');
  //	somTiro[TIRO4] / somTiro[TIRO6] — commented out in the original (jogo.cpp:110-111)
  somTiro[BOMBA1] = CA2_CarregaEfeito('./dados/sons/bomba.wav');

  // põe o "espaço para continuar" — F12: loading + ready redrawn every frame
  // (web: a click/tap also dismisses it, for touch devices; the original read Space only)
  while (true) {
    if (teclado[K.ESPACO].pressionado || mouse.botoes[C2D2_MESQUERDO].pressionado) break;
    C2D2_LimpaTela();
    C2D2_DesenhaSprite(loading, 0, 0, 0);
    C2D2_DesenhaSprite(ready, 0, 180, 440);
    C2D2_Sincroniza();
    yield;
  }
  jogoAtual.carregando = false;
}

// orig: jogo.cpp:230-234 troca tiros (LAlt) — previous unlocked weapon, wrapping 1 → 6.
// F11: the original `do { if (tiro_atual-- < 1) tiro_atual = 6; } while (!tiro_liberado[tiro_atual-1]);` reads
// tiro_liberado[-1] on its way from 1 to 6 (the last byte of planeta_atual, always 0). Same results without that
// read; bounded to 6 steps so a slot with nothing unlocked (impossible in practice) cannot hang.
export function jogo_troca_tiro(jogador: Nave): void {
  const atual = jogador.tiro_atual;
  for (let i = 0; i < 6; i++) {
    jogador.tiro_atual--;
    if (jogador.tiro_atual < 1) jogador.tiro_atual = 6;
    if (g.saveAtual.tiro_liberado[jogador.tiro_atual - 1]) return;
  }
  jogador.tiro_atual = atual;
}

// orig: jogo.cpp:278 sprintf(spontos, "pts: %09i", n)
function formataPontos(n: number): string {
  const v = n | 0;
  return v < 0 ? 'pts: -' + String(-v).padStart(8, '0') : 'pts: ' + String(v).padStart(9, '0');
}

// orig: jogo.cpp:126 jogo_tela — returns 0 like the C int
export function* jogo_tela(): Generator<void, number, void> {
  const yfundo1 = { v: 0 };   // float
  const yfundo2 = { v: 0 };   // float

  let quadroFlame = 24;

  const altura_energia = { v: 0 };
  const contadormarcas = { v: 0 };

  //variaveis para saveAtual.pts
  let spontos = '';
  const temp_pts = { v: 0 };

  jogoAtual.p = null;
  jogoAtual.rodando = false;
  yield* jogo_carrega();

  const teclado = C2D2_PegaTeclas();
  const mouse = C2D2_PegaMouse();

  //mapa & marcas
  C2D2M_VelocidadeCamadaMapa(fase.mapa, 0, 1);
  C2D2M_CamadaMarcas(fase.mapa, 0, 1);
  C2D2M_PosicionaMapa(fase.mapa, 0, fase.yinicio);
  const ini = C2D2M_PrimeiroBlocoMarca(fase.mapa, C2D2M_INICIO); // a failed search leaves the stale values
  if (ini) { fase.xinicio = ini.x; fase.yinicio = ini.y; }
  const fim = C2D2M_PrimeiroBlocoMarca(fase.mapa, C2D2M_FIM);
  if (fim) { fase.xfinal = fim.x; fase.yfinal = fim.y; }
  fase.ymapa = fase.yinicio;

  //Declaracao de Personagens , itens e tiros (memset INVALIDO = 0)
  const jogador = novoNave();
  const tiros: Tiro[] = Array.from({ length: MAXTIROS }, novoTiro);
  const marcas: Marca[] = Array.from({ length: MAXMARCAS }, novaMarca);
  const explos: Explo[] = Array.from({ length: MAXEXPLOS }, novaExplo);
  let Boss = -1; // orig: Marca *Boss = 0

  //inicia jogador, marcas e tiros
  jogo_inicia_jogador(jogador);
  jogador.sprite = spX85;

  jogo_procura_marca(fase.mapa, M_INIMIGO1, marcas, contadormarcas);
  jogo_procura_marca(fase.mapa, M_INIMIGO2, marcas, contadormarcas);
  jogo_procura_marca(fase.mapa, M_INIMIGO3, marcas, contadormarcas);
  jogo_procura_marca(fase.mapa, M_INIMIGO4, marcas, contadormarcas);
  jogo_procura_marca(fase.mapa, M_METEORO, marcas, contadormarcas);
  jogo_procura_marca(fase.mapa, M_BOSS, marcas, contadormarcas);
  jogo_procura_marca(fase.mapa, M_T1, marcas, contadormarcas); // não tem nenhuma no mapa, mas se não por da pau no T6
  jogo_procura_marca(fase.mapa, M_T2, marcas, contadormarcas);
  jogo_procura_marca(fase.mapa, M_T3, marcas, contadormarcas);
  jogo_procura_marca(fase.mapa, M_T4, marcas, contadormarcas);
  jogo_procura_marca(fase.mapa, M_T5, marcas, contadormarcas);
  jogo_procura_marca(fase.mapa, M_T6, marcas, contadormarcas);
  for (let i = 0; i < MAXMARCAS; i++)
    if (marcas[i].tipo >= BOSS1 && marcas[i].tipo <= BOSS5) {
      Boss = i;
      break;
    }

  const estrelas = new Int32Array(2 * MAXSTARS); // C2D2P_Ponto estrelas[MAXSTARS]
  jogo_cria_estrela(estrelas, MAXSTARS);

  const p: Partida = { jogador, tiros, marcas, explos, Boss, temp_pts, altura_energia, informacao: -1, contadorfinal: 0, quadro: 0 };
  jogoAtual.p = p;

  // F13: the press that dismissed "ready" is consumed: it does not fire (the original fired one shot on the first
  // frame because Space.pressionado was still set, jogo.cpp:121) — nor while that same press stays held.
  let segura_espaco = teclado[K.ESPACO].ativo || teclado[K.ESPACO].pressionado;
  let segura_mouse = mouse.botoes[C2D2_MESQUERDO].ativo || mouse.botoes[C2D2_MESQUERDO].pressionado;
  let abortou = false;

  jogoAtual.rodando = true;
  try {
    while (!g.encerra) {
      if (g.estado_atual !== TELA_JOGO)
        g.encerra = 1;

      if (teclado[K.ESC].pressionado) {
        g.estado_atual = TELA_MISSION;
        abortou = true; // F15
      }

      // F14: the original dereferenced Boss unconditionally (NULL when the map has no M_BOSS → crash); without a
      // boss the phase ends, as a win, once the map scroll is over.
      const semBoss = Boss < 0;
      if ((semBoss ? fase.ymapa <= -600 : marcas[Boss].tipo === INVALIDO) || jogador.energia <= 0) {
        //lógica de liberação de fases e save só entra uma vez
        if (p.contadorfinal === 0) {
          //matou o boss.. pasou de fase
          if (semBoss ? jogador.energia > 0 : marcas[Boss].energia <= 0) {
            if ((g.saveAtual.planeta_liberado === g.saveAtual.planeta_atual) && g.saveAtual.planeta_liberado < 4)
              g.saveAtual.planeta_liberado++;

            g.saveAtual.pts = (g.saveAtual.pts + temp_pts.v) | 0;
            menu_saves_saveslot(g.slotAtual);
            menu_recordes_insere(g.saveAtual.pts, g.saveAtual.nome);
          }

          //zera pontos;
          temp_pts.v = 0;
          menu_saves_loadslot(g.slotAtual);
        }

        if (p.contadorfinal < 200)
          p.contadorfinal++;
        else g.estado_atual = TELA_MISSION;
      }

      /*Troca tiros.. */
      if (teclado[K.LALT].pressionado) {
        jogo_troca_tiro(jogador); // F11
        p.informacao = 180;
      }

      //        if(teclado[C2D2_2].pressionado) ... — "next weapon" commented out in the original (jogo.cpp:236-240)

      jogo_atualiza_fundo(yfundo1, yfundo2);
      jogo_atualiza_estrela(estrelas, 1, MAXSTARS);
      jogo_atualiza_jogador(jogador, explos);
      jogo_atualiza_barras(altura_energia, jogador);
      jogo_atualiza_explosao(explos);
      jogo_atualiza_tiro(tiros, jogador);
      jogo_atualiza_marca(marcas, fase.ymapa, jogador, explos, somExplo, tiros, temp_pts);
      jogo_testa_colisao(marcas, tiros, spMarca, spTiro, jogador, temp_pts);

      if (jogador.intervalo_tiro > 0) jogador.intervalo_tiro--;

      if (fase.ymapa > -600) fase.ymapa -= 2;

      if (quadroFlame > 1) quadroFlame--;
      else quadroFlame = 24;

      // F13: release (or a new press edge) of the dismissing input re-arms it
      if (segura_espaco && (!teclado[K.ESPACO].ativo || (p.quadro > 0 && teclado[K.ESPACO].pressionado))) segura_espaco = false;
      if (segura_mouse && (!mouse.botoes[C2D2_MESQUERDO].ativo || (p.quadro > 0 && mouse.botoes[C2D2_MESQUERDO].pressionado))) segura_mouse = false;
      const lmb = mouse.botoes[C2D2_MESQUERDO].ativo && !segura_mouse;
      const espaco = (teclado[K.ESPACO].pressionado || teclado[K.ESPACO].ativo) && !segura_espaco;

      if ((lmb || espaco) && jogador.intervalo_tiro <= 0 && jogador.tipo !== INVALIDO) {
        CA2_TocaEfeitoTela(somTiro[jogador.tiro_atual], jogador.x);
        jogo_cria_tiro(tiros, jogador, jogador.tiro_atual);
      }

      if (teclado[K.LCTRL].pressionado && jogador.tipo !== INVALIDO && jogador.n_bombas > 0) {
        CA2_TocaEfeitoTela(somTiro[BOMBA1], jogador.x);
        jogo_cria_tiro(tiros, jogador, jogador.bomba_atual);
        jogador.n_bombas--;
      }

      //joga valor de saveAtual.pts em uma string para que possa ser desenhado
      spontos = formataPontos(temp_pts.v + g.saveAtual.pts);

      /*--------------------------------------------------------------------------------------*/
      /*-----------------    FIM DAS LOGICAS E COMECO DO DESENHO    --------------------------*/
      /*--------------------------------------------------------------------------------------*/

      C2D2_LimpaTela();

      //desenha fundo
      C2D2_DesenhaSprite(spFundo, 0, 0, Math.trunc(yfundo1.v));
      C2D2_DesenhaSprite(spFundo, 0, 0, Math.trunc(yfundo2.v));
      C2D2P_Pontos(estrelas, 100, 200, 200, 200);

      if (jogador.tipo !== INVALIDO)
        C2D2_DesenhaSprite(spFlame, quadroFlame, jogador.x + 9, jogador.y + 45);
      //desenha a nave
      if (jogador.tipo === X85)
        C2D2_DesenhaSprite(spX85, 0, jogador.x, jogador.y);
      else if (jogador.tipo === INVUNERAVEL)
        C2D2_DesenhaSprite(spX85, 1, jogador.x, jogador.y);

      //desenha tiros
      for (let i = 0; i < MAXTIROS; i++) {
        const t = tiros[i];
        const meio = Math.trunc(t.tamanho / 2);
        if (t.tipo === TIRO1)
          XDesenhaSprite(spTiro[TIRO1], 0, t.x, t.y, t.tamanho, t.tamanho, t.alpha);
        else if (t.tipo === TIRO2)
          XDesenhaSprite(spTiro[TIRO2], 0, t.x, t.y, t.tamanho, t.tamanho, t.alpha);
        else if (t.tipo === TIRO3)
          XDesenhaSprite(spTiro[TIRO3], 0, t.x - meio, t.y, t.tamanho, t.tamanho, t.alpha);
        else if (t.tipo === TIRO4)
          XDesenhaSprite(spTiro[TIRO4], 0, t.x - meio, t.y, t.tamanho, t.tamanho, t.alpha);
        else if (t.tipo === TIRO5)
          XDesenhaSprite(spTiro[TIRO5], 0, t.x - meio, t.y, t.tamanho, t.tamanho, t.alpha);
        else if (t.tipo === TIRO6)
          XDesenhaSprite(spTiro[TIRO6], 0, t.x - meio, t.y, t.tamanho, t.tamanho * 2, t.alpha);
        else if (t.tipo === BOMBA1)
          XDesenhaSprite(spTiro[BOMBA1], 0, t.x, t.y, 800, 600, t.alpha);
        else if (t.tipo === TIROINI1)
          XDesenhaSprite(spTiro[TIROINI1], 0, t.x, t.y, t.tamanho, t.tamanho, t.alpha);
        else if (t.tipo === TIROINI2)
          XDesenhaSprite(spTiro[TIROINI2], 0, t.x, t.y, t.tamanho, t.tamanho, t.alpha);
        else if (t.tipo === TIROINI3)
          XDesenhaSprite(spTiro[TIROINI3], 0, t.x, t.y, t.tamanho, t.tamanho, t.alpha);
      }

      //desenha todas marcas ativas
      for (let i = 0; i < MAXMARCAS; i++) {
        if (marcas[i].tipo !== INVALIDO && marcas[i].ativo)
          C2D2_DesenhaSprite(spMarca[marcas[i].tipo], 0, marcas[i].x, marcas[i].y);
      }
      //desenha explosoes
      for (let i = 0; i < MAXEXPLOS; i++) {
        const e = explos[i];
        if (e.tipo !== INVALIDO)
          XDesenhaSprite(spExplo, 0, e.x - Math.trunc(e.tamanho / 2), e.y - Math.trunc(e.tamanho / 2), e.tamanho, e.tamanho, e.alpha);
      }

      //desenha barras de vida e escudo e bombas
      C2D2_DesenhaSprite(barras_back, 0, 0, 0);
      if (jogador.energia > 0)
        XDesenhaSprite(barras_energy, 0, 6, 595, 16, Math.trunc((-altura_energia.v * 586) / 100), 255);
      for (let i = 0; i < jogador.n_bombas; i++)
        C2D2_DesenhaSprite(barras_bomba, 0, 774, 116 - (i * 26));
      //desenha saveAtual.pts
      C2D2_DesenhaTexto(fontejogo, 40, 0, spontos, C2D2_TEXTO_ESQUERDA);

      //informacao
      if (p.informacao >= 0) {
        p.informacao--;
        jogo_exibe_informacao(jogador.tiro_atual);
      }

      C2D2_Sincroniza();
      p.quadro++;
      yield;
    }
  } finally {
    jogoAtual.rodando = false;
  }
  // F15: Esc from the game reloads the slot (the original skipped it, jogo.cpp:199-200), so unlocks picked up
  // in the aborted run are discarded like on death. After a win/death the slot was already saved/reloaded.
  if (abortou) menu_saves_loadslot(g.slotAtual);
  return 0;
}

// orig: jogo.cpp:364 jogo_exibe_informacao — funcao para exibir informações durante o jogo
function jogo_exibe_informacao(tipo: number): void {
  const x = 380;
  const y = 5;
  C2D2_DesenhaSprite(barra_informacao, 0, x, y);
  switch (tipo) {
    case 1:
      C2D2_DesenhaSprite(spMarca[T1], 0, x + 10, y + 10);
      C2D2_DesenhaTexto(fontejogo, x + 70, y + 5, 'Weapon 1', C2D2_TEXTO_ESQUERDA);
      C2D2_DesenhaTexto(fontejogo, x + 70, y + 25, 'Blue Laser', C2D2_TEXTO_ESQUERDA);
      break;
    case 2:
      C2D2_DesenhaSprite(spMarca[T2], 0, x + 10, y + 10);
      C2D2_DesenhaTexto(fontejogo, x + 70, y + 5, 'Weapon 2', C2D2_TEXTO_ESQUERDA);
      C2D2_DesenhaTexto(fontejogo, x + 70, y + 25, 'Red Laser', C2D2_TEXTO_ESQUERDA);
      break;
    case 3:
      C2D2_DesenhaSprite(spMarca[T3], 0, x + 10, y + 10);
      C2D2_DesenhaTexto(fontejogo, x + 70, y + 5, 'Weapon 3', C2D2_TEXTO_ESQUERDA);
      C2D2_DesenhaTexto(fontejogo, x + 70, y + 25, 'Exploding Balls', C2D2_TEXTO_ESQUERDA);
      break;
    case 4:
      C2D2_DesenhaSprite(spMarca[T4], 0, x + 10, y + 10);
      C2D2_DesenhaTexto(fontejogo, x + 70, y + 5, 'Weapon 4', C2D2_TEXTO_ESQUERDA);
      C2D2_DesenhaTexto(fontejogo, x + 70, y + 25, 'Triple Exploding Balls', C2D2_TEXTO_ESQUERDA);
      break;
    case 5:
      C2D2_DesenhaSprite(spMarca[T5], 0, x + 10, y + 10);
      C2D2_DesenhaTexto(fontejogo, x + 70, y + 5, 'Weapon 5', C2D2_TEXTO_ESQUERDA);
      C2D2_DesenhaTexto(fontejogo, x + 70, y + 25, 'Hyper Wave', C2D2_TEXTO_ESQUERDA);
      break;
    case 6:
      C2D2_DesenhaSprite(spMarca[T6], 0, x + 10, y + 10);
      C2D2_DesenhaTexto(fontejogo, x + 70, y + 5, 'Weapon 6', C2D2_TEXTO_ESQUERDA);
      C2D2_DesenhaTexto(fontejogo, x + 70, y + 25, "That's FIRE BABY!", C2D2_TEXTO_ESQUERDA);
      break;
  }
}
