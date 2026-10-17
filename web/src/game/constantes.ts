// Game constants (the C enums and #defines), with their original names and values.
// orig: X85-devcore 2/funcoes_M.h:15-16, funcoes_J.h:5-20

// orig: funcoes_M.h:15 enum {TELA_MAIN, TELA_SLOT_SELECT, ..., SAIR}
export const TELA_MAIN = 0;        // orig: funcoes_M.h:15
export const TELA_SLOT_SELECT = 1; // orig: funcoes_M.h:15
export const TELA_SLOT_INSERT = 2; // orig: funcoes_M.h:15
export const TELA_MISSION = 3;     // orig: funcoes_M.h:15
export const TELA_OPCOES = 4;      // orig: funcoes_M.h:15
export const TELA_RANKING = 5;     // orig: funcoes_M.h:15
export const TELA_ABOUT = 6;       // orig: funcoes_M.h:15
export const TELA_JOGO = 7;        // orig: funcoes_M.h:15
export const SAIR = 8;             // orig: funcoes_M.h:15

// orig: funcoes_M.h:16 enum {EASY=1, NORMAL, HARD, GODMODE}
export const EASY = 1;    // orig: funcoes_M.h:16
export const NORMAL = 2;  // orig: funcoes_M.h:16
export const HARD = 3;    // orig: funcoes_M.h:16
export const GODMODE = 4; // orig: funcoes_M.h:16

export const MAXTIROS = 300;   // orig: funcoes_J.h:5
export const MAXMARCAS = 1000; // orig: funcoes_J.h:6
export const MAXSTARS = 100;   // orig: funcoes_J.h:7
export const MAXEXPLOS = 100;  // orig: funcoes_J.h:8

// orig: funcoes_J.h:11 tipos da nave — enum { INVALIDO=0, X85, INVUNERAVEL }
export const INVALIDO = 0;    // orig: funcoes_J.h:11
export const X85 = 1;         // orig: funcoes_J.h:11
export const INVUNERAVEL = 2; // orig: funcoes_J.h:11

// orig: chien2d2mapa.h:18-32 — single owner is the engine (web/src/engine/mapa.ts); re-exported here.
export { C2D2M_INICIO, C2D2M_FIM, C2D2M_PROG } from '../engine/mapa';

// orig: funcoes_J.h:15 marcações no mapa — enum {BOLA=C2D2M_PROG, M_INIMIGO1, ..., M_T6}
export const BOLA = 20;       // orig: funcoes_J.h:15 (= C2D2M_PROG)
export const M_INIMIGO1 = 21; // orig: funcoes_J.h:15
export const M_INIMIGO2 = 22; // orig: funcoes_J.h:15
export const M_INIMIGO3 = 23; // orig: funcoes_J.h:15
export const M_INIMIGO4 = 24; // orig: funcoes_J.h:15
export const M_METEORO = 25;  // orig: funcoes_J.h:15
export const M_BOSS = 26;     // orig: funcoes_J.h:15
export const M_T1 = 27;       // orig: funcoes_J.h:15
export const M_T2 = 28;       // orig: funcoes_J.h:15
export const M_T3 = 29;       // orig: funcoes_J.h:15
export const M_T4 = 30;       // orig: funcoes_J.h:15
export const M_T5 = 31;       // orig: funcoes_J.h:15
export const M_T6 = 32;       // orig: funcoes_J.h:15

// orig: funcoes_J.h:17 enum { INIMIGO1=1, INIMIGO2, ..., T6, EXPLOSAO }
export const INIMIGO1 = 1;  // orig: funcoes_J.h:17
export const INIMIGO2 = 2;  // orig: funcoes_J.h:17
export const INIMIGO3 = 3;  // orig: funcoes_J.h:17
export const INIMIGO4 = 4;  // orig: funcoes_J.h:17
export const METEORO = 5;   // orig: funcoes_J.h:17
export const BOSS1 = 6;     // orig: funcoes_J.h:17
export const BOSS2 = 7;     // orig: funcoes_J.h:17
export const BOSS3 = 8;     // orig: funcoes_J.h:17
export const BOSS4 = 9;     // orig: funcoes_J.h:17
export const BOSS5 = 10;    // orig: funcoes_J.h:17
export const T1 = 11;       // orig: funcoes_J.h:17
export const T2 = 12;       // orig: funcoes_J.h:17
export const T3 = 13;       // orig: funcoes_J.h:17
export const T4 = 14;       // orig: funcoes_J.h:17
export const T5 = 15;       // orig: funcoes_J.h:17
export const T6 = 16;       // orig: funcoes_J.h:17
export const EXPLOSAO = 17; // orig: funcoes_J.h:17

// orig: funcoes_J.h:20 tipos de tiro — enum {TIRO1=1, TIRO2, ..., BOMBA1, TIROINI1, TIROINI2, TIROINI3}
export const TIRO1 = 1;     // orig: funcoes_J.h:20
export const TIRO2 = 2;     // orig: funcoes_J.h:20
export const TIRO3 = 3;     // orig: funcoes_J.h:20
export const TIRO4 = 4;     // orig: funcoes_J.h:20
export const TIRO5 = 5;     // orig: funcoes_J.h:20
export const TIRO6 = 6;     // orig: funcoes_J.h:20
export const BOMBA1 = 7;    // orig: funcoes_J.h:20
export const TIROINI1 = 8;  // orig: funcoes_J.h:20
export const TIROINI2 = 9;  // orig: funcoes_J.h:20
export const TIROINI3 = 10; // orig: funcoes_J.h:20
