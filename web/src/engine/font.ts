// Bitmap fonts. orig: chien2d2.cpp:175-465 (C2D2_CarregaFonte, C2D2_DesenhaTexto, C2D2_DimensoesTexto); 02-engine §4.
import { normaliza } from './assets';
import { C2D2_CarregaSpriteSet, C2D2_PegaSpriteSet, C2D2_DesenhaSprite, geracaoSprites } from './sprites';

// orig: chien2d2.h C2D2_TEXTO_* enum
export const C2D2_TEXTO_CENTRALIZADO = 0, C2D2_TEXTO_DIREITA = 1, C2D2_TEXTO_ESQUERDA = 2;

export interface Fonte { path: string; tamanho: number; idSpriteSet: number; larguras: Int32Array; deslocamentos: Int32Array }

let fontes: Fonte[] = [];
let geracaoFontes = -1; // sprite generation the font table was built against

function fontesValidas(): Fonte[] {
  // initSprites() resets sprite ids; drop fonts built on a previous sprite table
  if (geracaoFontes !== geracaoSprites()) { fontes = []; geracaoFontes = geracaoSprites(); }
  return fontes;
}

// orig: chien2d2.cpp:175 C2D2_CarregaFonte — 1-based id, 0 on failure, cached by (normalised) path
export function C2D2_CarregaFonte(path: string, tamanho: number): number {
  const lista = fontesValidas();
  const chave = normaliza(path);
  const i = lista.findIndex(f => f.path === chave);
  if (i >= 0) return i + 1;
  const id = C2D2_CarregaSpriteSet(path, tamanho, tamanho);
  const s = C2D2_PegaSpriteSet(id);
  // orig: chien2d2.cpp:221-228 — image must be exactly 16*tamanho square
  if (!s || s.largura !== tamanho * 16 || s.altura !== tamanho * 16) return 0;
  const m = s.mask;
  const solido = (x: number, y: number) => x < m.w && y < m.h && ((m.bits[y * m.ldwords + (x >> 5)] >>> (x & 31)) & 1) === 1;
  const larguras = new Int32Array(256), deslocamentos = new Int32Array(256);
  // orig: chien2d2.cpp:230-312 — per-glyph metrics from the transparency test (same rule as the masks)
  for (let linha = 0; linha < 16; linha++) for (let coluna = 0; coluna < 16; coluna++) {
    const c = linha * 16 + coluna, ox = coluna * tamanho, oy = linha * tamanho;
    const colunaVazia = (x: number) => { for (let y = 0; y < tamanho; y++) if (solido(ox + x, oy + y)) return false; return true; };
    let primeira = -1;
    for (let x = 0; x < tamanho; x++) if (!colunaVazia(x)) { primeira = x; break; }
    if (primeira < 0) { larguras[c] = tamanho; deslocamentos[c] = 0; continue; }
    deslocamentos[c] = primeira;
    let ultima = -1;
    for (let x = primeira + 1; x < tamanho; x++) if (colunaVazia(x)) { ultima = x; break; }
    if (ultima >= 0) {
      // orig: chien2d2.cpp:296-303 — padding by font size
      if (tamanho < 16) ultima += 1;
      else if (tamanho < 32) ultima += 1;
      else if (tamanho < 64) ultima += 2;
      else ultima += 3;
      larguras[c] = ultima <= tamanho ? ultima - primeira : tamanho - primeira;
    } else larguras[c] = tamanho - primeira;
  }
  // orig: chien2d2.cpp:314-316 — space is half the font size
  larguras[32] = Math.trunc(tamanho / 2); deslocamentos[32] = 0;
  lista.push({ path: chave, tamanho, idSpriteSet: id, larguras, deslocamentos });
  return lista.length;
}

export function metricasFonte(fonte: number): Fonte | undefined {
  return fonte > 0 ? fontesValidas()[fonte - 1] : undefined;
}

// orig: chien2d2.cpp:442 C2D2_DimensoesTexto (width part); text is Latin-1 → charCodeAt & 255
export function larguraTexto(fonte: number, texto: string): number {
  const f = metricasFonte(fonte);
  if (!f) return 0;
  let w = 0;
  for (let i = 0; i < texto.length; i++) w += f.larguras[texto.charCodeAt(i) & 255];
  return w;
}

// orig: chien2d2.cpp:371 C2D2_DesenhaTexto
export function C2D2_DesenhaTexto(fonte: number, x: number, y: number, texto: string, alinhamento: number): void {
  const f = metricasFonte(fonte);
  if (!f) return;
  const W = larguraTexto(fonte, texto);
  let pen = x | 0;
  if (alinhamento === C2D2_TEXTO_CENTRALIZADO) pen = (x | 0) - Math.trunc(W / 2);
  else if (alinhamento === C2D2_TEXTO_DIREITA) pen = (x | 0) - W;
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i) & 255;
    C2D2_DesenhaSprite(f.idSpriteSet, c, pen - f.deslocamentos[c], y);
    pen += f.larguras[c];
  }
}
