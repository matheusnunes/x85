// Gameplay helpers: background, stars, player ship, shots, HUD bar, explosions, map markers, enemies, meteors,
// bosses, items and collisions. orig: X85-devcore 2/funcoes_J.cpp (all), funcoes_J.h
// C semantics: int / int → Math.trunc, int stores → | 0, C float stores → Math.fround.
// Pointers become object/array references; `int *x` / `int &x` become `{ v: number }`.
// Intentional behaviour changes (web/FIXES.md): F1, F2, F3, F7, F8, F9, F10 — each marked `// F<n>` below.
import {
  C2D2_PegaTeclas, K, rand, C2D2_ColidiuSprites, C2D2_PegaSpriteSet, CA2_TocaEfeitoTela,
  C2D2M_PrimeiroBlocoMarca, C2D2M_ProximoBlocoMarca,
} from '../engine/c2d2';
import { g } from './funcoes_M';
import {
  INVALIDO, X85, EXPLOSAO, MAXTIROS, MAXMARCAS, MAXEXPLOS,
  TIRO1, TIRO2, TIRO3, TIRO4, TIRO5, TIRO6, BOMBA1, TIROINI1, TIROINI2, TIROINI3,
  M_INIMIGO1, M_INIMIGO2, M_INIMIGO3, M_INIMIGO4, M_METEORO, M_BOSS, M_T1, M_T2, M_T3, M_T4, M_T5, M_T6,
  INIMIGO1, INIMIGO2, INIMIGO3, INIMIGO4, METEORO, BOSS1, BOSS2, BOSS3, BOSS4, BOSS5, T1, T2, T3, T4, T5, T6,
} from './constantes';
import type { Nave, Tiro, Marca, Explo } from './tipos';

// orig: funcoes_J.cpp:3 jogo_atualiza_fundo(float *ypersf1, float *ypersf2)
export function jogo_atualiza_fundo(ypersf1: { v: number }, ypersf2: { v: number }): void {
  if (ypersf1.v > 0) {
    ypersf1.v = Math.fround(-600);
  }
  if (ypersf2.v > 600) {
    ypersf2.v = 0;
  }
  ypersf1.v = Math.fround(ypersf1.v + 0.5);
  ypersf2.v = Math.fround(ypersf2.v + 0.5);
}

// orig: funcoes_J.cpp:15 jogo_cria_estrela(C2D2P_Ponto *estrelas, int max) — estrelas[i][0..1] = xy[2i], xy[2i+1]
export function jogo_cria_estrela(estrelas: Int32Array /* x,y pairs */, max: number): void {
  for (let i = 0; i < max; i++) {
    estrelas[2 * i] = rand() % 800;
    estrelas[2 * i + 1] = rand() % 600;
  }
}

// orig: funcoes_J.cpp:23 jogo_atualiza_estrela
export function jogo_atualiza_estrela(estrelas: Int32Array, vel: number, max: number): void {
  for (let i = 0; i < max; i++) {
    if ((estrelas[2 * i + 1] += vel) > 599) {
      estrelas[2 * i + 1] = rand() % 1; // always 0, but still consumes a rand() call
      estrelas[2 * i] = rand() % 808;
    }
  }
}

const velocidade = 15; // orig: funcoes_J.cpp:40 static int velocidade = 15 (target step per frame)

// Seam for external target nudges (Task 14 touch steering, `moveAlvoToque(dx, dy)`): deltas accumulated here
// between frames are added to the ship's target (xaux/yaux) right after the keyboard step, while the ship is
// alive, then cleared. Zero unless something writes it, so keyboard-only play is the original behaviour.
const alvoPendente = { dx: 0, dy: 0, pendente: false };

// Bounds of the target the keyboard step can produce (funcoes_J.cpp:48-55): it decrements only while
// yaux/xaux > velocidade (→ result ≥ 1) and increments only while yaux < 600+velocidade / xaux < 800+velocidade
// (→ result ≤ 600/800 + 2·velocidade − 1). A touch nudge is clamped to exactly this range.
export const ALVO_MIN = 1;                           // web port (derived from funcoes_J.cpp:48,54)
export const ALVO_MAX_X = 800 + 2 * velocidade - 1;  // web port (derived from funcoes_J.cpp:52) = 829
export const ALVO_MAX_Y = 600 + 2 * velocidade - 1;  // web port (derived from funcoes_J.cpp:50) = 629

const limita = (v: number, max: number): number => Math.min(max, Math.max(ALVO_MIN, v));

/** Web addition (D10, touch steering): moves the ship's target by (dx, dy) logical px on the next player update. */
export function moveAlvoToque(dx: number, dy: number): void {
  if (Number.isFinite(dx)) alvoPendente.dx += dx;
  else if (!Number.isNaN(dx)) alvoPendente.dx += dx > 0 ? ALVO_MAX_X : -ALVO_MAX_X;
  if (Number.isFinite(dy)) alvoPendente.dy += dy;
  else if (!Number.isNaN(dy)) alvoPendente.dy += dy > 0 ? ALVO_MAX_Y : -ALVO_MAX_Y;
  alvoPendente.pendente = true;
}

// orig: funcoes_J.cpp:35 jogo_atualiza_jogador(Nave *jogador, Explo *explos)
export function jogo_atualiza_jogador(jogador: Nave, explos: Explo[]): void {
  const teclado = C2D2_PegaTeclas(); // orig: static C2D2_Botao *teclado = C2D2_PegaTeclas()

  //mouse
  //  jogador->yaux=mouse->y;   (commented out in the original: funcoes_J.cpp:43-44)
  //  jogador->xaux=mouse->x;

  //teclado
  if (jogador.tipo !== INVALIDO) {
    if ((teclado[K.CIMA].pressionado || teclado[K.CIMA].ativo) && jogador.yaux > velocidade)
      jogador.yaux -= velocidade;
    if ((teclado[K.BAIXO].pressionado || teclado[K.BAIXO].ativo) && jogador.yaux < 600 + velocidade)
      jogador.yaux += velocidade;
    if ((teclado[K.DIREITA].pressionado || teclado[K.DIREITA].ativo) && jogador.xaux < 800 + velocidade)
      jogador.xaux += velocidade;
    if ((teclado[K.ESQUERDA].pressionado || teclado[K.ESQUERDA].ativo) && jogador.xaux > velocidade)
      jogador.xaux -= velocidade;
    // web port: external nudges (see alvoPendente), clamped to the keyboard's own target range
    if (alvoPendente.pendente) {
      jogador.xaux = limita(Math.trunc(jogador.xaux + alvoPendente.dx), ALVO_MAX_X) | 0;
      jogador.yaux = limita(Math.trunc(jogador.yaux + alvoPendente.dy), ALVO_MAX_Y) | 0;
    }
  }
  alvoPendente.dx = 0; alvoPendente.dy = 0; alvoPendente.pendente = false;

  //atualiza
  if (jogador.x < jogador.xaux && jogador.x < 720)
    jogador.x = (jogador.x + Math.trunc((jogador.xaux - jogador.x) / jogador.velocidade) + 1) | 0;
  else if (jogador.x > jogador.xaux)
    jogador.x = (jogador.x - (Math.trunc((jogador.x - jogador.xaux) / jogador.velocidade) + 1)) | 0;

  if (jogador.y < jogador.yaux && jogador.y < 520)
    jogador.y = (jogador.y + Math.trunc((jogador.yaux - jogador.y) / jogador.velocidade) + 1) | 0;
  else if (jogador.y > jogador.yaux)
    jogador.y = (jogador.y - (Math.trunc((jogador.y - jogador.yaux) / jogador.velocidade) + 1)) | 0;

  if (jogador.energia <= 0 && jogador.tipo !== INVALIDO) {
    jogador.tipo = INVALIDO;
    jogo_cria_explosao(jogador.x, jogador.y, explos);
  }
}

// orig: funcoes_J.cpp:81 jogo_atualiza_barras(int *altura_energia, Nave *jogador)
export function jogo_atualiza_barras(altura_energia: { v: number }, jogador: Nave): void {
  if (altura_energia.v < jogador.energia)
    altura_energia.v++;
  if (altura_energia.v > jogador.energia)
    altura_energia.v--;
}

// orig: funcoes_J.cpp:89 jogo_inicia_jogador
export function jogo_inicia_jogador(jogador: Nave): void {
  jogador.x = 400;
  jogador.y = 400;
  jogador.xaux = jogador.x;
  jogador.yaux = jogador.y;
  jogador.intervalo_tiro = 0;
  jogador.velocidade = 20;
  jogador.tipo = X85;
  jogador.escudo = 100;
  jogador.energia = 100;   // F1 — orig: funcoes_J.cpp:99 energia=10000 (debug value)
  jogador.tiro_atual = TIRO1;
  jogador.bomba_atual = BOMBA1;
  jogador.n_bombas = 5;    // F1 — orig: funcoes_J.cpp:102 n_bombas=50 (debug value)
}

// orig: funcoes_J.cpp:105 jogo_cria_tiro(Tiro *tiro, Nave *jogador, int tipo_tiro)
export function jogo_cria_tiro(tiro: Tiro[], jogador: Nave, tipo_tiro: number): void {
  if (tipo_tiro === TIRO1) {
    for (let i = 0; i < MAXTIROS; i++)
      if (tiro[i].tipo === INVALIDO) {
        jogador.intervalo_tiro = 4;
        tiro[i].tipo = TIRO1;
        tiro[i].x = jogador.x + 21;
        tiro[i].y = jogador.y;
        tiro[i].tamanho = 0;
        tiro[i].alpha = 255;
        break;
      }
  } else if (tipo_tiro === TIRO2) {
    for (let i = 0; i < MAXTIROS; i++)
      if (tiro[i].tipo === INVALIDO) {
        jogador.intervalo_tiro = 6;
        tiro[i].tipo = TIRO2;
        tiro[i].x = jogador.x + 14;
        tiro[i].y = jogador.y;
        tiro[i].tamanho = 0;
        tiro[i].alpha = 255;
        break;
      }
  } else if (tipo_tiro === TIRO3) {
    for (let i = 0; i < MAXTIROS; i++)
      if (tiro[i].tipo === INVALIDO) {
        jogador.intervalo_tiro = 6;
        tiro[i].tipo = TIRO3;
        tiro[i].x = jogador.x + 29;
        tiro[i].y = jogador.y;
        tiro[i].tamanho = 5;
        tiro[i].alpha = 255;
        break;
      }
  } else if (tipo_tiro === TIRO4) {
    for (let n = -1; n < 2; n++)
      for (let i = 0; i < MAXTIROS; i++)
        if (tiro[i].tipo === INVALIDO) {
          jogador.intervalo_tiro = 12;
          tiro[i].tipo = TIRO4;
          tiro[i].x = jogador.x + 27 + n * 10;
          tiro[i].y = jogador.y;
          tiro[i].tamanho = 5;
          tiro[i].alpha = 255;
          tiro[i].id = n;
          break;
        }
  } else if (tipo_tiro === TIRO5) {
    for (let i = 0; i < MAXTIROS; i++)
      if (tiro[i].tipo === INVALIDO) {
        jogador.intervalo_tiro = 6;
        tiro[i].tipo = TIRO5;
        tiro[i].x = jogador.x + 29;
        tiro[i].y = jogador.y - 5;
        tiro[i].tamanho = 10;
        tiro[i].alpha = 255;
        break;
      }
  } else if (tipo_tiro === TIRO6) {
    for (let i = 0; i < MAXTIROS; i++)
      if (tiro[i].tipo === INVALIDO) {
        jogador.intervalo_tiro = 0;
        tiro[i].tipo = TIRO6;
        tiro[i].x = jogador.x + 29;
        tiro[i].y = jogador.y - 2;
        tiro[i].alpha = 255;
        tiro[i].tamanho = 6;
        break;
      }
  } else if (tipo_tiro === BOMBA1) {
    for (let i = 0; i < MAXTIROS; i++)
      if (tiro[i].tipo === INVALIDO) {
        jogador.intervalo_tiro = 0;
        tiro[i].tipo = BOMBA1;
        tiro[i].tamanho = 800;
        tiro[i].x = 0;
        tiro[i].y = 0;
        tiro[i].alpha = 255;
        break;
      }
  }
}

// orig: funcoes_J.cpp:210 jogo_cria_tiro_inimigo(Tiro *tiro, Marca marca, int tipo_tiro) — marca passed by value (read only)
export function jogo_cria_tiro_inimigo(tiros: Tiro[], marca: Readonly<Marca>, tipo_tiro: number): void {
  // The three original branches are identical except for the type stored.
  if (tipo_tiro === TIROINI1 || tipo_tiro === TIROINI2 || tipo_tiro === TIROINI3) {
    for (let i = 0; i < MAXTIROS; i++)
      if (tiros[i].tipo === INVALIDO) {
        tiros[i].tipo = tipo_tiro;
        tiros[i].x = marca.x + 22;
        tiros[i].y = marca.y + 45;
        tiros[i].tamanho = 0;
        tiros[i].alpha = 255;
        break;
      }
  }
}

// orig: funcoes_J.cpp:253 jogo_atualiza_tiro(Tiro *tiro, Nave *jogador)
export function jogo_atualiza_tiro(tiro: Tiro[], jogador: Nave): void {
  for (let i = 0; i < MAXTIROS; i++) {
    const t = tiro[i];
    if (t.tipo !== INVALIDO) {
      if ((t.y < -100 || t.y > 700 || t.alpha < 10) && t.tipo < BOMBA1)
        t.tipo = INVALIDO;
      else if (t.alpha < 5 && t.tipo === BOMBA1)
        t.tipo = INVALIDO;
      // F2 — orig: funcoes_J.cpp:259 excluded enemy shots (tipo > BOMBA1) from expiry, so they leaked in the pool
      else if (t.tipo > BOMBA1 && (t.y > 700 || t.y < -100 || t.x < -100 || t.x > 900))
        t.tipo = INVALIDO;

      else if (t.tipo === TIRO1 || t.tipo === TIRO2)
        t.y -= 6;

      else if (t.tipo === TIRO3) {
        if (t.tamanho < 22) t.tamanho++;
        //                if(tiro[i].alpha>0)
        //                    tiro[i].alpha-=3;
        t.y = (t.y - Math.trunc(t.tamanho / 3)) | 0;
      } else if (t.tipo === TIRO4) {
        if (t.tamanho < 20) t.tamanho++;
        //                if(tiro[i].alpha>0)
        //                    tiro[i].alpha-=3;
        t.y = (t.y - Math.trunc(t.tamanho / 3)) | 0;
        t.x = (t.x + t.id * 2) | 0;
      } else if (t.tipo === TIRO5) {
        if (t.tamanho < 80) t.tamanho++;
        if (t.alpha > 0) t.alpha -= 4;
        t.y = (t.y - Math.trunc(t.tamanho / 4)) | 0;
      } else if (t.tipo === TIRO6) {
        t.y = (t.y - (Math.trunc(t.tamanho / 3) + 1)) | 0;
        if (t.tamanho < 30) t.tamanho++;
        if (t.alpha > 0) t.alpha -= 6;
      } else if (t.tipo === BOMBA1) {
        if (t.alpha > 0)
          t.alpha -= 5;
      } else if (t.tipo === TIROINI1) {
        t.y += 4;
      } else if (t.tipo === TIROINI2) {
        t.y += 4;
      } else if (t.tipo === TIROINI3) {
        if (t.x < jogador.x + 10) t.x = (t.x + Math.trunc((jogador.x - t.x) / 80) + 1) | 0;
        if (t.x > jogador.x + 10) t.x = (t.x - (Math.trunc((t.x - jogador.x) / 80) + 1)) | 0;
        t.y += 3;
      }
    }
  }
}

// orig: funcoes_J.cpp:321 jogo_procura_marca(unsigned int mapa, int marcacao, Marca *marcas, int &contadormarcas)
// Appends every mark `marcacao` of the map (row-major) to vetmarca[contadormarcas..] and initialises it.
export function jogo_procura_marca(mapa: number, marcacao: number, vetmarca: Marca[], contadormarcas: { v: number }): void {
  // C2D2M_PrimeiroBlocoMarca/ProximoBlocoMarca write x,y into marcas[contadormarcas] only on success
  let p = C2D2M_PrimeiroBlocoMarca(mapa, marcacao);
  if (p) {
    while (p && contadormarcas.v < MAXMARCAS) { // bound: the C code would overflow marcas[MAXMARCAS] (never reached)
      vetmarca[contadormarcas.v].x = p.x;
      vetmarca[contadormarcas.v].y = p.y;
      jogo_inicia_marca(vetmarca, contadormarcas.v, marcacao);
      contadormarcas.v++;
      p = C2D2M_ProximoBlocoMarca(mapa);
    }
  }
}

// orig: funcoes_J.cpp:336 jogo_inicia_marca(Marca *marcas, int contadormarcas, unsigned int tipo)
export function jogo_inicia_marca(marcas: Marca[], contadormarcas: number, tipo: number): void {
  const m = marcas[contadormarcas];
  m.tipo = tipo;
  m.angulo = Math.fround(90);
  m.ativo = 0;
  m.estado_atual = 0;
  m.tempotiro = 0;

  switch (tipo) {
    case M_INIMIGO1:
      m.tipo = INIMIGO1;
      m.energia = 200;
      break;
    case M_INIMIGO2:
      m.tipo = INIMIGO2;
      m.energia = 300;
      break;
    case M_INIMIGO3:
      m.tipo = INIMIGO3;
      m.energia = 400;
      break;
    case M_INIMIGO4:
      m.tipo = INIMIGO4;
      m.energia = 500;
      break;
    case M_METEORO:
      m.tipo = METEORO;
      m.energia = 750;
      break;
    case M_BOSS:
      switch (g.saveAtual.planeta_atual) {
        case 0:
          m.tipo = BOSS1;
          m.energia = 10000;
          break;
        case 1:
          m.tipo = BOSS2;
          m.energia = 20000;
          break;
        case 2:
          m.tipo = BOSS3;
          m.energia = 30000;
          break;
        case 3:
          m.tipo = BOSS4;
          m.energia = 30000;
          break;
        case 4:
          m.tipo = BOSS5;
          m.energia = 40000;
          break;
      }
      break;
    case M_T1:
      m.tipo = T1;
      break;
    case M_T2:
      m.tipo = T2;
      break;
    case M_T3:
      m.tipo = T3;
      break;
    case M_T4:
      m.tipo = T4;
      break;
    case M_T5:
      m.tipo = T5;
      break;
    case M_T6:
      m.tipo = T6;
      break;
  }
}

const F008 = Math.fround(0.08); // orig: funcoes_J.cpp:438,502,552,579,606,637 the float literal 0.08f

const DOIS_PI = 2 * Math.PI;

// orig: `if(marcas[i].angulo <360) marcas[i].angulo += 0.08f; else marcas[i].angulo = 0;`
// (funcoes_J.cpp:438-439, 502-503, 552-553, 579-580, 606-607, 637-638) — float accumulator.
// F10: the reset to 0 (360 rad is not a multiple of 2π, so the orbit jumped after ~56 s) becomes a wrap
// modulo 2π that still advances by 0.08f. Below 360 the accumulation is bit-identical to the original.
function passo_angulo(m: Marca): void {
  if (m.angulo < 360) m.angulo = Math.fround(m.angulo + F008);
  else m.angulo = Math.fround(Math.fround(m.angulo + F008) % DOIS_PI);
}

// orig: funcoes_J.cpp:413 jogo_atualiza_marca(Marca *marcas, int ymapa, Nave *jogador, Explo *explos,
//                                             unsigned int somExplo, Tiro *tiros, int *score)
// sin/cos take the float angle promoted to double (math.h), and the (int) casts truncate.
export function jogo_atualiza_marca(marcas: Marca[], ymapa: number, jogador: Nave, explos: Explo[], somExplo: number, tiros: Tiro[], score: { v: number }): void {
  for (let i = 0; i < MAXMARCAS; i++) {
    const m = marcas[i];
    if (m.tipo !== INVALIDO) {
      if (m.ativo && (m.y > 700)) {
        m.ativo = 0;
        m.tipo = INVALIDO; // senão da merda ( acredite ! )
      } else if (!m.ativo && m.y - ymapa >= -100) {
        //ta criado mano !
        m.ativo = 1;
        m.y = (m.y - ymapa) | 0;
        m.centroX = m.x;
        m.centroY = m.y;
      } else if (m.ativo === 1) {
        switch (m.tipo) {
          case INIMIGO1:
            m.y = Math.trunc(m.centroY + 50 * Math.sin(m.angulo));
            m.x = Math.trunc(m.centroX + 100 * Math.cos(m.angulo));
            passo_angulo(m);
            m.centroY += 2;
            if (m.energia <= 0) {
              m.tipo = INVALIDO;
              jogo_cria_explosao(m.x + 35, m.y + 35, explos);
              CA2_TocaEfeitoTela(somExplo, m.x);
              score.v += 200;
            }
            if (m.tempotiro <= 0) {
              jogo_cria_tiro_inimigo(tiros, m, TIROINI1);
              m.tempotiro = 100;
            } else m.tempotiro--;
            break;

          case INIMIGO2:
            if (jogador.tipo !== INVALIDO) {
              if (m.x < jogador.x + 10) m.x = (m.x + Math.trunc((jogador.x - m.x) / 80) + 1) | 0;
              if (m.x > jogador.x + 10) m.x = (m.x - (Math.trunc((m.x - jogador.x) / 80) + 1)) | 0;
              if (m.y < jogador.y - 50) m.y = (m.y + Math.trunc((jogador.y - m.y) / 80) + 1) | 0;
              if (m.y > jogador.y - 50) m.y = (m.y - (Math.trunc((m.y - jogador.y) / 80) + 1)) | 0;
            } else
              m.y += 2;
            if (m.energia <= 0) {
              m.tipo = INVALIDO;
              jogo_cria_explosao(m.x + 20, m.y + 20, explos);
              CA2_TocaEfeitoTela(somExplo, m.x);
              score.v += 300;
            }
            if (m.tempotiro <= 0) {
              jogo_cria_tiro_inimigo(tiros, m, TIROINI2);
              m.tempotiro = 50;
            } else m.tempotiro--;
            break;

          case INIMIGO3:
            m.y += 2;
            if (m.energia <= 0) {
              m.tipo = INVALIDO;
              jogo_cria_explosao(m.x + 30, m.y + 50, explos);
              CA2_TocaEfeitoTela(somExplo, m.x);
              score.v += 400; // F3 — orig: funcoes_J.cpp:489 `score+=400;` moved the pointer: the kill was worth 0
            }
            if (m.tempotiro <= 0) {
              jogo_cria_tiro_inimigo(tiros, m, TIROINI3);
              m.tempotiro = 180;
            } else m.tempotiro--;
            break;

          case INIMIGO4:
            m.y = Math.trunc(m.centroY + 40 * Math.sin(m.angulo));
            m.x = Math.trunc(m.centroX + 40 * Math.cos(m.angulo));
            passo_angulo(m);
            //marcas[i].centroY +=2;

            if (jogador.tipo !== INVALIDO) {
              if (m.centroX < jogador.x + 10) m.centroX += 3;
              if (m.centroX > jogador.x + 10) m.centroX -= 3;
              if (m.centroY < jogador.y - 200) m.centroY += 3;
              if (m.centroY > jogador.y - 200) m.centroY -= 3;
            } else
              m.y += 2;

            if (m.energia <= 0) {
              m.tipo = INVALIDO;
              jogo_cria_explosao(m.x + 30, m.y + 42, explos);
              CA2_TocaEfeitoTela(somExplo, m.x);
              score.v += 500;
            }
            if (m.tempotiro <= 0) {
              jogo_cria_tiro_inimigo(tiros, m, TIROINI3);
              m.tempotiro = 80;
            } else m.tempotiro--;
            break;

          case METEORO:
            m.y += 2;
            if (m.energia <= 0) {
              m.tipo = INVALIDO;
              jogo_cria_explosao(m.x + 30, m.y + 30, explos);
              CA2_TocaEfeitoTela(somExplo, m.x);
              score.v += 1000;
            }
            break;

          case BOSS1:
          case BOSS2:
          case BOSS3:
          case BOSS4:
            // orig: funcoes_J.cpp:542-657 — four identical copies except the firing pattern
            if (m.y <= 50 && m.estado_atual === 0) m.y++;
            else if (m.estado_atual === 0) {
              m.centroY = m.y;
              m.estado_atual = 1;
            } else {
              m.y = Math.trunc(m.centroY + 20 * Math.sin(m.angulo));
              m.x = Math.trunc(m.centroX + 50 * Math.cos(m.angulo));
              passo_angulo(m);
            }
            if (m.tempotiro <= 0) {
              if (m.tipo === BOSS1) {        // orig: funcoes_J.cpp:555-558
                jogo_cria_tiro_inimigo(tiros, m, TIROINI1);
                m.tempotiro = 30;
              } else if (m.tipo === BOSS2) { // orig: funcoes_J.cpp:582-585
                jogo_cria_tiro_inimigo(tiros, m, TIROINI2);
                m.tempotiro = 30;
              } else if (m.tipo === BOSS3) { // orig: funcoes_J.cpp:609-616
                const tirob = rand() % 2;
                if (tirob === 1)
                  jogo_cria_tiro_inimigo(tiros, m, TIROINI1);
                else
                  jogo_cria_tiro_inimigo(tiros, m, TIROINI2);
                m.tempotiro = 45;
              } else {                       // BOSS4 — orig: funcoes_J.cpp:640-647
                const tirob = rand() % 2;
                if (tirob === 1)
                  jogo_cria_tiro_inimigo(tiros, m, TIROINI2);
                else
                  jogo_cria_tiro_inimigo(tiros, m, TIROINI3);
                m.tempotiro = 40;
              }
            } else m.tempotiro--;
            if (m.energia <= 0) {
              m.tipo = INVALIDO;
              jogo_cria_explosao(m.x, m.y - 25, explos);
              CA2_TocaEfeitoTela(somExplo, m.x);
              score.v += 3000;
            }
            break;

          case BOSS5:
            if (m.y <= 50) m.y++;
            m.x = 800 - jogador.x;
            if (m.energia <= 0) {
              m.tipo = INVALIDO;
              jogo_cria_explosao(m.x, m.y - 25, explos);
              CA2_TocaEfeitoTela(somExplo, m.x);
              score.v += 3000;
            }
            if (m.tempotiro <= 0) {
              const tirob = rand() % 3;
              if (tirob === 0)
                jogo_cria_tiro_inimigo(tiros, m, TIROINI3);
              else if (tirob === 1)
                jogo_cria_tiro_inimigo(tiros, m, TIROINI2);
              else
                jogo_cria_tiro_inimigo(tiros, m, TIROINI1);

              m.tempotiro = 25;
            } else m.tempotiro--;
            break;

          case T2: m.y += 1; break;
          case T3: m.y += 1; break;
          case T4: m.y += 1; break;
          case T5: m.y += 1; break;
          case T6: m.y += 1; break;
        }
      }
    }
  }
}

/**
 * F9 — top-left at which a player shot's native-size mask is tested. The original tested every shot at (x,y)
 * (funcoes_J.cpp:704), but jogo.cpp:308-315 draws TIRO3–TIRO5 as a t×t quad and TIRO6 as t×2t at (x - t/2, y),
 * so the hit area sat right/down of the visual. Now the native mask's centre is placed on the drawn quad's
 * centre. TIRO1/TIRO2/BOMBA1/enemy shots are drawn at native size at (x,y) and are unchanged.
 */
export function posicao_colisao_tiro(t: Readonly<Tiro>, sprite: number): [number, number] {
  if (t.tipo < TIRO3 || t.tipo > TIRO6) return [t.x, t.y];
  const s = C2D2_PegaSpriteSet(sprite);
  if (!s) return [t.x, t.y];
  // orig: jogo.cpp:309-315 XDesenhaSprite(sp, 0, x - tamanho/2, y, tamanho, tamanho | tamanho*2, alpha)
  const dx = t.x - Math.trunc(t.tamanho / 2), dy = t.y;
  let dw = t.tamanho, dh = t.tipo === TIRO6 ? t.tamanho * 2 : t.tamanho;
  if (dw === 0 || dh === 0) { dw = s.spLargura; dh = s.spAltura; } // XDesenhaSprite: 0 → native size
  return [dx + Math.trunc((dw - s.spLargura) / 2), dy + Math.trunc((dh - s.spAltura) / 2)];
}

// orig: funcoes_J.cpp:694 jogo_testa_colisao(Marca *marcas, Tiro *tiros, unsigned int *spMarca, unsigned int *spTiro,
//                                            Nave *jogador, int *score)
// Loop order is kept: it decides which mark absorbs a shot (the first active one in array order).
export function jogo_testa_colisao(marcas: Marca[], tiros: Tiro[], spMarca: number[], spTiro: number[], jogador: Nave, _score: { v: number }): void {
  for (let i = 0; i < MAXTIROS; i++) {
    const t = tiros[i];
    // F9: where the shot's native mask is tested (TIRO3–6 centred on the quad jogo.cpp draws)
    const [tx, ty] = posicao_colisao_tiro(t, spTiro[t.tipo]);

    //testa tiros dos inimigos no jogador
    // F8 — orig: funcoes_J.cpp:743 this test was an `else if` inside the marks loop, guarded by
    // `marcas[j].tipo != INVALIDO && marcas[j].ativo` (:700): with no active mark, enemy shots passed through
    // the ship. It now runs once per shot. (Energy changes commute and nothing else here reads them, so the
    // result is the original one whenever some mark is active.)
    if (t.tipo >= TIROINI1 && t.tipo <= TIROINI3 && jogador.tipo === X85
      && C2D2_ColidiuSprites(spTiro[t.tipo], 0, t.x, t.y, jogador.sprite, 0, jogador.x, jogador.y)) {
      switch (t.tipo) {
        case TIROINI1:
          jogador.energia -= 15;
          t.tipo = INVALIDO;
          break;
        case TIROINI2:
          jogador.energia -= 5;
          t.tipo = INVALIDO;
          break;
        case TIROINI3:
          jogador.energia -= 15;
          t.tipo = INVALIDO;
          break;
      }
    }

    for (let j = 0; j < MAXMARCAS; j++) {
      const m = marcas[j];
      //verifica se tiro e marca são validos e ativos
      if (m.tipo !== INVALIDO && t.tipo !== INVALIDO && m.ativo) {
        //testa colisões tiros do jogador com todos inimigos
        if (t.tipo <= BOMBA1 && m.tipo >= INIMIGO1 && m.tipo <= BOSS5
          && C2D2_ColidiuSprites(spTiro[t.tipo], 0, tx, ty, spMarca[m.tipo], 0, m.x, m.y)) {
          switch (t.tipo) {
            case TIRO1:
              m.energia -= 50;
              t.tipo = INVALIDO;
              break;
            case TIRO2:
              m.energia -= 75;
              t.tipo = INVALIDO;
              break;
            case TIRO3:
              m.energia -= 100;
              t.tipo = INVALIDO;
              break;
            case TIRO4:
              m.energia -= 75;
              t.tipo = INVALIDO;
              break;
            case TIRO5:
              m.energia -= 120;
              t.tipo = INVALIDO;
              break;
            case TIRO6:
              m.energia -= 150;
              t.tipo = INVALIDO;
              break;
            case BOMBA1:
              if (t.alpha >= 250)
                m.energia -= 1000;
              break;
          }
          //Faz o calculo da pontuação baseado no tipo do tiro e na energia atual do jogador
          //if(marcas[j].tipo != BOSS)
          //   *score += (int)(10*tiros[i].tipo + (0.1*jogador->energia));
        }
        // (else if: enemy shot vs player — moved above the marks loop, F8)
      }
      //o I tem que ser zero, e os tiros podem ser invalidos pra testar uma vez só a colisão dos inimigos e itens no jogador
      if (i === 0 && m.tipo >= INIMIGO1 && m.tipo <= T6 && m.ativo && jogador.tipo === X85
        && C2D2_ColidiuSprites(spMarca[m.tipo], 0, m.x, m.y, jogador.sprite, 0, jogador.x, jogador.y)) {
        switch (m.tipo) {
          case INIMIGO1:
            jogador.energia -= 20;
            m.energia -= 9999;
            break;
          case INIMIGO2:
            jogador.energia -= 30;
            m.energia -= 9999;
            break;
          case INIMIGO3:
            jogador.energia -= 40;
            m.energia -= 9999;
            break;
          case INIMIGO4: // F7 — orig: funcoes_J.cpp:781 `case INIMIGO4: break;` (passed through harmlessly);
            //               now the INIMIGO3 contact branch's numbers
            jogador.energia -= 40;
            m.energia -= 9999;
            break;
          case METEORO:
            jogador.energia -= 50;
            m.energia -= 9999;
            break;

          case BOSS1: jogador.energia -= 100; break;
          case BOSS2: jogador.energia -= 100; break;
          case BOSS3: jogador.energia -= 100; break;
          case BOSS4: jogador.energia -= 100; break;
          case BOSS5: jogador.energia -= 100; break;

          case T2:
            g.saveAtual.tiro_liberado[1] = true;
            jogador.tiro_atual = TIRO2;
            m.tipo = INVALIDO;
            break;
          case T3:
            g.saveAtual.tiro_liberado[2] = true;
            jogador.tiro_atual = TIRO3;
            m.tipo = INVALIDO;
            break;
          case T4:
            g.saveAtual.tiro_liberado[3] = true;
            jogador.tiro_atual = TIRO4;
            m.tipo = INVALIDO;
            break;
          case T5:
            g.saveAtual.tiro_liberado[4] = true;
            jogador.tiro_atual = TIRO5;
            m.tipo = INVALIDO;
            break;
          case T6:
            g.saveAtual.tiro_liberado[5] = true;
            jogador.tiro_atual = TIRO6;
            m.tipo = INVALIDO;
            break;
        }
      }
    }
  }
}

// orig: funcoes_J.cpp:823 jogo_cria_explosao(int x, int y, Explo *explos) — (x,y) is the centre
export function jogo_cria_explosao(x: number, y: number, explos: Explo[]): void {
  for (let i = 0; i < MAXEXPLOS; i++)
    if (explos[i].tipo === INVALIDO) {
      explos[i].x = x | 0;
      explos[i].y = y | 0;
      explos[i].alpha = 255;
      explos[i].tamanho = 30;
      explos[i].tipo = EXPLOSAO;
      break;
    }
}

// orig: funcoes_J.cpp:836 jogo_atualiza_explosao
export function jogo_atualiza_explosao(explos: Explo[]): void {
  for (let i = 0; i < MAXEXPLOS; i++)
    if (explos[i].tipo !== INVALIDO) {
      if (explos[i].alpha > 0) {
        explos[i].tamanho += 3;
        explos[i].alpha -= 5;
      } else
        explos[i].tipo = INVALIDO;
    }
}
