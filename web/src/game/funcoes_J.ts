// Gameplay helpers: background, stars, player ship, shots, HUD bar, explosions, map markers, enemies, meteors,
// bosses, items and collisions. orig: X85-devcore 2/funcoes_J.cpp (all), funcoes_J.h
// C semantics: int / int → Math.trunc, int stores → | 0, C float stores → Math.fround.
// Pointers become object/array references; `int *x` / `int &x` become `{ v: number }`.
// Intentional behaviour changes (web/FIXES.md): F1, F2 (Task 11).
import { C2D2_PegaTeclas, K, rand } from '../engine/c2d2';
import {
  INVALIDO, X85, EXPLOSAO, MAXTIROS, MAXEXPLOS,
  TIRO1, TIRO2, TIRO3, TIRO4, TIRO5, TIRO6, BOMBA1, TIROINI1, TIROINI2, TIROINI3,
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
const alvoPendente = { dx: 0, dy: 0 };

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
    // web port: external nudges (see alvoPendente)
    jogador.xaux = (jogador.xaux + alvoPendente.dx) | 0;
    jogador.yaux = (jogador.yaux + alvoPendente.dy) | 0;
  }
  alvoPendente.dx = 0; alvoPendente.dy = 0;

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
