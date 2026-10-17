// Sprite sets and drawing, replacing Chien2D 2's sprite layer with the original function names.
// orig: chien2d2_gl.cpp:353-543 (C2D2GL_CarregaSpriteSet), :608-655 (DesenhaSprite), :661-718 (DesenhaSpriteEfeito),
//       funcoes_M.cpp:16-37 (XDesenhaSprite, the only caller of DesenhaSpriteEfeito); 02-engine §2-§3.
import { normaliza, type Dados, type Mascara } from './assets';
import type { Backend } from './renderer';

export interface SpriteSet {
  id: number; path: string;
  largura: number; altura: number;     // image size
  spLargura: number; spAltura: number; // frame size
  matrizX: number; matrizY: number;    // frames per row / column
  tex: number; mask: Mascara;          // whole-image mask; frames are sub-rectangles of it
}

let backend: Backend | null = null;
let dados: Dados | null = null;
let sprites: SpriteSet[] = [];
let cache = new Map<string, number>();
let geracao = 0;

/** Must be called before any other function here (and again to reset state, e.g. in tests). */
export function initSprites(b: Backend, d: Dados): void {
  backend = b; dados = d; sprites = []; cache = new Map(); geracao++;
}

/** Bumped by every initSprites(); lets dependent tables (fonts) know sprite ids were reset. */
export function geracaoSprites(): number { return geracao; }

// orig: chien2d2_gl.cpp:353 C2D2GL_CarregaSpriteSet — 1-based id, 0 on failure, cached by (normalised) path
export function C2D2_CarregaSpriteSet(path: string, largura: number, altura: number): number {
  if (!backend || !dados) return 0;
  const chave = normaliza(path);
  const existente = cache.get(chave);
  if (existente !== undefined) return existente;
  const entrada = dados.manifest.images[path] ?? dados.manifest.images[chave] ?? dados.manifest.images['./' + chave];
  if (!entrada) return 0;
  const W = entrada.w, H = entrada.h;
  let spLargura = W, spAltura = H, matrizX = 1, matrizY = 1;
  if (largura !== 0 && altura !== 0) {
    // orig: chien2d2_gl.cpp:402-420 — integer division, partial trailing frames ignored
    spLargura = largura; spAltura = altura;
    matrizX = Math.trunc(W / largura); matrizY = Math.trunc(H / altura);
    if (matrizX === 0 || matrizY === 0) return 0;
  }
  const mask = dados.mascaras.get(chave) ?? { w: W, h: H, ldwords: Math.ceil(W / 32), bits: new Uint32Array(Math.ceil(W / 32) * H) };
  const tex = backend.criaTextura(dados.imagens.get(chave) ?? null, W, H);
  const id = sprites.length + 1;
  sprites.push({ id, path: chave, largura: W, altura: H, spLargura, spAltura, matrizX, matrizY, tex, mask });
  cache.set(chave, id);
  return id;
}

// Replaces direct `sprites[id-1]` access (funcoes_M.cpp:21-22)
export function C2D2_PegaSpriteSet(id: number): SpriteSet | undefined {
  return id > 0 ? sprites[id - 1] : undefined;
}

/** Frame source rect origin, or null for id 0 / unknown id / out-of-range frame (orig: chien2d2_gl.cpp:611-619). */
export function origemQuadro(s: SpriteSet | undefined, indice: number): [number, number] | null {
  if (!s || indice < 0 || indice >= s.matrizX * s.matrizY) return null;
  return [(indice % s.matrizX) * s.spLargura, Math.trunc(indice / s.matrizX) * s.spAltura];
}

// orig: chien2d2_gl.cpp:608 C2D2GL_DesenhaSprite — top-left at (x,y), frame size, opaque vertex colour
export function C2D2_DesenhaSprite(id: number, indice: number, x: number, y: number): boolean {
  const s = C2D2_PegaSpriteSet(id); const o = origemQuadro(s, indice);
  if (!s || !o || !backend) return false;
  backend.quad({ tex: s.tex, sx: o[0], sy: o[1], sw: s.spLargura, sh: s.spAltura, dx: x | 0, dy: y | 0, dw: s.spLargura, dh: s.spAltura, alpha: 1 });
  return true;
}

// orig: funcoes_M.cpp:16 XDesenhaSprite + chien2d2_gl.cpp:661 C2D2GL_DesenhaSpriteEfeito (axis-aligned, r=g=b=255)
// w==0 || h==0 → frame size; negative w/h mirror (quad extends left/up of x,y); alpha is a Uint8 store (& 255).
export function C2D2_DesenhaSpriteEfeito(id: number, indice: number, x: number, y: number, w: number, h: number, alpha: number): boolean {
  const s = C2D2_PegaSpriteSet(id); const o = origemQuadro(s, indice);
  if (!s || !o || !backend) return false;
  if (w === 0 || h === 0) { w = s.spLargura; h = s.spAltura; }
  backend.quad({ tex: s.tex, sx: o[0], sy: o[1], sw: s.spLargura, sh: s.spAltura, dx: x | 0, dy: y | 0, dw: w | 0, dh: h | 0, alpha: (alpha & 255) / 255 });
  return true;
}

// orig: chien2d2_gl.cpp:257 C2D2GL_LimpaTela — clear colour is never changed by X85 (black)
export function C2D2_LimpaTela(): void { backend?.limpa(); }

// orig: chien2d2primitivas_gl.cpp:55 C2D2PGL_Pontos — xy holds n interleaved (x,y) pairs
export function C2D2P_Pontos(xy: Int32Array, n: number, r: number, g: number, b: number): void {
  backend?.pontos(xy, n, r & 255, g & 255, b & 255);
}

// orig: chien2d2_gl.cpp:235 C2D2GL_Sincroniza — here only ends the frame; timing/input live in loop/input
export function C2D2_Sincroniza(): void { backend?.fimQuadro(); }
