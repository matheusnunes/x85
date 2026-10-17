// Game structs as TS interfaces, plus zero-initialisers (C globals and arrays start zeroed).
// orig: X85-devcore 2/funcoes_J.h:22-74 (Nave, Tiro, Marca, Explo, Fase), funcoes_M.h:18-40 (planeta, tiporecorde, tiposave)

// tiposave / tiporecorde live with the persistence layer (single owner of stored shapes).
export type { TipoSave, TipoRecorde } from '../engine/storage';

// orig: funcoes_J.h:22-35
export interface Nave {
  tipo: number;
  x: number; y: number;
  xaux: number; yaux: number;
  energia: number;
  escudo: number;
  velocidade: number;
  tiro_atual: number;
  bomba_atual: number;
  n_bombas: number;
  intervalo_tiro: number;
  sprite: number; // unsigned int sprite-set id
}

// orig: funcoes_J.h:37-45
export interface Tiro {
  tipo: number;
  x: number; y: number;
  alpha: number;
  tamanho: number; // diametro
  id: number;      // auxiliar para efeitos
  sprite: number;
}

// orig: funcoes_J.h:47-59
export interface Marca {
  tipo: number;
  estado_atual: number;
  tempotiro: number;
  x: number;
  y: number;
  centroX: number; centroY: number;
  energia: number;
  ativo: number;
  angulo: number; // float (radians)
  sprite: number;
}

// orig: funcoes_J.h:61-67
export interface Explo {
  tipo: number;
  x: number; y: number;
  tamanho: number;
  alpha: number;
}

// orig: funcoes_J.h:69-74
export interface Fase {
  xinicio: number; xfinal: number; yinicio: number; yfinal: number;
  ymapa: number;
  mapa: number; // unsigned int map id
}

// orig: funcoes_M.h:18-23 struct planeta
export interface Planeta {
  x: number; y: number;
  tamanho: number;
  alpha: number;
}

// orig: funcoes_J.h:22 — zeroed like a C global
export function novoNave(): Nave {
  return { tipo: 0, x: 0, y: 0, xaux: 0, yaux: 0, energia: 0, escudo: 0, velocidade: 0, tiro_atual: 0, bomba_atual: 0, n_bombas: 0, intervalo_tiro: 0, sprite: 0 };
}
// orig: funcoes_J.h:37
export function novoTiro(): Tiro {
  return { tipo: 0, x: 0, y: 0, alpha: 0, tamanho: 0, id: 0, sprite: 0 };
}
// orig: funcoes_J.h:47
export function novaMarca(): Marca {
  return { tipo: 0, estado_atual: 0, tempotiro: 0, x: 0, y: 0, centroX: 0, centroY: 0, energia: 0, ativo: 0, angulo: 0, sprite: 0 };
}
// orig: funcoes_J.h:61
export function novaExplo(): Explo {
  return { tipo: 0, x: 0, y: 0, tamanho: 0, alpha: 0 };
}
// orig: funcoes_J.h:69 (jogo.cpp:11 global Fase fase — zeroed)
export function novaFase(): Fase {
  return { xinicio: 0, xfinal: 0, yinicio: 0, yfinal: 0, ymapa: 0, mapa: 0 };
}
// orig: funcoes_M.h:18 (menu.cpp:226-239 mallocs then sets every field)
export function novoPlaneta(): Planeta {
  return { x: 0, y: 0, tamanho: 0, alpha: 0 };
}
